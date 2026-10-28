/**
 * background-cover 插件入口。
 *
 * 功能（对应 vscode-background-cover 的背景能力，剔除粒子/宠物/在线图库）：
 * - 两个互相独立的本地文件夹播放列表，各自的文件夹 / 播放顺序 / 当前图片
 * - 只加载「当前一张」图片到内存，文件夹仅扫描文件名列表
 * - 透明度 / 模糊 / 尺寸模式 / 混合模式 / 淡入淡出过渡
 * - 纵向图的垂直取景位置（横向图不位移）
 * - 按宽高比筛选（读文件头统计尺寸，结果缓存到插件目录）
 * - 固定间隔自动轮播 + 手动命令随机换一张 / 切换播放列表
 * - 独立背景层，不修改任何主题 CSS 变量，与用户安装的主题互不冲突
 */
import { existsSync } from "fs";
import * as path from "path";

import { Notice, Plugin } from "obsidian";

import { BackgroundLayer, createImageObjectUrl } from "./background";
import { toRgbaColor } from "./css";
import { expandPathVariables, fileNameOf, isDirectory, listImagesInFolder, ShufflePlaylist } from "./folder";
import { t } from "./i18n";
import {
	aspectRatio,
	isPortrait,
	loadImageIndex,
	measureImages,
	saveImageIndex,
	type ImageIndex,
} from "./imageIndex";
import type { ImageSize } from "./imageSize";
import {
	BackgroundCoverSettingTab,
	BgcSettings,
	DEFAULT_SETTINGS,
	PLAYLIST_IDS,
	type PlaylistId,
} from "./settings";

/**
 * 「与主题配合」相关类名（样式定义在 styles.css）。
 * 这些是插件唯一会覆盖主题背景颜色的功能，默认关闭；具体子项见设置页。
 * 注意 bgc-transparent-theme 同时决定壁纸的层级：加上它以后，壁纸会从"盖在内容之上"
 * 切换成"沉到内容之下"（真背景模式，只与 body 底色合成），说明见 styles.css。
 */
const THEME_TRANSPARENT_CLASS = "bgc-transparent-theme";
const DIVIDER_TITLEBAR_CLASS = "bgc-divider-titlebar";
const DIVIDER_SIDEBAR_CLASS = "bgc-divider-sidebar";

/** 这些类在卸载时要一并清掉。 */
const THEME_CLASSES = [
	THEME_TRANSPARENT_CLASS,
	DIVIDER_TITLEBAR_CLASS,
	DIVIDER_SIDEBAR_CLASS,
];

/** 索引文件名，放在插件自己的目录下（与 data.json 同级，不写进用户图库）。 */
const INDEX_FILE_NAME = "image-index.json";

/** 单个播放列表的文件夹缓存。 */
interface FolderCache {
	/** 按当前筛选条件过滤后的文件名列表（轮播用它）；null 表示还没扫过。 */
	files: string[] | null;
	/** 过滤前的完整文件名列表（扫描尺寸、设置页统计用它）。 */
	all: string[];
	/** 缓存键：文件夹 + 筛选条件，任一变化都要重新扫描。 */
	key: string;
}

/**
 * 仓库根目录（桌面端才有）。索引文件放在插件目录下，需要把相对路径补成绝对路径。
 */
function vaultBasePath(adapter: unknown): string {
	const candidate = adapter as { getBasePath?: () => string };
	return typeof candidate.getBasePath === "function" ? candidate.getBasePath() : "";
}

/** 尺寸扫描结果摘要（设置页展示用）。 */
export interface ScanSummary {
	/** 文件夹内图片总数。 */
	total: number;
	/** 已得到尺寸的图片数。 */
	measured: number;
	/** 达到长宽比阈值（可作背景）的数量。 */
	landscape: number;
	/** 低于阈值的纵向图数量。 */
	portrait: number;
	/** 尚未得到尺寸的数量。 */
	unknown: number;
}

