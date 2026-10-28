/**
 * 插件设置：接口、默认值与设置页。
 *
 * 设置项与 vscode-background-cover 的 backgroundCover.* 配置对齐：
 * - playlists：两个互相独立的播放列表，各有自己的文件夹与「当前这张图」
 * - opacity / blur / sizeModel / blendMode / transitionEnabled：外观
 * - portraitPositionY：纵向图的垂直取景位置（横向图不位移）
 * - filterByAspect / aspectThreshold：按宽高比筛选
 * - autoStatus / autoIntervalSeconds：固定间隔自动轮播
 * - randomizeOnStart：启动时随机换一张，而不是恢复上次那张
 *
 * 两个播放列表的意义：用户有两套不同用途的图库（例如「工作时用的清淡壁纸」和
 * 「演示用的重色壁纸」），用命令面板一条命令就能整体切换，而不是每次改路径。
 * 因此文件夹、不重复播放序列、当前图片三者都按列表各存一份。
 */
import { App, DropdownComponent, PluginSettingTab, Setting } from "obsidian";

import { isDirectory } from "./folder";
import { blendModeOptions, sizeModelOptions, t } from "./i18n";
import type BackgroundCoverPlugin from "./main";

/** 播放列表标识。用 a / b 而不是 1 / 2，方便以后加第三个而不破坏存档。 */
export type PlaylistId = "a" | "b";

export const PLAYLIST_IDS: PlaylistId[] = ["a", "b"];

/** 一个播放列表的设置。 */
export interface PlaylistSettings {
	/** 图片文件夹路径（支持绝对路径 / ~ / 环境变量，可位于仓库外）。 */
	folder: string;
	/** 该列表当前应用的图片绝对路径（切换列表或重启后用于恢复）。 */
	currentImagePath: string;
}

export interface BgcSettings {
	enabled: boolean;
	/** 当前生效的播放列表。 */
	activePlaylist: PlaylistId;
	/** 两个播放列表各自的文件夹与当前图片。 */
	playlists: Record<PlaylistId, PlaylistSettings>;
	/** 背景不透明度 0–0.8。 */
	opacity: number;
	/** 背景模糊像素 0–100。 */
	blur: number;
	/** 尺寸适应模式（与 vscode-background-cover 一致）。 */
	sizeModel: string;
	/** 混合模式：auto / multiply / lighten。 */
	blendMode: string;
	/** 是否启用淡入淡出过渡。 */
	transitionEnabled: boolean;
	/**
	 * 纵向图的垂直取景位置：0 = 图片顶部，50 = 中间，100 = 底部。
	 * 只对宽高比低于 aspectThreshold 的图、且只在 cover 尺寸模式下生效；
	 * 横向图按 cover 已经能完整铺满横屏，不做任何位移。
	 */
	portraitPositionY: number;
	/** 是否只用宽高比不小于阈值的图片。 */
	filterByAspect: boolean;
	/**
	 * 宽高比阈值（宽 ÷ 高）。同时承担两个用途：
	 * - 开启 filterByAspect 时作为筛选下限（例如 1.3 ≈ 4:3 及更宽的横向图）；
	 * - 没有开启筛选时，作为「这张图算不算纵向图」的分界，决定要不要套用垂直取景位置。
	 */
	aspectThreshold: number;
	/** 是否启用自动轮播。 */
	autoStatus: boolean;
	/** 自动轮播间隔（秒）。 */
	autoIntervalSeconds: number;
	/** 启动时是否随机换一张（关闭则恢复上次退出时的那张）。 */
	randomizeOnStart: boolean;
	/**
	 * 是否让主题背景透明（把工作区/侧边栏的不透明背景色改成透明，并把壁纸沉到界面之下）。
	 * 这是本插件唯一会覆盖主题背景变量的功能，默认关闭。
	 */
	transparentTheme: boolean;
	/** 是否在标题栏与工作区之间画一条分隔细线。 */
	titlebarDivider: boolean;
	/** 是否恢复侧边栏与工作区之间的分隔细线。 */
	sidebarDivider: boolean;
	/** 分隔线颜色（`#rrggbb`，颜色选择器只有 RGB，浓度见 separatorOpacity）。 */
	separatorColor: string;
	/** 分隔线浓度 0–1。 */
	separatorOpacity: number;
}

