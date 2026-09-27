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

const SIZE_MODEL_OPTIONS: Record<string, string> = {
	cover: "cover（铺满，保持比例）",
	contain: "contain（完整显示）",
	center: "center（原尺寸居中）",
	repeat: "repeat（平铺）",
	not_center: "不居中",
	not_right_bottom: "右下角",
	not_right_top: "右上角",
	not_left: "靠左",
	not_right: "靠右",
	not_top: "靠上",
	not_bottom: "靠下",
};

const BLEND_MODEL_OPTIONS: Record<string, string> = {
	auto: "auto（随主题：浅色 multiply / 深色 lighten）",
	multiply: "multiply",
	lighten: "lighten",
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
			.setName("启用背景")
			.setDesc("开关背景图片显示。关闭时只停用背景层，不修改任何主题设置。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					await this.plugin.applyRuntimeState();
				})
			);

		// ---- 图片来源 ----
		new Setting(containerEl).setName("图片来源").setHeading();

		new Setting(containerEl)
			.setName("背景文件夹")
			.setDesc(
				"图片文件夹的绝对路径，支持 ~（用户目录）与环境变量；可位于 Obsidian 仓库之外，例如 d:\\wallpapers。"
			)
			.addText((text) =>
				text
					.setPlaceholder("例如 d:\\wallpapers")
					.setValue(this.plugin.settings.imageFolder)
					.onChange(async (value) => {
						this.plugin.settings.imageFolder = value;
						await this.plugin.saveSettings();
						this.refreshFolderInfo();
						await this.plugin.applyRuntimeState();
					})
			);

		new Setting(containerEl)
			.setName("图片数量")
			.setDesc("填写路径后自动扫描，只统计文件名，不会把图片读入内存。")
			.addButton((button) =>
				button.setButtonText("重新扫描").onClick(async () => {
					this.plugin.invalidateFolderScan();
					this.refreshFolderInfo();
					await this.plugin.applyRuntimeState();
				})
			);

		this.folderInfoEl = containerEl.createDiv({ cls: "bgc-folder-info" });
		this.refreshFolderInfo();

		// ---- 外观 ----
		new Setting(containerEl).setName("外观").setHeading();

		new Setting(containerEl)
			.setName("背景透明度")
			.setDesc("背景层不透明度，0 完全透明，0.8 为上限（与 vscode-background-cover 一致）。")
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
			.setName("背景模糊")
			.setDesc("背景模糊程度，单位像素，0 关闭。")
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
			.setName("尺寸模式")
			.setDesc("背景图片的尺寸适应方式。")
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(SIZE_MODEL_OPTIONS)) {
					dropdown.addOption(value, label);
				}
				dropdown.setValue(this.plugin.settings.sizeModel).onChange(async (value) => {
					this.plugin.settings.sizeModel = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				});
			});

		new Setting(containerEl)
			.setName("混合模式")
			.setDesc(
				"Auto 模式随深浅主题自动切换混合方式，图片与界面内容融合；multiply / lighten 固定模式。"
			)
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(BLEND_MODEL_OPTIONS)) {
					dropdown.addOption(value, label);
				}
				dropdown.setValue(this.plugin.settings.blendMode).onChange(async (value) => {
					this.plugin.settings.blendMode = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				});
			});

		new Setting(containerEl)
			.setName("淡入淡出过渡")
			.setDesc("换图时平滑过渡，尊重系统的“减少动态效果”设置。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.transitionEnabled).onChange(async (value) => {
					this.plugin.settings.transitionEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.applyAppearance();
				})
			);

		// ---- 与主题配合 ----
		new Setting(containerEl).setName("与主题配合").setHeading();

		const themeOn = this.plugin.settings.transparentTheme;

		// 下面几项都要先开启「让主题背景透明」才有可见效果。这里刻意不做「依赖式禁用」：
		// 禁用状态只在渲染时求值，而刷新设置页得重新调用 display()（obsidianmd 规则指出
		// 1.13+ 应改用 update()，但该方法尚未进入类型库），不重绘就会留下过时且误导的
		// 灰显状态，比不禁用更糟。因此改为在描述里写明依赖关系。

		new Setting(containerEl)
			.setName("让主题背景透明")
			.setDesc(
				"把工作区、侧边栏的不透明背景色改为透明，避免它们把壁纸往主题配色上拉（壁纸发灰、发紫、暗部被提亮）。这是本插件唯一会覆盖主题背景颜色的功能，默认关闭；开启后背景会变成纯黑（深色主题）或纯白（浅色主题），菜单与提示不受影响。"
			)
			.addToggle((toggle) =>
				toggle.setValue(themeOn).onChange(async (value) => {
					this.plugin.settings.transparentTheme = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName("标题栏分隔线")
			.setDesc("在标题栏与下方工作区之间画一条细线（主题常把 Obsidian 的分隔线设成透明）。需先开启「让主题背景透明」。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.titlebarDivider).onChange(async (value) => {
					this.plugin.settings.titlebarDivider = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName("侧边栏分隔线")
			.setDesc("恢复左右侧边栏与中间工作区之间的细线。需先开启「让主题背景透明」。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.sidebarDivider).onChange(async (value) => {
					this.plugin.settings.sidebarDivider = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName("分隔线颜色")
			.setDesc("上面两条细线的颜色。默认中性灰，深浅主题下都看得见。需先开启「让主题背景透明」。")
			.addColorPicker((picker) =>
				picker.setValue(this.plugin.settings.separatorColor).onChange(async (value) => {
					this.plugin.settings.separatorColor = value;
					await this.plugin.saveSettings();
					this.plugin.applyThemeTransparency();
				})
			);

		new Setting(containerEl)
			.setName("分隔线浓度")
			.setDesc("细线的不透明度，0 完全透明（等于不画），1 完全不透明。需先开启「让主题背景透明」。")
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
		new Setting(containerEl).setName("自动轮播").setHeading();

		new Setting(containerEl)
			.setName("启动时随机更换")
			.setDesc("开启后每次启动 Obsidian 都随机换一张；关闭则恢复上次退出时的那张。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.randomizeOnStart).onChange(async (value) => {
					this.plugin.settings.randomizeOnStart = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("启用自动轮播")
			.setDesc("按固定间隔从文件夹中随机换一张背景。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoStatus).onChange(async (value) => {
					this.plugin.settings.autoStatus = value;
					await this.plugin.saveSettings();
					this.plugin.restartAutoTask();
				})
			);

		new Setting(containerEl)
			.setName("轮播间隔（秒）")
			.setDesc("自动换图间隔，单位秒，最小 5 秒。")
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
		new Setting(containerEl).setName("操作").setHeading();

		new Setting(containerEl)
			.setName("随机换一张")
			.setDesc("立即从文件夹中随机选一张图片应用。")
			.addButton((button) =>
				button.setButtonText("随机换一张").onClick(async () => {
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
			this.folderInfoEl.setText("未填写文件夹路径。");
			return;
		}
		if (!isDirectory(folder)) {
			this.folderInfoEl.setText("路径无效或不是文件夹，请检查（支持绝对路径 / ~ / 环境变量）。");
			return;
		}
		const files = plugin.scanFolder();
		const current = plugin.getCurrentDisplayPath()
			? `；当前：${plugin.getCurrentDisplayPath()}`
			: "";
		this.folderInfoEl.setText(`共 ${files.length} 张图片（仅文件名列表，不占内存）${current}`);
	}
}
