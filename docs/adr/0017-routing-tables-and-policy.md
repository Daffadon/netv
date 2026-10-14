# 0017 — The tables the calculation produces, and a policy that moves a route

* Status: **accepted and implemented.** Six new steps (25 in the routing scenario instead of 19),
  a second datacentre edge router on the BGP map, one new optional step field (`table`), and a
  narrower TTL warning in `tools/validate.js`.
* Date: 2026-10-14
* Deciders: user (asked for how each router's table is calculated, for the packet's route to the
  border router, for which part of the BGP map belongs to which network, and for more routers with
  a policy that takes effect on the route)
* Builds on: 0006 (declarative steps), 0012 (chapters), 0014 (vocabulary), 0015 (routing scenario)

## Context

ADR 0015 shipped OSPF and BGP as *protocol exchanges*: hello, election, flood, the decision process.
A reader finished the chapter knowing how routers exchange a map and how two networks exchange
offers, but never saw the figure each step produces — the routing table — and never saw a packet
take the road that table chose. OSPF's step 7 said "the cheaper link wins" without showing the
numbers, and BGP's chapter had exactly one route for the prefix, so its decision process had nothing
to decide and its policy had nothing to change.

## Decision

1. **Show the numbers beside the map, as a table.** A step may carry `table: { caption, columns,
   rows }`; `src/ui.js` draws it in a column of the board stage, next to the canvas, so the messages
   keep playing while the figures are read — and a step without a table of its own keeps the last
   one from its chapter, with a line naming the step it came from, so the calculation stays in view
   through the exchanges that follow it. Fixed shape, no options: it exists for figures the reader
   otherwise cannot see (a routing table, two offers compared), and the validator rejects a row that
   is not as wide as the columns. Documented in `docs/data-schema.md` §4.
2. **OSPF gains the calculation and four tables.** `ospf-spf` carries the Dijkstra run on core A,
   nearest node first; a new `ospf-tables` step holds all four routers' tables side by side, so the
   reader sees that the map is shared and the tables are not; a new `ospf-path` step follows the
   HTTP packet from the home router to the border router, one lookup per router, at the cost the
   table holds.
3. **The BGP map gains a second link, and with it the policy case.** `edge-b` (203.0.113.2) is the
   datacentre's other front router, peering with the same border router, so the same block is
   offered twice: the exit hints differ by design. `bgp-topology` opens the chapter with which
   router is in which network, `bgp-second-offer` carries the second offer, `bgp-select` runs the
   fixed order over the two offers and stops at the hint, and `bgp-local-pref` shows the operator
   overriding the other network's hint with a preference of its own — first test, route moved,
   packet moved with it. `bgp-withdraw` now withdraws the offer the policy had chosen, so the spare
   taking over is the case the step describes.
4. **The TTL warning compares like with like.** `tools/validate.js` used to warn whenever a step's
   TTL differed from the previous step's without a router forwarding it; a protocol message (TTL 1)
   following a forwarded frame (TTL 64) is not the same packet, so the check now applies only when
   both steps carry the same headers.

## Consequences

* Two constants had to be fixed before any table could be computed: the cost of the `core-a`-`core-b`
  link and the `gw`-`isp` link. Both are now written out per link in `docs/data-schema.md` §2, so
  every figure in every table can be recomputed by hand.
* The 25-step list, the actors of the steps that moved to the second link, and the new constants are
  frozen in `docs/data-schema.md` §2, §3 and §7; `tools/validate.js` and `tools/smoke.mjs` check the
  order, the board, the table shape and the rendered row counts.
* The OSPF chapter still ends with a failure (`ospf-convergence`) and the packet still crosses the
  fast link first, so the two chapters stay consistent about which link the HTTP packet used.
