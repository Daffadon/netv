# 0003 — Every step cites an RFC, with a section number that was actually read

* Status: accepted
* Date: 2026-10-13
* Deciders: user (grilling round 1)

## Context

The user asked for explanations that "cite what happened". A citation that is plausible but wrong
is worse than none: it teaches a learner to trust a fabricated source, and it is invisible to
anyone who does not open the RFC.

## Decision

Each step carries one or more citations of the form `{ rfc, sec, title }`, rendered as
`RFC 9293 §3.5 — Establishing a Connection` and deep-linked.

* `sec` is a string taken from a closed, verified list (`docs/data-schema.md` §6). A step may not
  cite an RFC or a section that is not on that list.
* Every entry on the list was read out of the RFC text at `rfc-editor.org` before being written
  down. Sections recalled from memory were checked; four were wrong and were corrected
  (RFC 9499, RFC 4271, RFC 4987, RFC 2606).
* Links use the `#section-X.Y` anchor form, which exists only on the 1988-and-later RFCs — the
  older ones (768, 826, 894) link to the document itself.
* Where a *fact* has no RFC — Ethernet's frame check sequence, the 1500-byte MTU, EtherTypes — it
  is attributed to IEEE 802.3 or the IANA registry by name, never given a fake RFC number.
* We do not inline RFC prose. The RFC is linked instead: less copyright surface, and the learner
  sees the real normative text in context.

## Consequences

* Any step that a real source cannot support is written without a citation rather than with an
  invented one.
* RFC 894 §Frame Format contains a typo ("minimum length of the data field … is 1500 octets").
  The app attributes the 1500-byte MTU to IEEE 802.3, not to that sentence.

## Rejected

* **RFC number + title only** — cannot be checked, and the section is what makes the link useful.
* **Inlining quoted normative text** — more copyright surface and more transcription risk, for
  text one click away.
