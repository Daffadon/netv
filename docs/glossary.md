# Domain model & glossary

Shared vocabulary for the visualization. Every term defined here is a term the UI is
allowed to display. The citation registry in §8 is the only set of sources the app may cite.

Convention used throughout: `RFC nnnn` = the RFC number; a section number is only written
when it was read from the document itself.

---

## 1. The two layer models

| OSI (7 layers) | TCP/IP, 4 layers (RFC 1122 §1.1.3) | TCP/IP, 5 layers (textbooks) | PDU name | Protocols in scope |
|---|---|---|---|---|
| 7 Application | Application | 5 Application | data | HTTP, DNS, DHCP |
| 6 Presentation | Application | 5 Application | data | *(TLS is sub-layer, not a layer)* |
| 5 Session | Application | 5 Application | data | *(unused by HTTP)* |
| 4 Transport | Transport | 4 Transport | TCP: **segment** · UDP: **datagram** | TCP, UDP |
| 3 Network | Internet | 3 Internet | **packet** (IP datagram) | IPv4, IPv6, ICMP |
| 2 Data Link | Link | 2 Link | **frame** | Ethernet, Wi-Fi, ARP |
| 1 Physical | Link | 1 Physical | bits / symbols | 1000BASE-T, Wi-Fi radio |

