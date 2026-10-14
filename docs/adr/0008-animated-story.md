# 0008 — An animated story, not a dashboard

* Status: accepted
* Date: 2026-10-13
* Deciders: user, after using the first build
* Supersedes parts of: 0004 (step wizard)
* Superseded in part by: 0011 (the board) — the caption card became a line on the board

## Context

The first build put everything on screen at once: a header panel, a layer table, the full packet, a
note, the citations, a 26-item chip list and a footer. Every fact was correct and every fact was
simultaneously visible. The user's verdict: *"too technical … it's so confuse to see and to learn. I
want it to easily watch and learn with animation. not just step by step like that."*

The content was not the problem — the RFC citations and the header-level detail were requested
explicitly (ADRs 0002, 0003) and are the reason this is more than a slideshow. The problem was
that precision was on the critical path of a first-time reader, and that nothing moved.

## Decision

The default surface is a narrated animation that plays itself:

* **One caption at a time.** A new `say` field on every step carries a single plain-language
  sentence, 6–20 words, no acronyms, set as the largest text on the page. It is the whole story for
  somebody who never clicks anything.
* **Everything technical moves behind one disclosure.** `explain`, the field-by-field packet, the
  per-hop changes, the caveat and the RFC citations live in a closed `<details>` drawer.
* **The picture animates.** The packet glides hop to hop; each header wraps around the payload from
  the inside out and unwraps on arrival, one outline per layer; the TTL ticks down and a badge
  floats off every router it crosses; the destination peels the wrappers off in reverse.
* **The map grows with the story.** Nodes and links the journey has not reached yet are dimmed to
  18% opacity, so the full Internet topology is introduced rather than presented.
* **Chapters instead of a step list.** Six chapter pips plus a 26-segment progress bar with tooltips
  replaces the 26 chips.
* **It plays on arrival** (except on a deep link, and except under `prefers-reduced-motion`), with
  Play/Pause, a 1× / 1.5× / 2× speed control, and `←` `→` `space` `Home` `End` keys.
* **Motion is optional.** Under `prefers-reduced-motion: reduce` nothing animates: the finished
  packet appears, the captions still change, and the story advances on a fixed dwell.

No step file describes any of that motion. It is derived from `fields`, `hop`, `dir` and the
scenario constants, which keeps ADR 0006 intact: a protocol added later animates with no new code.

## Consequences

* `say` had to be written for all 26 steps, and `tools/validate.js` now rejects a step without one
  (word count, sentence stop, no filler, no shouted acronym).
* The validator also gained the arithmetic check that a packet crossing four routers arrives with
  `TTL 60` when the next step says it does — the animation displays a computed TTL, so the content
  has to agree with the computation.
* The smoke test asserts the derivation rather than the pixels: for every step, the wrappers drawn
  must be exactly the headers the data declares, and one step is timed to confirm the packet really
  does move from the first node to the last and the TTL really does reach 60.
* Animation is CSS transitions driven by a JavaScript timeline, so it stays inspectable and needs no
  canvas, no video file, and no library. The page still opens from `file://` with no build step.
* The technical detail is one click away rather than gone. If a learner never opens the drawer they
  get the story; if they do, nothing was removed to make room for it.

## Rejected

* **Keeping the dense layout and adding animation.** Motion would have competed with nine panels of
  text for attention instead of carrying the story.
* **Removing the technical detail.** It is why the page is trustworthy, and the user asked for it
  in the first place — folding it away keeps both audiences.
* **Scrolling narrative** (again — see ADR 0004). A single hop still needs to be linkable.
* **A rendered video or animated GIF export.** Unmaintainable against a live data model, and it
  would throw away the deep links.
