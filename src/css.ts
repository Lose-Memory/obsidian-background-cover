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
