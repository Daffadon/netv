# 0007 — Deploy as Workers static assets, with the repository root as the assets directory

* Status: accepted
* Date: 2026-10-13
* Deciders: user (asked how to run and deploy on Cloudflare)

## Context

The artifact is 11 static files with no server-side logic. Step routing lives in the URL fragment,
which is never sent to the server, so no rewrite or fallback rule is required.

Cloudflare offers two ways to serve this: **Workers static assets** (`assets.directory` in a
Wrangler config) and **Pages direct upload** (`wrangler pages deploy <dir>`). The layout choice is
separate: serve the repository root, or restructure the site into a `public/` directory.

## Decision

Workers static assets, configured in `wrangler.jsonc`, with the repository root as the assets
directory and a `.assetsignore` listing the development files (`docs/`, `tools/`, `README.md`,
`wrangler.jsonc`, `.wrangler/`). No Worker script, no `not_found_handling`, no build step.

## Consequences

Checked against a real `wrangler dev` server rather than assumed:

* `/` serves `index.html`; `/styles.css` and `/src/ui.js` return `200` with correct content types;
  `/docs/glossary.md` and `/tools/validate.js` return `404`, so `.assetsignore` is honoured.
* `/index.html` returns `307` to `/` under the default `html_handling`. A link's fragment survives
  that redirect, so `https://<host>/#/http/<step-id>` stays shareable.
* Requests to static assets are free and unlimited, and there is no Worker script, so nothing is
  billed per request.
* `.assetsignore` must list Wrangler's own `.wrangler/` directory: the tool reads its temp bundle
  out of the assets directory during a deploy, and without the entry those files are candidates for
  upload.
* Anything added at the repository root in future is public by default unless it is added to
  `.assetsignore`.

## Rejected

* **Pages direct upload** — one command and no config file, but there is no `.assetsignore`, so the
  docs and tooling would be published too, and a direct-upload project cannot later be switched to
  git integration.
* **Restructuring the site into `public/`** — clean separation, but it breaks the double-click story
  (the file to open would no longer be at the root) and buys nothing that `.assetsignore` does not
  already do.
* **A Worker script** — there is no dynamic behaviour to add. Routing the fragment through a Worker
  would add a billed request per page view for no benefit.
* **Bundling everything into one `index.html`** — deployable identically (the deploy target does not
  care how many files there are), but it would break `tools/validate.js` and `tools/smoke.mjs`,
  which load the file list explicitly, and it hides the step data that is the point of the project.
