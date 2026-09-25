/**
 * obsidian-background-cover 插件入口。
 *
 * 功能（对应 vscode-background-cover 的背景能力，剔除粒子/宠物/在线图库）：
 * - 本地文件夹背景源（支持 Obsidian 仓库之外、~、环境变量）
 * - 只加载「当前一张」图片到内存，文件夹仅扫描文件名列表
 * - 透明度 / 模糊 / 尺寸模式 / 混合模式 / 淡入淡出过渡
 * - 固定间隔自动轮播 + 手动命令随机换一张
 * - 独立背景层，不修改任何主题 CSS 变量，与用户安装的主题互不冲突
 */
import { existsSync } from "fs";
import { Notice, Plugin } from "obsidian";

import { BackgroundLayer, createImageObjectUrl } from "./background";
import { toRgbaColor } from "./css";
import { collectDiagnostics } from "./diagnostics";
import { expandPathVariables, isDirectory, listImagesInFolder, ShufflePlaylist } from "./folder";
import { BackgroundCoverSettingTab, BgcSettings, DEFAULT_SETTINGS } from "./settings";

/**
 * 「与主题配合」相关类名（样式定义在 styles.css）。
 * 这些是插件唯一会覆盖主题背景颜色的功能，默认关闭；具体子项见设置页。
 */
const THEME_TRANSPARENT_CLASS = "bgc-transparent-theme";
const DIVIDER_TITLEBAR_CLASS = "bgc-divider-titlebar";
const DIVIDER_SIDEBAR_CLASS = "bgc-divider-sidebar";
const MODAL_GLASS_CLASS = "bgc-modal-glass";

/** 这些类在卸载时要一并清掉。 */
const THEME_CLASSES = [
	THEME_TRANSPARENT_CLASS,
	DIVIDER_TITLEBAR_CLASS,
	DIVIDER_SIDEBAR_CLASS,
	MODAL_GLASS_CLASS,
];

export default class BackgroundCoverPlugin extends Plugin {
	settings!: BgcSettings;
	private layer: BackgroundLayer | null = null;
	private settingTab: BackgroundCoverSettingTab | null = null;
	private autoTask: number | null = null;
	private isAutoRunning = false;
	private folderCache: string[] | null = null;
	private folderCacheKey = "";
	/** 不重复播放列表：一轮内每张只出现一次，用尽后重新洗牌。 */
	private playlist = new ShufflePlaylist();
	/** 切换请求序号：只有最后一次发起的切换真正生效，防止异步读取竞态。 */
	private switchSeq = 0;

	// ============================================================================
	// 生命周期
	// ============================================================================

	async onload(): Promise<void> {
		await this.loadSettings();
		this.applyThemeTransparency();

		// 命令
		this.addCommand({
			id: "bgc-random-background",
			name: "Random background / 随机更换背景",
			callback: () => {
				void this.randomizeBackground();
			},
		});
		this.addCommand({
			id: "bgc-toggle-enabled",
			name: "Toggle background / 启用或停用背景",
			callback: () => {
				void this.toggleEnabled();
			},
		});
		this.addCommand({
			id: "bgc-copy-diagnostics",
			name: "Copy diagnostics / 复制诊断信息",
			callback: () => {
				void this.copyDiagnostics();
			},
		});

		// 状态栏按钮：点击随机换一张
		const statusBar = this.addStatusBarItem();
		statusBar.setText("🖼");
		statusBar.setAttribute("aria-label", "Random background / 随机更换背景");
		statusBar.addClass("bgc-status-bar");
		this.registerDomEvent(statusBar, "click", () => {
			void this.randomizeBackground();
		});

		// 设置页（保留引用：换图后同步刷新「当前」显示的图片名）
		this.settingTab = new BackgroundCoverSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		// 工作区就绪后挂载背景层
		this.app.workspace.onLayoutReady(() => {
			this.mountLayer();
		});
	}