**Note on "layer 5" (the confusion this app's UI must not inherit).**
"Layer 5 of TCP/IP" and "layer 7 of OSI" *are the same box*: the application layer.
In the 5-layer teaching model it is layer 5; in the 4-layer model of RFC 1122 §1.1.3 it is
layer 4; in OSI it is layer 7. RFC 1122 §1.1.3 states the Internet application layer
"essentially combines the functions of the top two layers -- Presentation and Application --
of the OSI reference model".

Decision this forces on the UI: **normalize on OSI numbering (7→1)** because the user's own
vocabulary is OSI-shaped, and render the TCP/IP column beside it. Never print a bare
"layer N" without naming the model it belongs to.

**ARP straddles L2/L3.** RFC 826 payloads carry L3 addresses, carried inside an L2 frame.
The packet inspector labels it `Internet/Link` for that reason; do not force it into one row.

**What the app draws.** The layer rail shows the four TCP/IP rows only — Application, Transport,
Internet, Link — because this scenario never uses the Presentation or Session row, and a bare OSI
number on screen is one more thing the reader has to translate. Steps still carry an `osi` array in
the data (data schema §4) and the engine maps those numbers onto the four rows: 7, 6 and 5 all file
into Application, 2 and 1 both file into Link.

**TLS is not a layer.** RFC 8446 places it between Transport and Application. Out of scope
while the scenario is plain `http://`.

## 2. Encapsulation

- **Encapsulation**: each layer prepends its own header to what the layer above handed down.
  Layer 2 also *appends* a trailer (Ethernet FCS).
- **Decapsulation**: the receiver strips headers bottom-up and delivers to the layer above.
- **SDU / PDU**: the SDU is the payload the layer above hands down; the PDU is what this
  layer puts on the wire (header + SDU, plus trailer at L2).
- **PDU naming discipline** — "packet" is overloaded, so the UI never says "packet" alone:
  say *HTTP message*, *TCP segment*, *IP packet*, *Ethernet frame*, *Physical bits*.
- **Payload never changes in transit** (except NAT rewriting L3/L4 addresses in the open and
  TCP options/checksums); headers *do* change at every hop, and TTL changes at every router.

## 3. Names, addresses, identifiers

| Term | Meaning | Source |
|---|---|---|
| host name / FQDN | ordered list of labels; wire vs presentation format | RFC 1035, RFC 9499 |
| IPv4 address | 32-bit locator | RFC 791 |
| IPv6 address | 128-bit locator | RFC 8200 |
| port number | 16-bit demultiplexer for a host; 80 = HTTP | IANA port registry |
| socket | (transport protocol, local address, local port) | RFC 9293 §2.2 |
| connection / flow | the 4-tuple (src IP, src port, dst IP, dst port) | RFC 9293 §2.2 |
| MAC address | 48-bit link-layer address; **scoped to one link only** | RFC 826 |
| broadcast MAC | `FF:FF:FF:FF:FF:FF`, used by the ARP request | RFC 826 |
| default gateway | router a host sends off-link traffic to | RFC 1122 §1.1.3 |
| DNS RR | resource record; types used here: A, AAAA, CNAME, NS, SOA | RFC 1035, RFC 9499 |

**How a frame is addressed.** One word per case, taken from the addresses above and never from a
step field, because the packet is drawn from the data:

| Word | When the step's addresses say so | Who reads it |
|---|---|---|
| **unicast** | any other destination address | one station on the link |
| **broadcast** | destination MAC `FF:FF:FF:FF:FF:FF`, or IPv4 destination `255.255.255.255` (the *limited broadcast*) | every station on the link; a router never forwards a limited broadcast, so it stays on one link (RFC 2131 §4.4.4, "Use of broadcast and unicast") |
| **multicast** | IPv4 destination inside `224.0.0.0/4` | the stations subscribed to that group (IANA IPv4 Special-Purpose Address Registry) |
| **not on the wire** | no `hop` on the step, and the step is not receiving | the bytes are still inside the machine |

## 4. Nodes and roles on the path

client host · NIC · access point/switch (L2, MAC table) · home router (L3 + NAT) ·
recursive resolver · ISP aggregation · autonomous system / backbone (BGP) ·
datacenter edge router · load balancer · origin server · proxy · CDN cache.

**Forwarding vs local delivery**: a switch rewrites nothing above L2; a router decrements
TTL, recomputes the L3 checksum and builds a *new* L2 frame for the next hop.

The routing walkthrough reuses those nodes and adds the roles its two maps need: **access router**
(the provider's router facing the home) · **core router** · **designated router / backup designated
router** (the two that speak for a shared segment) · **border router** (the edge of one network,
where the interior protocol stops and the one between networks begins) · **autonomous system** (the
whole network under one operator, named by an AS number) · **internal peer** and **external peer**
(two routers of the same network, or of two different ones — the datacentre reaches the provider
over two links, one front router per link, so the same block can be offered twice).

## 5. The HTTP exchange (RFC 9110, RFC 9112)

request · response · method (`GET`) · request target · header field · representation ·
status code · content negotiation · persistent connection (keep-alive) · user agent ·
origin server · intermediary · message framing (`Content-Length` vs `Transfer-Encoding: chunked`).

**Stateless by design** — RFC 9110 §1.1: HTTP is "a family of stateless, application-level,
request/response protocols".

## 6. Transport mechanics (RFC 9293)

segment · sequence number / ISN · acknowledgment number · receive window · congestion window ·
**MSS vs MTU** (MSS = MTU − IP header − TCP header; 1460 = 1500 − 20 − 20 for IPv4) ·
checksum (covers a pseudo-header including the IP addresses) · three-way handshake ·
four-way teardown · TIME-WAIT / 2×MSL · RST · retransmission · RTT.
Header fields exactly as RFC 9293 §3.1 defines them, flags CWR ECE URG ACK PSH RST SYN FIN.

## 7. Routing mechanics (RFC 2328, RFC 4271)

The routing walkthrough's vocabulary, in the two halves its chapters follow.

**Inside one network** (the interior protocol): every router keeps a *link state database*, built by
flooding rather than by exchanging routes — **link state advertisement** (LSA: how a router describes
its own links, with an `LS age`, an `LS sequence number` and an `LS checksum` so an old copy can never
overwrite a newer one) · **Hello** (the repeated greeting that discovers and keeps neighbours —
`HelloInterval`, `RouterDeadInterval`) · neighbour state **2-Way** (each has heard the other) ·
**ExStart / Exchange / Loading / Full** (the states the two pass through while they compare and
complete their databases) · **Database Description** (the table of contents, page by page) ·
**Link State Request / Update / Acknowledgment** (how the missing entries move, and how the exchange
is made reliable without TCP) · **Designated Router** and **Backup Designated Router** (one speaker
per shared segment, so N routers need 2N adjacencies instead of N²) · **flooding** (an entry reaches
every router in the area) · **area** (the part of the network whose routers share one database; the
backbone is `0.0.0.0`) · **router ID** (a router's own name, its highest address) · **interface
output cost** (what one link costs to use, set by the operator) · **shortest path first** (the
calculation each router runs on the same database) · **convergence** (every router back in step after
a change).

**Between networks** (the exterior protocol): **autonomous system** (one operator's network, named by
an AS number) · **prefix** (the block being offered, `203.0.113.0/24`) · **path vector** (a route is
a prefix plus the list of networks it passed through) · **external / internal peer** (`eBGP` / `iBGP`)
· **OPEN**, **UPDATE**, **KEEPALIVE**, **NOTIFICATION** (the four messages; the session itself runs
over TCP port 179) · **NLRI** (the addresses an update makes reachable) · **path attributes**:
`ORIGIN`, `AS_PATH` (the sender prepends its own AS), `NEXT_HOP`, `LOCAL_PREF`, `MULTI_EXIT_DISC` ·
**decision process** (highest `LOCAL_PREF`, shortest `AS_PATH`, lowest `ORIGIN`, lowest `MED`, external
before internal peer, lowest interior cost to `NEXT_HOP`, lowest router identity) · **route withdrawal**
· **policy** (nothing forces a router to accept an offer). The two halves meet at `NEXT_HOP`: an
exterior route is usable only while the interior protocol can still reach that address.

## 8. Citation registry (verified against rfc-editor.org)

| RFC | Title | Status | Cited for |
|---|---|---|---|
| 791 | Internet Protocol | STD 5 | IPv4 header, TTL |
| 792 | Internet Control Message Protocol | STD 5 | ICMP |
| 826 | An Ethernet Address Resolution Protocol | STD 37 | ARP request/reply |
| 1035 | Domain Names — Implementation and Specification | STD 13 | DNS message format, labels |
| 1122 | Requirements for Internet Hosts — Communication Layers | STD 3 | the 4-layer model (§1.1.3) |
| 2131 | Dynamic Host Configuration Protocol | Draft Std | how a host gets its IP/gateway |
| 2328 | OSPF Version 2 | STD 54 | the map inside one network: hello, adjacency, LSA flooding, shortest path |
| 3022 | Traditional IP Network Address Translator (Traditional NAT) | Informational | NAT at the home router |
| 3168 | The Addition of Explicit Congestion Notification (ECN) to IP | Standards Track | CWR/ECE flags |
| 4271 | A Border Gateway Protocol 4 (BGP-4) | Standards Track | inter-AS routing: the session over TCP, OPEN/UPDATE/KEEPALIVE/NOTIFICATION, path attributes, the decision process |
| 4987 | TCP SYN Flooding Attacks and Common Mitigations | Informational | SYN cookies, backlog |
| 6891 | Extension Mechanisms for DNS (EDNS(0)) | STD 75 | DNS over UDP size |
| 6996 | Private Use AS Numbers | BCP 6 | the 64512–65534 range the walkthrough's two networks use |
| 8200 | Internet Protocol, Version 6 (IPv6) Specification | STD 86 | IPv6 header |
| 8446 | The Transport Layer Security (TLS) Protocol Version 1.3 | Standards Track | (out of scope) |
| 9110 | HTTP Semantics | STD 97 | methods, status, headers, URI |
| 9112 | HTTP/1.1 | STD 99 | request/response message framing |
| 9113 | HTTP/2 | Standards Track | (future scenario) |
| 9293 | Transmission Control Protocol (TCP) | STD 7 | segments, handshake, teardown |
| 9499 | DNS Terminology | BCP 219 | resolver vocabulary |

Non-RFC sources, cited by name only: **IEEE 802.3** (Ethernet frame, 1500-byte MTU) and the
**IANA Service Name and Transport Protocol Port Number Registry**.