export default class BackgroundCoverPlugin extends Plugin {
	settings!: BgcSettings;
	private layer: BackgroundLayer | null = null;
	private settingTab: BackgroundCoverSettingTab | null = null;
	private autoTask: number | null = null;
	private isAutoRunning = false;
	/** 每个播放列表各自独立的文件夹缓存（切换列表不会互相踩缓存）。 */
	private readonly folderCaches: Record<PlaylistId, FolderCache> = {
		a: { files: null, all: [], key: "" },
		b: { files: null, all: [], key: "" },
	};
	/** 每个播放列表各自的不重复播放序列。 */
	private readonly playlists: Record<PlaylistId, ShufflePlaylist> = {
		a: new ShufflePlaylist(),
		b: new ShufflePlaylist(),
	};
	/** 切换请求序号：只有最后一次发起的切换真正生效，防止异步读取竞态。 */
	private switchSeq = 0;
	/** 图片尺寸索引（绝对路径 → 宽高）；用于按长宽比筛选。 */
	private sizeIndex: ImageIndex = {};
	/** 索引文件的绝对路径；插件目录不可知时为空串（此时只在内存里用）。 */
	private indexPath = "";
	private scanning = false;
	/** 上次自动补扫对应的文件夹缓存键（见 maybeAutoScan）。 */
	private autoScannedKey = "";

	// ============================================================================
	// 生命周期
	// ============================================================================

