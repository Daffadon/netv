# 0001 — Scenario scope: the full Internet path, with side protocols as first-class steps

* Status: accepted
* Date: 2026-10-13
* Deciders: user (grilling round 1)

## Context

The visualization answers "how does data get from layer 7 on my laptop to a server and back".
A LAN-only path (client → switch → router → server) teaches encapsulation but not what makes it
*the Internet*: name resolution, address translation, and autonomous-system routing all sit
off-LAN, and they are exactly the parts learners cannot observe on their own machine.

## Decision

The default scenario is the full path:

`client → switch/AP → home router (NAT) → ISP → backbone → datacenter edge → server`

with these side mechanisms as their own steps rather than background assumptions:
DHCP (how the client came to have an address at all), DNS (name → address), ARP (address → MAC,
local link only), NAT (private ↔ public address/port translation), and the full TCP lifecycle
(handshake through teardown).

## Consequences

* 26 steps instead of ~12. Each hop that changes the packet needs its own correct TTL and
  frame-layer state, so the data file is larger and every hop is a chance to be wrong.
* The learner sees why the return journey is not a mirror image (NAT has to look the flow up
  again; the server sees the router's address, not the laptop's).
* DHCP runs once per network join, not once per request. It is presented as a boot phase, and the
  UI must not imply it repeats on every page load.

## Rejected

* **LAN only** — cheapest, but it cannot answer the question the user asked.
* **A "simple mode" toggle for the LAN-only path** — two scenarios to keep correct and test, for a
  view the full path already contains.
