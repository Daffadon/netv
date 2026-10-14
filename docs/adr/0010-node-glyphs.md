# 0010 — Nodes are drawn as the device, not as a box

* Status: accepted
* Date: 2026-10-14
* Deciders: user, after watching the animated story
* Builds on: 0006 (declarative steps), 0008 (animated story)

## Context

ADR 0008 dimmed the map until the story reached a node, but every node was still the same rounded
rectangle with a label and a sub-line: the laptop, the switch, the home router and the server were
visually identical, and only the text said which was which. The user asked for the devices
themselves — "let's not using the box like that but the real icon of like computer, switch, router
and server".

`kind` was already on every node in the scenario data (`host`, `switch`, `router`, `server`, `dns`)
and was used only for a CSS class. Nothing new had to be declared.

## Decision

* **One stroked glyph per `kind`,** drawn from a table of SVG primitives in `src/ui.js`: a laptop
  screen and base for `host`, a port box for `switch`, the four-arrow circle for `router`, a rack
  for `server`, a globe for `dns`. No box, no fill, no per-node markup — the same table serves every
  scenario, and a new `kind` is one entry.
* **The glyph carries the state colour.** Stroked-not-filled means `current`, `known` and `unknown`
  still work exactly as before, with the accent applied to the stroke and the label instead of to a
  box border.
* **Links meet the glyphs.** A link stops at the icon edge: sideways along a row at the glyph's
  centre line, straight down between rows, instead of the old box-to-box offset. No scenario change
  was needed, because a link already names two nodes and the geometry comes from their positions.
* **Layout stays in the same footprint** the boxes used: glyphs occupy the 42-by-32 space above the
  label, so the packet's reserved band below a node is untouched.

## Consequences

* `data/scenario-http.js` and `docs/data-schema.md` §3 now say that `kind` selects the glyph and
  that only `host`, `switch`, `router`, `server` and `dns` are defined.
* Labels and sub-lines are centred under a glyph rather than inside a box, so they still must stay
  short — nothing in the engine can measure or wrap them (ADR 0006).
* The `.node-box` rule and element are gone rather than kept alongside the icons: nothing in the
  codebase referred to them outside that one call site.
* `tools/validate.js` now rejects a node whose `kind` the map has no glyph for, so a new scenario
  cannot fall back silently to the laptop. The smoke test counts `.node` and `.link` elements, which
  the glyphs do not change.

## Rejected

* **An icon font or an external sprite sheet.** A font would need a build or a data URL (ADR 0005),
  and a sprite would add a fetch to a page that currently makes none.
* **Keeping the box as a highlight for the current node.** It would have re-introduced the exact
  shape the user asked to remove; the accent stroke and the label colour carry the state instead.
* **Unicode glyphs (💻 🖥 ⌨).** Emoji render differently on every platform and cannot take the
  state colour.