	onunload(): void {
		this.stopAutoTask();
		// unmount 会同时移除背景层与容器上的混合模式类
		this.layer?.unmount();
		this.layer = null;
		// 主题透明化是覆盖主题背景颜色的功能，卸载时必须还原
		for (const cls of THEME_CLASSES) {
			document.body.removeClass(cls);
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<BgcSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	// ============================================================================
	// 文件夹扫描（只维护文件名列表，不读图片内容）
	// ============================================================================

	/** 扫描背景文件夹，带缓存；路径变化或显式失效时重新扫描。 */
	scanFolder(): string[] {
		const folder = this.settings.imageFolder;
		if (!folder) {
			this.folderCache = [];
			this.folderCacheKey = "";
			return this.folderCache;
		}
		const expanded = expandPathVariables(folder);
		if (expanded !== this.folderCacheKey || this.folderCache === null) {
			this.folderCache = isDirectory(expanded) ? listImagesInFolder(expanded) : [];
			this.folderCacheKey = expanded;
		}
		return this.folderCache;
	}

	/**
	 * 强制重新扫描，并重置播放序列。
	 * 重洗是必要的：重扫后应从新的随机顺序开始，而不是接着旧序列往下走
	 * （旧序列里还可能残留已被删除的文件）。
	 */
	invalidateFolderScan(): void {
		this.folderCache = null;
		this.folderCacheKey = "";
		this.playlist.reset();
	}

	// ============================================================================
	// 背景应用
	// ============================================================================

	private mountLayer(): void {
		this.layer = new BackgroundLayer(document.body, this.settings);
		this.layer.mount();
		void this.applyRuntimeState();
	}

	/**
	 * 根据启用状态与当前设置同步运行时：隐藏/显示背景层，恢复当前图或随机一张，
	 * 重启自动轮播。
	 */
	async applyRuntimeState(): Promise<void> {
		if (!this.layer) {
			return;
		}

		if (!this.settings.enabled) {
			this.layer.hide();
			this.stopAutoTask();
			return;
		}

		// 恢复上次的图：仅当该图仍属于当前文件夹的扫描结果时恢复，
		// 否则（路径已更换 / 文件被移除）从文件夹随机选一张。
		const files = this.scanFolder();
		const current = this.settings.currentImagePath;
		const currentValid = Boolean(current && files.includes(current) && this.hasImage(current));
		if (currentValid) {
			const restored = await this.applyImageFile(current);
			if (!restored) {
				await this.randomizeBackground();
			}
		} else if (files.length > 0) {
			await this.randomizeBackground();
		} else {
			this.layer.hide();
		}

		this.restartAutoTask();
	}

	/** 随机换一张：按不重复播放列表顺序取图，一轮内不会重复。 */
	async randomizeBackground(): Promise<void> {
		const files = this.scanFolder();
		if (files.length === 0) {
			new Notice("背景文件夹为空或路径无效 / background folder is empty or invalid.");
			return;
		}
		const next = this.playlist.next(
			files,
			this.folderCacheKey,
			this.settings.currentImagePath || undefined
		);
		if (!next) {
			return;
		}
		await this.applyImageFile(next);
	}

	/**
	 * 应用指定图片文件（读取为 blob URL → 交叉淡化切换）。
	 * 只有最后一次发起的调用会真正生效；返回是否成功应用。
	 */
	async applyImageFile(filePath: string): Promise<boolean> {
		if (!this.layer) {
			return false;
		}
		const seq = ++this.switchSeq;
		let objectUrl: string;
		try {
			objectUrl = await createImageObjectUrl(filePath);
		} catch (error) {
			console.error("[BackgroundCover] Failed to apply image:", error);
			new Notice(`背景加载失败：${(error as Error).message}`);
			return false;
		}
		// 读取期间又有新的切换请求，本请求已过期：丢弃并释放这一张的内存
		if (seq !== this.switchSeq) {
			URL.revokeObjectURL(objectUrl);
			return false;
		}
		if (!this.layer.setImage(objectUrl, filePath)) {
			// setImage 未能应用时已自行释放该 URL
			return false;
		}
		// 与设置里的「启用背景」保持一致：停用期间换图只更新内容，不显示
		if (this.settings.enabled) {
			this.layer.show();
		} else {
			this.layer.hide();
		}
		this.settings.currentImagePath = filePath;
		await this.saveSettings();
		// 设置页若开着，「当前」图片名需要立刻跟上实际显示的图
		this.settingTab?.refreshFolderInfo();
		return true;
	}

	/** 设置页展示用：当前实际显示在背景层上的图（无则退回持久化的记录）。 */
	getCurrentDisplayPath(): string {
		return this.layer?.getCurrentPath() ?? this.settings.currentImagePath;
	}

	/** 外观参数（透明度/模糊/尺寸/混合/过渡）变化时即时生效。 */
	applyAppearance(): void {
		if (!this.layer) {
			return;
		}
		this.layer.applyAppearance();
		if (this.settings.enabled && this.layer.hasImage()) {
			this.layer.show();
		} else {
			this.layer.hide();
		}
	}

	/**
	 * 同步「与主题配合」的全部开关与取值：类名加在 body 上、可调数值写成 CSS 变量，
	 * 具体样式见 styles.css。这些是本插件唯一会覆盖主题背景颜色的功能，默认关闭。
	 */
	applyThemeTransparency(): void {
		const on = this.settings.transparentTheme;
		document.body.toggleClass(THEME_TRANSPARENT_CLASS, on);
		document.body.toggleClass(DIVIDER_TITLEBAR_CLASS, on && this.settings.titlebarDivider);
		document.body.toggleClass(DIVIDER_SIDEBAR_CLASS, on && this.settings.sidebarDivider);
		document.body.toggleClass(MODAL_GLASS_CLASS, on && this.settings.modalGlass);
		document.body.setCssProps({
			"--bgc-separator": toRgbaColor(
				this.settings.separatorColor,
				this.settings.separatorOpacity
			),
			"--bgc-glass-blur": `${this.settings.modalGlassBlur}px`,
			"--bgc-glass-opacity": `${Math.round(this.settings.modalGlassOpacity * 100)}%`,
		});
	}

	/**
	 * 收集环境/主题/浮层相关的事实并复制到剪贴板（同时打印到控制台）。
	 * 「分隔线/毛玻璃不生效」这类问题只在用户机器上能观察，先拿到事实再改代码。
	 */
	async copyDiagnostics(): Promise<void> {
		const report = collectDiagnostics(this.settings, this.manifest.version);
		try {
			await navigator.clipboard.writeText(report);
			new Notice("诊断信息已复制到剪贴板 / diagnostics copied to clipboard.");
		} catch (error) {
			// 剪贴板不可用时把内容并进错误输出，用户仍可从控制台取到完整报告
			console.error(`[BackgroundCover] Clipboard unavailable; diagnostics:\n${report}`, error);
			new Notice("复制失败，请从开发者控制台复制 / copy failed; see the console.");
		}
	}

	/** 启用/停用切换命令。 */
	async toggleEnabled(): Promise<void> {		this.settings.enabled = !this.settings.enabled;
		await this.saveSettings();
		await this.applyRuntimeState();
	}

	private hasImage(filePath: string): boolean {
		try {
			return existsSync(filePath);
		} catch {
			return false;
		}
	}

	// ============================================================================
	// 自动轮播
	// ============================================================================

	restartAutoTask(): void {
		this.stopAutoTask();
		if (!this.settings.enabled || !this.settings.autoStatus) {
			return;
		}
		const intervalMs = Math.max(5, this.settings.autoIntervalSeconds) * 1000;
		this.autoTask = window.setInterval(() => {
			if (this.isAutoRunning) {
				return; // 上一轮尚未完成，跳过
			}
			if (this.scanFolder().length === 0) {
				return;
			}
			this.isAutoRunning = true;
			void this.randomizeBackground()
				.catch((error) => console.error("[BackgroundCover] Auto update failed:", error))
				.finally(() => {
					this.isAutoRunning = false;
				});
		}, intervalMs);
	}

	stopAutoTask(): void {
		if (this.autoTask !== null) {
			window.clearInterval(this.autoTask);
			this.autoTask = null;
		}
	}
}
