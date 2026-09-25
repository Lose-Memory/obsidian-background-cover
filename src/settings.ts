/**
 * 插件设置：接口、默认值与设置页。
 *
 * 设置项与 vscode-background-cover 的 backgroundCover.* 配置对齐：
 * - imageFolder：背景图片文件夹（支持绝对路径 / ~ / 环境变量，可位于仓库外）
 * - opacity / blur / sizeModel / blendMode / transitionEnabled：外观
 * - autoStatus / autoIntervalSeconds：固定间隔自动轮播
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

		// ---- 自动轮播 ----
		new Setting(containerEl).setName("自动轮播").setHeading();

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
