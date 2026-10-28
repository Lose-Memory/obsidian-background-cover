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
 */
import { getLanguage } from "obsidian";

/** 界面语言。 */
export type BgcLocale = "en" | "zh";

const EN = {
	// ---- 命令与通知 ----
	"cmd.random": "Change background",
	"cmd.toggle": "Toggle background",
	"cmd.switchPlaylist": "Switch playlist",
	"notice.noImages": "The background folder is empty or the path is invalid.",
	"notice.loadFailed": "Failed to load the background image: {message}",
	"notice.copyFailed": "Copy failed. See the developer console for details.",
	"notice.copiedName": "Copied file name: {name}",
	"notice.noCurrentImage": "No background image is showing right now.",
	"notice.playlistSwitched": "Switched to {name}.",
	"notice.scanDone": "Measured {count} images.",

	// ---- 设置：总开关 ----
	"settings.enable.name": "Enable background",
	"settings.enable.desc":
		"Show or hide the background image. Turning this off removes everything the plugin adds, including the theme transparency and divider overrides; it does not change your theme setting.",

	// ---- 设置：播放列表 ----
	"settings.playlist.heading": "Playlists",
	"settings.playlist.a": "Playlist A",
	"settings.playlist.b": "Playlist B",
	"settings.activePlaylist.name": "Active playlist",
	"settings.activePlaylist.desc":
		"The playlist that the status bar button, the change background command and auto rotation take images from. Each playlist keeps its own folder, playback order and current image.",
	"settings.folder.name": "Folder ({playlist})",
	"settings.folder.desc":
		"Absolute path of an image folder. Supports ~ (home directory) and environment variables, and may point outside your vault, for example d:\\wallpapers.",
	"settings.folder.placeholder": "For example d:\\wallpapers",
	"settings.folderInfo.empty": "No folder path set.",
	"settings.folderInfo.invalid":
		"The path is invalid or is not a folder. Supported: absolute paths, ~, and environment variables.",
	"settings.folderInfo.active": "In use · ",
	"settings.folderInfo.count": "{count} images (file names only, no memory cost)",
	"settings.folderInfo.filtered": "{count} of {total} images (aspect ratio filter)",
	"settings.folderInfo.current": " · showing {path}",

	// ---- 设置：尺寸扫描（按宽高比筛选的前提） ----
	"settings.scan.name": "Image sizes",
	"settings.scan.desc":
		"Measure width, height and aspect ratio of every image in the active playlist's folder. Only the file header is read, images are never decoded, and the results are cached, so rescanning re-reads only new or changed files. Required before the aspect ratio filter can work.",
	"settings.scan.button": "Scan",
	"settings.scan.noFolder": "Set a folder path first.",
	"settings.scan.idle": "Not scanned yet. Scan to enable the aspect ratio filter.",
	"settings.scan.progress": "Scanning {done}/{total}…",
	"settings.scan.summary":
		"{measured} of {total} images measured: {landscape} landscape, {portrait} portrait.",
	"settings.scan.unknown": " {count} could not be measured.",

	// ---- 设置：长宽比 ----
	"settings.aspect.heading": "Aspect ratio",
	"settings.filterByAspect.name": "Only use images at or above the aspect ratio",
	"settings.filterByAspect.desc":
		"Width ÷ height. At 1.3 only landscape images (4:3 and wider) are used as backgrounds. Images whose size is not known yet are skipped, so run a scan first.",
	"settings.aspectThreshold.name": "Aspect ratio threshold",
	"settings.aspectThreshold.desc":
		"Width ÷ height, default 1.3 (about 4:3). Also decides which images count as portrait for the vertical position setting below.",

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
		"auto follows the theme: multiply on light themes, lighten on dark themes. multiply and lighten are fixed. Blending only applies while the wallpaper sits above the interface; with make theme background transparent on, the wallpaper is the background layer and has nothing left to blend with.",
	"settings.transition.name": "Fade transition",
	"settings.transition.desc":
		"Crossfade smoothly when the image changes. Respects the system reduce motion setting.",
	"settings.portraitPosition.name": "Portrait image vertical position",
	"settings.portraitPosition.desc":
		"0 shows the top of a portrait image, 100 the bottom, 50 the middle (default). Only applies to images below the aspect ratio threshold, and only in cover size mode; landscape images are never moved.",

	// ---- 设置：与主题配合 ----
	"settings.theme.heading": "Theme integration",
	"settings.transparent.name": "Make theme background transparent",
	"settings.transparent.desc":
		"Make the workspace and sidebar backgrounds transparent and drop the wallpaper below the interface, so the two stop blending into each other (bright interface elements no longer show through the image on dark themes, and the image is no longer veiled by the base color on light themes). This is the only feature that overrides theme colors, and it is off by default. When on, the workspace base color becomes pure black (dark themes) or pure white (light themes) and the opacity setting fades the image toward it; menus, notices and modals are unaffected. Turning off enable background also turns this off.",
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
	"settings.copyName.name": "Copy current file name",
	"settings.copyName.desc":
		"Put the file name (not the full path) of the image that is on screen right now on your clipboard.",
	"settings.copyName.button": "Copy file name",

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
	"cmd.switchPlaylist": "切换播放列表",
	"notice.noImages": "背景文件夹为空或路径无效。",
	"notice.loadFailed": "背景加载失败：{message}",
	"notice.copyFailed": "复制失败，请从开发者控制台查看详情。",
	"notice.copiedName": "已复制文件名：{name}",
	"notice.noCurrentImage": "当前没有显示中的背景图。",
	"notice.playlistSwitched": "已切换到{name}。",
	"notice.scanDone": "已扫描 {count} 张图片。",

	// ---- 设置：总开关 ----
	"settings.enable.name": "启用背景",
	"settings.enable.desc":
		"开关背景图片显示。关闭时会一并退出本插件带来的全部影响（包括主题透明化与分隔线覆盖），但不修改你的主题设置。",

	// ---- 设置：播放列表 ----
	"settings.playlist.heading": "播放列表",
	"settings.playlist.a": "播放列表 A",
	"settings.playlist.b": "播放列表 B",
	"settings.activePlaylist.name": "当前播放列表",
	"settings.activePlaylist.desc":
		"状态栏按钮、更换背景命令与自动轮播都从这个列表取图。两个列表各自保存文件夹、播放顺序和当前这张图。",
	"settings.folder.name": "文件夹（{playlist}）",
	"settings.folder.desc":
		"图片文件夹的绝对路径，支持 ~（用户目录）与环境变量；可位于仓库之外，例如 d:\\wallpapers。",
	"settings.folder.placeholder": "例如 d:\\wallpapers",
	"settings.folderInfo.empty": "未填写文件夹路径。",
	"settings.folderInfo.invalid": "路径无效或不是文件夹，请检查（支持绝对路径 / ~ / 环境变量）。",
	"settings.folderInfo.active": "使用中 · ",
	"settings.folderInfo.count": "共 {count} 张图片（仅文件名列表，不占内存）",
	"settings.folderInfo.filtered": "共 {total} 张，按长宽比筛后剩 {count} 张",
	"settings.folderInfo.current": " · 当前：{path}",

	// ---- 设置：尺寸扫描 ----
	"settings.scan.name": "图片尺寸",
	"settings.scan.desc":
		"统计当前播放列表文件夹中每张图的宽、高与长宽比。只读文件头、不解码整图，结果会缓存，重新扫描只读取新增或改动过的文件。按长宽比筛选前需要先扫描一次。",
	"settings.scan.button": "扫描",
	"settings.scan.noFolder": "请先填写文件夹路径。",
	"settings.scan.idle": "尚未扫描。扫描后才能使用按长宽比筛选。",
	"settings.scan.progress": "正在扫描 {done}/{total}…",
	"settings.scan.summary": "已统计 {measured}/{total} 张：横向 {landscape} 张，纵向 {portrait} 张。",
	"settings.scan.unknown": "另有 {count} 张无法识别尺寸。",

	// ---- 设置：长宽比 ----
	"settings.aspect.heading": "长宽比",
	"settings.filterByAspect.name": "只用长宽比不小于阈值的图片",
	"settings.filterByAspect.desc":
		"宽 ÷ 高。设为 1.3 时只有横向图（4:3 及更宽）会被用作背景。尚未扫描到尺寸的图会被跳过，请先扫描。",
	"settings.aspectThreshold.name": "长宽比阈值",
	"settings.aspectThreshold.desc":
		"宽 ÷ 高，默认 1.3（约 4:3）。它同时决定下面「纵向图垂直位置」把哪些图当作纵向图。",

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
		"auto 随深浅主题自动切换混合方式；multiply / lighten 为固定模式。仅在壁纸位于界面之上时生效；开启「让主题背景透明」后壁纸就是背景层，没有可混合的对象。",
	"settings.transition.name": "淡入淡出过渡",
	"settings.transition.desc": "换图时平滑过渡，尊重系统的「减少动态效果」设置。",
	"settings.portraitPosition.name": "纵向图垂直位置",
	"settings.portraitPosition.desc":
		"0 显示图片顶部，100 显示底部，50 为中间（默认）。只对长宽比低于阈值的纵向图生效，且仅在 cover 尺寸模式下；横向图不做任何位移。",

	// ---- 设置：与主题配合 ----
	"settings.theme.heading": "与主题配合",
	"settings.transparent.name": "让主题背景透明",
	"settings.transparent.desc":
		"把工作区、侧边栏的不透明背景色改为透明，并让壁纸沉到界面之下：界面与壁纸不再互相混色（深色主题下界面亮部不再透到图上，浅色主题下图像不再被底色蒙白）。这是本插件唯一会覆盖主题背景颜色的功能，默认关闭；开启后工作区底色为纯黑（深色主题）或纯白（浅色主题），壁纸按「背景透明度」往它淡化，菜单/提示/弹窗不受影响。关闭「启用背景」时它也会一并退出。",
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
	"settings.copyName.name": "复制当前文件名",
	"settings.copyName.desc": "把此刻屏幕上那张图的文件名（不含完整路径）复制到剪贴板。",
	"settings.copyName.button": "复制文件名",

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
