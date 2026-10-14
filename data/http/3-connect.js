NETV.addSteps('http', [
  {
    id: 'tcp-syn-build',
    phase: 'HTTP',
    title: 'The transport layer builds a SYN segment',
    say: 'Before any words are exchanged, the two sides agree how to count the bytes.',
    actor: 'client',
    dir: 'out',
    osi: [4],
    pdu: 'TCP segment',
    payload: 'no application data yet',
    fields: {
      tcp: {
        srcPort: 49152,
        dstPort: 80,
        seq: '0x1a2b3c4d (ISN)',
        ack: '0',
        dataOffset: 20,
        flags: 'SYN',
        window: 65535,
        checksum: '0x4d2e',
        options: 'MSS=1460, SACK permitted, window scale 7'
      }
    },
    explain: 'The transport layer builds this segment before anything below it adds headers. It takes an unused local port, 49152, as the source and aims at port 80, and it sets the SYN flag while carrying no application data. That flag starts the negotiation of sequence numbers: this end offers its starting number, and the MSS option states the largest segment it will accept, so both sides learn each other\'s limits before any data moves. The starting number is random instead of zero, so an attacker who cannot watch the connection cannot guess what comes next and slip in a forged segment.',
    analogy: 'Two neighbours agree, before saying a word, which point they will start counting from and how big a bundle each can take.',
    changes: [
      'An ephemeral source port 49152 is chosen for this connection',
      'Initial sequence number 0x1a2b3c4d is selected at random'
    ],
    cite: [
      { rfc: 9293, sec: '3.5', title: 'Establishing a Connection' },
      { rfc: 9293, sec: '3.4.1', title: 'Initial Sequence Number Selection' },
      { rfc: 9293, sec: '3.7.1', title: 'Maximum Segment Size Option' }
    ]
  },
  {
    id: 'syn-on-the-wire',
    phase: 'HTTP',
    title: 'The SYN crosses the LAN and the Internet',
    say: 'The packet leaves home, and every router it crosses quietly subtracts one from its lifespan.',
    actor: 'gw',
    hop: ['client', 'ap', 'gw', 'isp', 'transit', 'edge', 'server'],
    dir: 'out',
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: 'b8:27:eb:11:22:33', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, totalLength: 60, ttl: 64, protocol: '6 (TCP)', src: '192.168.1.87', dst: '203.0.113.80' },
      tcp: { srcPort: 49152, dstPort: 80, seq: '0x1a2b3c4d', flags: 'SYN', window: 65535, options: 'MSS=1460' }
    },
    explain: 'The switch and access point forward on the destination hardware address alone and cannot lower the hop counter. The home router replaces the private address 192.168.1.87 with its public address 198.51.100.23 and records the mapping, so the reply finds its way back to the right machine. Each router then subtracts one from the hop counter and drops the packet with an ICMP Time Exceeded message once it reaches zero, so no packet circles forever. Every hop builds a fresh frame for the next link, so the hardware addresses change at each hop but the IP addresses do not, and the backbone routers choose a path from tables learned with BGP.',
    analogy: 'A reception desk writes its own return name on your parcel, and each postman crosses a day off its delivery window.',
    changes: [
      'TTL 64 → 63 at the home router',
      '63 → 62 at the ISP access router',
      '62 → 61 at the backbone transit router',
      '61 → 60 at the datacenter edge router',
      'source IP rewritten 192.168.1.87 → 198.51.100.23 by NAT',
      'the AP changes nothing above layer 2',
      'a new source and destination MAC on every hop'
    ],
    note: 'Had the source port been in use for another flow, NAT would have picked a different one — the binding is the (address, port) pair, not the address alone.',
    cite: [
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' },
      { rfc: 3022, sec: '3.1', title: 'Address binding' },
      { rfc: 894, sec: 'Frame Format', title: 'A Standard for the Transmission of IP Datagrams over Ethernet Networks' },
      { rfc: 791, sec: '2.2', title: 'Model of Operation' },
      { rfc: 4271, sec: '3', title: 'Summary of Operation' }
    ]
  },
  {
    id: 'tcp-syn-ack',
    phase: 'HTTP',
    title: 'The server answers with SYN, ACK',
    say: 'The server answers in kind, and the connection is half open.',
    actor: 'server',
    hop: ['server', 'edge', 'transit', 'isp', 'gw', 'ap', 'client'],
    dir: 'in',
    osi: [4, 3, 2, 1],
    pdu: 'TCP segment',
    fields: {
      ip: { version: 4, headerLength: 20, totalLength: 60, ttl: 64, protocol: '6 (TCP)', src: '203.0.113.80', dst: '198.51.100.23' },
      tcp: {
        srcPort: 80,
        dstPort: 49152,
        seq: '0x5e6f7081 (ISN)',
        ack: '0x1a2b3c4e',
        dataOffset: 20,
        flags: 'SYN, ACK',
        window: 65535,
        checksum: '0x9a3b',
        options: 'MSS=1460'
      },
      ethernet: { src: '00:1b:21:3c:4d:5e', type: '0x0800 (IPv4)', fcs: 'valid' }
    },
    explain: 'The server already listens on port 80, and this segment matches that socket, so the kernel creates a new connection record keyed by the client\'s four values: source address, source port, destination address, and destination port. It answers with its own starting sequence number and its MSS, and it sets both SYN and ACK: SYN to open the reverse direction, ACK to confirm the client\'s sequence number by sending it back plus one. The reply follows the same path home with the hop counter lowered once per router, and by the time it arrives the destination port reads 49152 because the home router mapped the flow back to the laptop.',
    analogy: 'A librarian with a desk already open takes your slip, starts a new card for you both and writes her own reference on it.',
    changes: [
      'TTL 64 → 63 at the datacenter edge router',
      '63 → 62 at the backbone transit router',
      '62 → 61 at the ISP access router',
      '61 → 60 at the home router',
      'destination port arrives as 49152 because the home router mapped the flow back to the laptop'
    ],
    note: 'A server that replied only after allocating memory for every SYN could be flooded to exhaustion — see SYN cookies and backlog tuning.',
    cite: [
      { rfc: 9293, sec: '3.5', title: 'Establishing a Connection' },
      { rfc: 9293, sec: '3.3.2', title: 'State Machine Overview' },
      { rfc: 4987, sec: '2.2', title: 'Theory of Operation' },
      { rfc: 4987, sec: '3.2', title: 'Increasing Backlog' }
    ]
  },
  {
    id: 'tcp-ack-established',
    phase: 'HTTP',
    title: 'The client acknowledges and the connection is established',
    say: 'One round trip spent. Both sides are ready, and nothing has been sent yet.',
    actor: 'client',
    dir: 'out',
    osi: [4],
    pdu: 'TCP segment',
    fields: {
      tcp: {
        srcPort: 49152,
        dstPort: 80,
        seq: '0x1a2b3c4e',
        ack: '0x5e6f7082',
        flags: 'ACK'
      }
    },
    explain: 'This third leg finishes the three-way handshake: the client confirms the server\'s sequence number and both ends move to ESTABLISHED. None of the three segments carried any data, so a full round trip passes before a single byte of the request can move, which makes opening a fresh connection costly and reusing one worthwhile. The connection is now symmetric and full-duplex, so either side may send whenever it likes without waiting for the other.',
    analogy: 'The two finish shaking hands before either says a word, and now either can talk at any moment.',
    changes: [
      'Client state: SYN-SENT → ESTABLISHED',
      'Server state: SYN-RECEIVED → ESTABLISHED'
    ],
    cite: [
      { rfc: 9293, sec: '3.5', title: 'Establishing a Connection' },
      { rfc: 9293, sec: '3.3.2', title: 'State Machine Overview' }
    ]
  }
]);
