/**
 * 背景层管理：负责把「当前选中的那一张图片」渲染到 Obsidian 工作区。
 *
 * 内存策略（对应 5000 张背景图的需求）：
 * - 文件夹扫描只产生文件名列表（见 folder.ts），图片内容从不批量读入；
 * - 这里只读取「当前这一张」，转成 blob URL 交给 CSS；
 * - 换图用两个图片层交叉淡化（background-image 不可过渡，单层无法淡入淡出）；
 * - 被替换的 blob URL 立即 revokeObjectURL，任意时刻只有当前（最多两张）在内存中。
 *
 * ⚠ 为什么必须用 blob URL，而不是 base64 data URL（实测结论）：
 * 把图片写成 `url("data:...;base64,...")` 需要塞进行内 CSS 自定义属性，而浏览器
 * 对单个 CSS 声明值有长度上限。实测（Chromium，1280px 视口，真实 17MB 壁纸）：
 *     2 MB 的值 → 行内 style 完整保存
 *     4 MB 的值 → getPropertyValue() 返回空串，值被**静默丢弃**
 * 值被丢弃后 `background-image: var(--bgc-image, none)` 解析为 none，背景整体消失，
 * 且控制台没有任何报错。用户的图库有 5172 张图、平均 5.9MB（base64 约 7.9MB），
 * 于是绝大多数图都超限 —— 表现为「大部分壁纸点了没反应，偶尔小图能用」。
 * blob URL 只有几十个字符，没有任何长度问题，也省掉 base64 的 33% 膨胀。
 *
 * DOM 结构（换图期间只动最内层的 opacity）：
 *
 *   div.bgc-layer                 ← 位置 / 层级 / 混合模式 / 模糊：全程恒定
 *     ├── div.bgc-layer-image     ← 旧图：只做 opacity 淡出
 *     └── div.bgc-layer-image     ← 新图：只做 opacity 淡入
 *
 * 为什么混合模式与模糊必须放在不参与动画的父层上：
 * `mix-blend-mode` / `filter` 所在元素在 opacity 动画期间会被合成器提升为独立
 * 合成层，混合模式随之退化为 normal（切图瞬间整屏变亮、盖住界面）。让父层承担
 * blend/blur、只对子层做透明度动画即可规避——这是 vscode-background-cover 的 A6
 * 修复（loaderFragments.ts 注释）记录的教训。
 *
 * CSS 变量约定（全部在 styles.css 中以 `var(--bgc-*, 兜底值)` 读取）：
 * 变量值一律是合法 CSS 记号（`none` / `cover` / `blur(4px)` …），绝不写入
 * `auto` 这类非法值：`var()` 的兜底只在变量「未定义」时生效，一旦变量被定义成
 * 非法记号，整条声明会被丢弃（混合模式失效即由此而来）。混合模式与过渡因此
 * 完全不用变量，改用纯 CSS 类表达。
 */
import { promises as fsp } from "fs";
import * as path from "path";

import { resolveSizeModel } from "./css";
import type { BgcSettings } from "./settings";

/** 扩展名 → MIME 类型。 */
const MIME_MAP: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".bmp": "image/bmp",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".jfif": "image/jpeg",
	".avif": "image/avif",
};

/** 背景层根容器类名（承载混合模式与模糊，属性恒定，不参与动画）。 */
export const BGC_LAYER_CLASS = "bgc-layer";

/** 背景图片层类名（每张图一层，只做透明度交叉淡化）。 */
export const BGC_IMAGE_CLASS = "bgc-layer-image";

/** 关闭淡入淡出时加在根容器上的类名。 */
export const BGC_NO_TRANSITION_CLASS = "bgc-no-transition";

/**
 * 固定混合模式 → 加在容器（body）上的类名。
 * auto 不需要类：styles.css 直接按 body.theme-light / body.theme-dark 选择，
 * 主题切换即时生效，无需 JS 监听主题变化。
 */
const BLEND_CLASSES: Record<string, string> = {
	multiply: "bgc-blend-multiply",
	lighten: "bgc-blend-lighten",
};

/**
 * 读取单个图片文件并生成 blob URL（仅当前这一张）。
 * 调用方负责在不再需要时 revokeObjectURL（见 BackgroundLayer.setImage / unmount）。
 */
export async function createImageObjectUrl(filePath: string): Promise<string> {
	const buffer = await fsp.readFile(filePath);
	const ext = path.extname(filePath).toLowerCase();
	const mime = MIME_MAP[ext] ?? "image/jpeg";
	// Node 的 Buffer 本身就是 Uint8Array，直接交给 Blob，避免为几十 MB 的整图再复制一份
	return URL.createObjectURL(new Blob([buffer], { type: mime }));
}

export class BackgroundLayer {
	private readonly container: HTMLElement;
	private wrapper: HTMLElement | null = null;
	private readonly images: HTMLElement[] = [];
	/** 每个图片层当前占用的 blob URL，替换与卸载时必须 revoke，否则会泄漏整张图的内存。 */
	private readonly objectUrls: (string | null)[] = [];
	private activeIndex = 0;
	/** 是否应当显示背景（由插件按「已启用 + 已有图片」决定）。 */
	private visible = false;
	private settings: BgcSettings;
	/** 当前实际显示在背景层上的图片路径（单一事实来源）。 */
	private currentPath: string | null = null;

