// Chapter BGP of the routing scenario: how two networks tell each other what they can reach.
// Owns steps 11-23 of the walkthrough (bgp-topology through bgp-forwarding). The board is
// NETV.scenarios.routing.boards.BGP: gw, isp, core-a, transit, edge, edge-b, server.
NETV.addSteps('routing', [
  {
    id: 'bgp-topology',
    phase: 'BGP',
    title: 'The map now holds two networks, not one',
    say: 'This map belongs to two networks at once, and two links join them.',
    actor: 'transit',
    dir: 'none',
    osi: [3],
    pdu: 'nothing on the wire yet',
    table: {
      caption: 'Which router belongs to which network on this map',
      columns: ['Router', 'Its network', 'What it does here'],
      rows: [
        ['home router', 'neither of the two', 'hands the packet to the provider and stops there'],
        ['ISP access', 'AS 64512', 'the first router of the provider network'],
        ['core A', 'AS 64512', 'a core router of the provider, an internal peer of its border router'],
        ['border router', 'AS 64512', 'the edge of the provider: the one that speaks across the boundary'],
        ['edge router', 'AS 64520', 'a front router of the datacentre, on the first link'],
        ['edge router B', 'AS 64520', 'the datacentre\'s other front router, on the second link'],
        ['server', 'AS 64520', 'the machine that holds the site being reached']
      ]
    },
    explain: 'The same picture is now two networks: everything up to and including the border router is the provider\'s, and the two edge routers with the server behind them are the datacentre\'s. Each network builds its own map inside itself, and the two maps meet at the two links between the border router and the edge routers. A conversation between routers of the same network is called internal, and one that crosses the boundary is external. The two are passed on under different rules, which is why the kind of peer an offer came from is part of what a router remembers about it.',
    analogy: 'Two neighbours agree on where the fence stands before either says what they have to trade.',
    changes: ['AS 64512 is the provider: the access router, core A and the border router', 'AS 64520 is the datacentre: the two edge routers and the server', 'Sessions inside one network are internal; only the border routers speak across'],
    note: 'The numbers 64512 and 64520 sit in the range set aside for private use, so they never name a real network on the public internet.',
    cite: [
      { rfc: 4271, sec: '3', title: 'Summary of Operation' },
      { rfc: 4271, sec: '3.1', title: 'Routes: Advertisement and Storage' },
      { rfc: 6996, sec: '3', title: 'Private Use ASNs' }
    ]
  },
  {
    id: 'bgp-tcp-peer',
    phase: 'BGP',
    title: 'The two routers open a session to the other network',
    say: 'Two border routers open a connection to talk for a long time.',
    actor: 'transit',
    hop: ['transit', 'edge'],
    dir: 'out',
    osi: [4, 3, 2, 1],
    pdu: 'TCP segment',
    payload: 'no application data yet',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.2', dst: '203.0.113.1' },
      tcp: { dstPort: 179, flags: 'SYN', window: 65535, options: 'MSS=1460' }
    },
    explain: 'BGP needs a conversation that lasts for years, not one request and one answer, so it asks TCP to carry it. TCP numbers every byte, retransmits what is lost, and slows down when the path is busy, so BGP never has to do those jobs itself. The two peers are not on the same wire; the session lives across several routers, and only TCP keeps it in order.',
    analogy: 'Two offices agree to keep a phone line open all day rather than calling fresh each time.',
    changes: ['The session is opened to port 179, the port reserved for this protocol'],
    note: 'A session between two different networks is called external; the same protocol also runs between routers inside one network.',
    cite: [
      { rfc: 4271, sec: '3', title: 'Summary of Operation' },
      { rfc: 9293, sec: '3.5', title: 'Establishing a Connection' }
    ]
  },
  {
    id: 'bgp-open',
    phase: 'BGP',
    title: 'They introduce themselves and agree on the terms',
    say: 'They greet each other and agree on the ground rules first.',
    actor: 'transit',
    hop: ['transit', 'edge'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.2', dst: '203.0.113.1' },
      tcp: { dstPort: 179, flags: 'PSH, ACK' },
      bgp: {
        type: 'OPEN (1)',
        version: 4,
        myAs: 64512,
        holdTime: 180,
        bgpIdentifier: '192.0.2.6',
        optionalParameters: 'capabilities'
      }
    },
    explain: 'Both sides introduce themselves: which version they speak, which network they belong to, how long they will wait in silence, and which address names this router. Optional parameters let them agree on extras before any traffic moves. If either side dislikes a parameter, it sends a refusal message and the session stops forming, so no routes are ever exchanged over it.',
    analogy: 'Two strangers meet at a door and check each other\u2019s credentials before letting anyone in.',
    changes: ['Hold time 180 s is agreed, and this router names itself 192.0.2.6'],
    note: 'The refusal that ends a bad handshake is a NOTIFICATION message; a router sends it for a version clash, a bad parameter, or a later error.',
    cite: [
      { rfc: 4271, sec: '4.2', title: 'OPEN Message Format' },
      { rfc: 4271, sec: '4.5', title: 'NOTIFICATION Message Format' }
    ]
  },
  {
    id: 'bgp-keepalive',
    phase: 'BGP',
    title: 'A small message keeps the session from going quiet',
    say: 'Small messages keep the session alive, and a quiet session is dropped.',
    actor: 'transit',
    hop: ['transit', 'edge'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.2', dst: '203.0.113.1' },
      tcp: { dstPort: 179, flags: 'PSH, ACK' },
      bgp: { type: 'KEEPALIVE (4)', holdTime: 180 }
    },
    explain: 'The session is kept open by a small message sent every third of the agreed hold time, so silence never reaches the limit. If the hold time passes with nothing heard, the session resets and every route learned over it is thrown away. A router that wants to stay reachable therefore keeps more than one peer, so losing one does not lose the reachability.',
    analogy: 'A night watchman checks in on a schedule, and silence is treated as trouble.',
    changes: ['A KEEPALIVE is expected every 60 s, one third of the 180 s hold time'],
    cite: [
      { rfc: 4271, sec: '4.4', title: 'KEEPALIVE Message Format' },
      { rfc: 4271, sec: '4.2', title: 'OPEN Message Format' }
    ]
  },
  {
    id: 'bgp-update-advertise',
    phase: 'BGP',
    title: 'The datacentre offers its block with the path attached',
    say: 'Each side offers the addresses it can reach, with the proof attached.',
    actor: 'edge',
    hop: ['edge', 'transit'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '203.0.113.1', dst: '198.51.100.2' },
      tcp: { dstPort: 179, flags: 'PSH, ACK' },
      bgp: {
        type: 'UPDATE (2)',
        origin: 'igp',
        asPath: '64520',
        nextHop: '203.0.113.1',
        multiExitDisc: 0,
        nlri: '203.0.113.0/24'
      }
    },
    explain: 'An update carries the addresses being offered and the claims that come with them: where the sender first learned the route, which networks it has passed through, and which address to send to next. This network puts its own number at the front of that list, so every receiver can see the path the offer travelled. A route is not a distance; it is a claim with evidence attached, and the receiver is free to judge it.',
    analogy: 'A merchant advertises goods with a receipt showing where they came from.',
    changes: ['AS_PATH starts as 64520, the sender\u2019s own network number, prepended to an empty list'],
    note: 'The network numbers 64512 to 65534 are set aside for private use, so they never name a real network on the public internet.',
    cite: [
      { rfc: 4271, sec: '4.3', title: 'UPDATE Message Format' },
      { rfc: 4271, sec: '5.1.1', title: 'ORIGIN' },
      { rfc: 4271, sec: '5.1.2', title: 'AS_PATH' },
      { rfc: 4271, sec: '5.1.3', title: 'NEXT_HOP' },
      { rfc: 4271, sec: '5.1.4', title: 'MULTI_EXIT_DISC' },
      { rfc: 6996, sec: '3', title: 'Private Use ASNs' }
    ]
  },
  {
    id: 'bgp-second-offer',
    phase: 'BGP',
    title: 'The second edge router offers the same block',
    say: 'The datacentre\'s other front router offers the same block over its own link.',
    actor: 'edge-b',
    hop: ['edge-b', 'transit'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '203.0.113.2', dst: '198.51.100.2' },
      tcp: { dstPort: 179, flags: 'PSH, ACK' },
      bgp: { type: 'UPDATE (2)', origin: 'igp', asPath: '64520', nextHop: '203.0.113.2', multiExitDisc: 100, nlri: '203.0.113.0/24' }
    },
    explain: 'The datacentre reaches the provider over two links, and each of its edge routers offers the same block over the one it sits on. The list of networks in the path and the way the route was learned are identical in both offers, so neither of those can tell them apart. The one thing that differs is the exit hint: the datacentre puts a higher number on this second link, which is how it tells the provider that it would rather receive the traffic on the first. The hint is only a hint, and the provider is free to ignore it.',
    analogy: 'A shop with two doors asks its customers to use the quieter one.',
    changes: ['The same block is offered a second time, over a different link', 'The exit hint here is 100, against 0 on the first link'],
    note: 'A hint can only be compared between offers from the same network, which is why both offers have to come from AS 64520.',
    cite: [
      { rfc: 4271, sec: '4.3', title: 'UPDATE Message Format' },
      { rfc: 4271, sec: '5.1.2', title: 'AS_PATH' },
      { rfc: 4271, sec: '5.1.4', title: 'MULTI_EXIT_DISC' }
    ]
  },
  {
    id: 'bgp-policy',
    phase: 'BGP',
    title: 'The receiver decides which offers to keep',
    say: 'The receiving router decides for itself which offers to keep.',
    actor: 'transit',
    dir: 'none',
    osi: [7, 3],
    pdu: 'nothing on the wire yet',
    explain: 'Nothing forces a router to accept what it is offered; its operator\u2019s policy decides what to keep, what to change, and what to drop, so there is no single shortest path in the world. When several offers survive, the choice is settled in a fixed order: highest local preference, then the shortest list of networks, then the lowest origin, then the lowest exit hint, then a direct peer before an internal one, then the lowest internal cost to the named next hop, and finally the lowest name.',
    analogy: 'A buyer sorts the offers by their own rules, not by which shop is nearest.',
    note: 'Local preference is only carried between routers of the same network; a neighbour in another network never sees how much this network likes a path.',
    cite: [
      { rfc: 4271, sec: '9.1', title: 'Decision Process' },
      { rfc: 4271, sec: '9.1.1', title: 'Phase 1: Calculation of Degree of Preference' },
      { rfc: 4271, sec: '9.1.2', title: 'Phase 2: Route Selection' },
      { rfc: 4271, sec: '9.1.2.2', title: 'Breaking Ties (Phase 2)' },
      { rfc: 4271, sec: '5.1.5', title: 'LOCAL_PREF' }
    ]
  },
  {
    id: 'bgp-select',
    phase: 'BGP',
    title: 'The two offers are compared, and the exit hint decides',
    say: 'Both offers are weighed in the same order, and the lower hint wins.',
    actor: 'transit',
    dir: 'none',
    osi: [7, 3],
    pdu: 'nothing on the wire yet',
    table: {
      caption: 'The comparison of the two offers, taken in the fixed order and stopped at the first difference',
      columns: ['Settled by', 'Edge router', 'Edge router B', 'Winner'],
      rows: [
        ['How much this network likes it', '100, default', '100, default', 'equal, go on'],
        ['Networks in the path', '64520', '64520', 'equal, go on'],
        ['How the route was learned', 'igp', 'igp', 'equal, go on'],
        ['Exit hint from the datacentre', '0', '100', 'the first link: lower']
      ]
    },
    explain: 'The receiver runs its tests in order and stops at the first one that separates the two offers, so the tests below it are never read at all. Here the first three are equal and the exit hint is not, so the offer that arrived over the first link goes into the table, and the other is kept as a spare. The spare is not thrown away: it stays ready, in case the chosen one goes. Nothing in this comparison looked at how far a packet would have to travel.',
    analogy: 'Two applicants with the same record are separated by the last question of the interview.',
    changes: ['Every offer is weighed on its own claims, not on the distance behind it', 'The block 203.0.113.0/24 leaves through the first edge router', 'The other offer stays in the table, ready to take over'],
    note: 'A tie that survives every test is settled by the lowest router name, so the comparison always ends with exactly one answer.',
    cite: [
      { rfc: 4271, sec: '9.1.2', title: 'Phase 2: Route Selection' },
      { rfc: 4271, sec: '9.1.2.2', title: 'Breaking Ties (Phase 2)' },
      { rfc: 4271, sec: '5.1.4', title: 'MULTI_EXIT_DISC' }
    ]
  },
  {
    id: 'bgp-local-pref',
    phase: 'BGP',
    title: 'The operator\'s policy moves the traffic to the other link',
    say: 'The network raises how much it likes the second offer, and the route moves.',
    actor: 'transit',
    hop: ['gw', 'isp', 'core-a', 'transit', 'edge-b', 'server'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.23', dst: '203.0.113.80' },
      tcp: { srcPort: 49152, dstPort: 80, flags: 'PSH, ACK' },
      http: { startLine: 'GET / HTTP/1.1', Host: 'daffapn.my.id' }
    },
    table: {
      caption: 'The same comparison, after the operator has raised how much this network likes the second offer',
      columns: ['Settled by', 'Edge router', 'Edge router B', 'Winner'],
      rows: [
        ['How much this network likes it', '100', '200, set here', 'the second link: higher'],
        ['Networks in the path', '64520', '64520', 'not reached'],
        ['Exit hint from the datacentre', '0', '100', 'not reached']
      ]
    },
    explain: 'Policy is applied as an offer arrives: every route learned from the second edge router is stamped with a higher preference than the one learned from the first. The same comparison runs again, and the very first test now separates the two, so the exit hint is never reached. A number the other network attached has been overruled by a decision this network made on its own, which is the whole point of the setting. The route changes, and every packet for that block changes with it.',
    analogy: 'A manager overrules the delivery note and sends the next van to the other gate.',
    changes: ['Every offer from the second edge router now carries a higher preference', 'The first offer is kept as the spare this time', 'The packet to the site leaves through the second edge router'],
    note: 'Preference is set inside this network and is never sent to another: the neighbour never learns how much this network likes its offer.',
    cite: [
      { rfc: 4271, sec: '5.1.5', title: 'LOCAL_PREF' },
      { rfc: 4271, sec: '9.1.1', title: 'Phase 1: Calculation of Degree of Preference' },
      { rfc: 4271, sec: '9.1.2', title: 'Phase 2: Route Selection' }
    ]
  },
  {
    id: 'bgp-loop-prevention',
    phase: 'BGP',
    title: 'An offer that names your own network is refused',
    say: 'A router throws away any offer that already names its own network.',
    actor: 'transit',
    dir: 'none',
    osi: [7, 3],
    pdu: 'nothing on the wire yet',
    explain: 'The list of networks a route has passed through is scanned while the router chooses the best route for that address: a list that already contains this router\'s own number describes a path that comes back to where it started, so the offer is discarded. The check costs nothing but matching one number against a short list. That single rule is what stops an offer from circling between networks forever.',
    analogy: 'A letter stamped with your own return address never gets sent back to you.',
    cite: [
      { rfc: 4271, sec: '5.1.2', title: 'AS_PATH' },
      { rfc: 4271, sec: '9.1.2', title: 'Phase 2: Route Selection' }
    ]
  },
  {
    id: 'bgp-next-hop',
    phase: 'BGP',
    title: 'An offer is only usable if the next hop is reachable',
    say: 'An offer is only usable when the path to it is itself reachable.',
    actor: 'transit',
    dir: 'none',
    osi: [7, 3],
    pdu: 'nothing on the wire yet',
    explain: 'The address named as the next hop is not found by the protocol that carries offers between networks; it must be found by the map that is built inside this network. If that internal route disappears, every offer that points at it becomes unusable, even though the offers themselves have not changed. This is where the two chapters meet: the outside world decides which path, and the inside map decides whether the path can be walked.',
    analogy: 'Knowing a shop\u2019s name is useless if you cannot find the street it sits on.',
    cite: [
      { rfc: 4271, sec: '5.1.3', title: 'NEXT_HOP' },
      { rfc: 4271, sec: '9.1.2.1', title: 'Route Resolvability Condition' }
    ]
  },
  {
    id: 'bgp-withdraw',
    phase: 'BGP',
    title: 'The block is taken back and the next path takes over',
    say: 'An address is taken back, and the next best way takes over.',
    actor: 'edge-b',
    hop: ['edge-b', 'transit'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '203.0.113.2', dst: '198.51.100.2' },
      tcp: { dstPort: 179, flags: 'PSH, ACK' },
      bgp: { type: 'UPDATE (2)', withdrawnRoutes: '203.0.113.0/24' }
    },
    explain: 'A route can vanish in two ways: the sender withdraws the address, or the session that carried the offer drops and everything learned over it goes with it. The router removes the path, runs its comparison again, and the next best offer takes over. From that moment the forwarding table sends every packet for that address down a different road, with no change in how any of those packets is handled.',
    analogy: 'A shop closes and customers take the next open road without being told twice.',
    changes: ['The offer this network preferred is withdrawn, and the spare takes its place', 'The block is reached through the first edge router again'],
    cite: [
      { rfc: 4271, sec: '4.3', title: 'UPDATE Message Format' },
      { rfc: 4271, sec: '9.1.2.2', title: 'Breaking Ties (Phase 2)' },
      { rfc: 4271, sec: '3', title: 'Summary of Operation' }
    ]
  },
  {
    id: 'bgp-forwarding',
    phase: 'BGP',
    title: 'The packet is forwarded by its destination alone',
    say: 'Back to the packet: each router reads only where it is going.',
    actor: 'gw',
    hop: ['gw', 'isp', 'core-a', 'transit', 'edge', 'server'],
    dir: 'out',
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '198.51.100.23', dst: '203.0.113.80' },
      tcp: { srcPort: 49152, dstPort: 80, seq: '0x1a2b3c4e', ack: '0x5e6f7082', flags: 'PSH, ACK', window: 65535 },
      http: {
        startLine: 'GET / HTTP/1.1',
        Host: 'daffapn.my.id',
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive'
      }
    },
    explain: 'This network forwards the packet by its destination address alone; it keeps no record of the connection the packet belongs to. The road was chosen long before, by the offers exchanged between networks, and one change of offer moves every packet for that address at once. The address it is aimed at, 203.0.113.80, sits inside the block 203.0.113.0/24 that the other network advertised.',
    analogy: 'A relay team passes the baton along, each runner looking only at the next hand.',
    changes: [
      'TTL steps down once per router: 64 \u2192 63 \u2192 62 \u2192 61 \u2192 60',
      'The server receives the packet with 60 left',
      'Each hop builds a new frame for the next link, and no router reads the connection inside'
    ],
    note: 'Every packet of the connection takes the same path today, but a single route change would move them all, even in the middle of a transfer.',
    cite: [
      { rfc: 4271, sec: '3', title: 'Summary of Operation' },
      { rfc: 4271, sec: '9.1', title: 'Decision Process' },
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' }
    ]
  }
]);
