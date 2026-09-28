# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/Lose-Memory/obsidian-background-cover/releases/tag/1.0.0