	constructor(container: HTMLElement, settings: BgcSettings) {
		this.container = container;
		this.settings = settings;
	}

	/** 创建背景层：一个恒定属性的根容器 + 两个交替使用的图片层。 */
	mount(): void {
		if (this.wrapper) {
			return;
		}
		this.wrapper = this.container.createDiv({ cls: BGC_LAYER_CLASS });
		for (let i = 0; i < 2; i++) {
			const el = this.wrapper.createDiv({ cls: BGC_IMAGE_CLASS });
			el.setCssProps({ "--bgc-opacity": "0" });
			this.images.push(el);
			this.objectUrls.push(null);
		}
		this.applyAppearance();
	}

	/** 从 DOM 中移除背景层，释放已加载的图片，并清掉容器上的混合模式类。 */
	unmount(): void {
		this.wrapper?.remove();
		this.wrapper = null;
		this.images.length = 0;
		this.releaseAllObjectUrls();
		this.currentPath = null;
		this.visible = false;
		for (const cls of Object.values(BLEND_CLASSES)) {
			this.container.removeClass(cls);
		}
	}

	/**
	 * 切换背景图：新图写入非活动层并淡入，旧层淡出。
	 *
	 * 非活动层的 opacity 为 0（不可见），其 background-image 保留到下次被覆盖为止，
	 * 因此**不需要任何定时器或 transitionend 清理**——早期实现用 400ms 定时器清空
	 * 「旧层」，快速连点时会把刚刚成为活动层的图一起清掉，导致背景整体消失。
	 *
	 * @param objectUrl 新图的 blob URL（本方法接管其生命周期）
	 * @param filePath 新图对应的文件路径（记录为当前显示，供设置页展示）
	 * @returns 是否成功应用；返回 false 时 objectUrl 已被释放
	 */
	setImage(objectUrl: string, filePath?: string): boolean {
		const nextIndex = 1 - this.activeIndex;
		const next = this.images[nextIndex];
		if (!next) {
			// 背景层已卸载：不留悬空 URL
			URL.revokeObjectURL(objectUrl);
			return false;
		}

		// 这一层即将被新图覆盖，先释放它上一张图的内存
		const stale = this.objectUrls[nextIndex];
		if (stale) {
			URL.revokeObjectURL(stale);
		}
		this.objectUrls[nextIndex] = objectUrl;

		next.setCssProps({ "--bgc-image": `url("${objectUrl}")` });
		// 先切换活动层再统一写 opacity：旧层归零、新层淡入，一步到位
		this.activeIndex = nextIndex;
		this.applyOpacity();
		if (filePath) {
			this.currentPath = filePath;
		}
		return true;
	}

	/**
	 * 按当前设置更新外观（尺寸 / 模糊 / 过渡 / 混合模式 / 透明度），
	 * 不改变「是否显示」的语义（可见性由 show / hide 决定）。
	 */
	applyAppearance(): void {
		if (this.wrapper) {
			const { size, repeat, position } = resolveSizeModel(this.settings.sizeModel);
			this.wrapper.setCssProps({
				"--bgc-size": size,
				"--bgc-repeat": repeat,
				"--bgc-position": position,
				// blur(0) 也会让整屏持续参与一次合成，为 0 时直接写 none
				"--bgc-blur": this.settings.blur > 0 ? `blur(${this.settings.blur}px)` : "none",
			});
			this.wrapper.toggleClass(BGC_NO_TRANSITION_CLASS, !this.settings.transitionEnabled);
			this.applyBlendClass();
		}
		this.applyOpacity();
	}

	/** 显示背景（若已有一张图，会从当前透明度淡入）。 */
	show(): void {
		this.visible = true;
		this.applyOpacity();
	}

	/** 隐藏背景：仅把透明度归零，保留已加载的图（再次启用时无需重新读文件）。 */
	hide(): void {
		this.visible = false;
		this.applyOpacity();
	}

	/** 是否已经应用过至少一张图片。 */
	hasImage(): boolean {
		return this.currentPath !== null;
	}

	/** 当前实际显示在背景层上的图片路径（无则 null）。 */
	getCurrentPath(): string | null {
		return this.currentPath;
	}

	/** 活动层取设置透明度，其余层归零；隐藏时全部归零。 */
	private applyOpacity(): void {
		for (let i = 0; i < this.images.length; i++) {
			const el = this.images[i];
			if (!el) {
				continue;
			}
			const active = i === this.activeIndex && this.visible;
			el.setCssProps({ "--bgc-opacity": active ? String(this.settings.opacity) : "0" });
		}
	}

	/** 同步混合模式：auto 交给 CSS 主题类，multiply / lighten 用容器类覆盖。 */
	private applyBlendClass(): void {
		for (const cls of Object.values(BLEND_CLASSES)) {
			this.container.removeClass(cls);
		}
		const cls = BLEND_CLASSES[this.settings.blendMode];
		if (cls) {
			this.container.addClass(cls);
		}
	}

	private releaseAllObjectUrls(): void {
		for (let i = 0; i < this.objectUrls.length; i++) {
			const url = this.objectUrls[i];
			if (url) {
				URL.revokeObjectURL(url);
			}
			this.objectUrls[i] = null;
		}
	}
}
