# 0015 — A routing scenario: OSPF inside an AS, BGP between ASes

* Status: **accepted and implemented.** Two data files (`data/routing/1-ospf.js`,
  `data/routing/2-bgp.js`), the scenario's two maps in `data/scenario-routing.js`, and the shared
  code it needed: the `ospf` and `bgp` catalogues, per-chapter boards, and a routing derivation that
  no longer leans on one scenario's node ids.
* Date: 2026-10-14
* Deciders: user (asked for the routing mechanisms to be walked through the way HTTP is)
* Builds on: 0001 (full-path scope), 0006 (declarative steps), 0012 (chapters), 0014 (vocabulary)

## What shipped, and where it differs from the proposal above

* **Two canvases, not one.** The user asked for OSPF and BGP to work on separate maps, so a
  scenario may now declare `boards: { <phase>: { nodes, links, aria } }` and each chapter is drawn
  on its own canvas (data schema §1). BGP's map carries the routers the HTTP walkthrough crossed —
  `gw`, `isp`, `transit`, `edge`, `server` keep their ids, addresses and notes — so the second
  chapter reads as the same story, and its closing step forwards the very packet the first
  walkthrough sent, arriving with the TTL 60 that story ends on.
* **The open question about "is this packet routed" is answered by derivation, not by node ids.**
  The page shows a remaining TTL when a router is on the hop, and drops it only at routers strictly
  between the two ends of that hop: the node the packet comes from has not forwarded it yet, and the
  node it arrives at is receiving it. An OSPF hello therefore keeps its `ttl: 1` to the end of its
  one hop instead of looking expired, and HTTP's behaviour is unchanged (checked step by step
  against the old rule: no step changes what it shows).
* **Reaching the walkthrough is a tab in the top bar**, built from `NETV.scenarios` in load order,
  so no second page and no navigation code: `data/scenario-http.js` gained a `nav` label and
  `data/scenario-routing.js` declares its own.
* **Everything else in the proposal held**: the two chapters, the nineteen steps and their order,
  the private AS numbers, the addresses, the multicast delivery of Hellos and floods, the fields and
  the citations, all of it data. `docs/data-schema.md` §2, §5, §6 and §7 carry the frozen parts.


## Context

The HTTP scenario shows a packet crossing six routers, and the only thing it says about *why* the
path exists is one node label: `backbone · BGP routing`, plus one line of prose in
`request-crosses-internet`. A reader finishes the walkthrough knowing how a packet is forwarded and
nothing about how a router came to have that route in the first place — the largest remaining hole
in "how the internet works", and the mechanism an interview, a course or an outage will ask about
next.

Routing has two halves, and they are different enough to need different chapters:

* **Inside one network operator (IGP)** — *link state*. Every router learns the whole map of its own
  area and computes the shortest path tree itself. **OSPF** is the one to show: it needs no vendor
  features to explain, it floods a database rather than exchanging routes, and its packets are small
  enough to read field by field.
* **Between network operators (EGP)** — *path vector*. There is no map of the whole internet and no
  shortest path: each AS tells its neighbours which prefixes it can reach, with the list of ASes the
  route passed through, and policy decides what to accept. **BGP** is the only protocol that does
  this job.

The two depend on each other, which is the lesson worth the whole scenario: BGP is not usable
without an IGP underneath it, and the IGP carries no policy and knows nothing past its own border.

## Proposed scenario

A second scenario object, `NETV.defineScenario({ id: 'routing', ... })`, with its own nodes, links,
phases and steps — data only, exactly as ADR 0006 requires. Two chapters:

| Chapter | Protocol | Role | Runs over |
|---|---|---|---|
| `OSPF` | OSPFv2, RFC 2328 | IGP: build one map per area, compute shortest paths | IP directly, protocol 89 — no TCP, no UDP |
| `BGP` | BGP-4, RFC 4271 | EGP: advertise reachability between autonomous systems, apply policy | TCP port 179 |

