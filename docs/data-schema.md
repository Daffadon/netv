# Data schema — netv scenarios

Frozen contract. The engine, the validator, and every scenario file obey this document.
Changing anything here means changing the engine in the same commit.

## 1. Layout & loading

```
index.html                  script tags, in order, load everything
src/ui.js                   DOM rendering
src/anim.js                 the animation timeline: packet, wrapping, TTL badges, delivery mode
src/engine.js               state machine, step navigation, hash routing
src/schema.js               NETV.addSteps / NETV.FIELDS / header catalogue
data/scenario-http.js       nodes, links, constants, phase order
data/http/1-boot.js         steps (this file owns "P0")
data/http/2-resolve.js      steps (owns "P1")
data/http/3-connect.js      steps (owns "P2")
data/http/4-request.js      steps (owns "P3")
data/http/5-response.js     steps (owns "P4", "P5")
```

Plain `<script>` tags, **not** ES modules: `file://` blocks module imports, and this page must
open by double-click. Each step file ends with one call:

```js
NETV.addSteps('http', [ /* step objects, in order */ ]);
```

Steps appended in script order. A file owns its own steps; never write a step another file owns.
A chapter may span files — the DHCP chapter holds the two ARP steps from `2-resolve.js`. All values
are literals — there is no inheritance between steps and no computed state. Redundancy is accepted
so each file is readable on its own.

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

Address policy: **no address in the scenario may point at a real machine.** Every IP is from
RFC 1918 or an RFC 5737 documentation block, so nothing the walkthrough shows can be dialled. The
one real name is `daffapn.my.id`, and the address shown for it (`203.0.113.80`) is a documentation
address, not the one it really resolves to — the step that answers the lookup says so in its `note`,
and any step where a learner could be confused by the difference from real life gets one too.

## 3. Node graph (topology)

`data/scenario-http.js` declares these ids and their positions; steps may only reference them.

`kind` picks the device glyph the map draws for the node — `host` (laptop), `switch`, `router`,
`server`, `dns` (a nameserver) — and only those five are defined. `label` and `sub` are centred
under the glyph, so they must stay short: nothing here can measure or wrap text.

`note` is required: one plain sentence saying what this device is for, in words a reader who does
not know the jargon can use ("the name server that does the lookups for you"). The drawer's *Who is
who on the map* legend and the hover tooltip both print it, so it is the only place the map
explains itself. The validator rejects a node without one.

`client` · `ap` (L2 switch/AP — rewrites nothing above L2, **never touches TTL**) · `gw` (home
router: NAT + gateway) · `isp` · `transit` (backbone) · `edge` (datacenter edge) · `server` ·
`resolver` · `root` (root nameserver) · `tld` (.id) · `auth` (authoritative for daffapn.my.id)

Standard hop sequences, client→server: `['client','ap','gw']` (LAN only),
`['client','ap','gw','isp','resolver']` (DNS query), `['client','ap','gw','isp','transit','edge','server']`
(the full path). Return legs are the same array reversed.

## 4. Step object

| Key | Type | Required | Meaning |
|---|---|---|---|
| `id` | string, kebab-case, unique | yes | stable anchor for `#/http/<id>` |
| `phase` | string | yes | group label; exactly one of `DHCP`, `DNS`, `HTTP` (the three tabs, in that order) |
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
| 3022 | Traditional IP Network Address Translator (Traditional NAT) | `2.1` Overview of Basic NAT · `2.2` Overview of NAPT · `3.1` Address binding · `3.2` Address lookup and translation · `3.3` Address unbinding |
| 4271 | A Border Gateway Protocol 4 (BGP-4) | `3` Summary of Operation · `3.1` Routes: Advertisement and Storage |
| 4987 | TCP SYN Flooding Attacks and Common Mitigations | `2.2` Theory of Operation · `3.2` Increasing Backlog |
| 5737 | IPv4 Address Blocks Reserved for Documentation | `3` |
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
| 15 | `encapsulation-down` | HTTP | client | 4-request.js |
| 16 | `request-crosses-internet` | HTTP | gw | 4-request.js |
| 17 | `server-receives` | HTTP | server | 4-request.js |
| 18 | `server-parses` | HTTP | server | 4-request.js |
| 19 | `app-handles` | HTTP | server | 4-request.js |
| 20 | `http-response-message` | HTTP | server | 5-response.js |
| 21 | `response-encapsulated` | HTTP | server | 5-response.js |
| 22 | `response-crosses-internet` | HTTP | gw | 5-response.js |
| 23 | `client-receives` | HTTP | client | 5-response.js |
| 24 | `browser-renders` | HTTP | client | 5-response.js |
| 25 | `tcp-teardown` | HTTP | client | 5-response.js |
| 26 | `time-wait` | HTTP | client | 5-response.js |

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

12. `phase` is one of exactly three: `DHCP`, `DNS` or `HTTP`. They are the tabs, they are declared in
    that order in `data/scenario-http.js`, and the validator fails a step outside the set.

13. A reader who knows the words but not the flow must be able to learn the vocabulary from the page
    alone: every node carries a `note`, every catalogued field name has a `NETV.FIELD_HELP` hint, and
    a step that uses a field name outside the catalogue gives it a hint too. Jargon the page never
    explains is a bug, not a shortcut.
