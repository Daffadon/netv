# 0004 — Step-wizard interaction, with each step addressable by URL

* Status: superseded by 0008 (the wizard became an animated story)
* Date: 2026-10-13
* Deciders: user (grilling round 1)

> Still in force: one step per protocol action, and every step addressable as `#/http/<step-id>`.
> Superseded: the manual next/previous-only interaction, the always-visible packet tables, and the
> 26-chip step list. See ADR 0008 for what replaced them and why.

## Context

The content is a sequence of discrete protocol events. Two failure modes to avoid: a
continuous animation the learner cannot stop at the interesting moment, and a long scroll where
"what happens at hop 3" is hard to point at.

## Decision

One protocol action per step. Controls: previous, next, play/pause, and a jump-to-step list
grouped by phase. Each step is addressable as `#/http/<step-id>`, so a specific moment can be
linked or reloaded. State lives in the URL, not only in memory.

Animation is limited to a packet marker travelling along `hop`; nothing else moves.

## Consequences

* Explanations can be read at the learner's pace, and a single hop can be shared as a link.
* Step data must be ordered and each step id unique — enforced by the validator.
* Playback needs a timer that stops on interaction and on the last step; the wizard still works
  with JavaScript-backed navigation only, so no separate no-JS fallback is required.

## Rejected

* **Scroll-driven** — reads well as an article, but makes a single hop hard to link to and hard to
  pause at.
* **Auto-play only** — prettiest, least usable for reading a paragraph per step.
