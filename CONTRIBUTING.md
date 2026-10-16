# Contributing

Thanks for taking the time to help. This plugin reads image files from folders the user chooses, so the bar for changes that touch file access or the DOM is deliberately high.

## Before you start

- **Bug reports** — please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). It asks for the output of **Copy diagnostics**, which is by far the most useful thing you can attach; most problems in this plugin are environment- or theme-specific and cannot be reproduced without it.
- **Larger changes** — open an issue first so we can agree on the approach before you write code.

## Requirements

- Node.js 18 or later (CI builds on 20, 22 and 24).
- npm. This project uses npm and esbuild; `package-lock.json` is committed.

## Commands

```bash
npm install      # install dependencies
npm run dev      # watch mode, compiles into output/
npm run build    # production build (tsc type check + esbuild bundle) into output/
npm run lint     # ESLint (eslint-plugin-obsidianmd)
```

`npm run build` and `npm run lint` must both pass before you open a pull request. `npm run lint` is expected to report **0 errors**.

## Project layout

```
src/
  main.ts         # plugin lifecycle, commands, status bar, folder scan cache
  background.ts   # the background layer: two image layers, blob URLs, blend classes
  settings.ts     # settings interface, defaults and the settings tab
  i18n.ts         # UI strings (English + Chinese) and language selection
  css.ts          # size-mode → CSS mapping, colour helpers
  folder.ts       # path expansion, recursive scan, shuffle playlist
  theme.ts        # the dark-theme guard (appearance API it uses, and why)
  diagnostics.ts  # the "Copy diagnostics" report
styles.css        # all styling; every class is prefixed bgc-
manifest.json     # plugin manifest (id: background-cover)
```

## Constraints that cannot be relaxed

These come from Obsidian's [Developer policies](https://docs.obsidian.md/community-directory/developer-policies) and are checked during review. A pull request that breaks one of them will not be merged.

- **No network access.** No `fetch`, no `requestUrl`, no downloads, no online gallery. The plugin is entirely offline.
- **No telemetry of any kind**, and no accounts.
- **Never execute remote code** or fetch and evaluate scripts.
- **Do not modify theme CSS variables.** The single exception is the opt-in **Make theme background transparent**, which must remain off by default, must stay scoped to `.workspace` (so modals and menus are untouched), and must be fully reverted on unload. With it on, the wallpaper becomes a real background layer below the interface, and under it is the one place where an element's background color may be cleared: text content that has no background of its own — table rows and cells, math blocks, quotes, inline and fenced code. Never clear the background of anything else, and never touch `background-image` or borders (table header gradients, quote and math accent bars are deliberate decoration).
- **Never change the user's app settings** — no appearance/theme switching, no hotkeys, no core-plugin toggles. The plugin adds a background; it does not get a say in how the app is configured.
- **Do not widen file access.** The plugin reads the folder the user configured, plus its subfolders. It never writes there.
- **Clean up on unload.** Register every event, DOM listener and interval with the `register*` helpers, and revoke every blob URL.
- **Keep `main.ts` a lifecycle file.** Feature logic belongs in its own module.

## Code style

- TypeScript with `strict`, targeting ES2021, bundled to CommonJS by esbuild.
- Tabs and LF line endings, per [`.editorconfig`](.editorconfig) and [`.gitattributes`](.gitattributes).
- `npm run lint` must be clean.
- Aim to keep a file under ~300 lines. If it grows past that, split it by responsibility.
- Comments and commit messages may be written in Chinese or English — match the file you are editing. Commit prefixes in the history follow `feat:` / `fix:` / `docs:` / `chore:`.

## UI text and translations

- Every user-visible string lives in `src/i18n.ts`.
- `ZH` is typed as `Record<BgcKey, string>`, so adding a key to `EN` without adding it to `ZH` is a **compile error**. Add both.
- The language follows Obsidian's own setting via `getLanguage()`; Chinese installs get Chinese, everything else falls back to English.
- Follow Obsidian's UI style: sentence case, action-oriented wording, no jargon.
- `src/diagnostics.ts` is intentionally **English-only** — that report gets pasted into issues.

## Verification

There is no automated test suite in this repository. Changes are verified locally: the production build is loaded in a headless browser against a harness that recreates Obsidian's DOM, and a set of assertions checks the DOM state, computed styles and blob URL lifetime. That harness depends on a local wallpaper folder, so it is not part of the repository.

In practice this means: if you change rendering, blend modes, z-index or the theme-transparency feature, please describe how you verified the change in a real Obsidian window, and say which theme and light/dark mode you tested.

## Releasing (maintainers)

Problems noticed while using the plugin are captured in a local, untracked `TODO.md` at the repository root. It is listed in `.gitignore` and is deliberately **not** committed: a pasted diagnostics report contains the maintainer's own wallpaper folder path, and that is not something to publish. Contributors will not have this file — it is a maintainer's notebook, not a project artifact.

1. Triage `TODO.md` first. Fill in the trigger conditions on the "待处理" entries, set a priority, merge anything that is really one problem, and move whatever you have decided not to do into "不做 / 暂缓" with a reason.
2. `npm version <x.y.z>` — the `version` script updates `manifest.json` and `versions.json`. `.npmrc` sets `tag-version-prefix=""`, so the tag is the bare version with no `v` prefix.
3. Write the [`CHANGELOG.md`](CHANGELOG.md) entry, taking the wording from the "已修复，待随版本发布" section of `TODO.md`, then delete those entries. Deriving the changelog from a list rather than from memory is the whole point of step 1 — this step is easy to skip, and 1.0.1 was released without an entry.
4. Push the tag. The release workflow refuses to publish if the tag does not match the `version` in `manifest.json`.

After the first release, routine updates only need a new release whose tag matches the manifest version — the community directory picks it up.
