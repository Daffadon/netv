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

## Run it

Double-click `index.html`. Nothing is fetched over the network and there is no build step.

To serve it instead — useful to open it from a phone on the same Wi-Fi:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

Step URLs live in the fragment (`#/http/tcp-syn-ack`), which never reaches the server. That is why
a plain static host is enough: there is no SPA fallback rule to write and no Worker code to deploy.

## Deploy to Cloudflare

The site is 15 static files: `index.html`, `styles.css`, `src/*.js`, `data/*.js`.

```sh
npx wrangler login     # once; in WSL it prints a URL to open in your Windows browser
npx wrangler deploy    # reads wrangler.jsonc -> https://netv.<your-subdomain>.workers.dev
```

`wrangler.jsonc` declares the repository root as the assets directory, and `.assetsignore` keeps the
development files off the public site — `docs/`, `tools/`, `README.md`, `wrangler.jsonc` and
wrangler's own `.wrangler/` are not uploaded. Verified against a real local server: `/`,
`/styles.css` and `/src/ui.js` return `200`, while `/docs/glossary.md` and `/tools/validate.js`
return `404`.

Preview exactly what the deploy will serve, before deploying:

```sh
npx wrangler dev       # http://127.0.0.1:8788
```

Notes:

* Requests to static assets are free and unlimited, and there is no Worker script here, so nothing
  is billed per request.
* `/` serves `index.html`. `/index.html` 307-redirects to `/` (the documented default
  `html_handling`), and a link's fragment survives that redirect — so share
  `https://<host>/#/http/<step-id>`.
* Attach your own domain in the Cloudflare dashboard after the first deploy.

Alternative with no configuration file at all — Cloudflare Pages:

```sh
npx wrangler pages deploy . --project-name netv
```

Pages has no `.assetsignore`, so that also publishes `docs/` and `tools/`, and a direct-upload
project cannot be switched to git integration later. Workers static assets is the better default
for this layout.

## What is on screen

The canvas is the page. It plays itself — press **▶ Play** (or just leave it) and watch one line at
a time as the packet crosses the network.

Controls: **Play/Pause**, **◀ ▶** for one step at a time, a **speed** button (0.5× / 1× / 1.5× / 2×), the
three chapter tabs in the top bar (**DHCP** steps 1–6, **DNS** 7–9, **HTTP** 10–30), the 30-segment
progress bar along the bottom edge, or the keyboard — `←` `→`, `space`, `Home`, `End`.

* **The two walkthroughs** — the top bar switches between **HTTP** (30 steps in three chapters) and
  **Routing** (25 steps in two). Routing is drawn on two canvases: OSPF works inside one provider
  network — four routers, two of them on one shared segment — and BGP on the two networks and the
  two links between them, which is what lets a route policy change move the traffic from one link
  to the other. The step URL carries which walkthrough it belongs to
  (`#/routing/bgp-open`), so a chapter can be linked to directly.
* **The canvas** — the map on a dotted field, filling everything under the top bar. Drag it to pan:
  the map floats in a canvas a little larger than the view, so a drag has somewhere to move it even
  at 100%, where the map already fits the width. **− / +**, `ctrl`/`⌘` + wheel, or **Fit** to zoom;
  **Fit** brings the whole map back into view and centres it again. When a step carries figures of
  its own — a routing table, two offers compared — they are drawn in a column beside the map rather
  than in the drawer, and stay there for the rest of the chapter with a line saying which step they
  came from, so the messages that follow the calculation are watched with the figure still in view.
  On a phone the column moves under the map.
* **The packet** — it glides from node to node, and every node is drawn as the thing it is: a
  laptop, a switch, a router, a server, a nameserver, not a labelled box. Each layer wraps itself
  around the payload from the inside out, and the destination peels the wrappers back off one at a
  time. Under the map the headers stack up field by field as they are added. A line on the packet
  says how it travels: **unicast** traces the one link it crosses, while **broadcast** and
  **multicast** ring at every station that reads them. When the packet is routed, the TTL ticks down
  and a badge floats off every router it crosses. Parts of the map the story has not reached yet
  stay dimmed, so the topology is introduced rather than dumped, and a line the story has to earn —
  the laptop's address — is not printed until the step that hands it over.
