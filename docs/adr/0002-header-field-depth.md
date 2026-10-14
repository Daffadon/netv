# 0002 — Payload inspector goes to header-field level

* Status: accepted
* Date: 2026-10-13
* Deciders: user (grilling round 1)

## Context

A layer diagram can show *that* TCP adds a sequence number; it cannot show the learner what
actually changes en route. The interesting observable facts — TTL dropping by one per router, the
destination MAC being rewritten at every hop while the destination IP never changes, the NAT
table rewriting the source port — only exist at field granularity.

## Decision

Every step may show the header fields of the PDU it carries, with concrete values from the fixed
scenario constants (`docs/data-schema.md` §2). Fields are declared per step; there is no
inference and no inheritance.

Depth stops short of a hex dump: field names and values, not byte offsets.

## Consequences

* The TTL/MAC/NAT behaviour becomes visible and checkable rather than asserted in prose.
* Every header value is authored data, so it can be wrong. The constants table and the per-file
  review exist to contain that.
* A hex dump remains possible later without changing the step contract — it would be one more
  optional key.

## Rejected

* **Conceptual only** — cannot show the one thing (per-hop mutation) that makes the journey worth
  animating.
* **Hex dump** — the authoring and accuracy cost is real, and byte offsets teach little that the
  field table does not already teach.
