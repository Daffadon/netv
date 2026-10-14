# 0011 — The map is the page; the step detail moves into the drawer

* Status: accepted
* Date: 2026-10-14
* Deciders: user, after watching the animated story
* Supersedes parts of: 0008 (the caption card)

## Context

ADR 0008 put a caption card *beside* the map: chapter and counter, a 27px sentence, the step title,
then the controls. Reading down the page, the map was one card among four, and the largest text on
the page was prose about the packet rather than the packet. The user's verdict: *"let's change the
UI to focus on the packet and just see details in the step when open the drawer. better to make the
diagram or flow like in the canvas."*

An actual `<canvas>` was on the table and was weighed and rejected: the whole animation (wrapping
rails, TTL badges, broadcast rings, the field-by-field stack) is CSS transitions over DOM elements,
the smoke test asserts that DOM, and text drawn into pixels loses selection and screen-reader
access to a map that is the point of the page. What was wanted from "canvas" was the *feel*: a
board that fills the window, that you can pan and zoom, with the drawing at the centre of it.

## Decision

* **The canvas is the screen.** Everything under the slim top bar is the board: no card, no
  max-width, no page padding, no page scroll. The map sits on a dotted field with one toolbar bar
  across the top of it — transport on the left, the layer rail in the middle, zoom on the right —
  and three thin strips at the bottom: the field-by-field stack, the caption line, and the 26-step
  progress bar as the bottom edge of the screen.
* **The explanation is a panel over the canvas.** The drawer is a right-hand panel (a bottom sheet
  under 720px) that opens over it and scrolls inside itself; when it is open the canvas is inset by
  the panel's width and the map is re-fitted into what is left, so the packet stays in view while
  the text is read. Closed, it is a small *Step details* tab in the corner of the canvas.
* **Pan and zoom.** Drag to pan, `− / +` and `ctrl`/`⌘` + wheel to zoom (0.4× to 3×, anchored on
  the middle of the view), **Fit** to show the whole map again — 100% fills the width, and less if
  the canvas is shorter than the map's own proportion. Panning is the scroll container's own
  scrolling with the scrollbars hidden, not a transform, so the SVG stays vector-crisp and the
  packet's own `transform` transitions keep working.
* **The caption is a line on the canvas.** `say` stays the story for somebody who opens nothing, but
  it is a 15px line above the progress bar, not the largest text on the page. Everything else — the
  chapter and counter, the step title, the explanation, the per-hop changes, the caveat, the RFC
  citations, and the field-by-field header walk with its delivery mode — is inside the panel.
* **The field-by-field stack is a strip under the map, not in the panel.** It is not prose about
  the packet, it is the packet: the headers currently wrapped around the payload, one row each,
  appearing as they wrap and leaving as they unwrap. The one thing worth watching with the panel
  closed.

## Consequences

* The element ids (`#say`, `#phase`, `#counter`, `#subtitle`, `#detail`, `#rail`, `#stack`) are
  unchanged, so `renderCaption`, `renderRail`, `renderDetail` and `anim.js` needed no rework — only
  where they land on the page changed.
* `tools/smoke.mjs` gained assertions for the new contract: the caption is inside the board, the
  step head is inside the drawer, and zoom in / zoom out / Fit move the SVG's width and the readout
  (100% → 125% → 100%).
* Panning is the one thing the jsdom harness cannot exercise — jsdom has no layout, so `scrollLeft`
  never moves. It was verified in a real browser by driving the handlers with synthetic pointer
  events and reading the resulting scroll offsets back (drag of (−120, −40) moved the scroll by
  exactly (120, 40) at 156% zoom, and the ±/Fit/ctrl-wheel paths followed).
* The panel is a fixed overlay inset from the canvas, so two CSS traps are worth knowing: a
  horizontal strip inside a grid item will widen the item to its intrinsic width unless the item is
  given `min-width: 0` (the field-by-field cells), and a media query placed before the rule it means
  to override loses on source order (the phone sheet had to move to the end of the stylesheet).
* The page is now `height: 100dvh` with `overflow: hidden`, so nothing scrolls except the canvas
  and the panel.

## Rejected

* **A real `<canvas>` renderer.** See Context: it would trade the CSS animation layer, the DOM
  contract the smoke test asserts and text accessibility for smooth panning of 11 nodes.
* **Keeping the caption card above the board.** It is exactly the competition for attention the
  user asked to remove.
* **An auto-following camera that recentres on the packet.** It would fight the user's own panning,
  and the packet is on screen at the default zoom anyway.
* **Native scrollbars.** They cost width and read as a document rather than a board.
