# Data schema — netv scenarios

Frozen contract. The engine, the validator, and every scenario file obey this document.
Changing anything here means changing the engine in the same commit.

## 1. Layout & loading

```
index.html                  Vite entry
src/scenarios.ts            imports schema.js and every data file, in order
src/useJourney.ts           step state, playback, URL routing, theme, quiz
src/anim.ts                 the animation timeline: packet, wrapping, TTL badges, delivery mode
src/schema.js               NETV.addSteps / NETV.FIELDS / header catalogue
data/scenario-http.js       nodes, links, constants, phase order
data/http/1-boot.js         steps (this file owns "P0")
data/http/2-resolve.js      steps (owns "P1")
data/http/3-connect.js      steps (owns "P2")
data/http/4-request.js      steps (owns "P3")
data/http/5-response.js     steps (owns "P4", "P5")
data/scenario-routing.js    the routing scenario: two maps, one per chapter, and its phase order
data/routing/1-ospf.js      steps (owns "OSPF")
data/routing/2-bgp.js       steps (owns "BGP")
data/quizzes/dhcp.js        ten DHCP quiz questions
data/quizzes/dns.js         ten DNS quiz questions
data/quizzes/http.js        ten HTTP quiz questions
data/quizzes/ospf.js        ten OSPF quiz questions
data/quizzes/bgp.js         ten BGP quiz questions
```

The data files are still plain scripts with no imports: Vite evaluates them as side-effect modules,
in the order `src/scenarios.ts` lists them, and they register themselves on the global `NETV`
object. Each step file ends with one call:

```js
NETV.addSteps('http', [ /* step objects, in order */ ]);
```

Steps appended in script order. A file owns its own steps; never write a step another file owns.
A chapter may span files — the DHCP chapter holds the two ARP steps from `2-resolve.js`. All values
are literals — there is no inheritance between steps and no computed state. Redundancy is accepted
so each file is readable on its own.

Each quiz bank is one plain-script file with one registration call, loaded after its scenario and
step files and before the engine:

```js
NETV.addQuiz('http', 'DHCP', [
  { id: 'dhcp-01', prompt: '...', choices: ['...', '...', '...', '...'], answer: 0, explanation: '...' }
]);
```

`NETV.addQuiz(scenarioId, phase, questions)` stores the supplied array at
`NETV.scenario(scenarioId).quizzes[phase]` and returns the scenario. Each question has a stable
module-prefixed ID, a non-empty prompt and explanation, exactly four non-empty choice strings, and
an integer `answer` index from 0 through 3. Each of the five module banks stores ten questions.
Starting a module quiz uses a partial Fisher–Yates shuffle to draw five distinct questions in a
fresh random order; the sample and score exist only for that run and are not saved.

A scenario with one map declares `nodes` and `links` on itself (the HTTP walkthrough). A scenario
whose chapters need different maps declares `boards: { <phase>: { nodes, links, aria } }` instead,
and each chapter is drawn on its own canvas — the routing walkthrough works inside one network in
its first chapter and between two networks in its second. `NETV.boardOf(scenario, phase)` answers
which map is on screen, and the engine, the animation and the validator all read the map through
it. Every canvas is 860×320 viewBox units; a node sits at `y ≤ 225` so the packet drawn 58 units
below it, and the line of text under that packet, stay inside the canvas.

## 2. Scenario constants (copy verbatim; never invent addresses)

| Thing | Value | Why |
|---|---|---|
| Client host | `laptop` | |
| Client MAC | `a4:5e:60:1f:2c:8b` | |
| Client IP | `192.168.1.87` | private, RFC 1918 |
| Client ephemeral port | `49152` | the bottom of the ephemeral range, RFC 6335 registry |
| Home router LAN IP | `192.168.1.1` | also the DHCP server and default gateway |
| Home router LAN MAC | `b8:27:eb:11:22:33` | |
| Home router WAN IP | `198.51.100.23` | TEST-NET-2, RFC 5737 |
| ISP access router IP | `198.51.100.1` | |
| Recursive resolver | `198.51.100.53` | operated by the ISP |
| Transit/backbone router | (no address shown — it is "the Internet") | |
| Datacenter edge router IP | `203.0.113.1` | TEST-NET-3, RFC 5737 |
| Target host | `daffapn.my.id` | the site this walkthrough follows |
| Target IP | `203.0.113.80` | TEST-NET-3, RFC 5737 |
| Target MAC | `00:1b:21:3c:4d:5e` | datacenter L2 |
| Target port | `80` | |
| DNS A record TTL | `3600` | |
| IP TTL at the client | `64` | decrements per router: `gw`→63, `isp`→62, `transit`→61, `edge`→60, so the server sees **60** |
| TCP MSS | `1460` | 1500 MTU − 20 IP − 20 TCP, RFC 9293 §3.7.1 |
| Client ISN | `0x1a2b3c4d` | RFC 9293 §3.4.1 |
| Server ISN | `0x5e6f7081` | |

