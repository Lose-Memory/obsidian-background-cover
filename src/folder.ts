/**
 * 本地文件夹扫描与随机选择（纯逻辑模块，不依赖 Obsidian API）。
 *
 * 设计目标：背景文件夹可能包含数千张图片（如 5000 张）。
 * 这里只维护「文件名列表」（纯字符串数组，内存开销极小），
 * 从不把图片内容读入内存——只有最终选中的那一张才会被读取（见 background.ts）。
 *
 * 路径支持：
 * - 任意绝对路径（含 Obsidian 仓库之外的文件夹，例如 D:\Wallpapers）
 * - `~/` 展开为用户主目录
 * - `${ENV}` / `$ENV` 展开为环境变量
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** 支持的图片扩展名（大小写不敏感）。 */
export const IMAGE_EXTS = [
	".png",
	".jpg",
	".jpeg",
	".gif",
	".bmp",
	".webp",
	".svg",
	".jfif",
	".avif",
];

/**
 * 展开路径中的 `~`（用户目录）和环境变量（`${ENV}`、`$ENV`）。
 * 未定义的变量保持原样，避免把用户的字面量悄悄改掉。
 */
export function expandPathVariables(input: string): string {
	if (!input) {
		return input;
	}
	let value = input;

	if (value.startsWith("~/")) {
		value = os.homedir() + value.slice(1);
	}
	value = value.replace(/\$\{(\w+)\}/g, (match, name: string) => {
		return process.env[name] !== undefined ? process.env[name] : match;
	});
	value = value.replace(/\$(\w+)/g, (match, name: string) => {
		return process.env[name] !== undefined ? process.env[name] : match;
	});

	return value;
}

function isSupportedImage(name: string): boolean {
	const lower = name.toLowerCase();
	return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

/**
 * 递归扫描文件夹下的图片文件（深度优先，目录按字母序保证结果稳定）。
 * 只返回文件绝对路径，忽略子目录与不可读条目；空/不存在/非目录返回 []。
 */
export function listImagesInFolder(folder: string): string[] {
	const results: string[] = [];
	const seen = new Set<string>();

	const walk = (dir: string) => {
		let normalized: string;
		try {
			normalized = path.resolve(dir);
		} catch {
			return;
		}
		if (seen.has(normalized)) {
			return; // 防止符号链接环
		}
		seen.add(normalized);

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(normalized, { withFileTypes: true });
		} catch {
			return;
		}
		entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
		for (const entry of entries) {
			const full = path.join(normalized, entry.name);
			try {
				if (entry.isDirectory()) {
					walk(full);
				} else if (entry.isFile() && isSupportedImage(entry.name)) {
					results.push(full);
				}
			} catch {
				// 单个条目失败不影响整体扫描
			}
		}
	};

	walk(folder);
	return results;
}

/**
 * 校验路径是否指向一个存在的本地目录（展开变量后）。
 */
export function isDirectory(input: string): boolean {
	const expanded = expandPathVariables(input);
	try {
		return fs.statSync(expanded).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Fisher-Yates 洗牌，返回新数组（不修改原数组）。
 * 用于生成「不重复播放列表」：一轮内每张图片只出现一次，
 * 用完一整轮才重新洗牌，避免手动切换/自动轮播反复撞到同一张。
 */
export function shuffle<T>(items: readonly T[]): T[] {
	const arr = [...items];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		// noUncheckedIndexedAccess 下下标读取为 T | undefined，实际恒存在
		const tmp = arr[i] as T;
		arr[i] = arr[j] as T;
		arr[j] = tmp;
	}
	return arr;
}

/**
 * 判断两个文件路径是否指向同一文件（Windows 下大小写不敏感）。
 */
export function sameFile(a: string, b: string): boolean {
	const na = path.resolve(a);
	const nb = path.resolve(b);
	return process.platform === "win32"
		? na.toLowerCase() === nb.toLowerCase()
		: na === nb;
}

/**
 * 不重复播放列表：把候选列表洗牌后按序逐个取出，一轮内每张只出现一次，
 * 列表用尽（或列表源变化）后重新洗牌。
 * 手动切换与自动轮播共用同一实例，因此连续取图不会撞到最近用过的图。
 */
export class ShufflePlaylist {
	private items: string[] = [];
	private index = 0;
	private listKey = "";

	/**
	 * 取下一张。
	 * @param list 当前候选列表（如文件夹扫描结果）
	 * @param listKey 列表源标识（如文件夹缓存键）；变化时立即重洗
	 * @param exclude 需要跳过的路径（如当前显示的图）
	 */
	next(list: readonly string[], listKey: string, exclude?: string): string | undefined {
		if (list.length === 0) {
			return undefined;
		}
		if (this.listKey !== listKey || this.index >= this.items.length) {
			this.items = shuffle(list);
			this.index = 0;
			this.listKey = listKey;
		}

		let index = this.index;
		let next = this.items[index];

		if (exclude && next && sameFile(next, exclude)) {
			index += 1;
			next = this.items[index];
			if (!next) {
				// 已到列表末尾：重洗后从头开始
				this.items = shuffle(list);
				this.index = 0;
				this.listKey = listKey;
				return this.items[0];
			}
		}

		this.index = index + 1;
		return next;
	}
}
