# 0016 — The chrome is a Cloudflare console, not a marketing page

* Status: accepted
* Date: 2026-10-14
* Deciders: user — *"let's redesign by taking reference to cloudflare consoles"*

## Context

The page was themed generically: a blue accent (`#2563eb`) doing duty for links, primary buttons,
the current tick, the active node and the traversed link at once; 16px panel radii; 10–30px soft
shadows; 999px pill tabs; and a page-sized dotted field on a `#f4f6f9` wash. None of it was wrong,
but the thing on screen is not a marketing page — it is an operator readout: a topology, a field
table that changes one row at a time, a hop list, RFC citations. That genre has a house style, and
the Cloudflare dashboard is the reference the user named.

The reference is a token system, so this was a stylesheet change, not a code change. Its relevant
values: brand orange `#F6821F` (hover `#E2700B`, pressed `#D9700F`, tint `#FDF3E7`, orange text
`#C2670F`), canvas and panels `#FFFFFF`, recessed `#F7F7F7`, hairline `#EDEDED`, strong border
`#D9D9D9`, charcoal `#1D1F20` / body `#36393A` / muted `#717174`, dark mode `#15171A` canvas,
`#262A2E` panel, `#3A3F44` border, orange unchanged; radii 4 / 6 / 8 / 12px; one subtle elevation
(`0 1px 3px rgba(0,0,0,.06)`); 14px/600 buttons, 12px/600 uppercase section eyebrows with 0.06em
tracking, 13px mono for anything an operator reads exactly; and a focus ring of 3px
`rgba(246,130,31,.2)`.

## Decision

* **Orange is the action, and only the action.** It fills the primary button, the rule under the
  open chapter tab, the current tick, the acting node's glyph, the traversed link, the current
  packet's TTL, and the tint of the analogy block. Everywhere else is charcoal on white with 1px
  hairlines.
* **A second orange for orange text.** `#F6821F` on white is 2.9:1, fine for a 2px rule or a
  3.5px stroke, not for text. Small orange text — `#phase`, `.say-where`, the acting node's label,
  the TTL chip, the packet's mode badge, a chevron — takes `--accent-text` (`#C2670F` light,
  `#FAAD3F` dark), which is the reference's own orange-on-tint pairing.
* **Links stay blue.** `--link` (`#0051C3`, Kumo's link token family) is split from `--accent`, so
  an RFC citation reads as a citation and not as an action, and the top bar keeps exactly one
  orange thing to look at.
* **Borders before shadows.** Panels, the drawer, packet cells and the legend are 1px `#EDEDED` on
  white; `--shadow` is the single `0 1px 3px rgba(0,0,0,.06)` and is used only by `.card`, the
  closed *Step details* tab and the selected segment. Radii are the reference ladder: 8 for panels,
  cells and buttons, 6 for the compact toolbar controls and chips, 999 for badges and the meter.
* **The top bar is a console header.** 56px, white, hairline under it: an orange gradient mark
  beside the wordmark (the one gradient in the page), the walkthroughs as a recessed segmented
  control, the chapters as underline tabs with a 2px orange rule under the open one, and the
  walkthrough's subtitle as muted 13px text on the right. `index.html` only reordered the subtitle
  behind the chapter tabs, so the two navs sit together.
* **The toolbar uses the reference's small button** (13px, 6px radius), and the tick bar becomes a
  meter: a hairline track, 7px pills, the steps behind filled with 30% brand and the current step
  solid brand. Hover on a future step is a `#D9D9D9` track, never orange.
* **The drawer keeps its shape** (right panel, bottom sheet under 720px, ADR 0011) and takes the
  reference's typography: 12px/600 uppercase eyebrows at 0.06em, hairline rules between header,
  step head and the field table's rows, a recessed sticky header when open.
* **The protocol series is untouched.** `--c-eth` … `--c-bgp` are the map's legend and the label
  on each packet cell; ten hues do the work orange must not compete with.
* **Dark mode follows the reference's elevation rule** — canvas `#15171A`, panel `#262A2E`,
  recessed `#1E2226`, hairline `#2E3338`, border `#3A3F44`, text `#E4E6E7`, muted `#9BA1A6`, and
  the orange holds unchanged. The palette is picked by `data-theme` on `<html>`, not by a media
  query: **Auto** resolves `prefers-color-scheme` (and keeps listening, so a machine that changes
  under the page is followed), **Light** and **Dark** pin one of the two, and the choice is kept in
  `localStorage`. `color-scheme` is set with the palette, so scrollbars and native widgets match.

## Consequences

* The theme switcher is three `.pip` buttons at the right end of the top bar, the same recessed
  segmented control as the walkthroughs. `styles.css` shares those rules between `#scenarios` and
  `#themes` and moved the second palette from a `@media` block to `:root[data-theme="dark"]`;
  `src/ui.js` gained `wireTheme()` and `applyTheme()`. `tools/smoke.mjs` asserts the three choices,
  which palette each puts on `<html>`, and that the choice is stored.
* The change is confined to `styles.css` (tokens, then chrome) plus one element order in
  `index.html`. No hex value lives in `src/*.js`, so the map, the packet and the animation followed
  the tokens without an edit; `tools/validate.js` and `tools/smoke.mjs` pass unchanged (113
  assertions).
* New tokens exist for the parts the old single `--accent` was overloading: `--accent-text`,
  `--accent-hover`, `--accent-press`, `--accent-soft`, `--accent-dim`, `--ring`, `--link`,
  `--hairline`. `--border` now means the *strong* border (`#D9D9D9`); rules inside a panel are
  `--hairline`.
* A stylesheet audit is part of the change: every `var(--x)` must resolve. jsdom cannot check
  layout, so the verification was a real headless Chrome at 1440×900 and 390×844, in both colour
  schemes, with the drawer open — the four states the redesign could have broken.
* The closed *Step details* tab floats over the canvas corner as it always has. Its offset is
  measured against the tool bar inside `.app`, not against the top bar, so the taller header does
  not push it onto the map's first row.

## Rejected

* **Loading Inter and JetBrains Mono from a CDN.** The page's contract is that nothing is fetched
  over the network and it opens from a `file://` URL (ADR 0005). Both are named first in the font
  stacks, so they are used where the machine already has them, and the system stack covers the
  rest.
* **A ~240px left nav rail**, as the reference has. The map is the page (ADR 0011); a permanent
  rail would take canvas width to hold two links.
* **Recolouring the protocol series into the brand palette.** The ten `--c-*` hues are the legend
  for the headers; pulling them toward orange would collapse the distinction the packet cells and
  the field stack exist to show.
* **Kumo's own interactive token, which is blue.** It is a real divergence in the reference, but
  the surface being matched — the dashboard and marketing pages — ships orange for its primary
  action, and the walkthrough has exactly one.
* **Gradients, shadows, glass and pill tabs.** The reference's restraint is the point: one orange
  action, hairline structure, and a single elevation reserved for layers that genuinely float.
