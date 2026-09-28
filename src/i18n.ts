/**
 * 界面文案字典与语言选择。
 *
 * 插件上架 Obsidian 社区目录面向的是国际用户，但作者日常使用中文界面，
 * 因此这里按 Obsidian 自身配置的语言（`getLanguage()`）二选一：
 * 中文环境显示中文，其余语言一律回退英文。
 *
 * 约定：
 * - 英文是默认与回退语言，新增文案先写 `EN`；`ZH` 用 `Record<BgcKey, string>`
 *   声明，漏写任何一条 key 都会编译失败，不会出现「某个键忘了翻译」的静默回退。
 * - `diagnostics.ts` 里的诊断报告**刻意不走这里**：它是贴到 issue 里给别人看的，
 *   固定英文更通用（见该文件头部注释）。
 */
import { getLanguage } from "obsidian";

/** 界面语言。 */
export type BgcLocale = "en" | "zh";

const EN = {
	// ---- 命令与通知 ----
	"cmd.random": "Change background",
	"cmd.toggle": "Toggle background",
	"cmd.diagnostics": "Copy diagnostics",
	"notice.noImages": "The background folder is empty or the path is invalid.",
	"notice.loadFailed": "Failed to load the background image: {message}",
	"notice.copied": "Diagnostics copied to the clipboard.",
	"notice.copyFailed": "Copy failed. See the developer console for the full report.",

	// ---- 设置：总开关 ----
	"settings.enable.name": "Enable background",
	"settings.enable.desc":
		"Show or hide the background image. Turning this off only hides the background layer; no theme setting is changed.",

	// ---- 设置：图片来源 ----
	"settings.source.heading": "Image source",
	"settings.folder.name": "Background folder",
	"settings.folder.desc":
		"Absolute path of an image folder. Supports ~ (home directory) and environment variables, and may point outside your vault, for example d:\\wallpapers.",
	"settings.folder.placeholder": "For example d:\\wallpapers",
	"settings.count.name": "Image count",
	"settings.count.desc":
		"The folder is scanned after you enter a path. Only file names are counted; images are never loaded into memory.",
	"settings.rescan": "Rescan",
	"settings.folderInfo.empty": "No folder path set.",
	"settings.folderInfo.invalid":
		"The path is invalid or is not a folder. Supported: absolute paths, ~, and environment variables.",
	"settings.folderInfo.count": "{count} images (file names only, no memory cost)",
	"settings.folderInfo.current": "; showing {path}",

	// ---- 设置：外观 ----
	"settings.appearance.heading": "Appearance",
	"settings.opacity.name": "Background opacity",
	"settings.opacity.desc":
		"Opacity of the background layer. 0 is fully transparent, 0.8 is the maximum.",
	"settings.blur.name": "Background blur",
	"settings.blur.desc": "Blur radius of the background, in pixels. 0 disables blur.",
	"settings.size.name": "Size mode",
	"settings.size.desc": "How the background image is scaled and positioned.",
	"settings.blend.name": "Blend mode",
	"settings.blend.desc":
		"auto follows the theme: multiply on light themes, lighten on dark themes. multiply and lighten are fixed.",
	"settings.transition.name": "Fade transition",
	"settings.transition.desc":
		"Crossfade smoothly when the image changes. Respects the system reduce motion setting.",

	// ---- 设置：与主题配合 ----
	"settings.theme.heading": "Theme integration",
	"settings.transparent.name": "Make theme background transparent",
	"settings.transparent.desc":
		"Make the opaque background colors of the workspace and sidebars transparent, so they stop tinting the wallpaper (graying it out, shifting it toward the theme palette, or lifting its shadows). This is the only feature that overrides theme colors, and it is off by default. When on, the workspace base color becomes pure black (dark themes) or pure white (light themes); menus and notices are unaffected.",
	"settings.titlebarDivider.name": "Title bar divider",
	"settings.titlebarDivider.desc":
		"Draw a thin line between the title bar and the workspace below it. Themes often set Obsidian's divider color to transparent. Requires make theme background transparent.",
	"settings.sidebarDivider.name": "Sidebar divider",
	"settings.sidebarDivider.desc":
		"Restore the thin line between the left and right sidebars and the workspace. Requires make theme background transparent.",
	"settings.separatorColor.name": "Divider color",
	"settings.separatorColor.desc":
		"Color of both divider lines above. The default neutral gray stays visible on light and dark themes. Requires make theme background transparent.",
	"settings.separatorOpacity.name": "Divider opacity",
	"settings.separatorOpacity.desc":
		"Opacity of the divider lines. 0 is invisible, 1 is fully opaque. Requires make theme background transparent.",

	// ---- 设置：自动轮播 ----
	"settings.auto.heading": "Auto rotation",
	"settings.randomizeOnStart.name": "Change image on startup",
	"settings.randomizeOnStart.desc":
		"Pick a random image every time Obsidian starts. When off, the image shown when you last quit is restored.",
	"settings.autoStatus.name": "Enable auto rotation",
	"settings.autoStatus.desc": "Change the background at a fixed interval.",
	"settings.interval.name": "Rotation interval (seconds)",
	"settings.interval.desc": "Seconds between automatic changes. The minimum is 5 seconds.",

	// ---- 设置：操作 ----
	"settings.actions.heading": "Actions",
	"settings.shuffle.name": "Change background now",
	"settings.shuffle.desc": "Take the next image from the folder and apply it immediately.",
	"settings.shuffle.button": "Change now",

	// ---- 尺寸模式选项 ----
	"size.cover": "cover (fill, keeps aspect ratio)",
	"size.contain": "contain (stretch to fill, distorts)",
	"size.center": "center (scale to fit, centered)",
	"size.repeat": "repeat (tile)",
	"size.not_center": "not_center (natural size, centered)",
	"size.not_right_bottom": "not_right_bottom (natural size, bottom right)",
	"size.not_right_top": "not_right_top (natural size, top right)",
	"size.not_left": "not_left (natural size, left)",
	"size.not_right": "not_right (natural size, right)",
	"size.not_top": "not_top (natural size, top)",
	"size.not_bottom": "not_bottom (natural size, bottom)",

	// ---- 混合模式选项 ----
	"blend.auto": "auto (follows the theme)",
	"blend.multiply": "multiply",
	"blend.lighten": "lighten",
} as const;

