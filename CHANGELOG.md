# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-10-28

### Fixed

- **The plugin description is now within the directory's 250-character limit.** The 1.2.0 text was 322 characters, so the release review failed on `manifest.json` alone; the wording now says the same things in 246 characters, and `package.json` carries the identical string.

## [1.2.0] - 2026-10-28

### Added

- **Two playlists.** **Settings → Background Cover → Playlists** now has a folder for **Playlist A** and one for **Playlist B**, plus an **Active playlist** dropdown. Each playlist keeps its own folder, its own playback order and its own current image, so switching playlists switches the whole wallpaper set, not just the folder. The command **Switch playlist** flips between them from the command palette. Users upgrading from 1.0–1.1 keep their folder and current image: they are read once into Playlist A.
- **Scan** measures width, height and aspect ratio of every image in the active playlist's folder and reports the totals under the button. Only the file header is read — no image is ever decoded, so a folder of thousands of wallpapers is scanned in well under a second per hundred images — and the result is cached in the plugin folder (`image-index.json`), which makes a rescan re-read only new or changed files. Supported formats: PNG, JPEG, GIF, BMP, WebP, AVIF and SVG.
- **Only use images at or above the aspect ratio.** Point at a folder of mixed orientations, set the threshold to 1.3 and only landscape images (4:3 and wider) are used as backgrounds. Images whose size is unknown are skipped, so the filter needs a scan first; turning it on for a folder that was never scanned triggers that scan automatically.
- **Portrait image vertical position** (0–100, default 50). A portrait image cannot fill a landscape screen without losing its top or bottom, so its vertical framing is now adjustable: 0 keeps the top, 100 the bottom. It applies only to images below the aspect ratio threshold and only in `cover` size mode — landscape images are never moved.

### Changed

- **Image source** is now split across the two playlists; **Copy file name** moved to a setting of its own under **Actions**.
- The **aspect ratio threshold** doubles as the definition of "portrait" for the vertical position setting, so the two features always agree on which images they act on.

### Removed

- **Copy diagnostics** and the whole diagnostics module. The report only ever contained information that is already visible in the developer console or in the settings themselves, and keeping it in step with new settings cost more than it was worth.

### Fixed

- **Turning off Enable background now really turns the plugin off.** Theme transparency and the two divider lines used to stay applied, so the interface kept looking modified with the background hidden — and the only way back was to disable the theme transparency option as well. Everything the plugin adds to the interface now follows the master switch, both from the settings page and from the **Toggle background** command.

## [1.1.0] - 2026-10-16

### Added

- **Copy file name** in **Settings → Background Cover → Image source**, next to **Rescan**: it puts the file name of the image that is on screen right now on your clipboard, so a wallpaper you like during auto rotation is easy to find again. Only the file name is copied — not the full path, which would carry your local folder layout along with it.

### Fixed

- **Text content no longer comes with a solid background block.** The transparency option used to clear only the workspace and sidebar surfaces, so anything a theme paints on document content stayed opaque and, now that the wallpaper is the background behind the interface, showed up as a block lying on top of it — on a light theme, all but white. It now also clears the **background color** of tables, formula blocks, quotes and code (inline and fenced), so the wallpaper shows through the text area. Table header gradients, colored borders and quotes' accent bars are kept, and nothing outside that list is touched (panels, buttons, callouts, tags, sidebar highlights). Note that these rules have to outrank the theme's own — quotes in particular are painted by a four-class live-preview rule — so they are written with a matching prefix rather than the shorter selector that looked right but lost the cascade.
- **Tables no longer draw a frame, and hovering a row highlights it lightly instead of darkly.** Themes commonly draw the table's outline with the theme's own color (Royal Velvet uses `outline: 1px solid var(--layer-1)`), and paint the hovered row with an opaque stripe; with the wallpaper behind that frame and stripe both read as solid blocks (the hover one was often the same dark color as the row it was meant to highlight). The frame is removed and the hover is now a light veil in dark themes, a slight darkening in light themes — never an opaque block.
- **The wallpaper is no longer blended into the interface.** With **Make theme background transparent** on, the background layer now sits *below* the interface (`z-index: -1`, blend mode `normal`) instead of being composited over it. Text, panels and controls are painted on top of the image and keep their own colors, and the image is no longer mixed with them:
  - on dark themes, the interface's bright elements (text, form fields, code blocks) used to be lifted into the image by `lighten`, so the image and the interface each looked half transparent — images with large bright areas looked as if their content had been erased;
  - on light themes, the light surfaces used to be multiplied into the image, so it looked like something had been laid over it.
