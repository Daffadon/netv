# 0006 — Steps are declarative data; the engine derives the visuals

* Status: accepted
* Date: 2026-10-13
* Deciders: assistant (design constraint from the brief: "later will add other protocol")

## Context

The obvious way to build this page is to hand-write one panel of HTML per step. It is also the
way that makes protocol #2 a rewrite, because everything that is not content — which layer glows,
which boxes nest inside which, where the marker sits — is then entangled with the prose.

The user stated up front that more protocols and use-cases follow.

## Decision

A step is a plain object (`docs/data-schema.md` §4) holding facts only: what happens, where, which
OSI rows are active, which header fields exist, what the prose says, which RFC sections back it.

The engine derives every visual from those facts:

* encapsulation boxes come from the `fields` keys, rendered in one fixed catalogue order;
* the layer panel maps the step's `osi` array onto a fixed OSI↔TCP/IP table (`docs/glossary.md` §1),
  so no step ever prints a bare "layer 5";
* the marker position comes from `hop`, and the CSS/SVG/HTML are one implementation shared by every
  step and every future scenario.

There is no inheritance between steps: a step carries the complete values it wants to show. The
redundancy is deliberate — it keeps each data file readable on its own, and it removes the class of
bug where an earlier step's omission silently changes a later one.

## Consequences

* A new protocol is a new data file plus a script tag, with no engine change.
* Adding a visual idea means changing the engine once, for all scenarios at once.
* Repetition in the data files. Accepted: the alternative is hidden cross-step coupling.