	async onload(): Promise<void> {
		await this.loadSettings();

		// 尺寸索引：只缓存元数据，5000 张约 400 KB，全部留在本地
		this.indexPath = this.resolveIndexPath();
		if (this.indexPath) {
			this.sizeIndex = await loadImageIndex(this.indexPath);
		}

		this.applyThemeTransparency();

		// 命令
		this.addCommand({
			id: "bgc-random-background",
			name: t("cmd.random"),
			callback: () => {
				void this.randomizeBackground();
			},
		});
		this.addCommand({
			id: "bgc-switch-playlist",
			name: t("cmd.switchPlaylist"),
			callback: () => {
				void this.switchPlaylist();
			},
		});
		this.addCommand({
			id: "bgc-toggle-enabled",
			name: t("cmd.toggle"),
			callback: () => {
				void this.toggleEnabled();
			},
		});

		// 状态栏按钮：点击随机换一张
		const statusBar = this.addStatusBarItem();
		statusBar.setText("🖼");
		statusBar.setAttribute("aria-label", t("cmd.random"));
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
		const data = (await this.loadData()) as
			| (Partial<BgcSettings> & { imageFolder?: string; currentImagePath?: string })
			| null;
		const settings: BgcSettings = {
			...DEFAULT_SETTINGS,
			...data,
			playlists: {
				a: { ...DEFAULT_SETTINGS.playlists.a, ...data?.playlists?.a },
				b: { ...DEFAULT_SETTINGS.playlists.b, ...data?.playlists?.b },
			},
		};
		// 旧版只有单个 imageFolder / currentImagePath：升级时并入播放列表 A，
		// 不丢用户已经配好的路径（旧键不再写回，保存后自然消失）
		if (data && !data.playlists) {
			settings.playlists.a.folder = data.imageFolder ?? "";
			settings.playlists.a.currentImagePath = data.currentImagePath ?? "";
		}
		if (settings.activePlaylist !== "a" && settings.activePlaylist !== "b") {
			settings.activePlaylist = "a";
		}
		this.settings = settings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/**
	 * 尺寸索引文件的绝对路径。
	 * `manifest.dir` 在桌面端是插件目录的绝对路径；万一拿到的是相对路径，
	 * 再拼上仓库根目录，避免把索引写到一个相对于进程工作目录的错误位置。
	 */
	private resolveIndexPath(): string {
		const dir = this.manifest.dir;
		if (!dir) {
			return "";
		}
		if (path.isAbsolute(dir)) {
			return path.join(dir, INDEX_FILE_NAME);
		}
		const base = vaultBasePath(this.app.vault.adapter);
		return base ? path.join(base, dir, INDEX_FILE_NAME) : "";
	}

	// ============================================================================
	// 文件夹扫描（只维护文件名列表，不读图片内容）
	// ============================================================================

	/**
	 * 扫描指定播放列表的文件夹（默认当前列表），带缓存。
	 * 缓存键包含筛选条件，因此切换「按长宽比筛选」或改阈值都会触发重新过滤。
	 */
	scanFolder(id: PlaylistId = this.settings.activePlaylist): string[] {
		const cache = this.folderCaches[id];
		const folder = this.settings.playlists[id].folder;
		if (!folder) {
			cache.files = [];
			cache.all = [];
			cache.key = "";
			return cache.files;
		}
		const expanded = expandPathVariables(folder);
		const key = this.settings.filterByAspect
			? `${expanded}\u0000${this.settings.aspectThreshold}`
			: expanded;
		if (cache.files === null || cache.key !== key) {
			cache.all = isDirectory(expanded) ? listImagesInFolder(expanded) : [];
			cache.files = this.filterByAspect(cache.all);
			cache.key = key;
		}
		return cache.files;
	}

	/** 按长宽比筛选文件名列表；尺寸未知的图会被排除（先扫描才能用）。 */
	private filterByAspect(files: readonly string[]): string[] {
		if (!this.settings.filterByAspect) {
			return [...files];
		}
		const threshold = this.settings.aspectThreshold;
		return files.filter((file) => aspectRatio(this.sizeIndex[file]) >= threshold);
	}

	/**
	 * 强制重新扫描，并重置播放序列。
	 * 重洗是必要的：重扫后应从新的随机顺序开始，而不是接着旧序列往下走
	 * （旧序列里还可能残留已被删除的文件）。
	 *
	 * @param id 只失效一个列表；省略则两个都失效（筛选条件变化时用）
	 */
	invalidateFolderScan(id?: PlaylistId): void {
		for (const key of id ? [id] : PLAYLIST_IDS) {
			const cache = this.folderCaches[key];
			cache.files = null;
			cache.all = [];
			cache.key = "";
			this.playlists[key].reset();
		}
	}

	// ============================================================================
	// 尺寸扫描（按长宽比筛选的前提）
	// ============================================================================

	/** 是否正在扫描尺寸（设置页据此不覆盖进度文本）。 */
	get isScanning(): boolean {
		return this.scanning;
	}

	/** 当前播放列表的尺寸统计（设置页展示用）。 */
	getScanSummary(): ScanSummary {
		const cache = this.folderCaches[this.settings.activePlaylist];
		const threshold = this.settings.aspectThreshold;
		let measured = 0;
		let landscape = 0;
		let portrait = 0;
		for (const file of cache.all) {
			const entry = this.sizeIndex[file];
			if (!entry) {
				continue;
			}
			measured += 1;
			if (aspectRatio(entry) >= threshold) {
				landscape += 1;
			} else {
				portrait += 1;
			}
		}
		return {
			total: cache.all.length,
			measured,
			landscape,
			portrait,
			unknown: cache.all.length - measured,
		};
	}

	/** 某个播放列表的图片数量（筛选前 / 筛选后）。 */
	getPlaylistStats(id: PlaylistId): { shown: number; total: number } {
		const shown = this.scanFolder(id).length;
		return { shown, total: this.folderCaches[id].all.length };
	}

	/**
	 * 扫描当前播放列表文件夹里所有图片的尺寸并写入索引。
	 * 只读文件头、不解码整图；命中缓存的文件直接跳过（见 imageIndex.ts）。
	 *
	 * @param silent 静默模式（打开筛选时自动补扫）：不弹完成/无图提示
	 */
	async startScan(silent = false): Promise<void> {
		if (this.scanning) {
			return;
		}
		const id = this.settings.activePlaylist;
		// 先把文件名列表扫出来（cache.all 才是要统计的全集，不受筛选影响）
		this.scanFolder(id);
		const all = this.folderCaches[id].all;
		if (all.length === 0) {
			if (!silent) {
				new Notice(t("notice.noImages"));
			}
			return;
		}

		this.scanning = true;
		this.settingTab?.setScanStatus(t("settings.scan.progress", { done: 0, total: all.length }));
		try {
			// 与现有索引合并：另一个播放列表的文件夹不在 `all` 里，直接替换会把它的记录弄丢
			const measured = await measureImages(all, this.sizeIndex, (done, total) => {
				this.settingTab?.setScanStatus(t("settings.scan.progress", { done, total }));
			});
			this.sizeIndex = { ...this.sizeIndex, ...measured };
			if (this.indexPath) {
				await saveImageIndex(this.indexPath, this.sizeIndex);
			}
		} finally {
			this.scanning = false;
		}

		// 尺寸变了：筛选结果与「这张图算不算纵向图」都要重算
		this.invalidateFolderScan();
		await this.applyRuntimeState();
		this.settingTab?.refreshInfo();
		if (!silent) {
			new Notice(t("notice.scanDone", { count: all.length }));
		}
	}

	/**
	 * 开启「按长宽比筛选」后，若当前列表还有图没量过尺寸，自动补扫一次。
	 * 不这么做的话筛选结果会只剩上次扫描看过的那几张，看起来像「图丢了」。
	 *
	 * 同一份文件列表只自动补扫一次：读不出尺寸的文件永远「没量过」，
	 * 没有这道闸门的话每次应用运行时都会再触发一次扫描。
	 */
	private maybeAutoScan(): void {
		if (!this.settings.filterByAspect || this.scanning) {
			return;
		}
		const cache = this.folderCaches[this.settings.activePlaylist];
		if (!cache.files || cache.all.length === 0) {
			return;
		}
		const missing = cache.all.some((file) => !this.sizeIndex[file]);
		if (!missing || this.autoScannedKey === cache.key) {
			return;
		}
		this.autoScannedKey = cache.key;
		void this.startScan(true);
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
		// 「与主题配合」的覆盖同样受总开关约束：停用背景 = 退出插件的全部影响
		this.applyThemeTransparency();

		if (!this.layer) {
			return;
		}

		if (!this.settings.enabled) {
			this.layer.hide();
			this.stopAutoTask();
			return;
		}

		// 恢复上次的图：仅当该图仍属于当前列表的扫描结果时恢复，
		// 否则（路径已更换 / 文件被移除 / 被筛选掉）从文件夹随机选一张。
		// 开启「启动时随机更换」时跳过恢复，直接随机一张。
		const id = this.settings.activePlaylist;
		const current = this.settings.playlists[id].currentImagePath;
		const files = this.scanFolder(id);
		const currentValid =
			!this.settings.randomizeOnStart &&
			Boolean(current && files.includes(current) && this.hasImage(current));
		if (currentValid && current) {
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
		this.maybeAutoScan();
	}

	/** 随机换一张：按当前列表的不重复播放序列取图，一轮内不会重复。 */
	async randomizeBackground(): Promise<void> {
		const id = this.settings.activePlaylist;
		const files = this.scanFolder(id);
		if (files.length === 0) {
			new Notice(t("notice.noImages"));
			return;
		}
		const next = this.playlists[id].next(
			files,
			this.folderCaches[id].key,
			this.settings.playlists[id].currentImagePath || undefined
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
		let loaded: { url: string; size: ImageSize | null };
		try {
			loaded = await createImageObjectUrl(filePath);
		} catch (error) {
			console.error("[BackgroundCover] Failed to apply image:", error);
			new Notice(t("notice.loadFailed", { message: (error as Error).message }));
			return false;
		}
		// 读取期间又有新的切换请求，本请求已过期：丢弃并释放这一张的内存
		if (seq !== this.switchSeq) {
			URL.revokeObjectURL(loaded.url);
			return false;
		}
		// 尺寸是顺手从已读入的数据里解析的：记进索引，下次扫描就不必再读这个文件
		if (loaded.size) {
			this.sizeIndex[filePath] = { ...loaded.size, mtimeMs: 0, size: 0 };
		}
		const portrait = isPortrait(loaded.size ?? undefined, this.settings.aspectThreshold);
		if (!this.layer.setImage(loaded.url, filePath, portrait)) {
			// setImage 未能应用时已自行释放该 URL
			return false;
		}
		// 与设置里的「启用背景」保持一致：停用期间换图只更新内容，不显示
		if (this.settings.enabled) {
			this.layer.show();
		} else {
			this.layer.hide();
		}
		this.settings.playlists[this.settings.activePlaylist].currentImagePath = filePath;
		await this.saveSettings();
		// 设置页若开着，「当前」图片名需要立刻跟上实际显示的图
		this.settingTab?.refreshInfo();
		return true;
	}

	/** 设置页展示用：当前实际显示在背景层上的图（无则退回持久化的记录）。 */
	getCurrentDisplayPath(): string {
		return (
			this.layer?.getCurrentPath() ??
			this.settings.playlists[this.settings.activePlaylist].currentImagePath
		);
	}

	/** 外观参数（透明度/模糊/尺寸/混合/过渡/纵向位置）变化时即时生效。 */
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
	 *
	 * 总开关关闭时一律不加这些类：否则「停用背景」后主题透明仍然生效，
	 * 界面看起来还是被改过（旧版本的 bug）。
	 */
	applyThemeTransparency(): void {
		const on = this.settings.enabled && this.settings.transparentTheme;
		document.body.toggleClass(THEME_TRANSPARENT_CLASS, on);
		document.body.toggleClass(DIVIDER_TITLEBAR_CLASS, on && this.settings.titlebarDivider);
		document.body.toggleClass(DIVIDER_SIDEBAR_CLASS, on && this.settings.sidebarDivider);
		document.body.setCssProps({
			"--bgc-separator": toRgbaColor(
				this.settings.separatorColor,
				this.settings.separatorOpacity
			),
		});
	}

	/**
	 * 复制「当前显示的那张图」的文件名到剪贴板（设置页「复制文件名」按钮）。
	 *
	 * 只复制文件名、不复制完整路径：文件名足够让用户在图库文件夹里找到同一张图，
	 * 而完整路径属于本机信息——随手截图或贴给别人时会顺带泄露目录结构。
	 */
	async copyCurrentImageName(): Promise<void> {
		const current = this.layer?.getCurrentPath();
		if (!current) {
			new Notice(t("notice.noCurrentImage"));
			return;
		}
		const name = fileNameOf(current);
		try {
			await navigator.clipboard.writeText(name);
			new Notice(t("notice.copiedName", { name }));
		} catch (error) {
			console.error("[BackgroundCover] Clipboard unavailable:", error);
			new Notice(t("notice.copyFailed"));
		}
	}

	/** 启用/停用切换命令。 */
	async toggleEnabled(): Promise<void> {
		this.settings.enabled = !this.settings.enabled;
		await this.saveSettings();
		await this.applyRuntimeState();
	}

	/** 切换（设置当前）播放列表：两个列表各自恢复自己上次显示的那张图。 */
	async setActivePlaylist(id: PlaylistId): Promise<void> {
		if (this.settings.activePlaylist === id) {
			return;
		}
		this.settings.activePlaylist = id;
		await this.saveSettings();
		await this.applyRuntimeState();
		this.settingTab?.refreshInfo();
		new Notice(
			t("notice.playlistSwitched", {
				name: t(id === "b" ? "settings.playlist.b" : "settings.playlist.a"),
			})
		);
	}

	/** 在 A / B 之间来回切换的命令入口。 */
	async switchPlaylist(): Promise<void> {
		await this.setActivePlaylist(this.settings.activePlaylist === "a" ? "b" : "a");
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