**Tabs:** the scenario declares `phases: ['OSPF', 'BGP']`, so the tab bar shows two chapters instead
of three, with no UI change (the tabs are built from the scenario's own phase list).

**Topology:** one operator's network inside AS 64512 (four routers: two edge, two core, one of them
the area's designated router on the shared segment), one link to AS 64520 where the site's server
lives, and the server itself. The AS border is drawn with the existing `router` glyph and a label —
no new node kind, so `src/ui.js` does not change.

**Delivery modes are already covered.** OSPF Hellos and LSA floods go to `224.0.0.5` (AllSPFRouters)
and `224.0.0.6` (AllDRouters), which sit inside `224.0.0.0/4`: the derivation in
`NETV.delivery()` classifies them as `multicast`, and the packet already draws the rings for that.
BGP is unicast and traces the link it crosses. A Hello has TTL 1 and is never forwarded, so it stays
inside one link — which the animation shows for free once that step's `ip.ttl` is 1.

## The walkthrough — step by step

Nineteen steps, in this order. Each line is what the step teaches; the field catalogue and the
citations come after. Step ids and the Chinese-wall order are the frozen part (data schema §7).

### Chapter OSPF — the map inside one operator

| # | id | what happens | on the wire |
|---|---|---|---|
| 1 | `ospf-process-up` | A routing process starts on an interface. It has a router ID (the highest loopback address), an area, and an empty database: it knows only its own links. | nothing yet |
| 2 | `ospf-hello` | It multicasts a **Hello** every 10 s to find neighbours: area ID, hello interval, dead interval, options, and the neighbours it already knows. Two routers whose intervals disagree refuse the adjacency. | 224.0.0.5, IP proto 89, TTL 1 |
| 3 | `ospf-two-way` | The neighbour answers with a Hello that lists this router as a neighbour: the two are **2-Way**. On a broadcast segment the routers elect a **Designated Router** (highest priority, then highest router ID) and a Backup, so N routers need 2N adjacencies instead of N². Only the DR's and BDR's adjacencies go to **Full**. | 224.0.0.5 |
| 4 | `ospf-dbd` | Master and slave are chosen (highest router ID) and they exchange **Database Description** packets: not a route, a *list of headers* — a table of contents for each side's database, in sequence-numbered pages. | unicast, one hop |
| 5 | `ospf-lsr` | Each side asks for what it is missing (**Link State Request**), gets it in a **Link State Update**, and confirms with a **Link State Acknowledgment**. This is how OSPF gets reliability: it acknowledges and retransmits itself, because there is no TCP under it. | unicast, one hop |
| 6 | `ospf-lsa-flood` | A router describes its own links in a **Router LSA** and floods it to every interface in the area. LSAs carry a sequence number (the first is `0x80000001`) and an age (retired at 3600 s), so an old copy can never overwrite a new one. Every router in the area ends with the *same* database. | 224.0.0.5 |
| 7 | `ospf-spf` | Because the databases are identical, **Dijkstra** run by every router produces the same map, each rooted at itself. The metric is the interface cost (reference bandwidth ÷ link bandwidth) summed along the path. | local work |
| 8 | `ospf-route-install` | Each destination's best next hop goes into the forwarding table. That is all an IGP knows: reachability inside this operator, one next hop per prefix. | local work |
| 9 | `ospf-convergence` | A link dies. Its neighbours notice when the **dead interval** expires, the change is flooded as a new LSA, every router reruns the same calculation, and the table changes under the traffic that was crossing it. This is what "the internet rerouted" means, and it is bounded by how fast the flood and the calculation finish. | 224.0.0.5 |
| 10 | `ospf-boundary` | At the edge of the area and of the AS, the IGP stops. The border router is reachable; the world behind it is not in the map. Everything else is somebody else's job. | local work |

### Chapter BGP — reachability between operators

| # | id | what happens | on the wire |
|---|---|---|---|
| 11 | `bgp-tcp-peer` | Two border routers open a **TCP connection to port 179**. BGP hands ordering, retransmission and flow control to TCP rather than implementing them, because it must talk to peers many hops away and keep a long-lived session with each. | IP proto 6, TCP 179 |
| 12 | `bgp-open` | **OPEN**: version 4, my AS number, hold time, BGP identifier, optional capabilities. A peer that dislikes any parameter answers with **NOTIFICATION** and the session never finishes forming. | TCP 179 |
| 13 | `bgp-keepalive` | **KEEPALIVE** every hold-time ÷ 3 keeps the session alive. Miss them and the session resets — and every route learned over it is withdrawn, which is why a router must have other peers. | TCP 179 |
| 14 | `bgp-update-advertise` | **UPDATE**: a list of prefixes (NLRI) plus path attributes — `ORIGIN`, `AS_PATH` (the sender prepends its own AS), `NEXT_HOP`, and the optional `LOCAL_PREF`, `MED`, communities. The route is not a distance; it is a claim with evidence attached. | TCP 179 |
| 15 | `bgp-policy` | The receiver decides: accept, modify or reject, by its own policy. There is no global shortest path. When several routes fit, the order is fixed: highest `LOCAL_PREF`, shortest `AS_PATH`, lowest `ORIGIN`, lowest `MED`, eBGP before iBGP, lowest IGP cost to `NEXT_HOP`, lowest identifier. | only the loopback link crosses the wire |
| 16 | `bgp-loop-prevention` | A router rejects any UPDATE whose `AS_PATH` already contains **its own AS number**. That single rule is what keeps a route from looping between operators. | local work |
| 17 | `bgp-next-hop` | `NEXT_HOP` is not the next hop by itself: the route is usable **only if the IGP can reach that address**. Lose the IGP route to the next hop and every BGP route through it disappears. This is the joint between the two chapters. | local work |
| 18 | `bgp-withdraw` | A prefix goes away — an explicit withdraw, or the session drops: the route is removed, the next best path takes over, and the forwarding table changes for every packet to that prefix from then on. | TCP 179 |
| 19 | `bgp-forwarding` | Back to the packet from the HTTP scenario: this AS forwards it per packet, on its destination prefix only, with no memory of the connection. The path was decided long before by BGP, and one route change moves all of it at once. | the server's link |

Each mechanism above keeps the house rules: the step says what happens without motion (ADR 0006),
an analogy in plain words (ADR 0012), a field-by-field table with a hint per field (ADR 0014), and
RFC sections cited only after being read out of the RFC (ADR 0003).

## Citations to verify before any step cites them

**Nothing below may be cited yet.** The house rule is that a section number is only written after it
is read from the document at rfc-editor.org, and that the whitelist in `docs/data-schema.md` §6 and
`tools/validate.js` is the only set a step may use. These are the documents to read, with the topics
to locate:

| RFC | Document | Topics to locate a section for |
|---|---|---|
| 2328 | OSPF Version 2 | the Hello protocol; neighbour states; the DR/BDR election; Database Description; Link State Request/Update/Ack; LSA types and the flooding procedure; the SPF calculation; the metric |
| 4271 | A Border Protocol 4 (BGP-4) | message header and message types (OPEN, UPDATE, KEEPALIVE, NOTIFICATION); path attributes and `AS_PATH`; the decision process; loop detection; withdrawals; TCP transport |
| 6996 | Private Use AS Numbers | the private AS range 64512–65534, for the scenario constants |
| 5737 | IPv4 Address Blocks Reserved for Documentation | the routers' addresses |

The field names for the two new headers (`ospf`, `bgp`) come from the packet formats in RFC 2328
Appendix A.3 and RFC 4271 §4.1 — the exact names and the section numbers are to be read there, then
added to the catalogue and to `NETV.FIELD_HELP`, because the validator refuses a catalogued field
name with no hint (ADR 0014).

## What implementing it would touch

Data, plus four small pieces of shared code:

1. **`src/schema.js`** — `ospf` and `bgp` added to `HEADER_ORDER`, `HEADER_LABELS`, `HEADER_CHIP`,
   `HEADER_ROW` (OSPF is `Internet`, it sits directly inside IP; BGP is `Application`, it rides TCP),
   `FIELDS` and `FIELD_HELP`. No new node kinds.
2. **`tools/validate.js`** — the constants at the top are hard-wired to the HTTP scenario
   (`SCENARIO_FILES`, `EXPECTED_IDS`, `PHASES`, `ALLOWED_TTL`, `ROUTER_NODES`, the TTL-arithmetic
   rule). They need to become per-scenario tables, with the new scenario's own step list, phases,
   addresses and citation whitelist.
3. **`src/anim.js`** — one thing is not scenario-neutral: "is this packet being routed?" is derived
   from `step.hop.includes('isp')`, which is an HTTP node id. A routing scenario has no `isp`, so a
   Hello or an LSA would show no TTL either way. This needs a derivation that works for both (for
   instance: routed when the hop crosses a node of kind `router` *and* the delivery mode is not a
   broadcast that the data says never crosses one), and the HTTP scenario's existing behaviour must
   not move — `dhcp-discover` must still show no TTL. **Open question for implementation.**
4. **`tools/smoke.mjs`** — the walk-the-steps checks are reusable; the 26-step, three-tab and
   `example`-flavoured assertions are HTTP-specific and need to run per scenario.
5. **`index.html`** — two more script tags, and a way to reach the scenario. Today the page loads one
   scenario (`NETV.UI.boot()`), and the hash already carries `#/<scenario>/<step>`. The smallest way
   in is a link in the top bar that calls `Engine.load('routing')`; a separate page is the
   alternative. **Open question, to decide when it is built.**

## What already works unchanged

The layer rail (the four TCP/IP rows), the board and its pan/zoom, the tabs, the caption line and
its position prefix, the packet and its wrapper rails — a stack of `ethernet > ip > ospf` and of
`ethernet > ip > tcp > bgp` are both derived from the `fields` keys, exactly like `ethernet > arp` is
today — the multicast rings for Hellos and floods, the unicast link trace, the field-by-field walk
with hints, the analogies, the reviews and the citations. That is the point of ADR 0006: a second
protocol is data.

## Out of scope

IS-IS, EIGRP and RIP as other IGPs; OSPFv3 and IPv6 addressing (RFC 8200 is already out of scope);
MPLS and segment routing; route reflectors and confederations; anycast and traffic engineering;
RPKI and route origin validation; BFD-based fast failure detection; RPKI/ROA; IPv6 BGP
multiprotocol extensions. Any of them is another scenario, not another chapter.

## Open questions

* **Answered.** The `isp`-based "is it routed" derivation in `src/anim.js` is gone: a hop shows a
  TTL when a router is on it, and only the routers strictly between the ends of the hop drop it. See
  *What shipped*.
* **Answered.** The routing maps reuse the HTTP nodes they need — `gw`, `isp`, `transit`, `edge`,
  `server` — with the same ids, addresses and notes, and no laptop: the routing walkthrough is about
  what the routers did, not about what the client sent.
* **Answered by the preamble, not by a step.** The chapters stay nineteen steps; the scenario's
  `preamble` says what the two networks are and why neither knew about the other, which is the one
  thing an intro step would have added.