- **The title bar** no longer needs its `z-index` rewritten to show the wallpaper: Obsidian's own frameless-window styling already makes it transparent and borderless, and it now sits above a wallpaper that is below everything anyway.

### Changed

- **Make theme background transparent** now also moves the wallpaper below the interface. The two halves only work together: transparent surfaces alone still leave the wallpaper composited over the interface, and moving it down alone would let the still-opaque surfaces hide it.
- **Blend mode** only applies while the wallpaper is an overlay (theme transparency off). As a real background layer it has nothing left to blend with, so it uses `normal` — which also stops a fixed `multiply` on a dark theme from multiplying the image with the pure black base and blanking it out.
- At a low **opacity**, a light theme still fades the image toward the workspace base color (that is what opacity means for a translucent layer). What changed is that the interface no longer mixes into the image on top of that.

## [1.0.1] - 2026-09-28

### Changed

- The plugin description no longer names Obsidian. The community directory review rejected 1.0.0 because the product name appeared in user-facing text, so the description now says "the app" instead; the copy in `package.json` was updated to match. **No plugin behaviour changed.**

## [1.0.0] - 2026-09-28

First public release.

### Added

- **Local folder as the background source**, including folders outside the vault, with `~` and `${ENV}` / `$ENV` expansion and recursive subfolder scanning (png, jpg, jpeg, gif, bmp, webp, svg, jfif, avif).
- **Memory strategy: only the currently displayed image is ever read.** The folder scan produces a plain array of file names; the active image is read into a blob URL and revoked as soon as it is replaced, so a library of thousands of images costs nothing at idle.
- **No-repeat shuffle rotation.** All images are shuffled into a playback list with Fisher-Yates; every image appears once per round and the list is only reshuffled when exhausted. Manual switching and auto rotation share the list.
- **VS Code-style appearance controls**: opacity (0–0.8), blur (0–100 px), size modes (cover, contain, center, repeat, plus natural-size positions), blend mode (`auto` / `multiply` / `lighten`) and a crossfade transition that respects the system "reduce motion" setting.
- **Auto rotation** at a fixed interval, plus commands and a status bar button to change the image immediately.
- **Theme integration (opt-in, off by default)**: make the theme's opaque background colors transparent so the wallpaper shows its true colors, restore the title bar and sidebar divider lines, and set per-line color and opacity. Scoped to `.workspace`, so modals and menus are unaffected. This is the only feature that overrides theme colors.
- **Copy diagnostics** command: collects runtime, CSS feature support, theme variables, overlay DOM structure and computed styles into the clipboard for issue reports.
- **Bilingual UI** that follows Obsidian's language setting (Chinese and English).
- Documentation in [English](README.md) and [Chinese](README.zh.md), with screenshots, and a permissions and privacy disclosure.

### Notes

- `isDesktopOnly` is `true`: the plugin reads image files through Node's `fs`.
- The plugin makes no network requests and collects no telemetry.
- The plugin does not modify theme CSS variables, except through the opt-in Make theme background transparent setting described above.

[1.2.0]: https://github.com/Lose-Memory/obsidian-background-cover/releases/tag/1.2.0
[1.1.0]: https://github.com/Lose-Memory/obsidian-background-cover/releases/tag/1.1.0
[1.0.1]: https://github.com/Lose-Memory/obsidian-background-cover/releases/tag/1.0.1
[1.0.0]: https://github.com/Lose-Memory/obsidian-background-cover/releases/tag/1.0.0
