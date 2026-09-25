/**
 * 诊断信息收集。
 *
 * 「与主题配合」的几项（分隔线、毛玻璃）都依赖主题与 Obsidian 自身的 CSS 变量、
 * 以及窗口/浮层的 DOM 结构，失败原因往往只在用户机器上才能观察到：
 * 是主题把变量设成了透明？是浮层根本不在当前文档里？还是浏览器不支持某个特性？
 * 与其猜测，不如把事实一次性收集出来——这也是给社区报 issue 时最有用的材料。
 */
import { Platform } from "obsidian";

import type { BgcSettings } from "./settings";

/** 读取元素的计算样式；元素不存在时返回标记文本而不是抛错。 */
function css(selector: string, property: string): string {
	const el = document.querySelector(selector);
	if (!el) {
		return "(无此元素)";
	}
	const value = getComputedStyle(el).getPropertyValue(property).trim();
	return value === "" ? "(空)" : value;
}

/** 统计选择器命中的元素个数。 */
function count(selector: string): number {
	return document.querySelectorAll(selector).length;
}

/**
 * 把 `var(--settings-background, var(--modal-background))` 解析成实际颜色。
 * 自定义属性的计算值不会做 var() 替换，所以挂一个带专用类的探针元素
 * （类定义在 styles.css 里），让浏览器算出真实颜色，读完立即移除。
 */
function resolveModalBackground(): string {
	const probe = document.body.createDiv({ cls: "bgc-probe-modal-bg" });
	try {
		return getComputedStyle(probe).backgroundColor;
	} finally {
		probe.remove();
	}
}

export function collectDiagnostics(settings: BgcSettings, version: string): string {
	const lines: string[] = [];
	const add = (key: string, value: unknown) => lines.push(`${key}: ${String(value)}`);

	lines.push("===== Background Cover 诊断信息 =====");
	add("插件版本", version);
	// 用 Platform 与 process.versions 而不是 navigator.userAgent：
	// 关心的是「运行环境支持哪些 CSS 特性」，而不是从 UA 猜操作系统
	add(
		"运行环境",
		[
			Platform.isDesktopApp ? "desktop" : "mobile",
			Platform.isWin ? "win" : Platform.isMacOS ? "macos" : Platform.isLinux ? "linux" : "other",
		].join("/")
	);
	add("Electron", process.versions.electron ?? "(未知)");
	add("Chromium", process.versions.chrome ?? "(未知)");
	add("Node", process.versions.node ?? "(未知)");
	add(
		"支持 color-mix",
		CSS.supports("background-color", "color-mix(in srgb, red 50%, transparent)")
	);
	add("支持 backdrop-filter", CSS.supports("backdrop-filter", "blur(4px)"));
	add("支持 -webkit-backdrop-filter", CSS.supports("-webkit-backdrop-filter", "blur(4px)"));

	lines.push("");
	lines.push("--- 插件状态 ---");
	add("body 类名", document.body.className);
	add(".bgc-layer 数量", count(".bgc-layer"));
	add(".bgc-layer z-index", css(".bgc-layer", "z-index"));
	add("--bgc-separator（行内）", document.body.style.getPropertyValue("--bgc-separator") || "(未设置)");
	add("background.enabled", settings.enabled);
	add("background.imageFolder", settings.imageFolder);
	add("与主题配合设置", JSON.stringify({
		transparentTheme: settings.transparentTheme,
		titlebarDivider: settings.titlebarDivider,
		sidebarDivider: settings.sidebarDivider,
		separatorColor: settings.separatorColor,
		separatorOpacity: settings.separatorOpacity,
	}));

	lines.push("");
	lines.push("--- DOM 结构 ---");
	add(
		"body 直接子元素",
		Array.from(document.body.children)
			.map((el) => `${el.tagName.toLowerCase()}.${el.className || "(无类名)"}`)
			.join(" | ")
	);
	add(".app-container 数量", count(".app-container"));
	add(".workspace 数量", count(".workspace"));
	add(".workspace 的 --background-primary", css(".workspace", "--background-primary"));
	add(".workspace 的 --divider-color", css(".workspace", "--divider-color"));

	lines.push("");
	lines.push("--- 分隔线 ---");
	add(".titlebar 数量 / 高度", `${count(".titlebar")} / ${css(".titlebar", "height")}`);
	add(".titlebar background-color", css(".titlebar", "background-color"));
	add(".titlebar 的 --titlebar-background", css(".titlebar", "--titlebar-background"));
	add(".titlebar border-bottom", `${css(".titlebar", "border-bottom-width")} ${css(".titlebar", "border-bottom-color")}`);
	add(".workspace-tab-header-container 数量", count(".workspace-tab-header-container"));
	add(
		".workspace-tab-header-container border-bottom",
		`${css(".workspace-tab-header-container", "border-bottom-width")} ${css(".workspace-tab-header-container", "border-bottom-color")}`
	);
	add(".workspace-tab-header-container 高度", css(".workspace-tab-header-container", "height"));
	add(".workspace-leaf-resize-handle 数量", count(".workspace-leaf-resize-handle"));
	add(
		".workspace-leaf-resize-handle border-color",
		css(".workspace-leaf-resize-handle", "border-right-color")
	);

	lines.push("");
	lines.push("--- 弹窗 / 浮层 ---");
	add(".modal-container 数量", count(".modal-container"));
	add(".modal 数量", count(".modal"));
	add(".modal.mod-settings 数量", count(".modal.mod-settings"));
	add("--modal-background 解析值", resolveModalBackground());
	add(".modal background-color", css(".modal", "background-color"));
	add(".modal backdrop-filter", css(".modal", "backdrop-filter"));
	add(".modal 位置", css(".modal", "position"));
	add(".modal 尺寸", `${css(".modal", "width")} x ${css(".modal", "height")}`);
	lines.push("（提示：若上面 .modal 数量为 0，说明弹窗不在当前文档里——多半是独立窗口。）");
	lines.push("===== 诊断信息结束 =====");

	return lines.join("\n");
}