### Routing walkthrough constants

| Thing | Value | Why |
|---|---|---|
| Provider network | AS 64512 | the network the home router feeds into, RFC 6996 §5 private range |
| Datacentre network | AS 64520 | the network holding the site |
| Second datacentre edge router | `edge-b`, `203.0.113.2` | the datacentre's other front router, on the second link to the provider, RFC 5737 TEST-NET-3 |
| Advertised prefix | `203.0.113.0/24` | the datacentre's block; the server `203.0.113.80` sits inside it |
| Router IDs | `isp` 192.0.2.3 · `core-b` 192.0.2.4 · `core-a` 192.0.2.5 · `transit` 192.0.2.6 | loopbacks in TEST-NET-1, RFC 5737; the highest wins the DR election |
| Interface addresses | `isp` 198.51.100.1 · `transit` 198.51.100.2 | TEST-NET-2, RFC 5737 |
| OSPF area | `0.0.0.0` | the backbone area |
| OSPF intervals | hello 10 s, dead 40 s (router priority 1 on the shared segment) | |
| OSPF link-local TTL | `1` | every OSPF message is one hop; nothing forwards it |
| OSPF protocol number | `89` | carried by IP itself, no TCP or UDP |
| OSPF groups | AllSPFRouters 224.0.0.5 · AllDRouters 224.0.0.6 | the only multicast addresses OSPF uses |
| OSPF interface cost | `gw`-`isp` 1 · `isp`-`core-a` 1 · `isp`-`core-b` 10 · `core-a`-`core-b` 10 · `core-a`-`transit` 1 · `core-b`-`transit` 10 | set by the operator, RFC 2328 §9: the output cost, always above zero. A fast link costs 1 and a slow one 10, so the border router costs 2 from `isp` through core A and 20 through core B, and core B keeps its own direct links because every detour through core A would add that link's cost on top |
| DD sequence number | `0x2c4f1a86` | the page each side is on while it lists its database |
| First LSA sequence number | `0x80000001` | an old copy can never overwrite a newer one; an LSA dies at age 3600 s |
| LSA checksum shown | `0x7c3f` | a value, not a constant of the scenario |
| BGP transport | TCP port 179 | RFC 4271 §3 |
| BGP timers | hold time 180 s, KEEPALIVE 60 s | a third of the hold time, RFC 4271 §4.4 |
| BGP attributes | ORIGIN `igp` · `AS_PATH` `64520` · `NEXT_HOP` `203.0.113.1` from the first edge router and `203.0.113.2` from the second | LOCAL_PREF defaults to 100; a route passed on prepends the sender's AS |
| BGP exit hints | MED `0` on `edge`'s offer and `100` on `edge-b`'s | the datacentre's hint that it would rather receive traffic on the first link; a lower number wins, RFC 4271 §5.1.4 |
| BGP policy case | LOCAL_PREF `200` on the offers learned from `edge-b` | the operator's own setting, applied as the offer arrives, so the second link wins before any hint is read, RFC 4271 §5.1.5 |
| BGP TTL | `64` at the sender | unicast between peers, never more than one hop here |
| The forwarded packet's TTL | `64` when the provider forwards it, arriving at the server with `60` | the same arithmetic the HTTP walkthrough ends with |

Address policy: **no address in the scenario may point at a real machine.** Every IP is from
RFC 1918 or an RFC 5737 documentation block, and every network number is from RFC 6996's private
use range, so nothing the walkthrough shows can be dialled or reached. The one real name is
`daffapn.my.id`, and the address shown for it (`203.0.113.80`) is a documentation address, not the
one it really resolves to — the step that answers the lookup says so in its `note`, and any step
where a learner could be confused by the difference from real life gets one too.

## 3. Node graph (topology)

`data/scenario-http.js` declares these ids and their positions; steps may only reference them.