/** 文案键。 */
export type BgcKey = keyof typeof EN;

const ZH: Record<BgcKey, string> = {
	// ---- 命令与通知 ----
	"cmd.random": "更换背景",
	"cmd.toggle": "启用或停用背景",
	"cmd.diagnostics": "复制诊断信息",
	"notice.noImages": "背景文件夹为空或路径无效。",
	"notice.loadFailed": "背景加载失败：{message}",
	"notice.copied": "诊断信息已复制到剪贴板。",
	"notice.copyFailed": "复制失败，请从开发者控制台查看完整报告。",

	// ---- 设置：总开关 ----
	"settings.enable.name": "启用背景",
	"settings.enable.desc": "开关背景图片显示。关闭时只停用背景层，不修改任何主题设置。",

	// ---- 设置：图片来源 ----
	"settings.source.heading": "图片来源",
	"settings.folder.name": "背景文件夹",
	"settings.folder.desc":
		"图片文件夹的绝对路径，支持 ~（用户目录）与环境变量；可位于 Obsidian 仓库之外，例如 d:\\wallpapers。",
	"settings.folder.placeholder": "例如 d:\\wallpapers",
	"settings.count.name": "图片数量",
	"settings.count.desc": "填写路径后自动扫描，只统计文件名，不会把图片读入内存。",
	"settings.rescan": "重新扫描",
	"settings.folderInfo.empty": "未填写文件夹路径。",
	"settings.folderInfo.invalid": "路径无效或不是文件夹，请检查（支持绝对路径 / ~ / 环境变量）。",
	"settings.folderInfo.count": "共 {count} 张图片（仅文件名列表，不占内存）",
	"settings.folderInfo.current": "；当前：{path}",

	// ---- 设置：外观 ----
	"settings.appearance.heading": "外观",
	"settings.opacity.name": "背景透明度",
	"settings.opacity.desc": "背景层不透明度，0 完全透明，0.8 为上限。",
	"settings.blur.name": "背景模糊",
	"settings.blur.desc": "背景模糊程度，单位像素，0 关闭。",
	"settings.size.name": "尺寸模式",
	"settings.size.desc": "背景图片的缩放与定位方式。",
	"settings.blend.name": "混合模式",
	"settings.blend.desc":
		"auto 随深浅主题自动切换混合方式，图片与界面内容融合；multiply / lighten 为固定模式。",
	"settings.transition.name": "淡入淡出过渡",
	"settings.transition.desc": "换图时平滑过渡，尊重系统的「减少动态效果」设置。",

	// ---- 设置：与主题配合 ----
	"settings.theme.heading": "与主题配合",
	"settings.transparent.name": "让主题背景透明",
	"settings.transparent.desc":
		"把工作区、侧边栏的不透明背景色改为透明，避免它们把壁纸往主题配色上拉（壁纸发灰、发紫、暗部被提亮）。这是本插件唯一会覆盖主题背景颜色的功能，默认关闭；开启后工作区底色会变成纯黑（深色主题）或纯白（浅色主题），菜单与提示不受影响。",
	"settings.titlebarDivider.name": "标题栏分隔线",
	"settings.titlebarDivider.desc":
		"在标题栏与下方工作区之间画一条细线（主题常把 Obsidian 的分隔线设成透明）。需先开启「让主题背景透明」。",
	"settings.sidebarDivider.name": "侧边栏分隔线",
	"settings.sidebarDivider.desc": "恢复左右侧边栏与中间工作区之间的细线。需先开启「让主题背景透明」。",
	"settings.separatorColor.name": "分隔线颜色",
	"settings.separatorColor.desc":
		"上面两条细线的颜色。默认中性灰，深浅主题下都看得见。需先开启「让主题背景透明」。",
	"settings.separatorOpacity.name": "分隔线浓度",
	"settings.separatorOpacity.desc":
		"细线的不透明度，0 完全透明（等于不画），1 完全不透明。需先开启「让主题背景透明」。",

	// ---- 设置：自动轮播 ----
	"settings.auto.heading": "自动轮播",
	"settings.randomizeOnStart.name": "启动时随机更换",
	"settings.randomizeOnStart.desc":
		"开启后每次启动 Obsidian 都随机换一张；关闭则恢复上次退出时的那张。",
	"settings.autoStatus.name": "启用自动轮播",
	"settings.autoStatus.desc": "按固定间隔从文件夹中随机换一张背景。",
	"settings.interval.name": "轮播间隔（秒）",
	"settings.interval.desc": "自动换图间隔，单位秒，最小 5 秒。",

	// ---- 设置：操作 ----
	"settings.actions.heading": "操作",
	"settings.shuffle.name": "随机换一张",
	"settings.shuffle.desc": "立即从文件夹中取下一张图片并应用。",
	"settings.shuffle.button": "随机换一张",

	// ---- 尺寸模式选项 ----
	"size.cover": "cover（铺满，保持比例）",
	"size.contain": "contain（拉伸铺满，比例会变形）",
	"size.center": "center（缩放至完整显示，居中）",
	"size.repeat": "repeat（平铺）",
	"size.not_center": "not_center（原始尺寸，居中）",
	"size.not_right_bottom": "not_right_bottom（原始尺寸，右下角）",
	"size.not_right_top": "not_right_top（原始尺寸，右上角）",
	"size.not_left": "not_left（原始尺寸，靠左）",
	"size.not_right": "not_right（原始尺寸，靠右）",
	"size.not_top": "not_top（原始尺寸，靠上）",
	"size.not_bottom": "not_bottom（原始尺寸，靠下）",

	// ---- 混合模式选项 ----
	"blend.auto": "auto（随主题）",
	"blend.multiply": "multiply",
	"blend.lighten": "lighten",
};

