# netv — how the Internet moves one HTTP request

A step-by-step visualization of what happens between pressing Enter on `http://daffapn.my.id/` and
the page appearing: DHCP, DNS, ARP, NAT, the TCP handshake, the HTTP exchange, and the teardown,
layer by layer and hop by hop. Wrapping gets one step per header, so the packaging of a packet is
watched a layer at a time and can be stopped at any of them. Every step cites the RFC section that
defines the behaviour.

A second walkthrough, **Routing**, continues from that same packet: how the provider's routers
agreed on a map of their own network before any of it could be forwarded (OSPF), and how two
networks told each other what they can reach (BGP). It is drawn on two canvases, one per protocol,
and it ends by forwarding the very packet the HTTP walkthrough sent.

The interface is React and TypeScript on Cloudflare's **Kumo** design system. Scenario and step
data stay in plain JavaScript so the validator can read the same files the browser runs.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173
```

Production build and preview:

```sh
npm run build        # typecheck + Vite build into dist/
npm run preview      # serve dist/
```

The old double-click `index.html` workflow is gone: the app is an ES-module bundle, so it needs a
local server. `npm run dev` and `npm run preview` are the supported ways to open it.

## Deploy to Cloudflare

```sh
npm run build
npx wrangler login   # once; in WSL it prints a URL to open in your Windows browser
npx wrangler deploy  # reads wrangler.jsonc -> https://netv.<your-subdomain>.workers.dev
```

`wrangler.jsonc` declares `dist/` as the assets directory. Only the compiled site is uploaded;
source, `docs/`, `tools/`, `node_modules/` and `wrangler.jsonc` stay out. There is no Worker script,
so static-asset requests are unlimited and free.

Preview exactly what the deploy will serve:

```sh
npx wrangler dev     # http://127.0.0.1:8788
```

Notes:

* `/` serves `index.html`. `/index.html` 307-redirects to `/`, and a link's fragment survives that
  redirect, so share `https://<host>/#/http/<step-id>`.
* Attach your own domain in the Cloudflare dashboard after the first deploy.
* Workers static assets is the better default here than Pages: a direct-upload Pages project
  cannot later switch to git integration.

## What is on screen

The canvas is the page. It plays itself — press **Play** (or leave it) and watch one line at a time
as the packet crosses the network.

Controls: **Play/Pause**, previous/next buttons, a speed button (0.5× / 1× / 1.5× / 2×, opening at the
slowest), the walkthrough tabs (**HTTP**, **Routing**), the chapter tabs inside each walkthrough, the
theme switcher (**Auto** / **Light** / **Dark**), the progress bar along the bottom edge, and the
keyboard — `←` `→`, `space`, `Home`, `End`.

* **The two walkthroughs** — HTTP has 30 steps in three chapters (DHCP, DNS, HTTP); Routing has 25
  steps in two (OSPF, BGP). Routing is drawn on two canvases. The step URL carries the walkthrough
  and step (`#/routing/bgp-open`), so any step can be linked to directly.
* **The canvas** — the map on a dotted field. Drag to pan; the map floats in a canvas a little
  larger than the view so a drag has somewhere to move even at 100%. **− / +**, `ctrl`/`⌘` + wheel,
  or **Fit** to zoom. When a step carries figures of its own — a routing table, two offers
  compared — they appear in a column beside the map and stay for the rest of the chapter, with a
  line naming the step they came from.
* **The packet** — it glides node to node, each layer wrapping around the payload from the inside
  out; the destination peels the wrappers back off. Under the map the headers stack up field by
  field. A line on the packet says how it travels: **unicast** traces the one link it crosses, while
  **broadcast** and **multicast** ring at every station that reads them. Routed hops tick the TTL
  down and float a badge off each router. Parts of the map the story has not reached stay dimmed.
* **The bar over the canvas** — transport, the four TCP/IP layer rows (Application, Transport,
  Internet, Link), zoom controls and the **Step details** toggle.
* **The caption** — one plain sentence above the progress bar, prefixed with the chapter and step
  number. It is the whole story for somebody who never opens anything.
* **Step details** — a panel that opens beside the canvas (a bottom sheet on a phone). It carries
  the preamble, an **analogy in plain words**, the precise explanation, the per-hop changes, the
  field-by-field headers in the order the animation takes (with a plain-language hint under each
  field), the caveat, the RFC citations, and a *Who is who on the map* legend. A field that changed
  since the previous step is highlighted. At a chapter boundary the panel opens a five-question
  quiz drawn from a ten-question bank; finishing or skipping continues into the next chapter.
