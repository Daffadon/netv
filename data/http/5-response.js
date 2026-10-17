NETV.addSteps('http', [
  {
    id: 'http-response-message',
    phase: 'HTTP',
    title: 'The server serialises the HTTP response',
    say: 'The reply: a status line, a few labels, and the page itself.',
    actor: 'server',
    dir: 'out',
    osi: [7],
    pdu: 'HTTP message',
    payload: 'the HTML representation, 1256 bytes',
    fields: {
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Date: 'Tue, 13 Oct 2026 21:00:00 GMT',
        ETag: '"a1b2c3"',
        Connection: 'keep-alive'
      }
    },
    explain: 'A response starts with a status line, then headers, a blank line, and the body (the page data). HTTP/1.1 200 OK means the request succeeded. For this GET, the body is the HTML page. Content-Type tells the browser how to read it; Content-Length says it has 1256 bytes, so the browser knows where the body ends even though the TCP connection stays open. ETag is a version label the browser can later use to check whether the page changed.',
    analogy: 'Like a parcel with the address label on top, the contents list under it, and the goods packed last.',
    cite: [
      { rfc: 9112, sec: '4', title: 'Status Line' },
      { rfc: 9110, sec: '15.3.1', title: '200 OK' },
      { rfc: 9110, sec: '8.6', title: 'Content-Length' },
      { rfc: 9112, sec: '6.2', title: 'Content-Length' },
      { rfc: 9112, sec: '2.1', title: 'Message Format' }
    ]
  },
  {
    id: 'response-wrap-tcp',
    phase: 'HTTP',
    title: 'TCP wraps the response in its own segment',
    say: 'The reply gets its own byte counter for the other direction.',
    actor: 'server',
    dir: 'none',
    osi: [7, 4],
    pdu: 'TCP segment',
    payload: 'the HTTP response message',
    fields: {
      tcp: { srcPort: 80, dstPort: 49152, seq: '0x5e6f7082 (server ISN + 1)', ack: '0x1a2b3cf1 (client ISN + 1 + 163 request bytes)', flags: 'PSH, ACK', window: 65535, dataOffset: 20, checksum: '0x3a7d' },
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Date: 'Tue, 13 Oct 2026 21:00:00 GMT',
        ETag: '"a1b2c3"',
        Connection: 'keep-alive'
      }
    },
    explain: 'The response bytes are handed to TCP, which numbers them in its own sequence space: the sequence number counts the bytes this server has sent, while the acknowledgement covers the request bytes that arrived from the client. The two directions never share counters, so one side can be far ahead of the other without confusion. Ports, window and checksum are filled in as they were on the way out, and the push flag asks the client to hand the data up as soon as it lands. The 1256-byte body fits in one segment.',
    analogy: 'Two people keep separate tallies, one for each direction of the conversation.',
    changes: ['TCP adds a 20-byte header, so the IP payload is 1276 bytes', 'The sequence number counts server bytes; the acknowledgement covers the request'],
    cite: [
      { rfc: 9293, sec: '3.7', title: 'Segmentation' },
      { rfc: 9293, sec: '3.8', title: 'Data Communication' },
      { rfc: 9112, sec: '6.3', title: 'Message Body Length' }
    ]
  },
  {
    id: 'response-wrap-ip',
    phase: 'HTTP',
    title: 'IP addresses the reply to the home router',
    say: 'The reply is addressed to the public address the request came from.',
    actor: 'server',
    dir: 'none',
    osi: [7, 4, 3],
    pdu: 'IP packet',
    payload: 'the TCP segment',
    fields: {
      ip: { version: 4, headerLength: 20, totalLength: 1296, id: '0x7b41', ttl: 64, protocol: '6 (TCP)', checksum: '0x9f2c', src: '203.0.113.80', dst: '198.51.100.23' },
      tcp: { srcPort: 80, dstPort: 49152, seq: '0x5e6f7082 (server ISN + 1)', ack: '0x1a2b3cf1 (client ISN + 1 + 163 request bytes)', flags: 'PSH, ACK', window: 65535, dataOffset: 20, checksum: '0x3a7d' },
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Date: 'Tue, 13 Oct 2026 21:00:00 GMT',
        ETag: '"a1b2c3"',
        Connection: 'keep-alive'
      }
    },
    explain: 'The header names the server as the source and the home router as the destination, because that is the address the request arrived from: the laptop\'s own address is private and could not survive a trip across the internet. This is the address the translation table will recognise when the reply gets home, and the private address is put back only at the last hop. The length field covers the whole packet, and the hop limit starts fresh for this journey.',
    analogy: 'A reply is sent to the front desk that forwarded the letter, not to the room.',
    changes: ['A 20-byte IP header; total length 1296', 'Destination is 198.51.100.23, the home router, not the laptop'],
    cite: [
      { rfc: 791, sec: '3.1', title: 'Internet Header Format' },
      { rfc: 3022, sec: '2.2', title: 'Overview of NAPT' },
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' }
    ]
  },
  {
    id: 'response-wrap-frame',
    phase: 'HTTP',
    title: 'The frame leaves the server for the edge router',
    say: 'The reply leaves the server in a frame built for this datacentre link.',
    actor: 'server',
    hop: ['server', 'edge'],
    dir: 'out',
    osi: [7, 4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { src: '00:1b:21:3c:4d:5e', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, totalLength: 1296, id: '0x7b41', ttl: 64, protocol: '6 (TCP)', checksum: '0x9f2c', src: '203.0.113.80', dst: '198.51.100.23' },
      tcp: { srcPort: 80, dstPort: 49152, seq: '0x5e6f7082 (server ISN + 1)', ack: '0x1a2b3cf1 (client ISN + 1 + 163 request bytes)', flags: 'PSH, ACK', window: 65535, dataOffset: 20, checksum: '0x3a7d' },
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Date: 'Tue, 13 Oct 2026 21:00:00 GMT',
        ETag: '"a1b2c3"',
        Connection: 'keep-alive'
      }
    },
    explain: 'The frame carries the sending card\'s hardware address, the type that marks an IPv4 packet inside, and a check at the end, and the network card turns it into signals for the datacentre link. The next device reads only these local addresses, picks the outgoing port, and builds a fresh frame for the following link, so the addresses inside the packet are the only ones that stay the same from end to end. The reply now exists as bytes travelling back the way the request came.',
    analogy: 'A parcel leaves the warehouse with the label the first driver has to read.',
    changes: ['An Ethernet header and a trailing check, as on every frame', 'The frame is rebuilt at each hop; the packet inside is untouched'],
    note: 'The scenario does not name the edge router\'s hardware address, so only the server\'s own is shown.',
    cite: [
      { rfc: 894, sec: 'Frame Format', title: 'Frame Format' },
      { rfc: 894, sec: 'Address Mappings', title: 'Address Mappings' },
      { rfc: 1122, sec: '1.1.3', title: 'Internet Protocol Suite' }
    ]
  },
  {
    id: 'response-crosses-internet',
    phase: 'HTTP',
    title: 'The response crosses the Internet and NAT restores the address',
    say: 'Coming home, the router recognises the reply and hands it to the right device.',
    actor: 'gw',
    dir: 'in',
    hop: ['server', 'edge', 'transit', 'isp', 'gw', 'ap', 'client'],
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, totalLength: 1296, id: '0x7b41', ttl: 64, protocol: '6 (TCP)', checksum: '0x9f2c', src: '203.0.113.80', dst: '198.51.100.23' },
      tcp: { srcPort: 80, dstPort: 49152, seq: '0x5e6f7082 (server ISN + 1)', ack: '0x1a2b3cf1 (client ISN + 1 + 163 request bytes)', flags: 'PSH, ACK', window: 65535 },
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Connection: 'keep-alive'
      }
    },
    explain: 'The reply comes back along the same routers, and each one lowers the TTL by one: 64 from the server, then 63, 62, 61, 60 at the home router. The packet is addressed to 198.51.100.23, the router itself, on the port it recorded when the request left. The router finds that pair in its translation table and puts back the internal destination 192.168.1.87:49152 before sending it to the laptop. If the entry had expired, the router would drop the packet, since it could not tell which device the connection belonged to. The frame is rebuilt for the local network, and the access point switches it untouched.',
    analogy: 'Like a hotel reception that checks the room number on a returning parcel before carrying it to the right guest.',
    changes: [
      'TTL 64 → 60 across the four routers on the return trip',
      'Destination IP rewritten 198.51.100.23 → 192.168.1.87',
      'Destination port restored to 49152',
      'Frame rewritten for the LAN: src b8:27:eb:11:22:33, dst a4:5e:60:1f:2c:8b'
    ],
    note: 'The public source port the router assigned is not part of the scenario constants, so only the restored internal port 49152 is shown. A dropped packet here looks to the client like a lost segment and is retransmitted by TCP.',
    cite: [
      { rfc: 3022, sec: '3.2', title: 'Address lookup and translation' },
      { rfc: 3022, sec: '3.3', title: 'Address unbinding' },
      { rfc: 1812, sec: '5.3.1', title: 'Time to Live (TTL)' }
    ]
  },
  {
    id: 'client-receives',
    phase: 'HTTP',
    title: 'The client decapsulates and accepts the segment',
    say: 'Your laptop rebuilds the stream in order and wakes up the browser.',
    actor: 'client',
    dir: 'in',
    osi: [4, 3, 2, 1],
    pdu: 'Ethernet frame',
    fields: {
      ethernet: { dst: 'a4:5e:60:1f:2c:8b', src: 'b8:27:eb:11:22:33', type: '0x0800 (IPv4)', fcs: 'valid' },
      ip: { version: 4, headerLength: 20, totalLength: 1296, id: '0x7b41', ttl: 60, protocol: '6 (TCP)', checksum: '0x9f2c', src: '203.0.113.80', dst: '192.168.1.87' },
      tcp: { srcPort: 80, dstPort: 49152, seq: '0x5e6f7082 (server ISN + 1)', ack: '0x1a2b3cf1 (client ISN + 1 + 163 request bytes)', flags: 'PSH, ACK', window: 65535 },
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '1256',
        Connection: 'keep-alive'
      }
    },
    explain: 'The frame is opened up layer by layer. Ethernet checks the destination address on the frame and strips it. IP checks its destination address and strips its header. TCP then receives the segment, and the sequence number lands exactly where the client expected the next byte, so the segment is in order. TCP puts the 1256 body bytes into the socket receive buffer and acknowledges the bytes from the server. The browser call that was waiting for data now returns. The TTL that arrived is 60, what is left after the four routers each lowered it once.',
    analogy: 'Like a post room that checks the parcel belongs here, files it in order on the shelf, then tells the office it has arrived.',
    changes: [
      'IP strips the 20-byte header and finds destination 192.168.1.87, the laptop',
      'TCP accepts 1256 bytes in order and buffers them',
      'An ACK for the server bytes is queued to send back'
    ],
    cite: [
      { rfc: 9293, sec: '3.8', title: 'Data Communication' },
      { rfc: 9293, sec: '3.1', title: 'Header Format' },
      { rfc: 791, sec: '3.1', title: 'Internet Header Format' }
    ]
  },
  {
    id: 'browser-renders',
    phase: 'HTTP',
    title: 'The browser parses the response and starts rendering',
    say: 'The browser reads the answer and starts drawing, then asks for the pictures too.',
    actor: 'client',
    dir: 'none',
    osi: [7],
    pdu: 'HTTP message',
    payload: 'the HTML source, 1256 bytes',
    fields: {
      http: {
        startLine: 'HTTP/1.1 200 OK',
        'Content-Type': 'text/html; charset=utf-8'
      }
    },
    explain: 'The client matches the response to the request it sent, then reads the status line and the field lines and hands the decoded body to the HTML parser, which starts building the page. The body points to style sheets, scripts and images, so more requests follow for those. The connection stays open by default and is reused for those later requests, which is what Connection: keep-alive asked for, and it saves a fresh TCP handshake for each resource.',
    analogy: 'A phone call you keep open to order more items instead of hanging up and dialling again each time.',
    note: 'HTTP/1.1 has no request identifier in a response, so the client matches each response to a request by the order the requests were sent on that connection; a response cannot be matched by content.',
    cite: [
      { rfc: 9112, sec: '9.3', title: 'Persistence' },
      { rfc: 9112, sec: '9.2', title: 'Associating a Response to a Request' },
      { rfc: 9293, sec: '3.8', title: 'Data Communication' }
    ]
  },
  {
    id: 'tcp-teardown',
    phase: 'HTTP',
    title: 'The client begins closing the connection',
    say: 'Done talking. Each side says it has finished, one direction at a time.',
    actor: 'client',
    dir: 'out',
    hop: ['client', 'ap', 'gw'],
    osi: [4],
    pdu: 'TCP segment',
    payload: 'no application data',
    fields: {
      tcp: { srcPort: 49152, dstPort: 80, seq: '0x1a2b3cf1 (next byte after the request)', ack: '0x5e6f756a (server ISN + 1 + 1256 response bytes)', flags: 'FIN, ACK' }
    },
    explain: 'The two directions of a TCP connection close separately. The client sends FIN (“I have finished sending”) and can still receive data. The connection is half-closed, not gone, until the server sends its own FIN. The ACK in the same segment confirms bytes the client already received from the server.',
    analogy: 'Like ending a written exchange where each person posts a final note and waits for the other reply before clearing the desk.',
    cite: [
      { rfc: 9293, sec: '3.6', title: 'Closing a Connection' },
      { rfc: 9293, sec: '3.3', title: 'TCP Terminology Overview' }
    ]
  },
  {
    id: 'time-wait',
    phase: 'HTTP',
    title: 'TIME-WAIT: TCP waits for old packets to expire',
    say: 'The laptop waits a short while before forgetting, in case a stray packet returns.',
    actor: 'client',
    dir: 'none',
    osi: [4],
    pdu: 'TCP segment',
    fields: {
      tcp: { srcPort: 49152, dstPort: 80, flags: 'ACK' }
    },
    explain: 'TIME-WAIT is a short waiting state after the client closes first. TCP keeps the connection record for twice the maximum segment lifetime (the longest a segment may remain in the network). If the final ACK was lost, the client can acknowledge a repeated FIN from the server. Waiting also lets old duplicate segments expire before the same address and port are used by a new connection.',
    analogy: 'Like a librarian keeping a returned book on the cart a while before reshelving it, in case someone asks for it again.',
    note: 'On a busy server this is the state that piles up in netstat, and it is why the ephemeral port range can be exhausted.',
    cite: [
      { rfc: 9293, sec: '3.6.1', title: 'Half-Closed Connections' },
      { rfc: 9293, sec: '3.3', title: 'TCP Terminology Overview' }
    ]
  }
]);
