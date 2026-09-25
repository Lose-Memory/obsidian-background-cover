/**
 * 背景 CSS 取值映射（纯逻辑模块，不依赖 Obsidian API）。
 *
 * 尺寸模式的取值映射参考 vscode-background-cover 的 getCssStyles：
 * sizeModel → background-size / repeat / position。
 *
 * 这里不输出任何主题 CSS 变量（--background-* / --text-* 等），
 * 保证插件只添加背景层、与用户安装的主题互不干扰。
 */

/** 尺寸模式 → background-size / repeat / position 映射。 */
export function resolveSizeModel(model: string): {
	size: string;
	repeat: string;
	position: string;
} {
	let size = "cover";
	let repeat = "no-repeat";
	let position = "center";

	switch (model) {
		case "cover":
			size = "cover";
			break;
		case "contain":
			size = "100% 100%";
			break;
		case "center":
			size = "contain";
			break;
		case "repeat":
			size = "auto";
			repeat = "repeat";
			break;
		case "not_center":
			size = "auto";
			break;
		case "not_right_bottom":
			size = "auto";
			position = "right 96%";
			break;
		case "not_right_top":
			size = "auto";
			position = "right 30px";
			break;
		case "not_left":
			size = "auto";
			position = "left";
			break;
		case "not_right":
			size = "auto";
			position = "right";
			break;
		case "not_top":
			size = "auto";
			position = "top";
			break;
		case "not_bottom":
			size = "auto";
			position = "bottom";
			break;
		default:
			size = "cover";
			break;
	}

	return { size, repeat, position };
}

/** 分隔线颜色的兜底值（设置里解析失败时使用）。 */
const FALLBACK_SEPARATOR = { r: 128, g: 128, b: 128 };

/**
 * `#rrggbb` + 不透明度 → CSS 颜色值。
 * 分隔线颜色由设置页的颜色选择器给出（只有 RGB，没有 alpha），不透明度单独用
 * 滑块控制，所以在这里合成为一个 rgba()。
 */
export function toRgbaColor(hex: string, alpha: number): string {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	const { r, g, b } = match?.[1]
		? {
				r: (parseInt(match[1], 16) >> 16) & 255,
				g: (parseInt(match[1], 16) >> 8) & 255,
				b: parseInt(match[1], 16) & 255,
			}
		: FALLBACK_SEPARATOR;
	const a = Math.min(1, Math.max(0, alpha));
	return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}