let cached: BgcLocale | null = null;

/** 当前界面语言：中文环境返回 zh，其余一律 en。 */
export function getLocale(): BgcLocale {
	if (cached === null) {
		cached = getLanguage().toLowerCase().startsWith("zh") ? "zh" : "en";
	}
	return cached;
}

/**
 * 取一条界面文案，`{name}` 形式的占位符用 `vars` 替换。
 * 语言只在首次调用时求值（Obsidian 切换语言需重启应用，届时模块会重新加载）。
 */
export function t(key: BgcKey, vars?: Record<string, string | number>): string {
	const template = getLocale() === "zh" ? ZH[key] : EN[key];
	if (!vars) {
		return template;
	}
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in vars ? String(vars[name]) : match
	);
}

/** 尺寸模式下拉项：取值 → 当前语言的标签。 */
export function sizeModelOptions(): Record<string, string> {
	return {
		cover: t("size.cover"),
		contain: t("size.contain"),
		center: t("size.center"),
		repeat: t("size.repeat"),
		not_center: t("size.not_center"),
		not_right_bottom: t("size.not_right_bottom"),
		not_right_top: t("size.not_right_top"),
		not_left: t("size.not_left"),
		not_right: t("size.not_right"),
		not_top: t("size.not_top"),
		not_bottom: t("size.not_bottom"),
	};
}

/** 混合模式下拉项：取值 → 当前语言的标签。 */
export function blendModeOptions(): Record<string, string> {
	return {
		auto: t("blend.auto"),
		multiply: t("blend.multiply"),
		lighten: t("blend.lighten"),
	};
}
