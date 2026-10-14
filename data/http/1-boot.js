// P0 · Getting on the network — the laptop obtains an IP address before any HTTP work begins.
// Owns steps 1–4 of the master list. One NETV.addSteps call, steps in order.
NETV.addSteps('http', [
  {
    id: 'intent',
    phase: 'DHCP',
    title: 'The browser parses the URL into scheme and host',
    say: 'You press Enter. The browser has a name, but no idea where that name lives.',
    actor: 'client',
    dir: 'none',
    osi: [7],
    pdu: 'nothing on the wire yet',
    explain: 'The browser takes http://daffapn.my.id/ apart into two facts it needs next. The scheme says requests go to port 80 over an unencrypted connection. The authority is a name, not an address, and that name has to become an address before anything can leave the laptop. The laptop has only now joined the network and holds no address of its own, so even the DNS query has to wait.',
    analogy: 'You hold a friend\'s name but not their street address, and your own new house has no door number yet.',
    changes: ['Nothing is transmitted: the browser has only recorded the scheme, the host name and the default port 80'],
    cite: [
      { rfc: 9110, sec: '1.1', title: 'Purpose' },
      { rfc: 9110, sec: '7.2', title: 'Host and :authority' },
      { rfc: 9112, sec: '3.2', title: 'Request Target' }
    ]
  },
  {
    id: 'dhcp-discover',
    phase: 'DHCP',
    title: 'The laptop broadcasts a DHCPDISCOVER for an address',
    say: 'The laptop has no address yet, so it shouts a question to the whole network.',
    actor: 'client',
    hop: ['client', 'ap', 'gw'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DHCP message',
    fields: {
      ethernet: { dst: 'ff:ff:ff:ff:ff:ff', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)' },
      ip: { src: '0.0.0.0', dst: '255.255.255.255', ttl: 64, protocol: '17 (UDP)' },
      udp: { srcPort: 68, dstPort: 67 },
      dhcp: { op: '1 (BOOTREQUEST)', xid: '0x9f3a17c2', chaddr: 'a4:5e:60:1f:2c:8b', ciaddr: '0.0.0.0' }
    },
    explain: 'The laptop has no address of its own, so it fills in the source as 0.0.0.0 and the destination as 255.255.255.255, the broadcast address every machine on the local link reads, since it does not know which one runs the DHCP server. At layer 2 the destination address is FF:FF:FF:FF:FF:FF, so the switch sends the frame out of every other port. The request rides UDP from port 68 to port 67, not TCP: it has to finish before the interface is configured, and TCP cannot set up its handshake or retransmissions without an address.',
    analogy: 'You call out a question to the whole room because you do not know who has the answer.',
    changes: ['TTL stays 64: a limited broadcast is never forwarded by a router, so it never crosses a routing hop', 'The frame is flooded to the whole LAN, and only the DHCP server answers'],
    note: 'The broadcast reaches every host on the link, but only the machine configured as the DHCP server replies.',
    cite: [
      { rfc: 2131, sec: '3.1', title: 'Client-server interaction - allocating a network address' },
      { rfc: 2131, sec: '4.4.1', title: 'Initialization and allocation of network address' },
      { rfc: 2131, sec: '4.4.4', title: 'Use of broadcast and unicast' }
    ]
  },
  {
    id: 'dhcp-offer',
    phase: 'DHCP',
    title: 'The router offers 192.168.1.87 with mask, gateway and DNS',
    say: 'The router answers with an address, a way out, and a phone book to use.',
    actor: 'gw',
    hop: ['gw', 'ap', 'client'],
    dir: 'in',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DHCP message',
    fields: {
      ethernet: { dst: 'ff:ff:ff:ff:ff:ff', src: 'b8:27:eb:11:22:33', type: '0x0800 (IPv4)' },
      ip: { src: '192.168.1.1', dst: '255.255.255.255', ttl: 64, protocol: '17 (UDP)' },
      udp: { srcPort: 67, dstPort: 68 },
      dhcp: {
        op: '2 (BOOTREPLY)',
        xid: '0x9f3a17c2',
        yiaddr: '192.168.1.87',
        siaddr: '192.168.1.1',
        chaddr: 'a4:5e:60:1f:2c:8b',
        ciaddr: '0.0.0.0',
        options: 'subnet mask 255.255.255.0, router 192.168.1.1, DNS 198.51.100.53, lease time 86400 s'
      }
    },
    explain: 'The router answers with an offer: the client address field holds 192.168.1.87, the address it is willing to lend. It still broadcasts the reply to 255.255.255.255, because the client has not taken that address yet and cannot be reached directly. The options carry what is needed to use the address: mask 255.255.255.0 sets the size of the local network, router 192.168.1.1 becomes the way off it, DNS 198.51.100.53 is the resolver to ask about names, and lease 86400 seconds says how long the address is lent.',
    analogy: 'A hotel clerk lends you a room and also says which wing it is in, which door leads out and when to check out.',
    changes: ['yiaddr now carries the offered address 192.168.1.87', 'Reply is still broadcast, so it can reach the client before the client owns an address'],
    cite: [
      { rfc: 2131, sec: '3.1', title: 'Client-server interaction - allocating a network address' },
      { rfc: 2131, sec: '4.3.1', title: 'DHCPDISCOVER message' }
    ]
  },
  {
    id: 'dhcp-request-ack',
    phase: 'DHCP',
    title: 'The client requests the offer and the server commits it',
    say: 'The laptop accepts the address, and the router confirms it is now yours.',
    actor: 'client',
    hop: ['client', 'ap', 'gw'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DHCP message',
    fields: {
      ethernet: { dst: 'ff:ff:ff:ff:ff:ff', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)' },
      ip: { src: '0.0.0.0', dst: '255.255.255.255', ttl: 64, protocol: '17 (UDP)' },
      udp: { srcPort: 68, dstPort: 67 },
      dhcp: {
        op: '1 (BOOTREQUEST)',
        xid: '0x9f3a17c2',
        chaddr: 'a4:5e:60:1f:2c:8b',
        ciaddr: '0.0.0.0',
        options: 'requested IP 192.168.1.87, server identifier 192.168.1.1'
      }
    },
    explain: 'The client picks one offer, so it broadcasts a request that names the server it chose, which lets any other server release the address it was holding. That server answers with an acknowledgement that commits the lease. Only when the acknowledgement arrives does the laptop take the configuration: address 192.168.1.87 with a mask of /24, gateway 192.168.1.1 and resolver 198.51.100.53, kept for 24 hours.',
    analogy: 'You accept one shop\'s quote out loud so the other shops stop holding the item for you, then the shop confirms the sale.',
    changes: ['Source stays 0.0.0.0 for the REQUEST; the client adopts 192.168.1.87 only after the ACK', 'The interface is now usable: 192.168.1.87/24, gateway 192.168.1.1, DNS 198.51.100.53'],
    note: 'This whole phase runs once per network join, not once per page load — the lease lasts 24 hours and is renewed in the background much later.',
    cite: [
      { rfc: 2131, sec: '3.1', title: 'Client-server interaction - allocating a network address' },
      { rfc: 2131, sec: '4.3.2', title: 'DHCPREQUEST message' }
    ]
  }
]);
