# 0018 — One step per header, so the packaging can be stopped at each layer

* Status: **accepted and implemented.** Two steps replaced by six: `encapsulation-down` becomes
  `wrap-tcp`, `wrap-ip` and `wrap-frame`; `response-encapsulated` becomes `response-wrap-tcp`,
  `response-wrap-ip` and `response-wrap-frame`. The HTTP walkthrough is 30 steps instead of 26, and
  the speed button gained a slower level.
* Date: 2026-10-14
* Deciders: user ("make it slower for step by step ... for every packaging of packet. better to
  make it step by step so user can stop in each layer")
* Builds on: 0006 (declarative steps, motion derived from data), 0008 (the animated story),
  0014 (learner vocabulary)

## Context

Wrapping a request was one step that added four headers in about a second: the animation reveals the
rails inside-out at 300 ms each, and the reader who wants to look at one layer has to catch it. The
story's own unit — the step — was the wrong size for the thing being taught.

## Decision

* **The step is the layer.** Each header a packet gains (or loses) is now its own step, with its own
  fields, caption, explanation and citations: the TCP header, then the IP header, then the frame, on
  the way out; the same three on the way back. The map shows one more wrapper per step, the stack
  under the map grows by one row, and the packet inspector lists the header that just went on.
* **Nothing in the engine changed for it.** The animator already derived the wrap order from the
  step's own `fields` (ADR 0006), so a step declaring `{ tcp, http }` wraps exactly those two and
  the next step declares one more. The layer rail lights what that step uses.
* **A slower level, not a slower default.** `SPEEDS` now runs `0.5, 1, 1.5, 2`, so a reader who
  wants time to read can halve the pace with two clicks of the speed button while the default stays
  at real time for everyone else.
* **The frozen parts moved with it**: `docs/data-schema.md` §7, the step list in
  `tools/validate.js`, and the counts in `tools/smoke.mjs` (200-level assertions, delivery-mode
  tallies, the deep link to the last step). The field, citation and style rules were not touched, so
  every new step had to satisfy the same validator.

## Consequences

* Six steps carry what two did, so the walkthrough is longer; the per-layer steps are short (the
  packet does not travel in them) and each one stops on a single idea.
* `wrap-frame` and `response-wrap-frame` are the steps that reach the wire, so the frame is what
  travels in them; the two inner layers are local work that keeps the packet where it is.
* The step ids for the old two are gone — bookmarks to `#/http/encapsulation-down` land on the first
  step of the walkthrough, since an unknown id is ignored by the router.
