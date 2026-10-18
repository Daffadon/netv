NETV.addSteps('http', [
  {
    id: 'arp-request',
    phase: 'DHCP',
    title: 'The laptop asks the local network who owns the gateway IP',
    say: 'The laptop must address the router on this wire, so it asks the whole room who owns it.',
    actor: 'client',
    hop: ['client', 'ap', 'gw'],
    dir: 'out',
    osi: [2, 3],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: 'FF:FF:FF:FF:FF:FF', src: 'a4:5e:60:1f:2c:8b', type: '0x0806 (ARP)', fcs: 'valid' },
      arp: {
        hardwareType: 1,
        protocolType: '0x0800',
        op: 1,
        senderMac: 'a4:5e:60:1f:2c:8b',
        senderIp: '192.168.1.87',
        targetMac: '00:00:00:00:00:00',
        targetIp: '192.168.1.1'
      }
    },
    explain: 'Address Resolution Protocol (ARP) finds the hardware address (MAC address) for a local IP. The laptop knows the gateway IP 192.168.1.1, but Ethernet or Wi-Fi must deliver each frame to the next device using that device’s MAC address (the hardware address of its network card). The laptop does not know the gateway’s MAC address yet, so it asks every device on the local network. The question is broadcast locally and contains no IP packet, so routers do not forward it. The answer pairs the gateway IP with its MAC address for future frames.',
    analogy: 'A shout across a crowded lobby asking who holds the front-door key gets an answer from the person who owns it.',
    changes: ['Target MAC starts as 00:00:00:00:00:00 — the value being asked for'],
    note: 'ARP has no authentication, so a device can accept a false IP-to-MAC mapping from another device on the same local network. An attacker can use this to redirect local traffic (ARP spoofing).',
    cite: [
      { rfc: 826, sec: 'Packet format', title: 'Packet format' },
      { rfc: 894, sec: 'Broadcast Address', title: 'Broadcast Address' },
      { rfc: 894, sec: 'Address Mappings', title: 'Address Mappings' }
    ]
  },
  {
    id: 'arp-reply',
    phase: 'DHCP',
    title: 'The router answers with its own MAC address',
    say: 'The router answers, and the laptop writes its hardware address down for next time.',
    actor: 'gw',
    hop: ['gw', 'ap', 'client'],
    dir: 'in',
    osi: [2, 3],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: 'a4:5e:60:1f:2c:8b', src: 'b8:27:eb:11:22:33', type: '0x0806 (ARP)', fcs: 'valid' },
      arp: {
        hardwareType: 1,
        protocolType: '0x0800',
        op: 2,
        senderMac: 'b8:27:eb:11:22:33',
        senderIp: '192.168.1.1',
        targetMac: 'a4:5e:60:1f:2c:8b',
        targetIp: '192.168.1.87'
      }
    },
    explain: 'The router reads the question and sees that it is the machine being asked about. The asker\'s hardware address travels inside the question, so the router replies to that address alone instead of to the whole network. Its reply carries the pair to be remembered — the gateway\'s hardware address beside its network address — and the laptop keeps that pair in its cache until the entry ages out. Every link along a path asks and answers this question for itself, so nothing about the exchange travels beyond the local network.',
    analogy: 'The receptionist who hears the name called replies only to the person who asked, who then notes it down to avoid asking twice.',
    changes: ['op 1 → op 2 (request → reply)', 'Destination is the requester\'s MAC, not the broadcast address'],
    cite: [
      { rfc: 826, sec: 'Packet format', title: 'Packet format' },
      { rfc: 826, sec: 'Related issue', title: 'Related issue' }
    ]
  },
  {
    id: 'dns-query',
    phase: 'DNS',
    title: 'The laptop asks its configured DNS resolver for the website IP address',
    say: 'DNS turns website names into IP addresses; the laptop asks its configured resolver.',
    actor: 'client',
    hop: ['client', 'ap', 'gw', 'isp', 'resolver'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DNS message',
    fields: {
      ethernet: { dst: 'b8:27:eb:11:22:33', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { src: '192.168.1.87', dst: '198.51.100.53', ttl: 64, protocol: '17 (UDP)' },
      udp: { srcPort: 49153, dstPort: 53 },
      dns: { id: '0x3a7f', rd: 1, question: 'daffapn.my.id.', qtype: 'A', qclass: 'IN' }
    },
    explain: 'The operating system has a small DNS client, called a stub resolver, that sends the question to the configured recursive resolver at 198.51.100.53. That server looks up the answer on the laptop’s behalf. The query fits in one UDP message to port 53, so no TCP connection is needed. This is the first packet to leave the home network; the home router replaces the private source address with its public address so the reply can find its way back.',
    analogy: 'Handing one written question to a librarian who will search every shelf for you saves you the walk.',
    changes: [
      'Source 192.168.1.87 → 198.51.100.23 at gw — the full NAPT mechanism is explained in the connection phase',
      'TTL 64 → 63 at gw'
    ],
    note: 'DNS runs over UDP because a query and its answer fit in one datagram; port 53 is also used over TCP, for answers too large to fit and for zone transfers.',
    cite: [
      { rfc: 1035, sec: '4.1', title: 'Format' },
      { rfc: 1035, sec: '4.2.1', title: 'UDP usage' },
      { rfc: 9499, sec: '4', title: 'DNS Transactions' }
    ]
  },
  {
    id: 'dns-recursion',
    phase: 'DNS',
    title: 'The resolver walks the DNS delegation chain',
    say: 'One name server asks another, then another, until somebody actually knows.',
    actor: 'resolver',
    hop: ['resolver', 'root', 'tld', 'auth'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DNS message',
    fields: {
      dns: {
        question: 'daffapn.my.id.',
        qtype: 'A',
        qclass: 'IN',
        authority: 'referral: .id NS the nameservers responsible for .id',
        additional: 'glue: the addresses of those .id nameservers'
      }
    },
    explain: 'No single server knows every name, so one question does not reach the answer in one hop. The resolver first asks a root server who is responsible for the top-level domain .id, and gets back a referral: the reply names the next servers to ask instead of giving the address. It then asks those servers who is responsible for daffapn.my.id, and finally asks that server, which holds the zone\'s records and answers from them. The resolver keeps every referral and answer for as long as the record allows, so later lookups of the same name can skip these hops.',
    analogy: 'Being sent from one office to the next, each pointing onward, ends at the clerk who actually holds the record.',
    changes: ['Each link returns a referral, not an answer, until the authoritative server is reached'],
    note: 'A recursive resolver and an authoritative server are different roles: the recursive resolver answers on behalf of the client and does the walking, while the authoritative server only answers for the zones it holds and never chases anything.',
    cite: [
      { rfc: 1035, sec: '4.1.3', title: 'Resource record format' },
      { rfc: 9499, sec: '6', title: 'DNS Servers and Clients' }
    ]
  },
  {
    id: 'dns-answer',
    phase: 'DNS',
    title: 'The answer returns and is cached for 3600 seconds',
    say: 'The answer comes back with a shelf life, so the laptop remembers it for an hour.',
    actor: 'client',
    hop: ['resolver', 'isp', 'gw', 'ap', 'client'],
    dir: 'in',
    osi: [7, 4, 3, 2, 1],
    pdu: 'DNS message',
    fields: {
      ethernet: { dst: 'a4:5e:60:1f:2c:8b', src: 'b8:27:eb:11:22:33', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { src: '198.51.100.53', dst: '192.168.1.87', protocol: '17 (UDP)' },
      udp: { srcPort: 53, dstPort: 49153 },
      dns: {
        qr: 1,
        rd: 1,
        ra: 1,
        question: 'daffapn.my.id.',
        qtype: 'A',
        qclass: 'IN',
        answers: 'daffapn.my.id. 3600 IN A 203.0.113.80'
      }
    },
    explain: 'This reply is a real answer rather than a referral: it carries the record daffapn.my.id. 3600 IN A 203.0.113.80. An A record maps a website name to an IPv4 address, here 203.0.113.80. The flags say this is a response and that the resolver did the lookup on the laptop’s behalf. The 3600 is how many seconds the record may be kept, so the operating system caches the name-to-address mapping for an hour. The next connection can use that IP without another DNS lookup.',
    analogy: 'A shop assistant writes the price on a slip and says how long the quote stays good.',
    changes: ['The laptop now has a destination IP for daffapn.my.id, so no further DNS is needed for 3600 seconds'],
    note: 'The address shown, 203.0.113.80, is a documentation address from RFC 5737 §3, not the address daffapn.my.id really resolves to: a real lookup returns whatever the zone holds at that moment, and that changes as services move.',
    cite: [
      { rfc: 1035, sec: '3.4.1', title: 'A RDATA format' },
      { rfc: 1035, sec: '4.1.3', title: 'Resource record format' },
      { rfc: 5737, sec: '3', title: 'The Address Blocks' }
    ]
  }
]);