`kind` picks the device glyph the map draws for the node — `host` (laptop), `switch`, `router`,
`server`, `dns` (a nameserver) — and only those five are defined. `label` and `sub` are centred
under the glyph, so they must stay short: nothing here can measure or wrap text.

`note` is required: one plain sentence saying what this device is for, in words a reader who does
not know the jargon can use ("the name server that does the lookups for you"). The drawer's *Who is
who on the map* legend and the hover tooltip both print it, so it is the only place the map
explains itself. The validator rejects a node without one.

A `sub` line the story has to earn declares both `subFrom` (the id of the step that hands it over)
and `subBefore` (what the map prints until that step). The laptop's address is the case: it reads
`no address yet` until `dhcp-request-ack`, then `192.168.1.87`. Both fields are required together,
and `subFrom` must be a step of the same scenario — the validator rejects either half alone and a
step id that does not exist.

A board that holds more than one network may declare `regions`: one object per network, `{ as, nodes }`,
where `as` is the number that network is known by in the scenario's own tables (`64512` for the
provider, `64520` for the datacentre) and `nodes` lists the ids that belong to it. The map draws a
dashed boundary around those nodes and labels it `AS` and the number, so the two networks are two
sections on the canvas and a node of neither — the home router — sits outside both. The rectangle is
derived from the nodes it groups, never stored, so moving a router moves its section with it. The
validator rejects a section that is not a bare number, groups no node, or groups a node of another
map.

A link may declare `cost`, the OSPF interface output cost of §2, and the map prints it at the
link's midpoint — the only place a figure in the tables can be pointed at on the canvas. Only the
OSPF board has them; BGP links carry no interior metric. The validator rejects a cost that is not
a whole number above zero. Whenever a step of a chapter is showing a `table` (§4), that chapter's
whole board is drawn undimmed instead of growing with the story, and the links the step's `hop`
walks print their cost in the accent colour: a figure the reader cannot find on the map is a figure
they cannot check.

`client` · `ap` (L2 switch/AP — rewrites nothing above L2, **never touches TTL**) · `gw` (home
router: NAT + gateway) · `isp` · `transit` (backbone) · `edge` (datacenter edge) · `server` ·
`resolver` · `root` (root nameserver) · `tld` (.id) · `auth` (authoritative for daffapn.my.id)

Standard hop sequences, client→server: `['client','ap','gw']` (LAN only),
`['client','ap','gw','isp','resolver']` (DNS query), `['client','ap','gw','isp','transit','edge','server']`
(the full path). Return legs are the same array reversed.

`data/scenario-routing.js` declares the routing walkthrough's two maps. A step may only reference
nodes on its own chapter's map, and only walk links that map draws.

**OSPF map** — one provider network, plus the home router it carries traffic for:

