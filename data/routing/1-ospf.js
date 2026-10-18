// Chapter OSPF — the map inside one provider network.
// Owns steps 1–10: ospf-process-up through ospf-boundary. One NETV.addSteps call, steps in order.
NETV.addSteps('routing', [
  {
    id: 'ospf-process-up',
    phase: 'OSPF',
    title: 'Each router starts with a map of its own links',
    say: 'A router turns on its map. It knows its own links and nothing else.',
    actor: 'core-a',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    explain: 'OSPF (Open Shortest Path First) is a protocol routers use to share link information inside one network. Each router begins with only the links it can see directly. It uses a router ID (stable name); here, this is the highest address on a loopback, a virtual interface that stays up while the router runs. It joins an area, a part of the network whose routers share the same map.',
    analogy: 'A new neighbour sketches only their own street until they meet the people living around the corner.',
    changes: ['Router ID 192.0.2.5 chosen as the highest loopback address', 'The database is empty except for the router\'s own links'],
    cite: [
      { rfc: 2328, sec: '5', title: 'Protocol data structures' },
      { rfc: 2328, sec: '9', title: 'The Interface Data Structure' }
    ]
  },
  {
    id: 'ospf-hello',
    phase: 'OSPF',
    title: 'The router calls out to find its neighbours',
    say: 'Every few seconds each router calls out on its links to see who is listening.',
    actor: 'core-a',
    hop: ['core-a', 'core-b'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '192.0.2.5', dst: '224.0.0.5' },
      ospf: { version: 2, type: '1 (Hello)', routerId: '192.0.2.5', areaId: '0.0.0.0 (backbone)', helloInterval: '10 s', routerDeadInterval: '40 s', routerPriority: 1, neighbors: 'none heard yet' }
    },
    explain: 'A router does not wait to be found: it sends a short greeting on every interface and listens for a greeting back. The greeting names the sender, the area it belongs to, how often it will speak, and how long it will wait before calling a silent neighbour gone. Two routers become neighbours only when these numbers agree, so a mismatch is refused before any map is exchanged.',
    analogy: 'Like a new resident calling hello over the garden fence to learn which neighbours are around.',
    changes: ['Sent to the group address every router on this segment listens to', 'TTL stays 1: the greeting never leaves this one link'],
    cite: [
      { rfc: 2328, sec: '7.1', title: 'The Hello Protocol' },
      { rfc: 2328, sec: 'A.3.2', title: 'The Hello packet' },
      { rfc: 2328, sec: '8.1', title: 'Sending protocol packets' }
    ]
  },
  {
    id: 'ospf-two-way',
    phase: 'OSPF',
    title: 'The neighbour replies; routers elect a designated router',
    say: 'The two confirm two-way contact, then elect a designated router and a backup.',
    actor: 'isp',
    hop: ['isp', 'core-a'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '198.51.100.1', dst: '224.0.0.5' },
      ospf: { version: 2, type: '1 (Hello)', routerId: '192.0.2.3', areaId: '0.0.0.0 (backbone)', helloInterval: '10 s', routerDeadInterval: '40 s', routerPriority: 1, designatedRouter: '192.0.2.5 (core A)', backupDesignatedRouter: '192.0.2.4 (core B)', neighbors: '192.0.2.5 (core A)' }
    },
    explain: 'When a router hears its own name in a neighbour’s Hello, the two are two-way: each knows the other heard it. On a shared link, routers elect a designated router (DR) to coordinate map exchanges and a backup designated router (BDR) to take over if needed. Without this pair, every router would need a full relationship with every other router. The router with the highest priority wins; a tie is settled by the highest router ID.',
    analogy: 'A crowd picks one person to speak for everyone, with a stand-in ready if that person steps away.',
    changes: ['This router hears itself named, so the pair is two-way', 'The greeting now carries the chosen leader and its stand-in'],
    cite: [
      { rfc: 2328, sec: '10.1', title: 'Neighbor states' },
      { rfc: 2328, sec: '9.4', title: 'Electing the Designated Router' },
      { rfc: 2328, sec: '7.3', title: 'The Designated Router' }
    ]
  },
  {
    id: 'ospf-dbd',
    phase: 'OSPF',
    title: 'The two compare their maps page by page',
    say: 'Before swapping routes, the two list what their maps already contain.',
    actor: 'core-a',
    hop: ['core-a', 'core-b'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '192.0.2.5', dst: '192.0.2.4' },
      ospf: { version: 2, type: '2 (Database Description)', routerId: '192.0.2.5', areaId: '0.0.0.0 (backbone)', interfaceMtu: 1500, ddSequence: '0x2c4f1a86', lsaHeaders: 'one line per entry the sender holds', lsaType: '1 (Router-LSA)', linkStateId: '192.0.2.5', advertisingRouter: '192.0.2.5', sequenceNumber: '0x80000001', lsaChecksum: '0x7c3f' }
    },
    explain: 'The two routers agree who will lead the exchange, and the higher name takes that role. Rather than send the whole map at once, each sends a summary: a list of the entry names it holds, one line each, split over numbered pages so the other can spot what is missing. Nothing here is a route yet, only a table of contents the two sides can compare.',
    analogy: 'Two collectors compare the indexes of their albums before deciding which records to swap.',
    changes: ['Unicast to the other router, not to the group address', 'A list of entry names, not the entries themselves'],
    cite: [
      { rfc: 2328, sec: '7.2', title: 'The Synchronization of Databases' },
      { rfc: 2328, sec: '10.8', title: 'Sending Database Description Packets' },
      { rfc: 2328, sec: 'A.3.3', title: 'The Database Description packet' }
    ]
  },
  {
    id: 'ospf-lsr',
    phase: 'OSPF',
    title: 'The routers request the entries they are missing',
    say: 'Each side asks for what it lacks, then confirms what it receives.',
    actor: 'core-b',
    hop: ['core-b', 'core-a'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '192.0.2.4', dst: '192.0.2.5' },
      ospf: { version: 2, type: '3 (Link State Request)', routerId: '192.0.2.4', areaId: '0.0.0.0 (backbone)', lsaType: '1 (Router-LSA)', linkStateId: '192.0.2.5', advertisingRouter: '192.0.2.5' }
    },
    explain: 'After the summaries, each router knows which entries its neighbour holds that it does not. It asks for those by name, and the neighbour returns them, one message per batch. Because there is no transport protocol underneath, the router confirms every entry it receives and asks again when nothing comes back; that confirmation is what makes the exchange dependable.',
    analogy: 'Two people trade missing pages from a book, each confirming aloud that the pages arrived.',
    changes: ['Unicast one hop between the pair', 'No transport under it: the router itself confirms and retries'],
    cite: [
      { rfc: 2328, sec: '10.9', title: 'Sending Link State Request Packets' },
      { rfc: 2328, sec: '10.7', title: 'Receiving Link State Request Packets' },
      { rfc: 2328, sec: 'A.3.4', title: 'The Link State Request packet' },
      { rfc: 2328, sec: '13.5', title: 'Sending Link State Acknowledgment packets' }
    ]
  },
  {
    id: 'ospf-lsa-flood',
    phase: 'OSPF',
    title: 'Each router sends a link-state advertisement describing its links',
    say: 'Every router writes down its own links and shares that note with the area.',
    actor: 'core-a',
    hop: ['core-a', 'core-b'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '192.0.2.5', dst: '224.0.0.5' },
      ospf: { version: 2, type: '4 (Link State Update)', routerId: '192.0.2.5', areaId: '0.0.0.0 (backbone)', numberOfLsa: 1, lsaType: '1 (Router-LSA)', linkStateId: '192.0.2.5', advertisingRouter: '192.0.2.5', lsAge: '0 s', sequenceNumber: '0x80000001', lsaChecksum: '0x7c3f', links: 'to core B and to the border router', metric: 1 }
    },
    explain: 'Each router writes one link-state advertisement (LSA), a map entry listing its router ID and directly connected links, with a cost for each. It sends this entry to neighbours; they pass a copy on until every router in the area has it. This spreading is called flooding. The sequence number distinguishes newer versions, and the age lets old entries expire. An LSA describes links; it is not the final route table.',
    analogy: 'A notice pinned in one hallway is copied and pinned in every other hallway until the whole building has read it.',
    changes: ['Sent to the whole area, one link at a time', 'Every router ends holding an identical copy of the map'],
    cite: [
      { rfc: 2328, sec: '12.1', title: 'The LSA Header' },
      { rfc: 2328, sec: '12.4.1', title: 'Router-LSAs' },
      { rfc: 2328, sec: '13', title: 'The Flooding Procedure' },
      { rfc: 2328, sec: '12.1.6', title: 'LS sequence number' },
      { rfc: 2328, sec: '12.1.1', title: 'LS age' },
      { rfc: 2328, sec: 'A.4.2', title: 'Router-LSAs' }
    ]
  },
  {
    id: 'ospf-spf',
    phase: 'OSPF',
    title: 'Every router runs the same shortest-path calculation',
    say: 'With the same map in hand, each router works out the shortest path to every destination.',
    actor: 'core-a',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    explain: 'Because every router holds the same entries, each can run the same calculation over the same picture, and all of them reach the same tree. A router starts at itself and repeatedly adds the nearest place it has not yet reached, until nothing is left. The numbers are link costs the operator set, so the tree follows the cheaper links rather than the physically shorter ones; reaching the datacentre prefix this way costs two through core A.',
    analogy: 'With the same street map, everyone can work out their own shortest route home.',
    changes: ['Each router roots the tree at itself, so each has its own view of the same map'],
    table: {
      caption: 'The calculation on core A: the nearest place it has not yet reached, added one at a time',
      columns: ['Added to the tree', 'Cost from core A', 'Through which link'],
      rows: [
        ['core A itself', '0', 'the tree starts here'],
        ['isp', '1', 'its direct fast link'],
        ['the border router', '1', 'its direct link to the edge'],
        ['core B', '10', 'its direct slow link: through any neighbour it would cost 11']
      ]
    },
    cite: [
      { rfc: 2328, sec: '16', title: 'Calculation of the routing table' },
      { rfc: 2328, sec: '16.1', title: 'Calculating the shortest-path tree for an area' },
      { rfc: 2328, sec: '9', title: 'The Interface Data Structure' }
    ]
  },
  {
    id: 'ospf-route-install',
    phase: 'OSPF',
    title: 'The best next hop for each destination goes into the table',
    say: 'The tree becomes a plain list: this destination, that next hop.',
    actor: 'core-a',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    explain: 'The tree is not what forwards packets. Each router turns it into a short list that names, for every destination, the next router to hand the packet to. From here the map is set aside and only the list is consulted. This is all the interior routing knows: the places within its own network, and nothing about the world outside it.',
    analogy: 'The route you planned becomes a short set of directions kept in the glovebox for every trip.',
    changes: ['One next hop per destination prefix', 'No route to any prefix outside this network'],
    cite: [
      { rfc: 2328, sec: '16', title: 'Calculation of the routing table' },
      { rfc: 2328, sec: '1.2', title: 'Definitions of commonly used terms' }
    ]
  },
  {
    id: 'ospf-tables',
    phase: 'OSPF',
    title: 'Every router writes its own table from the same map',
    say: 'Each router turns the tree into a list: a next hop for every other router.',
    actor: 'isp',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    table: {
      caption: 'The four tables after the calculation, one row per router: for each other router in the area, the next hop it would use and the total cost of the path. isp 192.0.2.3 · core A 192.0.2.5 · core B 192.0.2.4 · the border router 192.0.2.6.',
      columns: ['Router', 'to isp', 'to core A', 'to core B', 'to the border router'],
      rows: [
        ['isp', '—', 'core A · 1', 'core B · 10', 'core A · 2'],
        ['core A', 'isp · 1', '—', 'core B · 10', 'the border · 1'],
        ['core B', 'isp · 10', 'core A · 10', '—', 'the border · 10'],
        ['the border', 'core A · 2', 'core A · 1', 'core B · 10', '—']
      ]
    },
    explain: 'The database is identical on all four routers, but each runs the calculation with itself as the starting point, so no two tables read the same. isp holds both ways to the border router and puts the cheaper one in the table: the fast link through core A, at a total cost of two. core B keeps its own slow links, because reaching anything through core A would add that link on top. The number stored is the cost of the whole path, not of one link, which is why isp records a cost of two for a router it never touches itself.',
    analogy: 'Four neighbours read the same street map, but each works out the walk from their own front door.',
    changes: ['isp picks the fast link to core A, and the way to the border router that follows it', 'core B stays on its own slow links: every detour through core A would cost it eleven', 'the border router reaches isp through core A, and keeps core B on the direct slow link'],
    note: 'The cost is an operator setting, not a distance: the slow link costs ten times the fast one, so two hops through core B count twenty instead of two.',
    cite: [
      { rfc: 2328, sec: '16', title: 'Calculation of the routing table' },
      { rfc: 2328, sec: '16.1', title: 'Calculating the shortest-path tree for an area' },
      { rfc: 2328, sec: '9', title: 'The Interface Data Structure' }
    ]
  },
  {
    id: 'ospf-path',
    phase: 'OSPF',
    title: 'The packet follows those tables to the border router',
    say: 'Each router reads its own list and hands the packet to the next one.',
    actor: 'gw',
    hop: ['gw', 'isp', 'core-a', 'transit'],
    dir: 'out',
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.23', dst: '203.0.113.80' },
      tcp: { srcPort: 49152, dstPort: 80, flags: 'PSH, ACK' },
      http: { startLine: 'GET / HTTP/1.1', Host: 'daffapn.my.id' }
    },
    explain: 'The packet carries a destination address and nothing about the way. The home router hands it to the access router, which looks up the border router, finds the fast way at a cost of two, and sends it to core A; core A has the border router one hop away and hands it over. Every one of these choices came from the calculation that router ran on its own map, and none of them needed to know where the packet had been. The interior map\'s job ends at the border router, which the packet reaches with the same address it started with.',
    analogy: 'A parcel changes hands at every post office, each clerk reading only the address on the box.',
    changes: ['The home router sends everything it does not own to its gateway', 'isp reads a cost of two for the border router and takes the fast link to core A', 'core A reads a cost of one and hands the packet straight over', 'The border router is the last one on this map: the interior map knows nothing beyond it'],
    note: 'Nothing in the packet records the way it took, so the same lookup on a changed table sends it somewhere else: that is exactly what the next step shows.',
    cite: [
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' },
      { rfc: 2328, sec: '16', title: 'Calculation of the routing table' },
      { rfc: 2328, sec: '1.2', title: 'Definitions of commonly used terms' }
    ]
  },
  {
    id: 'ospf-convergence',
    phase: 'OSPF',
    title: 'One link fails and every router learns the new map',
    say: 'A cable fails, the routers notice, and each quietly rebuilds the same map again.',
    actor: 'core-a',
    hop: ['core-a', 'core-b'],
    dir: 'out',
    osi: [3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 1, protocol: '89 (OSPF)', src: '192.0.2.5', dst: '224.0.0.5' },
      ospf: { version: 2, type: '4 (Link State Update)', routerId: '192.0.2.5', areaId: '0.0.0.0 (backbone)', numberOfLsa: 1, lsaType: '1 (Router-LSA)', linkStateId: '192.0.2.5', advertisingRouter: '192.0.2.5', lsAge: '0 s', links: 'no longer the link to the border router' }
    },
    explain: 'A router expects a greeting from each neighbour at a fixed rhythm, and when that wait runs out it decides the link is gone. It writes a fresh entry describing its links without the failed one and floods that through the area, so every router hears about it. Each then reruns the same calculation and its list of next hops changes, while packets that were already crossing take the new path.',
    analogy: 'When one road closes, drivers who share the same map all turn toward the other route at about the same time.',
    changes: ['The old entry is replaced by a newer one', 'Every router recalculates and the table changes under the traffic'],
    cite: [
      { rfc: 2328, sec: '7.1', title: 'The Hello Protocol' },
      { rfc: 2328, sec: '10.3', title: 'The Neighbor state machine' },
      { rfc: 2328, sec: '13', title: 'The Flooding Procedure' },
      { rfc: 2328, sec: '13.1', title: 'Determining which LSA is newer' }
    ]
  },
  {
    id: 'ospf-boundary',
    phase: 'OSPF',
    title: 'At the edge of the network the map stops',
    say: 'The border router is on the map, but everything beyond it is not.',
    actor: 'transit',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    explain: 'A network is split into areas so that no router has to hold the whole world, and this walkthrough sits inside one area. The border router at the edge can be reached like any other, because it is part of the map. What lies behind it, the other networks it connects to, is deliberately left out of this map; learning that is the job of a different kind of routing, between networks rather than inside one.',
    analogy: 'Your local map shows every street in town but stops at the county line, leaving what lies beyond to another map.',
    changes: ['The border router is reachable; the prefixes beyond it are not in the database'],
    cite: [
      { rfc: 2328, sec: '3', title: 'Splitting the AS into Areas' },
      { rfc: 2328, sec: '3.1', title: 'The backbone of the Autonomous System' },
      { rfc: 2328, sec: '6', title: 'The Area Data Structure' },
      { rfc: 2328, sec: '1.2', title: 'Definitions of commonly used terms' }
    ]
  }
]);
