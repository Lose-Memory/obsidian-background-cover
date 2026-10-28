# Background Cover

A community plugin for [Obsidian](https://obsidian.md) that puts your own images behind the workspace.

**English** · [中文](README.zh.md)

The background model — opacity, blur, size modes, blend modes and the folder-based random rotation — follows [vscode-background-cover](https://github.com/AShujiao/vscode-background-cover), minus its particle effects, desktop pet and online gallery. The Obsidian-side layering approach was informed by [obsidian-dynamic-theme-background](https://github.com/sean2077/obsidian-dynamic-theme-background).

> **The point of this plugin:** your background folder can hold thousands of images (5,000+, tens of GB). Only **the one image currently on screen** is ever read into memory. The folder itself is scanned for file names only, so library size does not affect performance.

![Settings panel on a dark theme](./images/settings-dark.png)

![Settings panel on a light theme](./images/settings-light.png)

*The plugin follows Obsidian's own language setting: Chinese UI on Chinese installs, English everywhere else. The screenshots above show a Chinese install.*

## Features

**Two local folders you can switch between**

- **Playlist A** and **Playlist B**, each with its own folder, its own playback order and its own current image — switching playlists switches the whole wallpaper set, and the current image of the other playlist is remembered
- Works with folders **outside** your vault (for example `d:\wallpapers`)
- Supports `~` (home directory) and `${ENV}` / `$ENV` environment variables
- Recursively scans subfolders and recognises png / jpg / jpeg / gif / bmp / webp / svg / jfif / avif

**Memory-friendly by design**

- The folder scan produces a plain array of file names; image bytes are never read in bulk
- Only the current image is read, converted to a blob URL and handed to CSS
- 5,000 wallpapers is not a problem

**No-repeat shuffle rotation**

- All images are shuffled with Fisher-Yates into a playback list. Every image appears exactly once per round, and the list is reshuffled only when it is exhausted — so "random" never lands on the same image twice in a row

**VS Code-style appearance controls**

- Opacity (0 – 0.8)
- Blur (0 – 100 px)
- Size modes: cover, contain (stretch), center (fit), repeat, and several natural-size positions
- Blend modes: `auto` (multiply on light themes, lighten on dark themes, switching instantly with the theme), `multiply`, `lighten`
- Fade transition between images, respecting the system "reduce motion" setting

**Rotation**

- Fixed-interval automatic rotation, or change the image manually at any time

**Zero conflict with themes**

- The plugin only adds its own independent background layer (all classes are prefixed `bgc-`). It does **not** modify any theme CSS variable (`--background-*`, `--text-*`, …) and does not override theme styles

## Installation

### From the community directory

Once the plugin has been reviewed and published, search for **Background Cover** in **Settings → Community plugins → Browse**.

### With BRAT (early access)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. In BRAT's settings, add this repository's URL.

### Manually

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](../../releases/latest).
2. Put them in a folder named `background-cover` inside your vault:

   ```
   <Vault>/.obsidian/plugins/background-cover/
     ├── main.js
     ├── manifest.json
     └── styles.css
   ```

3. Reload Obsidian and enable **Background Cover** in **Settings → Community plugins**.

> The folder name must match the `id` in `manifest.json` (`background-cover`).
>
> **Desktop only.** The plugin sets `isDesktopOnly: true` because it reads image files through Node's `fs`, which does not exist in the mobile app.

## Usage

### Settings

Open **Settings → Background Cover**.

| Setting | Description |
| --- | --- |
| Enable background | Master switch. Turning it off removes **everything** the plugin adds — the background layer, theme transparency and both dividers — and does not change any theme setting of its own. |
| Active playlist | Which of the two playlists the background, the status bar button, **Change background** and auto rotation take images from. |
| Folder (Playlist A) / Folder (Playlist B) | One absolute image path per playlist. Supports `~` and environment variables, and may point outside your vault. The folder is scanned as soon as you enter a path. |
| Image sizes | **Scan** reads the header of every image in the active playlist's folder, reports how many are landscape / portrait at the current threshold, and caches the result. Only headers are read — no image is decoded — and a rescan re-reads only new or changed files. |
| Only use images at or above the aspect ratio | Filter the folder down to images wider than the threshold, so a mixed folder never shows a cropped vertical shot. Images whose size is unknown are skipped, so run a scan first (turning the filter on starts one automatically). |
| Aspect ratio threshold | Width ÷ height, default 1.3 (about 4:3). It also defines which images count as portrait for the vertical position below. |
| Background opacity | Opacity of the background layer, 0 – 0.8 (default 0.2). |
| Background blur | Blur radius in pixels, 0 – 100 (default 0). |
| Size mode | `cover` (fill, keeps aspect ratio) / `contain` (stretch to fill, distorts) / `center` (scale to fit, centered) / `repeat` (tile) / natural-size positions. |
| Portrait image vertical position | 0 shows the top of a portrait image, 100 the bottom, 50 the middle (default). Only images below the aspect ratio threshold are moved, and only in `cover` mode — a landscape image is never repositioned. |
| Blend mode | `auto` (follows the theme) / `multiply` / `lighten`. Only applies while the wallpaper is an overlay (theme transparency off); once it is the background layer there is nothing left to blend with. |
| Fade transition | Crossfade smoothly when the image changes (on by default). |
| Make theme background transparent | Makes the theme's opaque background colors transparent **and drops the wallpaper below the interface**, so the UI and the image stop blending into each other. **The only feature that overrides theme colors**, off by default — see below. |
| Title bar divider | A 1 px line between the title bar and the workspace (requires the setting above). |
| Sidebar divider | A 1 px line between the sidebars and the workspace (requires the setting above). |
| Divider color | Color of both lines, default neutral gray `#808080`. |
| Divider opacity | Opacity of both lines, 0 – 1 (default 0.45). |
| Change image on startup | When on, a random image is picked on every launch. When off (default), the image from your last session is restored. |
| Enable auto rotation | Change the background at a fixed interval, off by default. |
| Rotation interval (seconds) | Interval between automatic changes, minimum 5 seconds. |
| Change background now | Immediately take the next image from the active playlist. |
| Copy file name | Puts the file name of the image that is on screen right now on your clipboard — the name only, not the full path. |

### Commands

- **Change background** — take the next image from the active playlist's playback list
- **Switch playlist** — flip between Playlist A and Playlist B
- **Toggle background** — turn the background layer on or off (this also turns theme transparency and the dividers off, so nothing the plugin adds stays behind)

### Status bar

A 🖼 button in the status bar changes the image with one click.

### Playback order

"Random" is not an independent draw each time — it is a **shuffled playback list**:

- All images in the folder are shuffled into a sequence. The command, the status bar button and auto rotation all take the next entry, so **every image appears exactly once per round**. With 5,000 images you would have to click 5,000 times to see a repeat.
- **Each playlist has its own list and its own position in it.** Switching to B picks up where B left off; switching back to A continues A's round rather than restarting it.
- The list is reshuffled when it is exhausted, when the folder path changes, when the **aspect ratio** filter or threshold changes, and after a **Scan** (which can retire images that no longer pass the filter).
- Restarting Obsidian restores the image you were last showing in each playlist. If the next entry happens to be that same image, the plugin skips to the one after it.
- With **Change image on startup** enabled, a fresh image is drawn from the new list on every launch instead of restoring the previous one.

> If your folder genuinely contains only 2–3 images, "no repeats within a round" will feel like cycling between them — that is a property of the library, not the plugin.

## Permissions and privacy

This section describes exactly what the plugin accesses and why. It is required disclosure, not marketing.

- **No network access at all.** The plugin makes no HTTP requests, downloads nothing, and has no online gallery.
- **No telemetry, no analytics, no accounts.** Nothing about you or your vault ever leaves your machine.
- **Reads image files from a folder you choose, which may be outside your vault.** This is the entire point of the plugin: your wallpaper collection usually lives somewhere like `d:\wallpapers`, not inside the vault. The plugin reads that folder's file names, then reads a single image file when it is displayed. A **Scan** additionally reads the first bytes of each image to learn its size — the header only, never the pixels. It never writes to that folder, never deletes anything, and never scans folders you did not configure.
- **You can point it at a folder inside the vault instead** if you prefer to keep everything in one place.
- **Only file names and the one currently displayed image are held in memory.** Replaced images have their blob URL revoked immediately.
- The exceptions to "read-only" are all inside the plugin's own folder in your vault: the settings in `data.json`, and `image-index.json` — the scan cache, a file name → width/height map used so a rescan only re-reads what changed. It contains no image data, and deleting it merely means the next scan starts from scratch.
- **No remote code.** Nothing is fetched and evaluated at runtime; updates only arrive through normal plugin releases.

## Compatibility with themes

By default the plugin **only adds a background**. It does not touch any theme variable — the single exception is the optional **Make theme background transparent**, which is off by default. It never changes your app's appearance or theme setting.

The background layer has two modes, and the difference matters:

- **Overlay (default, theme transparency off).** The layer is an independent `position: fixed` full-screen overlay composited over the workspace content with `mix-blend-mode` (the same default effect as vscode-background-cover), at **`z-index: 20`** — above the workspace and the window background bars (Obsidian's `--layer-cover 5` / `--layer-sidedock 10` / `--layer-status-bar 15`) and below floating panels (`--layer-modal 50` / `--layer-notice 60` / `--layer-menu 65` / `--layer-tooltip 70`). Menus, the command palette, notices and hover previews are therefore never tinted by the wallpaper and always look exactly like the theme. Because it is an overlay, the theme's own opaque background colors cannot hide the image, so no theme variable has to be rewritten. The trade-off is that the blend mode composites the wallpaper with **everything** behind it, interface content included (see below).
- **Real background (theme transparency on).** The layer drops to **`z-index: -1`** and the blend mode is forced to `normal`, so the wallpaper is composited with nothing but the workspace base color (pure black on dark themes, pure white on light themes). Text, panels and controls are then painted opaquely on top of it: they keep their own colors, and none of them is pulled into the image. `body` carries `contain: strict` in Obsidian's own stylesheet, which makes it a stacking context — that is what lets a `z-index: -1` child sit above the base color and below the whole interface. This mode needs the theme's opaque surfaces to be transparent, which is exactly what the setting does; that is why the two go together.

> Obsidian's floating layers are unaffected in both modes: menus, notices, the command palette and modals keep their own opaque backgrounds and are never tinted by the wallpaper. If you want the wallpaper to cover those panels too (not recommended — the blend mode will tint them), raise the `z-index` of `.bgc-layer` in `styles.css`.

> **Frameless window mode** (`is-hidden-frameless`, common on Windows and Linux) is handled by Obsidian itself: core gives `.titlebar` `background: transparent`, `border: none` and `z-index: var(--layer-popover)`. It is a transparent drag strip, so the wallpaper shows through it in both modes, and the plugin no longer needs to touch its `z-index` (1.0.1 pushed it down to `--layer-status-bar`, a workaround that is unnecessary now that the wallpaper sits below the interface).

> Requires Obsidian **1.13.0** or later (dynamic styling uses the official `setCssProps` API).

## Making the theme background transparent

Some themes paint the workspace, sidebars and title bar with **opaque** background colors (Royal Velvet, for example, uses a palette of `--layer-0` … `--layer-4` across the whole UI). In overlay mode those colors take part in the `mix-blend-mode` computation and pull the wallpaper toward the theme palette: the image looks gray or purple, and its dark areas get lifted. It looks like the theme is applying a filter to your background.

> Measured conclusion: this is usually not an actual filter or mask layer in the theme (there is no `filter`, `backdrop-filter` or full-screen overlay to be found in Royal Velvet). It is simply the normal result of a blend mode meeting the content behind it.

Turn on **Settings → Background Cover → Theme integration → Make theme background transparent**. It does two things at once, and they only work together:

1. It makes those opaque surfaces transparent, so they stop coloring the wallpaper.
2. It drops the wallpaper **below the interface** (`z-index: -1`, blend mode `normal`). This is the part that removes the *other* half of the problem: in overlay mode the wallpaper is composited with the interface content as well, so on dark themes the bright elements (text, form fields, code blocks) are lifted into the image through `lighten` — the image and the interface each look half transparent, and on light themes the light panels are multiplied into the image until it looks like something is covering it. As a real background layer, the wallpaper is composited only with the neutral base color, and the interface is painted on top of it.

- **This is the only feature that overrides theme background colors, and it is off by default.** While it is off, the plugin still touches no theme variable at all.
- **It only affects the workspace** — menus, notices and hover previews are untouched. The variable overrides are scoped to `.workspace` (custom properties inherit downward), while Obsidian's modals live under `body`, siblings of `.app-container` and outside `.workspace`, so they are not affected. **Do not move these variables back to `body` or `.theme-*`**: once `--background-primary` becomes transparent globally, the settings window, command palette and menus all go transparent with it.
- **The note title row** (`.view-header`, the strip showing the current file name) is handled too. Core sets its background through `--file-header-background` / `--file-header-background-focused`, which are also resolved at the root and derive from `--background-primary`; what is more, its "active leaf + focused window" rule uses four classes (`(0,4,0)`) and beats an ordinary element-level override, so the plugin blanks the variable instead. **A useful diagnostic trick:** if an area only looks different while focus is in the note body and returns to normal the moment you click a sidebar or open a separate settings window, you are looking at a focus/active-state rule with higher specificity.
- **Restoring the divider lines.** Themes often set `--background-modifier-border` (which `--divider-color` defaults to) to `transparent`, leaving the UI with no dividers at all. With this option on, the plugin draws a 1 px line **between the top (tab bar / title bar) and the workspace**, and colors the sidebars' `.workspace-leaf-resize-handle` so **the sidebars get their divider back** as well. Both lines have their own switches, and the color and opacity are configurable. Only that handle is colored; no other divider in the workspace is touched.
- With this on, the workspace base color becomes pure black (dark themes) or pure white (light themes). The wallpaper is composited against that base, so it has to be blend-neutral — a colored base would tint the whole image. The base color is only visible through the wallpaper itself (the base plate lives under it, and every workspace surface is transparent), so it does not turn your light theme dark or vice versa.
- **Text content that never had a background does not get one.** Tables, formula blocks, quotes and code are laid out as transparent content, but themes commonly paint them anyway — Royal Velvet, for example, stripes table rows with `--layer-1` / `--layer-2` and fills math blocks and quotes with `--layer-1`. As long as the wallpaper was an overlay those colors sat underneath it and were invisible; with the wallpaper below the interface they turned into opaque blocks lying on top of it (on a light theme, all but white). This option clears their **background color** so the wallpaper shows through the text area, removes a table's **frame** (themes often draw it as an `outline` in a theme color), and turns the **hovered table row** into a light veil instead of an opaque stripe (a slight darkening on light themes). Everything that is deliberate decoration is kept — table header gradients, formula blocks' and quotes' colored borders — and nothing outside that list is touched (panels, buttons, callouts, tags, sidebar highlights).
- **Opacity still means opacity.** At `0.4` the image contributes 40% and the workspace base color the other 60%, so it looks **dim on a dark theme and pale on a light one** — that is what a translucent layer over a light background means, and it is not something the plugin can remove. What changed in 1.1.0 is that the interface no longer mixes into the image on top of that: at low opacity the image now looks uniformly faded instead of smeared wherever text and panels sit over it. Light themes are fully supported; if you want the wallpaper to keep more of its color, raise the opacity.
- The plugin also handles the opaque overlay of the Bases view, plus the **status bar and title bar** — two window background bars that sit outside `.workspace` and need separate treatment, otherwise the wallpaper is cut off across them. If you do not want them transparent, delete the corresponding rules in `styles.css`.

## How it works

- **Layer structure.** A full-screen root container `.bgc-layer` (carrying `mix-blend-mode` and blur, whose properties stay **completely constant**) plus two image children `.bgc-layer-image` that crossfade by alternating `opacity`. The container is mounted on `document.body`, after `.app-container`. Its `z-index` and blend mode are decided purely in CSS by whether `body` has the `bgc-transparent-theme` class (overlay `z-index: 20` / real background `z-index: -1`), so switching the theme-transparency setting never touches the layer from JavaScript.
- **Copying the current file name.** The settings button reads the path from the layer's own record of what it is displaying (`getCurrentPath()`), not from the persisted setting, so during auto rotation it always copies what is on screen at that moment. It copies the **file name only**: the name is enough to find the image in your folder, while a full path leaks your local directory layout into anything you paste it into.
- **Image sizes are parsed from the file header, never by decoding the image.** `imageSize.ts` reads at most 64 KB (1 MB for JPEG, which may keep its `SOF` marker far into the file) and interprets the PNG `IHDR`, JPEG `SOF`, GIF, BMP, WebP `VP8`/`VP8L`/`VP8X`, AVIF `ispe` or SVG width/height fields. Decoding thousands of wallpapers through an `<img>` or a canvas would cost seconds and hundreds of megabytes; parsing headers is a few milliseconds per hundred files.
- **The scan is cached by path, mtime and size.** `image-index.json` lives in the plugin's own folder, so a rescan after adding five images reads five headers, not five thousand. The cache is keyed on absolute paths — moving the wallpaper folder therefore just means one new scan, not a corrupted index.
- **The vertical position only applies where it is needed.** `resolveSizeModel()` computes `background-position` for the size mode and, when the image is portrait and the mode is `cover`, swaps the vertical half of the position for `center <n>%`. `cover` is the only mode that crops, so it is the only mode where moving the image does anything; the landscape path keeps the original `center` value verbatim.
- **Why the blend mode sits on a parent that never animates.** An element with `mix-blend-mode` or `filter` is promoted to its own compositing layer while an `opacity` animation runs, and the blend mode degrades to `normal` — the whole screen flashes brighter and covers the UI at the moment of the switch. vscode-background-cover's A6 fix records this trap; this plugin split "blend mode + blur" and "crossfade" onto different elements accordingly.
- **No deferred cleanup when switching.** The inactive child is already invisible at `opacity: 0`, and its `background-image` is kept until it is overwritten. An earlier version cleared the "old layer" with a 400 ms timer, which — when you clicked quickly — also wiped the image that had just become active, making the background disappear entirely. Fixed, and the plugin now uses no timers for this at all.
- **Local images go through a blob URL, not a base64 data URL.** This one matters. The file is read and turned into a `blob:` URL (about 50 characters) written into the image layer's `--bgc-image` variable. **Do not switch this to `data:...;base64,...`**: that requires putting the whole image into an inline CSS declaration, and browsers impose a length limit on a single CSS declaration value. An over-long value is **silently discarded** — no error anywhere — after which `background-image: var(--bgc-image, none)` resolves to `none` and the background vanishes. Measured in Chromium: a 2 MB value survives intact, a 4 MB value makes `getPropertyValue()` return an empty string. A high-resolution wallpaper's base64 is routinely several to tens of MB, so the data URL approach manifests as "most images do nothing when clicked, and occasionally a small one works". A blob URL has no length limit and skips base64's 33% overhead.
- **Only one image is in memory at a time.** A replaced blob URL is revoked immediately, and everything is released when the layer unmounts, so repeated switching does not accumulate a leak.
- **Variable values are always valid CSS tokens.** `--bgc-*` only ever receives legal tokens (`none`, `cover`, `blur(4px)`, …) and never nests `var()`. A `var()` fallback only applies while the variable is **undefined**; once a variable is defined to an invalid token, the whole declaration — `mix-blend-mode` included — is dropped. That is the usual root cause of "the background is there but the blend mode stopped working". Blend mode and transitions are therefore expressed purely as CSS classes, not variables.
- **The `auto` blend mode is pure CSS.** `body.theme-light` / `body.theme-dark` select multiply / lighten, so switching themes applies instantly with no JS theme listener.
- **Randomisation** is a shuffled playlist (Fisher-Yates): every image appears once per round, and the list is reshuffled only when exhausted. Manual switching and auto rotation share the same list.
- **The settings page always matches what is on screen.** The background layer records the image it is actually displaying (`getCurrentPath()`) and the settings page reads that real state rather than keeping a second copy. Each switch also carries a request sequence number, so only the last read that was started is applied and out-of-order async reads cannot desynchronise the display.

> **Very large images:** if your folder contains a few extremely high-resolution images (a panorama can easily exceed 8000×5000), decoding will be noticeably slower and memory will spike briefly when one comes up. That is the cost of the image itself — the plugin still holds only that one. **Change background now** skips past it.

## Development

```bash
npm install      # install dependencies
npm run dev      # watch mode, compiles into output/
npm run build    # production build (tsc type check + esbuild bundle) into output/
npm run lint     # ESLint
```

Build artifacts go to `output/`, which contains `main.js`, `manifest.json` and `styles.css` — a folder that can be dropped straight into a vault or attached to a GitHub release.

Source layout:

```
src/
  main.ts         # plugin lifecycle, commands, status bar, folder scan cache, scan coordination
  background.ts   # background layer: dual image layers, blob URLs, blend classes
  settings.ts     # settings interface, defaults and the settings tab
  i18n.ts         # UI strings (English + Chinese) and language selection
  css.ts          # size-mode → CSS mapping, colour helpers
  folder.ts       # path expansion, recursive scan, shuffle playlist
  imageSize.ts    # image dimensions from the file header (no decoding)
  imageIndex.ts   # size cache on disk, aspect ratio helpers
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the constraints that apply to changes, the UI text rules and the release process.

**There is no automated test suite in this repository.** Changes are verified locally by loading the built `main.js` in a headless browser against a harness that recreates Obsidian's DOM; that harness depends on a local wallpaper folder, so it is not shipped here. If you change rendering behaviour — blend modes, z-index, the theme-transparency feature — please say in your pull request how you verified it and on which theme.

## Releasing

1. Bump the version with `npm version <x.y.z>`. The `version` script updates `manifest.json` and `versions.json`; `.npmrc` sets `tag-version-prefix=""` so the git tag is the bare version with no `v` prefix.
2. Add the entry to [CHANGELOG.md](CHANGELOG.md).
3. Push the tag. `.github/workflows/release.yml` builds the plugin, attests build provenance, and publishes a release with `main.js`, `manifest.json` and `styles.css` attached. The workflow refuses to publish if the tag does not match the `version` in `manifest.json`.
4. Obsidian installs by looking up the release whose tag equals the `version` in your manifest, so the tag must match exactly and the release must be **published**, not a draft.

## Submitting to the community directory

The submission process is self-service at [community.obsidian.md](https://community.obsidian.md) — there is no longer a pull request to `obsidian-releases`.

1. Create a GitHub release whose tag matches `manifest.json`'s `version`, with `main.js`, `manifest.json` and (optionally) `styles.css` attached.
2. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account and connect your GitHub account.
3. Add the plugin by repository URL, review and accept the [Developer policies](https://docs.obsidian.md/community-directory/developer-policies), and submit.
4. The directory reads `manifest.json` from the HEAD of the default branch, so make sure it is committed. The `id` must be unique across all published plugins and **must not contain `obsidian`**.
5. Fix anything the automated review reports, then publish a new release with an incremented version.

See [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin) and the [submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins) for the authoritative details.

## Credits

The design and implementation of this plugin were informed by the following open-source projects:

- **[vscode-background-cover](https://github.com/AShujiao/vscode-background-cover)** (MIT, © 2021 ashujiao) — the background parameter model (opacity / blur / size mode / blend mode / transition), folder-based random rotation, and the "load only the current image" memory strategy. Its A6 note in `src/loaderFragments.ts` about `mix-blend-mode` / `filter` degrading when an element is promoted during an `opacity` animation is what this plugin's layer structure is built around.
- **[obsidian-dynamic-theme-background](https://github.com/sean2077/obsidian-dynamic-theme-background)** (MIT, © 2025 Sean2077) — the approach to implementing the background as an independent overlay layer in Obsidian, the multiply-on-light / lighten-on-dark blend semantics, and the use of a blur filter.
- **[obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)** (ISC, © 2020-2026 Dynalist Inc.) — the project scaffold this repository is derived from: the TypeScript + esbuild build configuration, the GitHub Actions workflows and the manifest conventions.
- **[esbuild](https://esbuild.github.io/)** — the bundler.

The two background projects are MIT-licensed, so the design ideas and parameter semantics borrowed from them are used within their terms. This project is an independent implementation and contains **no copied source text** from either of them; the attribution above is given because it is the right thing to do, not because a licence compels it.

The scaffold is a different matter: it *is* derived from obsidian-sample-plugin, so the copyright and permission notice required by its ISC license is retained in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## AI assistance disclosure

The code and documentation of this project were produced with AI assistance:

- **ByteDance Doubao (豆包) LLM** — initial requirements analysis, architecture, first implementation, documentation and build configuration.
- **DeepSeek (`deepseek-flash`, via the DeepSeek Harness coding agent)** — fixed the "background disappears after rapid switching" and "settings page shows a different name than the actual background" defects; found and fixed the deeper root cause (writing images into inline CSS as data URLs exceeds the browser's per-declaration length limit and is silently discarded — measured between 2 and 4 MB — now using blob URLs); restructured the background layers to separate blend mode/blur from the crossfade; completed the blend-mode and opacity failure handling; rewrote the styles, build output and this documentation; verified each change by loading the real build artifact in a headless browser against a local Obsidian DOM harness; and localised the UI, added the contributor and issue-template files, and prepared the project for the community directory.

All AI-generated content was reviewed by a human and passes TypeScript type checking, ESLint and a render verification of the built artifact. If you have concerns about AI-assisted development, the source and commit history are open to inspection.

## License

Released under the [MIT License](LICENSE).

---

**Disclaimer**: This project is an independent community plugin and is not affiliated with or endorsed by Obsidian.