`gw` (home router: the last hop before the provider) · `isp` (the provider's access router) ·
`core-a` (core router, the designated router of the shared segment) · `core-b` (the second core
router, the backup designated router) · `transit` (the border router: the edge of the network).
Links: `gw`-`isp`, and the shared segment `isp`-`core-a`, `isp`-`core-b`, `core-a`-`core-b` with
`core-a`-`transit` and `core-b`-`transit` as the two ways to the edge. The shared segment is drawn
as a triangle — every router on it linked to every other, which is what the election and the flood
refer to — because three routers on one row would make the third link cross the middle glyph.

**BGP map** — the two networks and the two links between them:

`gw` · `isp` · `core-a` (still inside AS 64512) · `transit` (the border router, AS 64512) ·
`edge` and `edge-b` (the datacentre's two front routers, AS 64520) · `server` (the site). Links:
`gw`-`isp`, `isp`-`core-a`, `core-a`-`transit` (this is the internal peering link as well as the
data path), `transit`-`edge` and `transit`-`edge-b` (the two links between the networks, one per
datacentre router) and `edge`-`server`, `edge-b`-`server`. The packet's own path is
`['gw','isp','core-a','transit','edge','server']`; the second link carries the same block offered a
second time, which is what the chapter's comparison and its policy change are read off.

## 4. Step object

| Key | Type | Required | Meaning |
|---|---|---|---|
| `id` | string, kebab-case, unique | yes | stable anchor for `#/<scenario>/<id>` |
| `phase` | string | yes | group label; exactly one of the scenario's own chapters, in that order — `DHCP`, `DNS`, `HTTP` for the HTTP walkthrough, `OSPF`, `BGP` for the routing one |
| `title` | string | yes | ≤ 70 chars, one line, no trailing period |
| `say` | string | yes | the one caption a learner reads without opening anything: 6–20 words, plain language, present tense, ends in a full stop. No acronym in capitals, no jargon the step has not earned. See §9 |
| `actor` | node id | yes | where the work happens (highlighted) |
| `hop` | array of node ids | no | wire traversal, animate marker along it; omit for pure local work |
| `dir` | `'out' \| 'in' \| 'none'` | yes | direction relative to the client |
| `osi` | array of ints 1–7 | yes | OSI rows to highlight; ARP is `[2,3]`, DHCP/DNS `[7,4,3,2,1]` |
| `pdu` | string | yes | outermost PDU name: `Ethernet frame`, `IP packet`, `TCP segment`, `UDP datagram`, `DNS message`, `DHCP message`, `HTTP message`, `bits` |
| `fields` | object | no | header snapshots; keys from the catalogue in §5 |
| `payload` | string | no | what the innermost box holds, e.g. `GET / HTTP/1.1` |
| `explain` | string | yes | 2–4 sentences, ≤ 110 words. What just happened, in plain language. No hype, no marketing |
| `analogy` | string | yes | one sentence, 8–25 words: an everyday comparison from normal life that maps onto this step's mechanism. No acronyms, protocol names or numbers. It is the first thing the drawer shows. See §9 |
| `changes` | array of strings | no | per-hop deltas, e.g. `TTL 64 → 63` |
| `note` | string | no | one caveat or "don't be confused by X" |
| `table` | object | no | a step's own evidence table: `caption` (string, used as the panel's heading), `columns` (non-empty array of strings) and `rows` (non-empty array, each row as wide as `columns`, cells text or numbers). Drawn in a column beside the map, not in the drawer, so the map and its messages stay visible while the figures are read; a step without one keeps showing the last table of its own chapter, with a line naming the step it came from. Only for figures the reader cannot see otherwise — a routing table, a comparison of offers |
| `cite` | array of citation objects | yes (≥1) | see §6 |

Citation object: `{ rfc: 9293, sec: '3.5', title: 'Establishing a Connection' }`.
`sec` is a string; use `''` when the cited part has no section number. The engine builds the URL:
numeric section → `https://www.rfc-editor.org/rfc/rfc<rfc>.html#section-<sec>`; named or empty →
`https://www.rfc-editor.org/rfc/rfc<rfc>.html` (the pre-1988 RFCs have no section anchors — verified).

## 5. Header catalogue

`fields` may only use these keys, and each key may only use these field names. Render order is
the order below, outermost first.

Every name in this catalogue needs a plain-language hint in `NETV.FIELD_HELP` (`src/schema.js`) —
the drawer prints it under the name, because the values alone teach nothing to a reader who does
not already know the protocol. The validator fails a catalogued name without a hint, and warns
about an `http` field line that has none.

- `ethernet` — `dst`, `src`, `type` (`0x0800` IPv4, `0x0806` ARP), `fcs` (say `valid`; the FCS is
  IEEE 802.3, not RFC 894)
- `arp` — `hardwareType`, `protocolType`, `op` (`1` request, `2` reply), `senderMac`, `senderIp`,
  `targetMac`, `targetIp`
- `ip` — `version`, `headerLength`, `dscp`, `ecn`, `totalLength`, `id`, `flags`, `fragmentOffset`,
  `ttl`, `protocol` (`6` TCP, `17` UDP), `checksum`, `src`, `dst`
- `tcp` — `srcPort`, `dstPort`, `seq`, `ack`, `dataOffset`, `flags`, `window`, `checksum`,
  `urgentPointer`, `options`
- `udp` — `srcPort`, `dstPort`, `length`, `checksum`
- `dns` — `id`, `qr`, `opcode`, `rd`, `ra`, `question`, `qtype`, `qclass`, `answers`, `authority`,
  `additional`
- `dhcp` — `op`, `htype`, `hlen`, `xid`, `secs`, `flags`, `ciaddr`, `yiaddr`, `siaddr`, `giaddr`,
  `chaddr`, `magicCookie`, `options`
- `http` — `startLine` plus the actual field lines by name (`Host`, `User-Agent`, `Accept`,
  `Accept-Encoding`, `Connection`, `Content-Type`, `Content-Length`, `Date`, `ETag`, `Server`)
- `ospf` — one catalogue for all five packet types and for the LSA they carry: `version`, `type`,
  `packetLength`, `routerId`, `areaId`, `checksum`, `autype`, `networkMask`, `helloInterval`,
  `options`, `routerPriority`, `routerDeadInterval`, `designatedRouter`, `backupDesignatedRouter`,
  `neighbors`, `interfaceMtu`, `ddSequence`, `lsaHeaders`, `lsaType`, `linkStateId`,
  `advertisingRouter`, `lsAge`, `sequenceNumber`, `lsaChecksum`, `length`, `numberOfLsa`, `links`,
  `metric`. It sits directly inside IP: a step that shows an OSPF message has `ethernet`, `ip` and
  `ospf`, and no transport header at all
- `bgp` — `marker`, `length`, `type`, `version`, `myAs`, `holdTime`, `bgpIdentifier`,
  `optionalParameters`, `withdrawnRoutes`, `pathAttributes`, `nlri`, `origin`, `asPath`,
  `nextHop`, `localPreference`, `multiExitDisc`, `communities`, `errorCode`, `errorSubcode`. BGP
  rides TCP: a step that shows a BGP message has `ethernet`, `ip`, `tcp` and `bgp`

Only list keys the PDU actually has. ARP has **no** `ip`, `tcp`, or `udp` key — that is the point
of the ARP steps. Drop hop-by-hop L2 detail rather than inventing it: the backbone router's MAC
address is not shown, because the scenario does not name it.

## 6. Citation table — the only RFCs and sections you may cite

Verified against rfc-editor.org. **Do not cite anything outside this table, and do not guess a
section number.** If a step needs a source that is not here, write the step without it.

| RFC | Name | Allowed `sec` values (verified) |
|---|---|---|
| 768 | User Datagram Protocol | `Fields`, `Format`, `Protocol Number` |
| 791 | Internet Protocol | `2.2` Model of Operation · `3.1` Internet Header Format · `3.2` Discussion |
| 792 | Internet Control Message Protocol | `Time Exceeded Message`, `Destination Unreachable Message` |
| 826 | An Ethernet Address Resolution Protocol | `Packet format`, `Related issue` |
| 894 | A Standard for the Transmission of IP Datagrams over Ethernet Networks | `Frame Format`, `Address Mappings`, `Broadcast Address` |
| 1035 | Domain Names — Implementation and Specification | `3.4.1` A RDATA format · `4.1` Format · `4.1.1` Header section format · `4.1.2` Question section format · `4.1.3` Resource record format · `4.2.1` UDP usage |
| 1122 | Requirements for Internet Hosts — Communication Layers | `1.1.3` Internet Protocol Suite |
| 1812 | Requirements for IP Version 4 Routers | `5.3.1` Time to Live (TTL) |
| 1918 | Address Allocation for Private Internets | `3` |
| 2131 | Dynamic Host Configuration Protocol | `3.1` Client-server interaction - allocating a network address · `4.3.1` DHCPDISCOVER message · `4.3.2` DHCPREQUEST message · `4.4.1` Initialization and allocation of network address · `4.4.4` Use of broadcast and unicast |
| 2328 | OSPF Version 2 | `1.2` Definitions of commonly used terms · `3` Splitting the AS into Areas · `3.1` The backbone of the Autonomous System · `4.3` Routing protocol packets · `5` Protocol data structures · `6` The Area Data Structure · `7.1` The Hello Protocol · `7.2` The Synchronization of Databases · `7.3` The Designated Router · `7.4` The Backup Designated Router · `8.1` Sending protocol packets · `9` The Interface Data Structure · `9.4` Electing the Designated Router · `9.5` Sending Hello packets · `10.1` Neighbor states · `10.3` The Neighbor state machine · `10.5` Receiving Hello Packets · `10.6` Receiving Database Description Packets · `10.7` Receiving Link State Request Packets · `10.8` Sending Database Description Packets · `10.9` Sending Link State Request Packets · `12.1` The LSA Header · `12.1.1` LS age · `12.1.6` LS sequence number · `12.1.7` LS checksum · `12.4.1` Router-LSAs · `13` The Flooding Procedure · `13.1` Determining which LSA is newer · `13.2` Installing LSAs in the database · `13.5` Sending Link State Acknowledgment packets · `16` Calculation of the routing table · `16.1` Calculating the shortest-path tree for an area · `A.1` Encapsulation of OSPF packets · `A.3.1` The OSPF packet header · `A.3.2` The Hello packet · `A.3.3` The Database Description packet · `A.3.4` The Link State Request packet · `A.3.5` The Link State Update packet · `A.3.6` The Link State Acknowledgement packet · `A.4.1` The LSA header · `A.4.2` Router-LSAs |
| 3022 | Traditional IP Network Address Translator (Traditional NAT) | `2.1` Overview of Basic NAT · `2.2` Overview of NAPT · `3.1` Address binding · `3.2` Address lookup and translation · `3.3` Address unbinding |
| 4271 | A Border Gateway Protocol 4 (BGP-4) | `3` Summary of Operation · `3.1` Routes: Advertisement and Storage · `4` Message Formats · `4.1` Message Header Format · `4.2` OPEN Message Format · `4.3` UPDATE Message Format · `4.4` KEEPALIVE Message Format · `4.5` NOTIFICATION Message Format · `5` Path Attributes · `5.1.1` ORIGIN · `5.1.2` AS_PATH · `5.1.3` NEXT_HOP · `5.1.4` MULTI_EXIT_DISC · `5.1.5` LOCAL_PREF · `9.1` Decision Process · `9.1.1` Phase 1: Calculation of Degree of Preference · `9.1.2` Phase 2: Route Selection · `9.1.2.1` Route Resolvability Condition · `9.1.2.2` Breaking Ties (Phase 2) · `9.3` Route Selection Criteria |
| 4987 | TCP SYN Flooding Attacks and Common Mitigations | `2.2` Theory of Operation · `3.2` Increasing Backlog |
| 5737 | IPv4 Address Blocks Reserved for Documentation | `3` |
| 6996 | Private Use AS Numbers | `3` Private Use ASNs · `5` IANA Considerations (64512–65534) |
| 9110 | HTTP Semantics | `1.1` Purpose · `3.1` Resources · `5.2` Field Lines and Combined Field Value · `7.2` Host and :authority · `7.3` Routing Inbound Requests · `8.2` Representation Metadata · `8.3` Content-Type · `8.6` Content-Length · `8.8.3` ETag · `9.3.1` GET · `12.5.1` Accept · `15.3.1` 200 OK |
| 9112 | HTTP/1.1 | `2.1` Message Format · `2.2` Message Parsing · `3` Request Line · `3.2` Request Target · `4` Status Line · `6.1` Transfer-Encoding · `6.2` Content-Length · `6.3` Message Body Length · `9.1` Establishment · `9.2` Associating a Response to a Request · `9.3` Persistence · `9.6` Tear-down |
| 9293 | Transmission Control Protocol (TCP) | `2.2` Key TCP Concepts · `3.1` Header Format · `3.3` TCP Terminology Overview · `3.3.2` State Machine Overview · `3.4.1` Initial Sequence Number Selection · `3.5` Establishing a Connection · `3.6` Closing a Connection · `3.6.1` Half-Closed Connections · `3.7` Segmentation · `3.7.1` Maximum Segment Size Option · `3.8` Data Communication · `3.8.2` TCP Congestion Control |
| 9499 | DNS Terminology | `4` DNS Transactions · `6` DNS Servers and Clients |

Everything else is cited by name in prose only: **IEEE 802.3** (Ethernet frame, FCS, 1500-byte MTU)
and the **IANA registries** (port numbers, EtherTypes, AS numbers).

## 7. Master step list (ownership)

Non-negotiable order. Each file writes exactly its own rows.

| # | id | phase | actor | owner file |
|---|---|---|---|---|
| 1 | `intent` | DHCP | client | 1-boot.js |
| 2 | `dhcp-discover` | DHCP | client | 1-boot.js |
| 3 | `dhcp-offer` | DHCP | gw | 1-boot.js |
| 4 | `dhcp-request-ack` | DHCP | client | 1-boot.js |
| 5 | `arp-request` | DHCP | client | 2-resolve.js |
| 6 | `arp-reply` | DHCP | gw | 2-resolve.js |
| 7 | `dns-query` | DNS | client | 2-resolve.js |
| 8 | `dns-recursion` | DNS | resolver | 2-resolve.js |
| 9 | `dns-answer` | DNS | client | 2-resolve.js |
| 10 | `tcp-syn-build` | HTTP | client | 3-connect.js |
| 11 | `syn-on-the-wire` | HTTP | gw | 3-connect.js |
| 12 | `tcp-syn-ack` | HTTP | server | 3-connect.js |
| 13 | `tcp-ack-established` | HTTP | client | 3-connect.js |
| 14 | `http-request-message` | HTTP | client | 4-request.js |
| 15 | `wrap-tcp` | HTTP | client | 4-request.js |
| 16 | `wrap-ip` | HTTP | client | 4-request.js |
| 17 | `wrap-frame` | HTTP | client | 4-request.js |
| 18 | `request-crosses-internet` | HTTP | gw | 4-request.js |
| 19 | `server-receives` | HTTP | server | 4-request.js |
| 20 | `server-parses` | HTTP | server | 4-request.js |
| 21 | `app-handles` | HTTP | server | 4-request.js |
| 22 | `http-response-message` | HTTP | server | 5-response.js |
| 23 | `response-wrap-tcp` | HTTP | server | 5-response.js |
| 24 | `response-wrap-ip` | HTTP | server | 5-response.js |
| 25 | `response-wrap-frame` | HTTP | server | 5-response.js |
| 26 | `response-crosses-internet` | HTTP | gw | 5-response.js |
| 27 | `client-receives` | HTTP | client | 5-response.js |
| 28 | `browser-renders` | HTTP | client | 5-response.js |
| 29 | `tcp-teardown` | HTTP | client | 5-response.js |
| 30 | `time-wait` | HTTP | client | 5-response.js |

### Routing walkthrough — 25 steps, two chapters

| # | id | phase | actor | owner file |
|---|---|---|---|---|
| 1 | `ospf-process-up` | OSPF | core-a | 1-ospf.js |
| 2 | `ospf-hello` | OSPF | core-a | 1-ospf.js |
| 3 | `ospf-two-way` | OSPF | isp | 1-ospf.js |
| 4 | `ospf-dbd` | OSPF | core-a | 1-ospf.js |
| 5 | `ospf-lsr` | OSPF | core-b | 1-ospf.js |
| 6 | `ospf-lsa-flood` | OSPF | core-a | 1-ospf.js |
| 7 | `ospf-spf` | OSPF | core-a | 1-ospf.js |
| 8 | `ospf-route-install` | OSPF | core-a | 1-ospf.js |
| 9 | `ospf-tables` | OSPF | isp | 1-ospf.js |
| 10 | `ospf-path` | OSPF | gw | 1-ospf.js |
| 11 | `ospf-convergence` | OSPF | core-a | 1-ospf.js |
| 12 | `ospf-boundary` | OSPF | transit | 1-ospf.js |
| 13 | `bgp-topology` | BGP | transit | 2-bgp.js |
| 14 | `bgp-tcp-peer` | BGP | transit | 2-bgp.js |
| 15 | `bgp-open` | BGP | transit | 2-bgp.js |
| 16 | `bgp-keepalive` | BGP | transit | 2-bgp.js |
| 17 | `bgp-update-advertise` | BGP | edge | 2-bgp.js |
| 18 | `bgp-second-offer` | BGP | edge-b | 2-bgp.js |
| 19 | `bgp-policy` | BGP | transit | 2-bgp.js |
| 20 | `bgp-select` | BGP | transit | 2-bgp.js |
| 21 | `bgp-local-pref` | BGP | transit | 2-bgp.js |
| 22 | `bgp-loop-prevention` | BGP | transit | 2-bgp.js |
| 23 | `bgp-next-hop` | BGP | transit | 2-bgp.js |
| 24 | `bgp-withdraw` | BGP | edge-b | 2-bgp.js |
| 25 | `bgp-forwarding` | BGP | gw | 2-bgp.js |

## 8. Worked example — copy this shape exactly

```js
NETV.addSteps('http', [
  {
    id: 'tcp-syn-build',
    phase: 'HTTP',
    title: 'The client builds a SYN segment',
    actor: 'client',
    dir: 'out',
    osi: [4, 3, 2, 1],
    pdu: 'TCP segment',
    payload: 'no application data yet',
    fields: {
      ethernet: { dst: 'b8:27:eb:11:22:33', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, totalLength: 60, id: '0x3f2a', ttl: 64, protocol: '6 (TCP)', checksum: '0x8c1d', src: '192.168.1.87', dst: '203.0.113.80' },
      tcp: { srcPort: 49152, dstPort: 80, seq: '0x1a2b3c4d (ISN)', ack: '0', dataOffset: 20, flags: 'SYN', window: 65535, checksum: '0x4d2e', options: 'MSS=1460, SACK permitted, window scale 7' }
    },
    explain: 'TCP picks an unused local port and offers an initial sequence number. The SYN flag carries no application data — it only asks the server to synchronise sequence numbers. The MSS option states the largest segment this client will accept.',
    analogy: 'Two neighbours agree, before saying a word, which point they will start counting from and how big a bundle each can take.',
    changes: ['Sequence number is random, not zero, so an attacker cannot guess what comes next'],
    cite: [
      { rfc: 9293, sec: '3.5', title: 'Establishing a Connection' },
      { rfc: 9293, sec: '3.7.1', title: 'Maximum Segment Size Option' }
    ]
  }
]);
```

## 9. Author rules

1. Cite only from §6. No invented section numbers, no invented RFCs.
2. Use only §2 constants. If a step needs a value that is not there, leave it out rather than
   invent one.
3. TTL arithmetic must match §2 exactly, and must not change at `ap` (a switch is L2 only).
4. MAC addresses are scoped to one link. A frame leaving the home router has the router's WAN MAC
   as source — but the scenario does not name that MAC, so omit `src` rather than guess.
5. The HTTP payload bytes never change in transit. Only headers change, and only the ones real
   routers change (TTL, checksum, L2 addresses, NAT addresses/ports).
6. `explain` teaches the mechanism and why it exists, in 2–4 short sentences and at most 110 words.
   No "simply", no "just", no exclamation marks. Ordinary words beat jargon chains: "the router
   writes its own public address into the packet" reads better than "the NAT binding is rewritten".
   Keep a term only when the step's own fields or title already use it.
7. Every step cites at least one source; a step that cannot cite real text gets no invented source.
8. `say` is the whole story for someone who never opens the drawer: it must make sense on its own,
   in plain words, present tense, and it must not lean on an acronym or a term the step has not
   introduced yet. The precision lives in `explain`, never in `say`.
9. `analogy` is what a beginner reads first. One sentence, 8–25 words, an everyday situation — a
   letter, a queue, a hotel desk, a relay race — and it must map onto what this step actually does,
   so the reader can say which part of the comparison is which. Never an acronym, a protocol name
   or a number; never "it is like" for every step in the file.
10. Nothing in the data describes motion. The engine derives what wraps what, what travels, when the
   TTL drops and what unwraps on arrival, from `fields`, `hop`, `dir` and the scenario constants.
   A step that wants different motion is a bug in the derivation, not a new data field.

11. The delivery mode is derived the same way, from the addresses a step declares, and is never a
    field: `ethernet.dst` of `ff:ff:ff:ff:ff:ff`, or `ip.dst` of `255.255.255.255`, is `broadcast`;
    `ip.dst` inside `224.0.0.0/4` is `multicast`; anything else on a wire is `unicast`. A step with
    no `hop` is `local` — nothing leaves the machine — except a step that receives (`dir: 'in'` and
    no `hop`), which was delivered by whoever carried it and is read off its own addresses. The four
    words live in `NETV.DELIVERY` in `src/schema.js`, with the note shown beside the packet.

12. `phase` is one of the scenario's own chapters: the three of the HTTP walkthrough (`DHCP`, `DNS`,
    `HTTP`) or the two of the routing walkthrough (`OSPF`, `BGP`). They are the tabs, they are
    declared in that order in the scenario file, and the validator fails a step outside its own
    scenario's set. A scenario whose chapters need different maps declares one board per chapter
    (§1), and a step's `actor` and `hop` must both be on its chapter's map.

13. A reader who knows the words but not the flow must be able to learn the vocabulary from the page
    alone: every node carries a `note`, every catalogued field name has a `NETV.FIELD_HELP` hint, and
    a step that uses a field name outside the catalogue gives it a hint too. Jargon the page never
    explains is a bug, not a shortcut.

14. A router pays a TTL only when it forwards. The page drops the TTL at routers strictly between
    the first and the last node of a hop, so the node the packet arrives at never shows a drop and a
    message read by the neighbour it was sent to keeps the TTL it left with — which is why an OSPF
    hello carries `ttl: 1` to the end of its one hop and never looks expired. A broadcast hop shows
    no TTL at all: it never leaves its link.
