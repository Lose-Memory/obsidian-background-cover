/**
 * 诊断信息收集。
 *
 * 「与主题配合」的几项（分隔线、毛玻璃）都依赖主题与 Obsidian 自身的 CSS 变量、
 * 以及窗口/浮层的 DOM 结构，失败原因往往只在用户机器上才能观察到：
 * 是主题把变量设成了透明？是浮层根本不在当前文档里？还是浏览器不支持某个特性？
 * 与其猜测，不如把事实一次性收集出来——这也是给社区报 issue 时最有用的材料。
 *
 * 报告文案**刻意固定为英文**，不走 i18n：它是要被贴进 GitHub issue 给别人看的，
 * 英文在社区里更通用，也让同一份报告在任何语言环境下都长得一样、便于对比。
 */
import { Platform } from "obsidian";

import type { BgcSettings } from "./settings";

/** 读取元素的计算样式；元素不存在时返回标记文本而不是抛错。 */
function css(selector: string, property: string): string {
	const el = document.querySelector(selector);
	if (!el) {
		return "(element not found)";
	}
	const value = getComputedStyle(el).getPropertyValue(property).trim();
	return value === "" ? "(empty)" : value;
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

	lines.push("===== Background Cover diagnostics =====");
	add("Plugin version", version);
	// 用 Platform 与 process.versions 而不是 navigator.userAgent：
	// 关心的是「运行环境支持哪些 CSS 特性」，而不是从 UA 猜操作系统
	add(
		"Runtime",
		[
			Platform.isDesktopApp ? "desktop" : "mobile",
			Platform.isWin ? "win" : Platform.isMacOS ? "macos" : Platform.isLinux ? "linux" : "other",
		].join("/")
	);
	add("Electron", process.versions.electron ?? "(unknown)");
	add("Chromium", process.versions.chrome ?? "(unknown)");
	add("Node", process.versions.node ?? "(unknown)");
	add(
		"Supports color-mix",
		CSS.supports("background-color", "color-mix(in srgb, red 50%, transparent)")
	);
	add("Supports backdrop-filter", CSS.supports("backdrop-filter", "blur(4px)"));
	add("Supports -webkit-backdrop-filter", CSS.supports("-webkit-backdrop-filter", "blur(4px)"));

	lines.push("");
	lines.push("--- Plugin state ---");
	add("body class list", document.body.className);
	add(".bgc-layer count", count(".bgc-layer"));
	add(".bgc-layer z-index", css(".bgc-layer", "z-index"));
	add("--bgc-separator (inline)", document.body.style.getPropertyValue("--bgc-separator") || "(not set)");
	add("background.enabled", settings.enabled);
	add("background.imageFolder", settings.imageFolder);
	add("Theme integration settings", JSON.stringify({
		transparentTheme: settings.transparentTheme,
		titlebarDivider: settings.titlebarDivider,
		sidebarDivider: settings.sidebarDivider,
		separatorColor: settings.separatorColor,
		separatorOpacity: settings.separatorOpacity,
	}));

	lines.push("");
	lines.push("--- DOM structure ---");
	add(
		"body direct children",
		Array.from(document.body.children)
			.map((el) => `${el.tagName.toLowerCase()}.${el.className || "(no class)"}`)
			.join(" | ")
	);
	add(".app-container count", count(".app-container"));
	add(".workspace count", count(".workspace"));
	add(".workspace --background-primary", css(".workspace", "--background-primary"));
	add(".workspace --divider-color", css(".workspace", "--divider-color"));

	lines.push("");
	lines.push("--- Dividers ---");
	add(".titlebar count / height", `${count(".titlebar")} / ${css(".titlebar", "height")}`);
	add(".titlebar background-color", css(".titlebar", "background-color"));
	add(".titlebar --titlebar-background", css(".titlebar", "--titlebar-background"));
	add(".titlebar border-bottom", `${css(".titlebar", "border-bottom-width")} ${css(".titlebar", "border-bottom-color")}`);
	add(".workspace-tab-header-container count", count(".workspace-tab-header-container"));
	add(
		".workspace-tab-header-container border-bottom",
		`${css(".workspace-tab-header-container", "border-bottom-width")} ${css(".workspace-tab-header-container", "border-bottom-color")}`
	);
	add(".workspace-tab-header-container height", css(".workspace-tab-header-container", "height"));
	add(".workspace-leaf-resize-handle count", count(".workspace-leaf-resize-handle"));
	add(
		".workspace-leaf-resize-handle border-color",
		css(".workspace-leaf-resize-handle", "border-right-color")
	);

	lines.push("");
	lines.push("--- Modals / popovers ---");
	add(".modal-container count", count(".modal-container"));
	add(".modal count", count(".modal"));
	add(".modal.mod-settings count", count(".modal.mod-settings"));
	add("--modal-background resolved", resolveModalBackground());
	add(".modal background-color", css(".modal", "background-color"));
	add(".modal backdrop-filter", css(".modal", "backdrop-filter"));
	add(".modal position", css(".modal", "position"));
	add(".modal size", `${css(".modal", "width")} x ${css(".modal", "height")}`);
	lines.push("(Note: if .modal count above is 0, the modal lives in another document - likely a separate window.)");
	lines.push("===== End of diagnostics =====");

	return lines.join("\n");
}
