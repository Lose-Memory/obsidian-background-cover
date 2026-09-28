/**
 * 插件设置：接口、默认值与设置页。
 *
 * 设置项与 vscode-background-cover 的 backgroundCover.* 配置对齐：
 * - imageFolder：背景图片文件夹（支持绝对路径 / ~ / 环境变量，可位于仓库外）
 * - opacity / blur / sizeModel / blendMode / transitionEnabled：外观
 * - autoStatus / autoIntervalSeconds：固定间隔自动轮播
 * - randomizeOnStart：启动时随机换一张，而不是恢复上次那张
 * - currentImagePath：最近一次应用的单张图片（重启后恢复）
 */
import { App, PluginSettingTab, Setting } from "obsidian";

import type BackgroundCoverPlugin from "./main";
import { isDirectory } from "./folder";
import { blendModeOptions, sizeModelOptions, t } from "./i18n";

export interface BgcSettings {
	enabled: boolean;
	/** 背景图片文件夹路径。 */
	imageFolder: string;
	/** 当前应用的图片绝对路径（用于重启后恢复）。 */
	currentImagePath: string;
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
	/** 是否启用自动轮播。 */
	autoStatus: boolean;
	/** 自动轮播间隔（秒）。 */
	autoIntervalSeconds: number;
	/** 启动时是否随机换一张（关闭则恢复上次退出时的那张）。 */
	randomizeOnStart: boolean;
	/**
	 * 是否让主题背景透明（把工作区/侧边栏的不透明背景色改成透明）。
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
	imageFolder: "",
	currentImagePath: "",
	opacity: 0.2,
	blur: 0,
	sizeModel: "cover",
	blendMode: "auto",
	transitionEnabled: true,
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
	private folderInfoEl: HTMLElement | null = null;

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

		// ---- 图片来源 ----
		new Setting(containerEl).setName(t("settings.source.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("settings.folder.name"))
			.setDesc(t("settings.folder.desc"))
			.addText((text) =>
				text
					.setPlaceholder(t("settings.folder.placeholder"))
					.setValue(this.plugin.settings.imageFolder)
					.onChange(async (value) => {
						this.plugin.settings.imageFolder = value;
						await this.plugin.saveSettings();
						this.refreshFolderInfo();
						await this.plugin.applyRuntimeState();
					})
			);

		new Setting(containerEl)
			.setName(t("settings.count.name"))
			.setDesc(t("settings.count.desc"))
			.addButton((button) =>
				button.setButtonText(t("settings.rescan")).onClick(async () => {
					this.plugin.invalidateFolderScan();
					this.refreshFolderInfo();
					await this.plugin.applyRuntimeState();
				})
			);

		this.folderInfoEl = containerEl.createDiv({ cls: "bgc-folder-info" });
		this.refreshFolderInfo();

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
					this.refreshFolderInfo();
				})
			);
	}

	refreshFolderInfo(): void {
		if (!this.folderInfoEl) {
			return;
		}
		const plugin = this.plugin;
		const folder = plugin.settings.imageFolder;
		if (!folder) {
			this.folderInfoEl.setText(t("settings.folderInfo.empty"));
			return;
		}
		if (!isDirectory(folder)) {
			this.folderInfoEl.setText(t("settings.folderInfo.invalid"));
			return;
		}
		const files = plugin.scanFolder();
		const currentPath = plugin.getCurrentDisplayPath();
		const current = currentPath ? t("settings.folderInfo.current", { path: currentPath }) : "";
		this.folderInfoEl.setText(
			t("settings.folderInfo.count", { count: files.length }) + current
		);
	}
}