export const DEFAULT_SETTINGS: BgcSettings = {
	enabled: true,
	activePlaylist: "a",
	playlists: {
		a: { folder: "", currentImagePath: "" },
		b: { folder: "", currentImagePath: "" },
	},
	opacity: 0.2,
	blur: 0,
	sizeModel: "cover",
	blendMode: "auto",
	transitionEnabled: true,
	portraitPositionY: 50,
	filterByAspect: false,
	// 1.3 ≈ 4:3：低于它的图在横屏显示器上按 cover 铺满会被裁掉相当一部分
	aspectThreshold: 1.3,
	autoStatus: false,
	autoIntervalSeconds: 60,
	randomizeOnStart: false,
	transparentTheme: false,
	titlebarDivider: true,
	sidebarDivider: true,
	// 中性灰：深浅主题下都看得见，不必因主题明暗各配一次
	separatorColor: "#808080",
	separatorOpacity: 0.45,
};

export class BackgroundCoverSettingTab extends PluginSettingTab {
	plugin: BackgroundCoverPlugin;
	/** 每个播放列表下方的文件夹信息文本。 */
	private readonly infoEls: Partial<Record<PlaylistId, HTMLElement>> = {};
	private scanStatusEl: HTMLElement | null = null;
	/** 「当前播放列表」下拉框：切换播放列表的命令执行后要同步它的显示值。 */
	private activeDropdown: DropdownComponent | null = null;

