NETV.addSteps('http', [
  {
    id: 'http-request-message',
    phase: 'HTTP',
    title: 'The client composes the HTTP request',
    say: 'Finally the actual request: a few lines of text asking for the page.',
    actor: 'client',
    dir: 'out',
    osi: [7],
    pdu: 'HTTP message',
    fields: {
      http: {
        startLine: 'GET / HTTP/1.1',
        Host: 'daffapn.my.id',
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive'
      }
    },
    explain: 'The browser writes an HTTP request as text: the first line says what it wants, then header lines add details. Each header ends with CRLF (a line break); a blank line marks the end of headers. GET / asks the server to return the site’s home page and carries no request body. Host names the site because several sites can share one IP address. GET is intended to read, not change, server state; repeating it has the same intended effect (idempotent), so it is safe to retry. Whether the response may be cached depends on its cache rules.',
    analogy: 'Think of a note that names the building and the room, so the reader knows exactly which place you mean.',
    cite: [
      { rfc: 9110, sec: '9.3.1', title: 'GET' },
      { rfc: 9110, sec: '7.2', title: 'Host and :authority' },
      { rfc: 9112, sec: '3', title: 'Request Line' },
      { rfc: 9112, sec: '2.1', title: 'Message Format' },
      { rfc: 9110, sec: '5.2', title: 'Field Lines and Combined Field Value' },
      { rfc: 9110, sec: '12.5.1', title: 'Accept' }
    ]
  },
  {
    id: 'wrap-tcp',
    phase: 'HTTP',
    title: 'TCP adds its header and numbers the bytes',
    say: 'The request is wrapped in a segment and its bytes are numbered.',
    actor: 'client',
    dir: 'none',
    osi: [7, 4],
    pdu: 'TCP segment',
    payload: 'the HTTP request message',
    fields: {
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
    explain: 'The bytes the application wrote are handed down to TCP, which treats them as raw data and puts its own header in front of them: the two port numbers that name the two programs, the sequence number of the first byte in this segment, an acknowledgement for the bytes it has received from the other side, and the push flag that asks for the data to be handed up as soon as it lands. TCP never reads the request text, so changing the request would not change this header. The 163-byte request fits in one segment, so nothing is split here.',
    analogy: 'Each office adds its own cover sheet to a document without reading it.',
    changes: ['A 20-byte TCP header goes in front of the 163 request bytes', 'The ports name the programs; the sequence number counts the bytes'],
    cite: [
      { rfc: 9293, sec: '3.7', title: 'Segmentation' },
      { rfc: 9293, sec: '3.1', title: 'Header Format' }
    ]
  },
  {
    id: 'wrap-ip',
    phase: 'HTTP',
    title: 'IP adds the addresses that can cross networks',
    say: 'IP writes the two addresses and a limit on how far to go.',
    actor: 'client',
    dir: 'none',
    osi: [7, 4, 3],
    pdu: 'IP packet',
    payload: 'the TCP segment',
    fields: {
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '192.168.1.87', dst: '203.0.113.80' },
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
    explain: 'The segment is handed down once more, and IP puts its own header in front of it: the version and the header length, the source address of the machine sending it, the destination address of the server, the protocol number that tells the far side a TCP segment is inside, and a limit on how many routers the packet may still cross. IP does not read the segment either; it moves a block of bytes between networks. This is the first header that means anything outside the local link.',
    analogy: 'A courier writes the sender and the destination on the outside of the parcel.',
    changes: ['A 20-byte IP header goes in front of the segment', 'TTL starts at 64: every router that forwards it takes one away'],
    note: 'Nothing here knows the route: the addresses say where the packet must go, and each router decides the next hop on its own.',
    cite: [
      { rfc: 791, sec: '3.1', title: 'Internet Header Format' },
      { rfc: 791, sec: '2.2', title: 'Model of Operation' },
      { rfc: 1122, sec: '1.1.3', title: 'Internet Protocol Suite' }
    ]
  },
  {
    id: 'wrap-frame',
    phase: 'HTTP',
    title: 'Ethernet adds the two local hardware addresses',
    say: 'The frame carries the hardware address of the very next device.',
    actor: 'client',
    hop: ['client', 'ap'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: 'b8:27:eb:11:22:33', src: 'a4:5e:60:1f:2c:8b', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 64, protocol: '6 (TCP)', src: '192.168.1.87', dst: '203.0.113.80' },
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
    explain: 'The last header is the one only this link can read: the hardware address of the next device, the hardware address of the sending card, a type field that marks the contents as an IPv4 packet, and a check at the end of the frame. The network card turns the frame into signals on the wire, and the switch reads only these addresses to decide which port to send it out of. This is where the first hop ends, and a router rebuilds this header from scratch at every hop after it.',
    analogy: 'A relay runner reads only the next hand-off, not the message being carried.',
    changes: ['An Ethernet header and a trailing check go around the packet', 'These addresses name this link only, so every hop builds a new frame'],
    note: 'The payload bytes never change while the packet is in flight — only the headers do.',
    cite: [
      { rfc: 894, sec: 'Frame Format', title: 'Frame Format' },
      { rfc: 894, sec: 'Address Mappings', title: 'Address Mappings' },
      { rfc: 1122, sec: '1.1.3', title: 'Internet Protocol Suite' }
    ]
  },
  {
    id: 'request-crosses-internet',
    phase: 'HTTP',
    title: 'The frame crosses the internet hop by hop',
    say: 'Out the door: your private address is swapped for the household public one.',
    actor: 'gw',
    hop: ['client', 'ap', 'gw', 'isp', 'transit', 'edge', 'server'],
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
    explain: 'Routers send the packet toward its destination IP one hop at a time, using a route table to choose the next router. Those tables are prepared before the request: OSPF (Open Shortest Path First) shares a map inside one network; BGP (Border Gateway Protocol) exchanges reachable address blocks between networks, and each network uses policy to choose routes. A chosen path need not be physically shortest and can change while the connection stays open. The home router uses its NAT mapping to replace the laptop’s private source IP with its public IP and keep track of the change, so the reply can be matched when it returns.',
    analogy: 'A courier chain passes each parcel onward reading only the label on the front, and each office stamps its own return address.',
    changes: [
      'NAT rewrites the source address: 192.168.1.87 → 198.51.100.23',
      'TTL steps down once per router: 64 → 63 → 62 → 61 → 60',
      'Each hop builds a new L2 frame with the next link\u2019s MAC addresses',
      'The AP is L2 only and leaves the TTL untouched'
    ],
    cite: [
      { rfc: 3022, sec: '3.1', title: 'Address binding' },
      { rfc: 3022, sec: '3.2', title: 'Address lookup and translation' },
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' },
      { rfc: 4271, sec: '3', title: 'Summary of Operation' },
      { rfc: 894, sec: 'Frame Format', title: 'Frame Format' }
    ]
  },
  {
    id: 'server-receives',
    phase: 'HTTP',
    title: 'The server unwraps the frame back to HTTP',
    say: 'Arrived. The server peels off each envelope until the request is readable.',
    actor: 'server',
    dir: 'in',
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: '00:1b:21:3c:4d:5e', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, ttl: 60, protocol: '6 (TCP)', src: '198.51.100.23', dst: '203.0.113.80' },
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
    explain: 'The server unwraps the packet in the reverse order of the way it was built. The network card checks the frame check sequence and the destination MAC, then the type says the payload is an IPv4 packet, so it goes to IP. IP checks its header checksum and sees the TTL has dropped to 60 after five routers; the protocol number 6 then hands the payload to TCP. TCP matches the connection from the four addresses and ports, checks the segment, acknowledges the data, and puts the bytes in the socket receive queue, where the stream is reassembled in order for the server process.',
    analogy: 'A sealed packet travels through several doors, and each guard opens only the wrapper meant for them.',
    cite: [
      { rfc: 9293, sec: '3.1', title: 'Header Format' },
      { rfc: 9293, sec: '3.8', title: 'Data Communication' },
      { rfc: 791, sec: '3.1', title: 'Internet Header Format' },
      { rfc: 894, sec: 'Frame Format', title: 'Frame Format' }
    ]
  },
  {
    id: 'server-parses',
    phase: 'HTTP',
    title: 'The server parses the request line and routes it',
    say: 'The server reads the request and works out which site on this machine you meant.',
    actor: 'server',
    dir: 'none',
    osi: [7],
    pdu: 'HTTP message',
    fields: {
      http: {
        startLine: 'GET / HTTP/1.1',
        Host: 'daffapn.my.id'
      }
    },
    explain: 'A web server waits for connections on port 80. Once TCP connects, the server reads the request. GET / HTTP/1.1 means “use GET to fetch / with HTTP/1.1”; Host daffapn.my.id selects the right site because several sites can share one IP address and port. The server then uses path / to choose the page.',
    analogy: 'Like a hotel reception that reads the room name on your booking and sends you to the right door.',
    cite: [
      { rfc: 9112, sec: '2.2', title: 'Message Parsing' },
      { rfc: 9112, sec: '3', title: 'Request Line' },
      { rfc: 9112, sec: '3.1', title: 'Request Target' },
      { rfc: 9110, sec: '7.2', title: 'Host and :authority' },
      { rfc: 9110, sec: '7.3', title: 'Routing Inbound Requests' }
    ]
  },
  {
    id: 'app-handles',
    phase: 'HTTP',
    title: 'The application selects the representation',
    say: 'The application builds the page and describes what it is about to send.',
    actor: 'server',
    dir: 'none',
    osi: [7],
    pdu: 'HTTP message',
    fields: {
      http: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        ETag: '"a1b2c3"',
        Date: 'Mon, 13 Oct 2026 21:30:00 GMT'
      }
    },
    explain: 'The server application chooses a page to send (the representation) and labels its bytes. Content-Type says the body is HTML encoded as UTF-8; Content-Length says it has 1256 bytes; Date says when the server made the response. ETag is a version label the browser can use later to check whether the page changed. These labels describe the body but are not the body; the next step sends the HTML bytes.',
    analogy: 'Like a librarian who chooses the right book and writes its details on the slip before handing it over.',
    note: 'The body is 1256 bytes, which fits inside one 1460-byte MSS segment, so the response will not need to be split.',
    cite: [
      { rfc: 9110, sec: '8.2', title: 'Representation Metadata' },
      { rfc: 9110, sec: '8.3', title: 'Content-Type' },
      { rfc: 9110, sec: '8.6', title: 'Content-Length' },
      { rfc: 9110, sec: '8.8.3', title: 'ETag' }
    ]
  }
]);
