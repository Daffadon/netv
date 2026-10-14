# 0009 — The packet is shown field by field, and how it travels is derived

* Status: accepted
* Date: 2026-10-14
* Deciders: user, after watching the animated story
* Builds on: 0006 (declarative steps), 0008 (animated story)

## Context

ADR 0008 made the packet move: headers wrap around the payload from the inside out and unwrap on
arrival, one outline per layer. Two things were still missing when watching it.

First, the wrappers show *that* a header was added, not *what* was added. The user asked for the
packet to be built up "field by field", and for that same walk to be readable in the drawer's
step-by-step unmarshal, layer by layer.

Second, every frame travelled the same way. A DHCPDISCOVER, an ARP request and a request to
`example.com` all glided along a link looking identical, although the first two are read by every
station on the link and the third by one. The user asked for the transfer to show "if it's
broadcast or just unicast or others".

## Decision

* **The field-by-field stack.** Under the map, one row per header present in the step, in catalogue
  order (outermost first), each row naming the header and listing the fields the data declares for
  it. The row appears as its wrapper reveals and disappears as it unwraps, so the stack grows
  around the payload on the way out and is peeled back on the way in. The rows come from
  `Object.keys(step.fields[key])` — no new data field, and nothing to keep in sync.
* **The delivery mode is derived, never declared.** `NETV.delivery(step)` in `src/schema.js` reads
  the addresses the step already carries: the broadcast MAC or `255.255.255.255` is `broadcast`,
  `224.0.0.0/4` is `multicast`, anything else on a wire is `unicast`, and a step with no wire is
  `local` — except a step that receives with no `hop`, which was delivered by whoever carried it.
  The four words and their one-line notes live in `NETV.DELIVERY`.
* **The wire animation follows that mode.** A line under the packet names it. A unicast frame traces
  the single link it crosses; a broadcast or multicast frame leaves a ring at every station it
  reaches. Both marks are cleaned up by the same timeline that created them, and both are off under
  `prefers-reduced-motion: reduce`, which shows the finished packet instead.
* **The drawer walks the same order.** The packet cells are rendered in the direction the animation
  takes — innermost header first when leaving, outermost first when arriving — with arrows between
  them, the delivery mode and its note above, and the cells arriving one at a time in that order.
  The peel on arrival is staggered one layer at a time for the same reason.

## Consequences

* Two derivations now feed both the stage and the drawer, so they cannot disagree; `NETV.delivery`
  is what the validator and the smoke test assert against, not the pixels.
* `tools/validate.js` rejects a step whose derived mode has no label, and one that travels but
  derives `local`. `tools/smoke.mjs` asserts the stack rows match the declared headers for all 26
  steps, the walk order in the drawer for both directions, and that a broadcast rings and a unicast
  traces a link, then cleans both up.
* The stack rows are HTML below the SVG, not SVG text: five nested wrappers 5 units apart leave no
  room for a legible label inside the packet drawing, and the same list would have to be rewritten
  for every future scenario's geometry.
* `docs/data-schema.md` §9 gained rule 10: the delivery mode is derived from `ethernet.dst` and
  `ip.dst`, and is never a field in a step.

## Rejected

* **A `delivery: 'broadcast'` field on the step.** It is already implied by the addresses the step
  declares, and a field could contradict them — the derive-once rule of ADR 0006 is what keeps the
  animation honest.
* **Enlarging the packet until the field names fit inside it.** It would cover the node boxes the
  packet must stay below, and it moves the layout work into every scenario's geometry.
* **Showing the delivery mode only in the drawer.** The point is to see it while the packet flows.
