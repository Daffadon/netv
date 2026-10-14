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
    explain: 'The application layer writes the request as plain text: a start line and then the field lines. Every field line ends with CRLF, and a blank line after the last field ends the header section. A GET has no body, so the request never declares a length, and the target is only the path; the separate Host field supplies the site name the path leaves out, because one address can host many sites. GET is safe and idempotent, so the browser may retry or cache it without surprising the server.',
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
    id: 'encapsulation-down',
    phase: 'HTTP',
    title: 'One header stacked on another on the way down',
    say: 'Each layer wraps the message in its own envelope, and none of them reads inside.',
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
    explain: 'The byte stream is handed down one layer at a time, and each layer adds its own header before passing the result to the layer below. The lower layer never looks inside what it is carrying: TCP treats the HTTP bytes as raw data, and IP treats the TCP segment as raw data. TCP splits the stream into segments and gives each a sequence number; IP adds the source and destination addresses and a TTL; Ethernet adds the MAC addresses and a trailing frame check. The network card finally turns the frame into electrical or radio bits on the wire.',
    analogy: 'Each office adds its own cover sheet to a document without reading it, then passes the pile along.',
    changes: [
      'HTTP message wrapped into a TCP segment',
      'Segment wrapped into an IP packet',
      'Packet wrapped into an Ethernet frame',
      'Ethernet frame becomes bits on the medium'
    ],
    note: 'The payload bytes never change while the packet is in flight — only the headers do. Sending a request adds four nested addresses before a single bit leaves the host.',
    cite: [
      { rfc: 9293, sec: '3.7', title: 'Segmentation' },
      { rfc: 791, sec: '3.1', title: 'Internet Header Format' },
      { rfc: 894, sec: 'Frame Format', title: 'Frame Format' },
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
    explain: 'Every router forwards the packet using only its destination address, one hop at a time, and keeps no memory of the connection: each packet is handled on its own. The path was chosen by BGP, which prefers policy and reachability over raw distance, so it is not always the shortest and can change while the connection stays open. By now the home router has looked up the binding for the private address and written its own public address into the packet, so it leaves with the translated source.',
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
    explain: 'A server process was waiting for a new connection on a listening socket, and once the connection was complete it received a fresh file descriptor for it. The server reads the start line and splits it into method, target, and version, then checks that a Host field is present and that the target is only a path. It routes on the Host and the path, because several sites can share one address and one port, and this lookup is where the right site is chosen.',
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
    explain: 'The handler runs and decides what to send back: it picks a representation for the resource and works out the metadata that describes it. The media type and charset tell the client how to read the bytes, the length says how many bytes to expect, and the ETag gives a version label the client can use later for conditional requests. None of these fields is the response text itself; that is written in the next step.',
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
