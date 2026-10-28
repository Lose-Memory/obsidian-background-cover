/**
 * 从图片文件的**文件头**读出像素尺寸（纯逻辑模块，不依赖 Obsidian API）。
 *
 * 需求背景：用户图库有 5000+ 张图片，其中纵向图（竖构图）在横屏显示器上按 cover
 * 铺满时只能看到中间一条，需要单独给它们一个垂直取景位置；同时还要能「只用宽高比
 * ≥ 1.3 的图」。两件事都只需要宽和高这两个数字。
 *
 * 为什么不直接把图片解码：
 * - `decode()` 一张 4K 壁纸要几十毫秒到几百毫秒，5000 张不可接受；
 * - 这里只读文件头（常见格式 10–30 字节），一张图通常不到 1 毫秒。
 *
 * 支持的格式：PNG / JPEG / GIF / BMP / WebP / AVIF(HEIC) / SVG。
 * 解析不出来（或格式不认识）时返回 null，调用方按「尺寸未知」处理，不抛异常。
 */
import { promises as fsp } from "fs";
import type { FileHandle } from "fs/promises";
import * as path from "path";

/** 图片的像素尺寸。 */
export interface ImageSize {
	width: number;
	height: number;
}

/**
 * 首轮读取深度。PNG/GIF/BMP/WebP 的尺寸都在前 30 字节内，64 KB 只是为了让 JPEG 的
 * SOF 段能落进来（它排在 0–64 KB 的 EXIF/ICC 段之后）。
 */
const HEAD_BYTES = 64 * 1024;

/** 首轮没解析出尺寸时（实际上只有 JPEG 会走到这里）再读 1 MB。 */
const EXTENDED_HEAD_BYTES = 1024 * 1024;

/** 读取图片尺寸；文件不可读、损坏或格式不认识时返回 null。 */
export async function readImageSize(filePath: string): Promise<ImageSize | null> {
	const ext = path.extname(filePath).toLowerCase();
	let handle: FileHandle | null = null;
	try {
		handle = await fsp.open(filePath, "r");
		const head = await readHead(handle, HEAD_BYTES);
		const size = parseImageSize(head, ext);
		if (size || !isJpegExt(ext)) {
			return size;
		}
		return parseImageSize(await readHead(handle, EXTENDED_HEAD_BYTES), ext);
	} catch {
		return null;
	} finally {
		await handle?.close();
	}
}

/**
 * 从文件头数据解析尺寸。`data` 只需包含文件开头的一段，不必是完整文件。
 * 按魔数判断格式（扩展名只作为 SVG 的补充线索：SVG 是文本，没有固定魔数）。
 */
export function parseImageSize(data: Buffer, ext = ""): ImageSize | null {
	return (
		pngSize(data) ??
		gifSize(data) ??
		bmpSize(data) ??
		webpSize(data) ??
		avifSize(data) ??
		jpegSize(data) ??
		(ext === ".svg" || looksLikeSvg(data) ? svgSize(data) : null)
	);
}

async function readHead(handle: FileHandle, bytes: number): Promise<Buffer> {
	const buffer = Buffer.alloc(bytes);
	const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
	return buffer.subarray(0, bytesRead);
}

function isJpegExt(ext: string): boolean {
	return ext === ".jpg" || ext === ".jpeg" || ext === ".jfif";
}

/** PNG / APNG：8 字节签名，IHDR 里的宽高是 32 位大端。 */
function pngSize(data: Buffer): ImageSize | null {
	if (data.length < 24 || data.readUInt32BE(0) !== 0x89504e47) {
		return null;
	}
	const width = data.readUInt32BE(16);
	const height = data.readUInt32BE(20);
	return width > 0 && height > 0 ? { width, height } : null;
}