* **The bar over the canvas** — the transport buttons, the layer rail, and the zoom controls. The
  rail shows the four TCP/IP rows (Application, Transport, Internet, Link) and lights the ones this
  step uses; OSI's Presentation and Session rows are gone, because nothing in the scenario uses them.
* **The caption line** — one plain sentence above the progress bar, prefixed with the chapter and
  step number (`DNS · step 9 of 30`), so the story is never watched blind. It is the whole story for
  somebody who never opens anything.
* **“Step details”** — a panel that opens over the canvas from the right (a sheet from the bottom on
  a phone). While it is open the map is re-fitted beside it, so nothing is covered. On the first
  step it opens with a *Before we start* line saying what the walkthrough is about. Then an
  **analogy in plain words**, the precise explanation, the field-by-field headers walked in the
  order the animation takes (one layer under the next, on the way out the innermost header first, on
  the way in the outermost first, each cell arriving under the delivery mode for the step) with a
  plain-language hint under every field name, the per-hop changes, the caveat, the RFC sections that
  define the behaviour, and a *Who is who on the map* legend for the map's own vocabulary. A field
  that changed since the previous step is highlighted.
* **Hover help** — every device on the map and every layer row in the bar explains itself in a
  tooltip, from the same sentences the drawer shows.

With **`prefers-reduced-motion: reduce`** set, nothing animates: the finished packet appears, the
captions still change, and the story advances on a fixed dwell.

## Layout

```
index.html                 script tags in load order
styles.css
wrangler.jsonc             Cloudflare deploy config (Workers static assets, no Worker script)
.assetsignore              development files kept off the deployed site
src/schema.js              closed vocabularies: header catalogue, field names, OSI/TCP-IP table
src/engine.js              step state, playback, URL routing
src/ui.js                  all DOM rendering; every visual is derived from step data
src/anim.js                the animation timeline: the packet, the wrapping, the TTL badges,
                           the field-by-field stack and the delivery animation
data/scenario-http.js      topology, phases, framing text
data/http/*.js             the 30 steps, one file per phase
data/scenario-routing.js   the routing walkthrough's two maps, one per chapter
data/routing/1-ospf.js     the 10 OSPF steps
data/routing/2-bgp.js      the 9 BGP steps
tools/validate.js          schema check — run this after touching any data file
tools/smoke.mjs            optional: renders the real page in jsdom and drives it
docs/glossary.md           domain model: the two layer models, PDU names, roles
docs/data-schema.md        the frozen data contract + the verified citation table
docs/adr/                  why the scope, depth, stack and interaction are what they are
```

## Adding another protocol

A new scenario is data, not code. Write `data/<name>.js` calling `NETV.defineScenario({...})`
with its own nodes, links and phases, add step files that call `NETV.addSteps('<name>', [...])`,
add the `<script>` tags to `index.html`, and add its entry to the tables in `tools/validate.js`.
The engine, the layer panel, the nesting of header boxes and the packet inspector are all shared —
no visual code changes for a second protocol. The top bar grows a tab for it by itself, in script
order. The animation is derived too, so a new protocol moves correctly without touching
`src/anim.js`; the delivery animation comes with it, because unicast, broadcast and multicast are
read off the addresses the step declares, and the remaining TTL is read off the routers a hop
passes through. A scenario whose chapters need different maps declares `boards` instead of
`nodes`/`links` — the routing walkthrough has one canvas per chapter, and `NETV.boardOf` is what
the engine, the animation and the validator read the map through.
Every step needs the required fields including `say`, the one plain-language caption — the
validator rejects a step without one.
Any data file whose name changes must also be listed in `tools/validate.js`.

## Checks

```
node tools/validate.js
```

Zero-dependency. It enforces the step list and its order, the schema, the closed set of header
fields, the whitelist of verified RFC sections, the scenario constants (an invented TTL fails), and
that `index.html` loads every data file.

```
mkdir -p /tmp/netv-dom && cd /tmp/netv-dom && bun add jsdom
JSDOM_PATH=/tmp/netv-dom/node_modules/jsdom node tools/smoke.mjs
```

Optional, and needs `jsdom` installed outside the tree so the page itself stays dependency-free.
It renders the page over `http://` and from `file://`, walks all 30 HTTP steps and all 25 routing
steps, and checks that each chapter is drawn on its own canvas.

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