	constructor(app: App, plugin: BackgroundCoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t("settings.enable.name"))
			.setDesc(t("settings.enable.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					await this.plugin.applyRuntimeState();
				})
			);

		// ---- 播放列表 ----
		new Setting(containerEl).setName(t("settings.playlist.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.activePlaylist.name"))
			.setDesc(t("settings.activePlaylist.desc"))
			.addDropdown((dropdown) => {
				for (const id of PLAYLIST_IDS) {
					dropdown.addOption(id, this.playlistName(id));
				}
				dropdown.setValue(this.plugin.settings.activePlaylist).onChange(async (value) => {
					await this.plugin.setActivePlaylist(value === "b" ? "b" : "a");
				});
				this.activeDropdown = dropdown;
			});

		for (const id of PLAYLIST_IDS) {
			new Setting(containerEl)
				.setName(t("settings.folder.name", { playlist: this.playlistName(id) }))
				.setDesc(t("settings.folder.desc"))
				.addText((text) =>
					text
						.setPlaceholder(t("settings.folder.placeholder"))
						.setValue(this.plugin.settings.playlists[id].folder)
						.onChange(async (value) => {
							this.plugin.settings.playlists[id].folder = value;
							await this.plugin.saveSettings();
							this.plugin.invalidateFolderScan(id);
							this.refreshInfo();
							// 只有正在使用的列表才需要立刻重画背景；
							// 编辑另一个列表的路径不应该打断当前显示
							if (this.plugin.settings.activePlaylist === id) {
								await this.plugin.applyRuntimeState();
							}
						})
				);
			this.infoEls[id] = containerEl.createDiv({ cls: "bgc-folder-info" });
		}

		new Setting(containerEl)
			.setName(t("settings.scan.name"))
			.setDesc(t("settings.scan.desc"))
			.addButton((button) =>
				button.setButtonText(t("settings.scan.button")).onClick(async () => {
					await this.plugin.startScan();
				})
			);
		this.scanStatusEl = containerEl.createDiv({ cls: "bgc-folder-info" });

		// ---- 长宽比 ----
		new Setting(containerEl).setName(t("settings.aspect.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.filterByAspect.name"))
			.setDesc(t("settings.filterByAspect.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.filterByAspect).onChange(async (value) => {
					this.plugin.settings.filterByAspect = value;
					await this.plugin.saveSettings();
					this.plugin.invalidateFolderScan();
					await this.plugin.applyRuntimeState();
					this.refreshInfo();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.aspectThreshold.name"))
			.setDesc(t("settings.aspectThreshold.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0.5, 3, 0.05)
					.setValue(this.plugin.settings.aspectThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.aspectThreshold = value;
						await this.plugin.saveSettings();
						// 阈值同时影响筛选结果与「算不算纵向图」，两条路径都要重算
						this.plugin.invalidateFolderScan();
						await this.plugin.applyRuntimeState();
						this.refreshInfo();
					})
			);

		// ---- 外观 ----
		new Setting(containerEl).setName(t("settings.appearance.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.opacity.name"))
			.setDesc(t("settings.opacity.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0, 0.8, 0.05)
					.setValue(this.plugin.settings.opacity)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.opacity = value;
						await this.plugin.saveSettings();
						this.plugin.applyAppearance();
					})
			);

		new Setting(containerEl)
			.setName(t("settings.blur.name"))
			.setDesc(t("settings.blur.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.blur)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.blur = value;
						await this.plugin.saveSettings();
						this.plugin.applyAppearance();
					})
			);

		new Setting(containerEl)
			.setName(t("settings.size.name"))
			.setDesc(t("settings.size.desc"))
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(sizeModelOptions())) {
					dropdown.addOption(value, label);
				}
				dropdown.setValue(this.plugin.settings.sizeModel).onChange(async (value) => {
					this.plugin.settings.sizeModel = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				});
			});

		new Setting(containerEl)
			.setName(t("settings.blend.name"))
			.setDesc(t("settings.blend.desc"))
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(blendModeOptions())) {
					dropdown.addOption(value, label);
				}
				dropdown.setValue(this.plugin.settings.blendMode).onChange(async (value) => {
					this.plugin.settings.blendMode = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				});
			});

		new Setting(containerEl)
			.setName(t("settings.transition.name"))
			.setDesc(t("settings.transition.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.transitionEnabled).onChange(async (value) => {
					this.plugin.settings.transitionEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.portraitPosition.name"))
			.setDesc(t("settings.portraitPosition.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.portraitPositionY)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.portraitPositionY = value;
						await this.plugin.saveSettings();
						this.plugin.applyAppearance();
					})
			);

		// ---- 与主题配合 ----
		new Setting(containerEl).setName(t("settings.theme.heading")).setHeading();

		const themeOn = this.plugin.settings.transparentTheme;

		// 下面几项都要先开启「让主题背景透明」才有可见效果。这里刻意不做「依赖式禁用」：
		// 禁用状态只在渲染时求值，而刷新设置页得重新调用 display()（obsidianmd 规则指出
		// 1.13+ 应改用 update()，但该方法尚未进入类型库），不重绘就会留下过时且误导的
		// 灰显状态，比不禁用更糟。因此改为在描述里写明依赖关系。

		new Setting(containerEl)
			.setName(t("settings.transparent.name"))
			.setDesc(t("settings.transparent.desc"))
			.addToggle((toggle) =>
				toggle.setValue(themeOn).onChange(async (value) => {
					this.plugin.settings.transparentTheme = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.titlebarDivider.name"))
			.setDesc(t("settings.titlebarDivider.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.titlebarDivider).onChange(async (value) => {
					this.plugin.settings.titlebarDivider = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.sidebarDivider.name"))
			.setDesc(t("settings.sidebarDivider.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.sidebarDivider).onChange(async (value) => {
					this.plugin.settings.sidebarDivider = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.separatorColor.name"))
			.setDesc(t("settings.separatorColor.desc"))
			.addColorPicker((picker) =>
				picker.setValue(this.plugin.settings.separatorColor).onChange(async (value) => {
					this.plugin.settings.separatorColor = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.separatorOpacity.name"))
			.setDesc(t("settings.separatorOpacity.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.05)
					.setValue(this.plugin.settings.separatorOpacity)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.separatorOpacity = value;
						await this.plugin.saveSettings();
						this.plugin.applyThemeTransparency();
					})
			);

		// ---- 自动轮播 ----
		new Setting(containerEl).setName(t("settings.auto.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.randomizeOnStart.name"))
			.setDesc(t("settings.randomizeOnStart.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.randomizeOnStart).onChange(async (value) => {
					this.plugin.settings.randomizeOnStart = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.autoStatus.name"))
			.setDesc(t("settings.autoStatus.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoStatus).onChange(async (value) => {
					this.plugin.settings.autoStatus = value;
					await this.plugin.saveSettings();
					this.plugin.restartAutoTask();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.interval.name"))
			.setDesc(t("settings.interval.desc"))
			.addText((text) =>
				text
					.setPlaceholder("60")
					.setValue(String(this.plugin.settings.autoIntervalSeconds))
					.onChange(async (value) => {
						const seconds = Math.max(5, parseInt(value, 10) || 60);
						this.plugin.settings.autoIntervalSeconds = seconds;
						text.setValue(String(seconds));
						await this.plugin.saveSettings();
						this.plugin.restartAutoTask();
					})
			);

		// ---- 操作 ----
		new Setting(containerEl).setName(t("settings.actions.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.shuffle.name"))
			.setDesc(t("settings.shuffle.desc"))
			.addButton((button) =>
				button.setButtonText(t("settings.shuffle.button")).onClick(async () => {
					await this.plugin.randomizeBackground();
					this.refreshInfo();
				})
			);

		new Setting(containerEl)
			.setName(t("settings.copyName.name"))
			.setDesc(t("settings.copyName.desc"))
			.addButton((button) =>
				button.setButtonText(t("settings.copyName.button")).onClick(async () => {
					await this.plugin.copyCurrentImageName();
				})
			);

		this.refreshInfo();
	}

	/** 播放列表的显示名（「播放列表 A」/「Playlist A」）。 */
	playlistName(id: PlaylistId): string {
		return id === "b" ? t("settings.playlist.b") : t("settings.playlist.a");
	}

	/** 刷新两个播放列表的文件夹信息与尺寸扫描状态（换图、换列表、扫描后调用）。 */
	refreshInfo(): void {
		for (const id of PLAYLIST_IDS) {
			this.refreshPlaylistInfo(id);
		}
		this.activeDropdown?.setValue(this.plugin.settings.activePlaylist);
		this.refreshScanStatus();
	}

	/** 扫描进度由插件在扫描过程中实时写入，不重建整个设置页。 */
	setScanStatus(text: string): void {
		this.scanStatusEl?.setText(text);
	}

	private refreshPlaylistInfo(id: PlaylistId): void {
		const el = this.infoEls[id];
		if (!el) {
			return;
		}
		const folder = this.plugin.settings.playlists[id].folder;
		if (!folder) {
			el.setText(t("settings.folderInfo.empty"));
			return;
		}
		if (!isDirectory(folder)) {
			el.setText(t("settings.folderInfo.invalid"));
			return;
		}
		const stats = this.plugin.getPlaylistStats(id);
		const filtered =
			stats.shown === stats.total
				? t("settings.folderInfo.count", { count: stats.total })
				: t("settings.folderInfo.filtered", { count: stats.shown, total: stats.total });
		let text = this.plugin.settings.activePlaylist === id ? t("settings.folderInfo.active") : "";
		text += filtered;
		if (this.plugin.settings.activePlaylist === id) {
			const currentPath = this.plugin.getCurrentDisplayPath();
			if (currentPath) {
				text += t("settings.folderInfo.current", { path: currentPath });
			}
		}
		el.setText(text);
	}

	private refreshScanStatus(): void {
		if (!this.scanStatusEl || this.plugin.isScanning) {
			return;
		}
		const summary = this.plugin.getScanSummary();
		if (summary.total === 0) {
			this.scanStatusEl.setText(t("settings.scan.noFolder"));
			return;
		}
		if (summary.measured === 0) {
			this.scanStatusEl.setText(t("settings.scan.idle"));
			return;
		}
		let text = t("settings.scan.summary", {
			measured: summary.measured,
			total: summary.total,
			landscape: summary.landscape,
			portrait: summary.portrait,
		});
		if (summary.unknown > 0) {
			text += t("settings.scan.unknown", { count: summary.unknown });
		}
		this.scanStatusEl.setText(text);
	}
}