/** GIF87a / GIF89a：逻辑屏幕宽高是 16 位小端。 */
function gifSize(data: Buffer): ImageSize | null {
	if (data.length < 10 || data.toString("latin1", 0, 4) !== "GIF8") {
		return null;
	}
	const width = data.readUInt16LE(6);
	const height = data.readUInt16LE(8);
	return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * BMP：文件头 14 字节之后是 DIB 头。
 * 头长度 12 是 OS/2 的 BITMAPCOREHEADER（16 位宽高），其余按 32 位有符号数读，
 * 高度为负表示自上而下存储，取绝对值。
 */
function bmpSize(data: Buffer): ImageSize | null {
	if (data.length < 26 || data.toString("latin1", 0, 2) !== "BM") {
		return null;
	}
	if (data.readUInt32LE(14) === 12) {
		const width = data.readUInt16LE(18);
		const height = data.readUInt16LE(20);
		return width > 0 && height > 0 ? { width, height } : null;
	}
	const width = data.readInt32LE(18);
	const height = Math.abs(data.readInt32LE(22));
	return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * WebP：RIFF 容器，尺寸藏在第一个 VP8/VP8L/VP8X 块里，三种编码的存法各不相同。
 * - `VP8 `（有损）：第 3–5 字节是帧起始码 9d 01 2a，随后 2 个 16 位值各取低 14 位；
 * - `VP8L`（无损）：比特流里紧接 0x2f 标志后的 14+14 位是「宽-1 / 高-1」；
 * - `VP8X`（扩展）：画布尺寸是 24 位值「宽-1 / 高-1」。
 */
function webpSize(data: Buffer): ImageSize | null {
	if (data.length < 30) {
		return null;
	}
	if (data.toString("latin1", 0, 4) !== "RIFF" || data.toString("latin1", 8, 12) !== "WEBP") {
		return null;
	}
	const format = data.toString("latin1", 12, 16);
	if (format === "VP8 ") {
		if (data.readUInt8(23) !== 0x9d || data.readUInt8(24) !== 0x01 || data.readUInt8(25) !== 0x2a) {
			return null;
		}
		const width = data.readUInt16LE(26) & 0x3fff;
		const height = data.readUInt16LE(28) & 0x3fff;
		return width > 0 && height > 0 ? { width, height } : null;
	}
	if (format === "VP8L") {
		if (data.readUInt8(20) !== 0x2f) {
			return null;
		}
		const bits = data.readUInt32LE(21);
		return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
	}
	if (format === "VP8X") {
		return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
	}
	return null;
}

/**
 * AVIF / HEIC：ISO-BMFF 容器，尺寸在 `ispe` 盒里（紧随 4 字节版本+标志之后的两个 32 位值）。
 * 首个 `ispe` 通常是主图；缩略图也可能带 `ispe`，但排在主图之后，所以取第一个即可。
 */
function avifSize(data: Buffer): ImageSize | null {
	if (data.length < 24 || data.toString("latin1", 4, 8) !== "ftyp") {
		return null;
	}
	const brand = data.toString("latin1", 8, 12);
	if (brand !== "avif" && brand !== "avis" && brand !== "mif1" && brand !== "msf1") {
		return null;
	}
	const index = data.indexOf("ispe", 0, "latin1");
	if (index < 0 || index + 16 > data.length) {
		return null;
	}
	const width = data.readUInt32BE(index + 8);
	const height = data.readUInt32BE(index + 12);
	return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * JPEG：逐段跳读标记段，找到 SOF（C0–CF，排除 C4 DHT / C8 JPG / CC DAC）即可。
 * SOF 段结构是 长度(2) 精度(1) 高(2) 宽(2)，注意**高在前、宽在后**。
 */
function jpegSize(data: Buffer): ImageSize | null {
	if (data.length < 4 || data.readUInt8(0) !== 0xff || data.readUInt8(1) !== 0xd8) {
		return null;
	}
	let offset = 2;
	while (offset + 9 < data.length) {
		if (data.readUInt8(offset) !== 0xff) {
			offset += 1; // 越界或填充：逐字节重新对齐到下一个标记
			continue;
		}
		const marker = data.readUInt8(offset + 1);
		if (marker === 0xff) {
			offset += 1; // 标记前的填充字节
			continue;
		}
		if (marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
			offset += 2; // 无长度字段的独立标记
			continue;
		}
		const length = data.readUInt16BE(offset + 2);
		if (length < 2) {
			return null; // 长度字段非法，文件已损坏
		}
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			const height = data.readUInt16BE(offset + 5);
			const width = data.readUInt16BE(offset + 7);
			return width > 0 && height > 0 ? { width, height } : null;
		}
		offset += 2 + length;
	}
	return null;
}

function looksLikeSvg(data: Buffer): boolean {
	return data.toString("utf8", 0, Math.min(data.length, 2048)).includes("<svg");
}

/**
 * SVG：优先读根标签的 width / height（可带单位，取数值部分），
 * 没有具体数值时退回 viewBox 的宽高。矢量图没有固有像素尺寸，这两个值就是它的设计尺寸。
 */
function svgSize(data: Buffer): ImageSize | null {
	const text = data.toString("utf8", 0, Math.min(data.length, HEAD_BYTES));
	const tag = /<svg[^>]*>/i.exec(text)?.[0];
	if (!tag) {
		return null;
	}
	const width = numberAttr(tag, "width");
	const height = numberAttr(tag, "height");
	if (width && height) {
		return { width: Math.round(width), height: Math.round(height) };
	}
	const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
	if (!viewBox) {
		return null;
	}
	const parts = viewBox.trim().split(/[\s,]+/).map(Number);
	const viewWidth = parts[2];
	const viewHeight = parts[3];
	if (viewWidth && viewHeight && viewWidth > 0 && viewHeight > 0) {
		return { width: Math.round(viewWidth), height: Math.round(viewHeight) };
	}
	return null;
}

function numberAttr(tag: string, name: string): number | null {
	const match = new RegExp(`\\b${name}\\s*=\\s*["']?\\s*([\\d.]+)`, "i").exec(tag);
	const raw = match?.[1];
	if (!raw) {
		return null;
	}
	const value = Number.parseFloat(raw);
	return Number.isFinite(value) && value > 0 ? value : null;
}