* **The colour theme** — **Auto** follows the system, **Light** and **Dark** pin Kumo's palette, and
  the choice survives a reload in `localStorage`.

With **`prefers-reduced-motion: reduce`**, nothing animates: the finished packet appears, captions
still change, and the story advances on a fixed dwell.

## Layout

```
index.html                 Vite entry
vite.config.ts             React plugin, dist/ output
tsconfig.json              strict TypeScript
src/main.tsx               Kumo styles, app styles, React root
src/App.tsx                shell, keyboard, top-level state owner
src/app.css                board, topology, packet and drawer styling on Kumo tokens
src/useJourney.ts          step state, playback, URL routing, theme, quiz
src/anim.ts                the animation timeline: packet, wrapping, TTL badges, field stack
src/scenarios.ts           imports schema.js and every data file once
src/schema.js              NETV.addSteps / NETV.FIELDS / header catalogue (shared with the validator)
src/types.ts               scenario, step, board and quiz types
src/components/            TopBar, Board, Topology, BoardTable, Drawer, DetailPanel, QuizPanel
data/scenario-http.js      topology, phases, framing text
data/http/*.js             the 30 steps, one file per phase
data/scenario-routing.js   the routing walkthrough's two maps, one per chapter
data/routing/1-ospf.js     the 10 OSPF steps
data/routing/2-bgp.js      the 9 BGP steps
data/quizzes/*.js          ten questions per chapter
tools/validate.js          schema check — run after touching any data file
tools/smoke.mjs            browser smoke test for the built site
docs/glossary.md           domain model: the two layer models, PDU names, roles
docs/data-schema.md        the frozen data contract + the verified citation table
docs/adr/                  why the scope, depth, stack and interaction are what they are
```

## Adding another protocol

A new scenario is data, not UI. Write `data/<name>.js` calling `NETV.defineScenario({...})` with its
own nodes, links, phases and quizzes, add step files that call `NETV.addSteps('<name>', [...])`, then
import both in `src/scenarios.ts`. Add its entry to the tables in `tools/validate.js`. The top bar
grows a tab for it from the data, in import order. The engine, the layer rail, the nesting of header
boxes, the packet inspector and the animation are shared. A scenario whose chapters need different
maps declares `boards` instead of `nodes`/`links`; `NETV.boardOf` is what the UI, animation and
validator read the map through.

Every step needs the required fields, including `say`, the one plain-language caption — the
validator rejects a step without one. Any data file whose name changes must also be listed in
`src/scenarios.ts` and `tools/validate.js`.

## Checks

```sh
npm run validate     # data schema, step order, RFC whitelist, citations, imports
npm run typecheck    # TypeScript, no emit
npm run build        # typecheck + production bundle
npx playwright-core install chromium   # once, for the smoke test
npm run smoke        # drives the built site in Chromium
```

`tools/validate.js` is zero-dependency and runs the data files under Node. It enforces the step
list and its order, the schema, the closed set of header fields, the whitelist of verified RFC
sections, the scenario constants (an invented TTL fails), and that `src/scenarios.ts` imports every
data file.

`tools/smoke.mjs` serves `dist/`, walks all 55 steps, and checks each step's caption, citation,
progress tick, packet rails and field stack; it also drives the quiz, theme, zoom, table column,
deep links and autoplay. Set `CHROMIUM_PATH` if Chromium is not in Playwright's cache.

## Accuracy rules

* A step may only cite an RFC and section listed in `docs/data-schema.md` §6. Every entry there was
  read out of the RFC at rfc-editor.org; sections recalled from memory were checked and several
  were wrong.
* Facts with no RFC — Ethernet's frame check sequence, the 1500-byte MTU, EtherTypes — are
  attributed to IEEE 802.3 or the IANA registry by name, never given a fake RFC number.
* RFC 894 §Frame Format contains a typo ("minimum length of the data field … is 1500 octets"), so
  the MTU is attributed to IEEE 802.3 instead.
* Every address comes from a documentation range (RFC 1918, RFC 5737), so nothing the walkthrough
  shows can be dialled. The one real name is `daffapn.my.id`, and the address the walkthrough gives
  it is a documentation address: the step that answers the lookup says so, because a real lookup
  returns whatever the zone holds at that moment.
