# 0005 — No build step: plain scripts, no ES modules, no dependencies

* Status: accepted
* Date: 2026-10-13
* Deciders: user (grilling round 1)

## Context

This is a teaching artifact that must be shareable. The realistic distribution paths are "send
someone the folder", "open it from a USB stick", and "put it on any static host".

Browsers refuse to load ES modules over `file://` (module scripts are fetched with CORS, and the
origin is `null`). `fetch()` of a local JSON file fails the same way. A React/Vite build would
require `npm install` before anyone could open it at all.

## Decision

Multiple small files, wired by plain `<script>` tags in `index.html`. No bundler, no package.json,
no network requests at runtime, no third-party code. Scenario data lives in `.js` files that call
`NETV.addSteps(...)` instead of being fetched.

Adding a protocol means adding one data file and one `<script>` line.

## Consequences

* Double-clicking `index.html` works, offline, forever. No toolchain to rot.
* Globals (`NETV`) instead of imports; script order in `index.html` defines step order, so a
  missing `<script>` tag silently drops a phase — the validator checks the expected step ids.
* No minifier, no tree-shaking, no TypeScript. Acceptable for a page of this size.
* `file://` has a second consequence the first draft missed: `history.replaceState()` throws a
  SecurityError on an opaque origin, which aborted the first render entirely — the page was blank
  when double-clicked. Step URLs are now synced inside a try/catch with a `location.hash`
  fallback, so URL tracking is a nicety and never a prerequisite for rendering.
* The only third-party module anywhere near this project is `jsdom`, used by the optional
  `tools/smoke.mjs` check and installed outside the tree. Nothing the page loads depends on it.

## Rejected

* **Single `index.html`** — works, but one 2000-line file mixing engine, UI and 26 steps of data is
  worse to maintain than four small ones, and this page is the template for every later protocol.
* **Vite + React + TS** — a build step and an `npm install` between the user and the artifact, for
  a UI that is one DOM tree and a few event listeners.
