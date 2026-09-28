# Third-party notices

This project is distributed under the [MIT License](LICENSE). It also contains material from the project below, whose notice is reproduced here as its license requires.

## obsidian-sample-plugin

- Source: <https://github.com/obsidianmd/obsidian-sample-plugin>
- License: **ISC**
- Copyright (C) 2020-2026 by Dynalist Inc.

The project scaffold of this repository originates from the Obsidian sample plugin: the build configuration, the GitHub Actions workflows, the editor and TypeScript configuration, the version-bump script and the overall project layout are derived from it and have been modified since. `src/main.ts`, `src/settings.ts`, `README.md`, `manifest.json`, `styles.css` and `LICENSE` started from the sample plugin's counterparts and have been substantially rewritten for this plugin.

The following files are affected:

```
.editorconfig
.github/workflows/lint.yml
.github/workflows/release.yml
.gitignore
.npmrc
AGENTS.md
esbuild.config.mjs
eslint.config.mts
manifest.json
package.json
tsconfig.json
version-bump.mjs
versions.json
```

### ISC License

```
Copyright (C) 2020-2026 by Dynalist Inc.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Design references

The background model of this plugin — opacity, blur, size modes, blend modes, folder-based random rotation and the "load only the current image" memory strategy — was informed by [vscode-background-cover](https://github.com/AShujiao/vscode-background-cover) (MIT, © 2021 ashujiao) and [obsidian-dynamic-theme-background](https://github.com/sean2077/obsidian-dynamic-theme-background) (MIT, © 2025 Sean2077).

**No source code from either project is included in this repository.** They are listed here for transparency and credited in the [README](README.md#credits); the attribution is given because it is the right thing to do, not because a license compels it.
