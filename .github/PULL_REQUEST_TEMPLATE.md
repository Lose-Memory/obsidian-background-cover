<!--
Keep this short. The checklist plus one paragraph on how you verified the change
is enough — the full explanation of the project's constraints lives in
CONTRIBUTING.md, and there is no need to repeat it here.
-->

## What this changes

<!--
One or two sentences. If there is an issue, link it on its own line:
"Fixes #12" — that closes the issue when the pull request is merged.
-->

## How I verified it

<!--
There is no automated test suite in this repository, so this section matters
more than usual. Name the theme, light or dark mode, the window mode (frameless
or native frame), and whether "Make theme background transparent" was enabled.
If you only changed documentation, just say so.
-->

## Checklist

- [ ] `npm run build` passes (TypeScript type check + esbuild bundle).
- [ ] `npm run lint` reports **0 errors**.
- [ ] If this changes rendering, blend modes, z-index or theme transparency, I described above how I verified it and on which theme.
- [ ] If this adds a user-visible string, it was added to **both** `EN` and `ZH` in `src/i18n.ts` (a missing `ZH` key is a compile error).
- [ ] This adds no network access, no telemetry, no remote code and no wider file access, and modifies no theme CSS variable outside the existing opt-in setting.
- [ ] Every new listener, interval and blob URL is cleaned up on unload.

## Notes for the reviewer

<!-- Optional: trade-offs, things deliberately left out, follow-up work. -->

---

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the constraints that apply to changes, the UI text rules and the release process.
