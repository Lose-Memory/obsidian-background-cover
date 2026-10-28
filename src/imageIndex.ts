/**
 * 图片尺寸索引：宽 / 高 / 宽高比的缓存，用于「按宽高比筛选」。
 *
 * 只缓存元数据（每张图约 80 字节，5000 张的 JSON 约 400 KB），不缓存图片内容。
 * 缓存键是图片绝对路径，值里带 mtime 与文件大小：文件被替换后自动重新读取，
 * 因此「重新扫描」只需付出新增/改动文件的读文件头开销。
 *
 * 索引文件放在插件自己的目录下（`image-index.json`），与 data.json 同级，
 * 全部留在本地，不写入用户图库文件夹。
 */
import { promises as fsp } from "fs";

import { readImageSize } from "./imageSize";

export interface ImageIndexEntry {
	width: number;
	height: number;
	/** 文件最后修改时间（毫秒）与大小，用来判断缓存是否仍然有效。 */
	mtimeMs: number;
	size: number;
}

/** 图片绝对路径 → 尺寸记录。 */
export type ImageIndex = Record<string, ImageIndexEntry>;

/** 每扫描这么多张就让出一次事件循环，避免长扫描把设置页卡死。 */
const YIELD_EVERY = 50;

/**
 * 宽 ÷ 高。读不出尺寸时（记录为 0×0）返回 0：任何正阈值都不会把它当成横向图，
 * 也不会发生除零。参数只需要宽高，所以缓存的索引项与直接的图片尺寸都能传进来。
 */
export function aspectRatio(entry: { width: number; height: number } | undefined): number {
	if (!entry || entry.height <= 0) {
		return 0;
	}
	return entry.width / entry.height;
}

/** 该图是否算「纵向图」：宽高比低于阈值。尺寸未知的一律不算。 */
export function isPortrait(
	entry: { width: number; height: number } | undefined,
	threshold: number
): boolean {
	const ratio = aspectRatio(entry);
	return ratio > 0 && ratio < threshold;
}

/** 读取索引文件；文件不存在或损坏时返回空索引（等价于「还没扫描过」）。 */
export async function loadImageIndex(filePath: string): Promise<ImageIndex> {
	try {
		const raw = JSON.parse(await fsp.readFile(filePath, "utf8")) as unknown;
		if (!raw || typeof raw !== "object") {
			return {};
		}
		const index: ImageIndex = {};
		for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
			const entry = value as Partial<ImageIndexEntry> | null;
			if (!entry || typeof entry.width !== "number" || typeof entry.height !== "number") {
				continue;
			}
			index[key] = {
				width: entry.width,
				height: entry.height,
				mtimeMs: typeof entry.mtimeMs === "number" ? entry.mtimeMs : 0,
				size: typeof entry.size === "number" ? entry.size : 0,
			};
		}
		return index;
	} catch {
		return {};
	}
}

/** 写入索引文件；失败只在控制台记录，不影响扫描结果本身。 */
export async function saveImageIndex(filePath: string, index: ImageIndex): Promise<void> {
	try {
		await fsp.writeFile(filePath, JSON.stringify(index), "utf8");
	} catch (error) {
		console.error("[BackgroundCover] Failed to save the image index:", error);
	}
}

/**
 * 补齐 `paths` 的尺寸记录。
 *
 * - 命中缓存（mtime 与大小都没变）不读文件；
 * - 只读文件头，不解码整图；
 * - 读不出尺寸的文件记为 0×0，这样它不会被一直当成「还没扫描」而反复重试。
 *
 * @param known 现有索引（来自上一次扫描）
 * @param onProgress 进度回调（已完成数, 总数）
 */
export async function measureImages(
	paths: readonly string[],
	known: ImageIndex,
	onProgress?: (done: number, total: number) => void
): Promise<ImageIndex> {
	const index: ImageIndex = {};
	for (const [position, filePath] of paths.entries()) {
		const cached = known[filePath];
		try {
			const stat = await fsp.stat(filePath);
			if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
				index[filePath] = cached;
			} else {
				const size = await readImageSize(filePath);
				index[filePath] = {
					width: size?.width ?? 0,
					height: size?.height ?? 0,
					mtimeMs: stat.mtimeMs,
					size: stat.size,
				};
			}
		} catch {
			// 文件在扫描期间被删除/不可读：不写记录，下次扫描再试
		}
		onProgress?.(position + 1, paths.length);
		if ((position + 1) % YIELD_EVERY === 0) {
			await new Promise((resolve) => window.setTimeout(resolve, 0));
		}
	}
	return index;
}
