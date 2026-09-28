# Security policy

## Supported versions

Only the latest release receives fixes. Please confirm the problem still reproduces on the newest version before reporting.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

- **Preferred:** report it privately through GitHub. Open the **Security** tab of this repository, then **Advisories → Report a vulnerability**. (This requires the maintainer to have private vulnerability reporting enabled; if the button is not available, use the fallback below.)
- **Fallback:** contact the maintainer through <https://github.com/Lose-Memory>.

Please include the Obsidian version, the plugin version, the operating system, and the shortest steps that reproduce the problem. The output of **Copy diagnostics** is useful here too.

This is a small, single-maintainer project, so please allow a few days for a reply.

## What this plugin does with your data

This is the context you need to judge whether something is actually a vulnerability:

- It reads image files from **one folder you configure**, plus its subfolders. That folder may live outside your vault. The plugin **never writes to it, never deletes anything, and never scans folders you did not configure**.
- It makes **no network requests** and collects **no telemetry**. Nothing about you or your notes leaves your machine.
- Images are loaded through `blob:` URLs, and each one is revoked as soon as it is replaced, so only the image currently on screen is held in memory.
- The only thing it stores is its own settings, in `data.json` inside the plugin folder in your vault. That file contains the folder path you configured and your appearance settings — no file names, no vault contents.
- It does not execute remote code. Updates only arrive through normal plugin releases.

## Scope

**In scope:** anything that lets a file be read outside the folder you configured, executes untrusted code, exfiltrates data, or escapes the plugin sandbox.

**Out of scope:**

- The visual result of a specific theme, or a wallpaper that looks tinted. See the "Making the theme background transparent" section of the [README](../README.md).
- The fact that the plugin uses Node's `fs` to read a folder you explicitly pointed it at. That is the feature, it is why the plugin is desktop-only, and it is disclosed in the README.
- Vulnerabilities in Obsidian itself or in a theme. Report those to their authors.
