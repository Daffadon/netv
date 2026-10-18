NETV.addSteps('http', [
  {
    id: 'tcp-syn-build',
    phase: 'HTTP',
    title: 'TCP opens a connection with its first SYN message',
    say: 'First of three TCP handshake messages: the client opens a connection before sending the request.',
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
    explain: 'TCP (Transmission Control Protocol) reliably carries bytes between programs and opens a connection before any HTTP data moves. The client picks a temporary local port, 49152, and sends a SYN, the opening message, to the server’s web port 80. The SYN carries a random initial sequence number (the starting byte number); the MSS (Maximum Segment Size) option states the largest piece of data this end will accept. The server replies with its own starting number and limit, then the client confirms them before sending the request. A random starting number also makes it harder for an off-path attacker to guess a valid packet.',
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
    explain: 'The switch and access point forward on the destination hardware address alone and cannot lower the hop counter. The home router performs NAT (Network Address Translation): it replaces the private address 192.168.1.87 with its public address 198.51.100.23 and records the mapping, so the reply finds its way back to the right machine. Each router subtracts one from the hop counter and drops the packet with an ICMP (Internet Control Message Protocol) Time Exceeded error when it reaches zero, so no packet circles forever. Every hop builds a fresh frame for the next link, so hardware addresses change at each hop but IP addresses do not. OSPF (Open Shortest Path First) works inside a network; BGP (Border Gateway Protocol) helps different networks exchange routes.',
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
    say: 'The server confirms the client’s starting number and sends its own; the client still needs to confirm it.',
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
    explain: 'The server listens on port 80 for web requests. When the SYN arrives, TCP creates a connection record identified by the client and server IP addresses and port numbers. The server sends its own starting sequence number and MSS. SYN carries that number; ACK confirms the client’s starting number by returning the next number expected. The reply follows the route home; the home router maps the public address and port back to the laptop’s private address and port.',
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
    explain: 'The third message finishes the three-way handshake: the client confirms the server’s starting number. Both sides now know where byte counting starts, so either can send while receiving. None of the first three messages carried HTTP data; opening a new connection costs a round trip before the request can start.',
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
