# Obsidian Background Cover

一个为 [Obsidian](https://obsidian.md) 提供自定义背景的插件。背景定义形式与视觉效果参考 [vscode-background-cover](https://github.com/AShujiao/vscode-background-cover)（剔除其粒子效果、顶部宠物、在线图库等装饰功能），并借鉴了 [obsidian-dynamic-theme-background](https://github.com/badrlaraki/obsidian-dynamic-theme-background) 的 Obsidian 背景实现思路。

> **核心特性**：背景文件夹可包含数千张图片（如 5000 张），插件**只把当前显示的那一张加载进内存**，文件夹本身仅扫描文件名列表，因此无论图库多大都不会卡顿。

## 功能特性

- **本地文件夹背景源**
  - 支持 Obsidian 仓库**之外**的文件夹（例如 `d:\wallpapers`）
  - 支持 `~`（用户主目录）与 `${ENV}` / `$ENV` 环境变量
  - 递归扫描子文件夹，自动识别常见图片格式（png / jpg / jpeg / gif / bmp / webp / svg / jfif / avif）
- **内存友好**：文件夹只维护文件名列表（纯字符串数组）；只有当前选中的那一张被读取为 blob URL 交给 CSS。5000 张背景图无压力
- **不重复随机轮播**：全部图片随机洗牌成播放列表，一轮内每张只出现一次，用完才重新洗牌——手动切换与自动轮播都不会反复撞到同一张
- **VS Code 风格外观设置**
  - 背景透明度（0 – 0.8）
  - 背景模糊（0 – 100 px）
  - 尺寸模式：cover / contain / center / repeat / 多种自定义位置
  - 混合模式：auto（浅色主题 multiply、深色主题 lighten，主题切换即时生效）/ multiply / lighten
  - 淡入淡出过渡（尊重系统「减少动态效果」设置）
- **自动轮播**：固定间隔（秒）随机换一张；也可手动命令随机换
- **与主题零冲突**：插件只添加独立背景层（`.bgc-` 前缀样式），**不修改任何主题 CSS 变量**（`--background-*`、`--text-*` 等），不覆盖主题的任何样式；叠加层的层级取舍见下方「与主题的兼容性」

## 安装

### 方式一：Obsidian 社区插件市场

插件通过审核并上架后，可在 **设置 → 第三方插件 → 社区插件市场** 搜索 **Background Cover** 直接安装。

### 方式二：BRAT（抢先体验）

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. 在 BRAT 设置中添加你的 GitHub 仓库地址（见下方「发布」章节）

### 方式三：手动安装

1. 构建插件（需 Node.js 18+）：

   ```bash
   npm install
   npm run build
   ```

2. 将 `output/` 目录中的三个文件复制到插件目录：

   ```
   <Vault>/.obsidian/plugins/obsidian-background-cover/
     ├── main.js
     ├── manifest.json
     └── styles.css
   ```

3. 重启 Obsidian，在 **设置 → 第三方插件** 中启用 **Background Cover**。

## 使用

### 设置

打开 **设置 → Background Cover**：

| 设置项 | 说明 |
| --- | --- |
| 启用背景 | 总开关，只影响背景层显示 |
| 背景文件夹 | 图片文件夹路径，支持仓库外路径 / `~` / 环境变量；填写后自动扫描并显示图片数量 |
| 图片数量 | 显示扫描到的图片数（仅文件名列表，不占内存），可手动重新扫描 |
| 背景透明度 | 背景层不透明度（0–0.8），默认 0.2 |
| 背景模糊 | 背景模糊像素（0–100），默认 0 |
| 尺寸模式 | cover（铺满）/ contain（完整）/ center / repeat / 自定义位置 |
| 混合模式 | auto（随主题）/ multiply / lighten |
| 淡入淡出过渡 | 换图平滑过渡，默认开启 |
| 启用自动轮播 | 固定间隔随机换图，默认关闭 |
| 轮播间隔（秒） | 自动换图间隔，最小 5 秒 |
| 随机换一张 | 立即手动随机换一张 |

### 命令

- `Random background / 随机更换背景`：立即随机换一张
- `Toggle background / 启用或停用背景`：开关背景

### 状态栏

底部状态栏有一个 🖼 按钮，点击即可随机换一张。

## 与主题的兼容性

本插件**只修改背景**，不触碰任何主题变量。背景是一个独立的 `position: fixed` 全屏层，用 `mix-blend-mode` 叠加在工作区内容之上（与 vscode-background-cover 的默认效果一致）。正因为是叠加层，主题自带的不透明背景色不会遮住图片，也就不需要改写 `--background-primary` 之类的变量——这是本插件与「改写主题变量」类背景插件的根本区别。

需要知道的取舍：叠加层位于 `z-index: 500`，因此**你的主题如果把菜单、弹窗做成半透明，图片会透过它们显示出来**。如果你更希望图片只出现在工作区内容区域、所有界面浮层保持完全不透明，把 `styles.css` 中 `.bgc-layer` 的 `z-index` 改小即可（例如 `1`）。

> 需要 Obsidian **1.13.0** 或更高版本（动态样式使用官方的 `setCssProps` API）。

## 工作原理

- **背景层结构**：一个全屏根容器 `.bgc-layer`（承载 `mix-blend-mode` 与模糊，换图期间**属性完全恒定**）+ 两个图片子层 `.bgc-layer-image`，两层交替做 `opacity` 交叉淡化。
- **为什么混合模式要放在不参与动画的父层上**：`mix-blend-mode` / `filter` 所在元素在 `opacity` 动画期间会被合成器提升为独立合成层，混合模式随之退化为 `normal`（表现为切图瞬间整屏变亮、盖住界面）。vscode-background-cover 的 A6 修复记录了这个坑，本插件据此把「混合模式 + 模糊」与「淡入淡出」拆到不同元素上。
- **换图不做任何延时清理**：非活动子层 `opacity` 为 0 本就不可见，它的 `background-image` 保留到下次被覆盖为止。早期版本用 400ms 定时器清理「旧层」，快速连点时会把刚刚成为活动层的图一起清掉，导致背景整体消失（已修复，且不再使用任何定时器）。
- **本地图片走 blob URL，而不是 base64 data URL**（这一点很关键）：图片文件被读取后转成 `blob:` URL（约 50 个字符）写入图片层的 `--bgc-image` 变量。**不要改用 `data:...;base64,...`**：那需要把整张图塞进行内 CSS，而浏览器对单个 CSS 声明值有长度上限，超限的值会被**静默丢弃**（无任何报错），`background-image: var(--bgc-image, none)` 随即解析为 `none`，背景整体消失。实测（Chromium）：2 MB 的值能完整保存，4 MB 的值 `getPropertyValue()` 返回空串。高清壁纸的 base64 常有数 MB 到数十 MB，因此 data URL 方案会表现为「大部分图点了没反应，偶尔小图能用」。blob URL 既没有长度上限，也省掉 base64 的 33% 膨胀。
- **同一时刻内存中只有当前这一张图片**：被替换掉的 blob URL 会立刻 `revokeObjectURL`，背景层卸载时也会全部释放（不会随着反复切图累积泄漏）。
- **变量取值一律合法**：`--bgc-*` 只会被写入合法 CSS 记号（`none` / `cover` / `blur(4px)` …），且不使用嵌套 `var()`。因为 `var()` 的兜底值只在变量**未定义**时生效，一旦变量被定义成非法记号，整条声明（包括 `mix-blend-mode`）都会被丢弃——这正是「背景在、混合模式却失效」的常见根因。混合模式与过渡因此完全用 CSS 类表达，不用变量。
- **混合模式 auto 是纯 CSS**：依据 `body.theme-light` / `body.theme-dark` 选择 multiply / lighten，主题切换即时生效，不需要 JS 监听主题变化。
- **随机机制**为「洗牌播放列表」（Fisher-Yates）：全部图片洗牌成一轮播放顺序，一轮内每张只出现一次，用尽才重新洗牌，手动切换与自动轮播共用同一个播放列表。
- **设置页的名称与实际显示的图严格一致**：背景层自己记录「当前实际显示的那张图」（`getCurrentPath()`），设置页读取的是这个真实状态，而不是另一份独立记录；同时每次切换带请求序号，只有最后一次发起的读取会被应用，异步读图的先后顺序不会造成错位。

> **超大图提示**：图库里若有个别几十 MB 的超高分辨率图（例如全景图，可轻松超过 8000×5000），切到它时解码会明显变慢、瞬时内存较高——这是图片本身的代价，插件同一时刻只保留当前这一张。**随机换一张**可以跳过它。

## 开发

```bash
npm install      # 安装依赖
npm run dev      # 监听模式编译到 output/
npm run build    # 生产构建（tsc 类型检查 + esbuild 打包）到 output/
npm run lint     # ESLint 检查
```

构建产物统一输出到 `output/` 目录，包含 `main.js`、`manifest.json`、`styles.css`，可直接安装或作为 GitHub Release 资产。

## 发布到 Obsidian 社区插件市场

1. 将本仓库发布到 GitHub（仓库名建议为 `obsidian-background-cover`）
2. 按 [Obsidian 官方指南](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin) 创建 GitHub Release：标签版本号与 `manifest.json` 中的 `version` 完全一致（不带 `v` 前缀），附件包含 `main.js`、`manifest.json`、`styles.css`
3. 提交插件到社区目录：[obsidian-releases](https://github.com/obsidianmd/obsidian-releases) 的 `community-plugins.json`，需满足[插件准入规则](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)：
   - 插件 `id` 唯一且稳定（本插件为 `obsidian-background-cover`）
   - 仓库包含 `manifest.json`、`main.js`、`styles.css`
   - 首次发布后如修改版本，同步更新 `versions.json`

## 致谢与引用

本项目的功能设计与实现参考了以下开源项目，特此致谢：

- **[vscode-background-cover](https://github.com/AShujiao/vscode-background-cover)**：背景参数体系（透明度 / 模糊 / 尺寸模式 / 混合模式 / 过渡动画）、文件夹随机轮播与「只加载当前图片」的内存策略；以及其 `src/loaderFragments.ts` 中关于「`mix-blend-mode` / `filter` 在 opacity 动画期间被合成器提升后混合退化」的 A6 修复记录——本插件的背景层结构正是据此把混合模式与模糊移出动画层
- **[obsidian-dynamic-theme-background](https://github.com/badrlaraki/obsidian-dynamic-theme-background)**：Obsidian 端背景层的实现思路（背景作为独立层叠加、浅色 multiply / 深色 lighten 的混合语义、blur 过滤器的用法）
- **[obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)**：本项目脚手架（TypeScript + esbuild 构建配置、manifest 规范）
- **[esbuild](https://esbuild.github.io/)**：打包工具

> **合规说明**：上述两个参考项目在下载源码中未附带 LICENSE 文件。为规避法律风险，本项目**未复制任何上游代码文本**，仅在功能设计、参数语义与通用 CSS 概念上对齐，所有代码均为本项目原创实现。如上游后续补充 LICENSE，本项目将按其条款补充致谢与声明。

## AI 辅助声明

本项目的代码与文档由 AI 辅助完成，具体模型如下：

- **字节跳动豆包（Doubao）大语言模型**：初版需求分析、架构设计、代码编写、文档与构建配置
- **DeepSeek（`deepseek-flash`，经由 DeepSeek Harness 编码智能体）**：修复「快速连点后背景整体失效」与「设置页显示的名称与实际背景不符」两个缺陷；**定位并修复了更深的根因——把图片写进行内 CSS 的 data URL 超过浏览器对单个 CSS 声明值的长度上限后被静默丢弃（实测阈值在 2–4 MB 之间），改为 blob URL**；重构背景层结构（把混合模式/模糊与淡入淡出拆分到不同元素）；补齐混合模式与透明度的失效逻辑；改写样式、构建产物与本文档；并新增基于无头浏览器的真实渲染验证

所有 AI 生成内容均已由人工复核，并通过 TypeScript 类型检查、ESLint 与构建产物渲染验证。若你对 AI 辅助开发有疑虑，可查看源码与提交历史中的说明。

## 许可证

本项目以 [MIT License](LICENSE) 开源。

---

**Disclaimer**: This project is an independent community plugin and is not affiliated with or endorsed by Obsidian. Use at your own risk.
