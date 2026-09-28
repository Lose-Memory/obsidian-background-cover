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
  diagnostics.ts  # the "Copy diagnostics" report
styles.css        # all styling; every class is prefixed bgc-
manifest.json     # plugin manifest (id: background-cover)
```

## Constraints that cannot be relaxed

These come from Obsidian's [Developer policies](https://docs.obsidian.md/community-directory/developer-policies) and are checked during review. A pull request that breaks one of them will not be merged.

- **No network access.** No `fetch`, no `requestUrl`, no downloads, no online gallery. The plugin is entirely offline.
- **No telemetry of any kind**, and no accounts.
- **Never execute remote code** or fetch and evaluate scripts.
- **Do not modify theme CSS variables.** The background layer must stay an independent overlay. The single exception is the opt-in **Make theme background transparent**, which must remain off by default, must stay scoped to `.workspace` (so modals and menus are untouched), and must be fully reverted on unload.
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

1. `npm version <x.y.z>` — the `version` script updates `manifest.json` and `versions.json`. `.npmrc` sets `tag-version-prefix=""`, so the tag is the bare version with no `v` prefix.
2. Add the entry to [`CHANGELOG.md`](CHANGELOG.md).
3. Push the tag. The release workflow refuses to publish if the tag does not match the `version` in `manifest.json`.

After the first release, routine updates only need a new release whose tag matches the manifest version — the community directory picks it up.
