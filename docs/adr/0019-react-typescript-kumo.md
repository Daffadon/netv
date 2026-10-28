# 0019 — React, TypeScript and Kumo replace the plain-script UI

* Status: accepted
* Date: 2026-10-28
* Supersedes: [0005](0005-no-build-plain-scripts.md), [0007](0007-cloudflare-deploy.md)

## Context

The page grew to a 900-line renderer, a second walkthrough, quizzes, per-chapter boards, a
zoomable map and a themed drawer. Every panel was built by hand with `document.createElement`, and
the Cloudflare console look was a local stylesheet with its own tokens. The user asked for a React
and TypeScript refactor on Cloudflare's design system.

The data contract is separate from the renderer: scenario files are a freeze-checked contract
(`docs/data-schema.md`) and `tools/validate.js` reads them as plain scripts. That contract should
not move into TS without a build-aware validator.

## Decision

* **Vite + React 19 + TypeScript** for the app. `src/main.tsx` owns the root; `src/App.tsx` owns the
  shell and keyboard; `src/useJourney.ts` owns step state, playback, hash routing, theme and quiz.
* **Kumo** (`@cloudflare/kumo` 2.x) supplies buttons, badges, tables, links, typography and the
  collapsible legend, with its standalone stylesheet imported before the app stylesheet. The app
  CSS uses Kumo semantic tokens (`--color-kumo-*`, `--text-color-kumo-*`) and adds only the board,
  topology, packet and drawer layout Kumo does not provide.
* **The animation stays imperative** in `src/anim.ts`. It is a timeline over SVG transforms and
  timers; React renders the map and hands the animation one empty `<g>` and one stack host. This
  keeps the timeline deterministic instead of turning every frame into state.
* **Data stays plain JavaScript.** `src/scenarios.ts` imports `src/schema.js` and each data file
  for its side effect, so `NETV` is populated before the app reads it. `tools/validate.js` still
  runs the same files under `node:vm`.
* **The deploy target is `dist/`.** Vite builds the site; Wrangler uploads only that directory. The
  `.assetsignore` file is no longer needed.

## Consequences

* `file://` double-click is gone. The app needs a server (`npm run dev`, `npm run preview`) and an
  `npm install` once. This is the trade the user asked for.
* `index.html` is the Vite entry, not the app. The validator checks that it loads `/src/main.tsx`,
  that `src/scenarios.ts` imports `schema.js`, and that every data file on disk is imported.
* The browser smoke test now uses Playwright against `dist/` instead of jsdom against classic
  scripts. It drives the real bundle, so it also catches bundler and CSS failures.
* TypeScript strict mode covers the app; JS data files are `allowJs` and unchecked, so the data
  contract still belongs to the validator.
* Kumo's palette is blue-branded rather than the previous orange-accented local theme. The
  topology's header colours remain custom because they are per-protocol data, not semantic status.

## Rejected

* **Keep both UIs** — two renderers over one engine doubles the surface and lets the tests drift.
* **Port the animation to React state** — a 300 ms wrapper, a 430 ms glide and a 1.5 s dwell per
  step would cause a render per frame and make interruption harder.
* **Convert the data to TS modules** — the validator, the frozen schema and the RFC table would all
  need a TypeScript runner for no reader benefit.
