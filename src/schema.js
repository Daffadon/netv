// Loaded first. Holds the closed vocabularies from docs/data-schema.md so the engine,
// the validator and the data files all agree on the same names.
(function (global) {
  const NETV = (global.NETV = global.NETV || {});

  // Render order for the packet inspector: outermost header first.
  // ARP sits before ip on purpose - an ARP message travels in a frame with no IP header.
  // OSPF sits between ip and tcp: it is carried by IP itself (protocol 89), with no transport
  // header under it. BGP is innermost: it is an application that rides TCP.
  NETV.HEADER_ORDER = ['ethernet', 'arp', 'ip', 'ospf', 'tcp', 'udp', 'dns', 'dhcp', 'http', 'bgp'];

  NETV.HEADER_LABELS = {
    ethernet: 'Ethernet frame',
    arp: 'ARP message',
    ip: 'IPv4 header',
    ospf: 'OSPF packet',
    tcp: 'TCP header',
    udp: 'UDP header',
    dns: 'DNS message',
    dhcp: 'DHCP message',
    http: 'HTTP message',
    bgp: 'BGP message'
  };

  // Which TCP/IP row a header belongs to, for the packet inspector. The page names layers the way
  // TCP/IP does, so nothing here prints a bare OSI number.
  NETV.HEADER_ROW = {
    ethernet: 'Link', arp: 'Internet/Link', ip: 'Internet', ospf: 'Internet',
    tcp: 'Transport', udp: 'Transport',
    dns: 'Application', dhcp: 'Application', http: 'Application', bgp: 'Application'
  };

  // The layer rail, top to bottom, in the four-layer TCP/IP model (RFC 1122 §1.1.3). OSI's
  // Presentation and Session rows fold into Application - nothing in this scenario uses them - and
  // Link covers both the data-link and the physical row. Each entry lists the OSI numbers a step's
  // `osi` array may use to light that row up.
  NETV.LAYERS = [
    { name: 'Application', osi: [7, 6, 5], help: 'HTTP, DNS, DHCP and BGP speak here' },
    { name: 'Transport', osi: [4], help: 'TCP and UDP: which program, and in what order' },
    { name: 'Internet', osi: [3], help: 'IP addresses: which machine, across networks' },
    { name: 'Link', osi: [2, 1], help: 'hardware addresses, and the wire itself' }
  ];

  // Short label written on the travelling packet: the innermost header is what it really is.
  NETV.HEADER_CHIP = {
    ethernet: 'frame', arp: 'ARP', ip: 'packet', tcp: 'TCP',
    udp: 'UDP', dns: 'DNS', dhcp: 'DHCP', http: 'HTTP', ospf: 'OSPF', bgp: 'BGP'
  };

  // How the step's bytes travel on the link. Derived from the addresses the step already declares,
  // never declared itself (ADR 0006): the animator, the drawer and the validator read one answer.
  NETV.DELIVERY = {
    broadcast: { word: 'broadcast', note: 'every station on the link reads this frame' },
    multicast: { word: 'multicast', note: 'the stations subscribed to that group read this frame' },
    unicast: { word: 'unicast', note: 'one station on the link reads this frame' },
    local: { word: 'not on the wire', note: 'the bytes are still inside the machine' }
  };

  NETV.delivery = function (step) {
    // An arriving packet was delivered by whoever carried it, so only a step that is not receiving
    // can be local. Everything else is read off the addresses it declares.
    if ((!step.hop || step.hop.length < 2) && step.dir !== 'in') return 'local';
    const eth = (step.fields && step.fields.ethernet) || {};
    const ip = (step.fields && step.fields.ip) || {};
    if (/^ff:ff:ff:ff:ff:ff$/i.test(eth.dst || '') || ip.dst === '255.255.255.255') {
      return 'broadcast';
    }
    if (/^2(2[4-9]|3[0-9])\./.test(ip.dst || '')) return 'multicast';
    return 'unicast';
  };

  NETV.FIELDS = {
    ethernet: ['dst', 'src', 'type', 'fcs'],
    arp: ['hardwareType', 'protocolType', 'op', 'senderMac', 'senderIp', 'targetMac', 'targetIp'],
    ip: ['version', 'headerLength', 'dscp', 'ecn', 'totalLength', 'id', 'flags', 'fragmentOffset',
      'ttl', 'protocol', 'checksum', 'src', 'dst'],
    // One catalogue for all five OSPF packet types and for the LSA they carry: a step lists the
    // names the message it shows actually has.
    ospf: ['version', 'type', 'packetLength', 'routerId', 'areaId', 'checksum', 'autype',
      'networkMask', 'helloInterval', 'options', 'routerPriority', 'routerDeadInterval',
      'designatedRouter', 'backupDesignatedRouter', 'neighbors',
      'interfaceMtu', 'ddSequence', 'lsaHeaders',
      'lsaType', 'linkStateId', 'advertisingRouter', 'lsAge', 'sequenceNumber', 'lsaChecksum',
      'length', 'numberOfLsa', 'links', 'metric'],
    tcp: ['srcPort', 'dstPort', 'seq', 'ack', 'dataOffset', 'flags', 'window', 'checksum',
      'urgentPointer', 'options'],
    udp: ['srcPort', 'dstPort', 'length', 'checksum'],
    dns: ['id', 'qr', 'opcode', 'rd', 'ra', 'question', 'qtype', 'qclass', 'answers', 'authority',
      'additional'],
    dhcp: ['op', 'htype', 'hlen', 'xid', 'secs', 'flags', 'ciaddr', 'yiaddr', 'siaddr', 'giaddr',
      'chaddr', 'magicCookie', 'options'],
    http: null, // free-form: startLine plus whatever field lines the message carries
    // BGP messages: one catalogue for OPEN, UPDATE, KEEPALIVE and NOTIFICATION.
    bgp: ['marker', 'length', 'type', 'version', 'myAs', 'holdTime', 'bgpIdentifier',
      'optionalParameters', 'withdrawnRoutes', 'pathAttributes', 'nlri',
      'origin', 'asPath', 'nextHop', 'localPreference', 'multiExitDisc', 'communities',
      'errorCode', 'errorSubcode']
  };

  // What each field name means, in words a beginner can use. The drawer prints one hint per row,
  // and the validator refuses a catalogued field name that has no hint here.
  NETV.FIELD_HELP = {
    ethernet: {
      dst: 'hardware address of the next device on this link',
      src: 'hardware address of the device that sent this frame',
      type: 'which protocol is carried inside (0x0800 = IPv4)',
      fcs: 'checksum: did the bits arrive undamaged?'
    },
    arp: {
      hardwareType: 'the link technology (1 = Ethernet)',
      protocolType: 'the kind of address being looked up (IPv4)',
      op: 'is this a question (1) or an answer (2)?',
      senderMac: 'hardware address of the device asking',
      senderIp: 'IP address of the device asking',
      targetMac: 'the hardware address wanted; all zeros in a question',
      targetIp: 'the IP address whose hardware address is wanted'
    },
    ip: {
      version: '4: the address size this packet uses',
      headerLength: 'header size, counted in 4-byte words',
      dscp: 'priority hint for busy links',
      ecn: 'signal that the network is congested',
      totalLength: 'the whole packet in bytes, header included',
      id: 'ties the pieces together if the packet was split',
      flags: 'may this packet be split, and is more coming?',
      fragmentOffset: 'where this piece sits in the whole packet',
      ttl: 'routers it may still cross before it is dropped',
      protocol: 'which protocol is inside (6 = TCP, 17 = UDP)',
      checksum: 'header checksum, redone at every router',
      src: 'who sent it',
      dst: 'where it is going'
    },
    tcp: {
      srcPort: 'which program on the sender',
      dstPort: 'which program on the receiver (80 = web)',
      seq: 'position of the first byte of this segment',
      ack: 'the next byte this side expects to get',
      dataOffset: 'header size, counted in 4-byte words',
      flags: 'control bits: SYN opens, FIN closes, ACK confirms',
      window: 'how many more bytes may arrive before an answer',
      checksum: 'cover for the header, the data and the addresses',
      urgentPointer: 'where urgent data ends, when URG is set',
      options: 'extras, such as the largest segment accepted'
    },
    udp: {
      srcPort: 'which program on the sender',
      dstPort: 'which program on the receiver (53 = names)',
      length: 'the datagram in bytes, header included',
      checksum: 'cover for the header and the data'
    },
    dns: {
      id: 'matches an answer to the question it answers',
      qr: '0 = question, 1 = answer',
      opcode: 'which operation (0 = a plain query)',
      rd: 'the client asks for the walking to be done',
      ra: 'the server says it does the walking',
      question: 'the name being looked up',
      qtype: 'what is wanted: A = the address',
      qclass: 'the address family, IN = Internet',
      answers: 'the records that answer the question',
      authority: 'records pointing at the next server to ask',
      additional: 'extra records that help, such as addresses'
    },
    dhcp: {
      op: '1 = request from the client, 2 = reply from the server',
      htype: 'the hardware address type (1 = Ethernet)',
      hlen: 'how long that hardware address is, in bytes',
      xid: 'random number matching this reply to the request',
      secs: 'seconds since the client started asking',
      flags: 'asks for the reply to be broadcast',
      ciaddr: 'the address the client already holds, if any',
      yiaddr: 'the address being offered to this client',
      siaddr: 'the server the client should talk to next',
      giaddr: 'relay address, when a router forwards the request',
      chaddr: 'hardware address of the client asking',
      magicCookie: 'fixed value marking the rest as options',
      options: 'the settings: mask, gateway, names, lease time'
    },
    ospf: {
      version: 'which version of the routing protocol this is (2)',
      type: 'which of the five protocol messages this is',
      packetLength: 'how long this whole protocol message is',
      routerId: 'the name a router gives itself: its own highest address',
      areaId: 'which part of the network these routers share (0.0.0.0 = the whole network)',
      checksum: 'cover for the whole message, to catch damage in transit',
      autype: 'what kind of proof of identity this router offers',
      networkMask: 'how wide the network this message is sent on is',
      helloInterval: 'seconds until this router sends the next hello',
      options: 'which extra abilities this router has',
      routerPriority: 'who leads the group when the priorities differ',
      routerDeadInterval: 'seconds of silence before a neighbour counts as gone',
      designatedRouter: 'the router chosen to speak for this shared network',
      backupDesignatedRouter: 'the router that takes that job over if the first one goes',
      neighbors: 'the routers whose hellos this router has already heard',
      interfaceMtu: 'the largest message this link can carry in one piece',
      ddSequence: 'which page of the database summary this is, so the pages go back in order',
      lsaHeaders: 'the table of contents of the sender\'s own map, one line per entry',
      lsaType: 'which kind of map entry this is (1 = a router and the links it has)',
      linkStateId: 'which piece of the map this entry describes',
      advertisingRouter: 'the router that made this entry, so it can be told apart from copies',
      lsAge: 'how many seconds old this entry is',
      sequenceNumber: 'which version of the entry this is: the newer number wins',
      lsaChecksum: 'cover for the entry, not counting its age',
      length: 'how long this map entry is',
      numberOfLsa: 'how many map entries this message carries',
      links: 'the links this router is advertising, one entry per interface',
      metric: 'what this link costs to use: lower is better'
    },
    bgp: {
      marker: 'a fixed pattern, so both sides agree where a message begins',
      length: 'how long this message is',
      type: 'which of the four message kinds this is',
      version: 'which version of the protocol this speaker uses (4)',
      myAs: 'the number of the network sending this message',
      holdTime: 'seconds of silence allowed before the connection is dropped',
      bgpIdentifier: 'the address this router uses as its own name',
      optionalParameters: 'extras the two sides can agree to use',
      withdrawnRoutes: 'routes the sender no longer offers',
      pathAttributes: 'the claims that come with the route: where it came from and what it costs',
      nlri: 'the addresses this route makes reachable',
      origin: 'how the sender first learned the route (igp, egp or incomplete)',
      asPath: 'the networks the route has passed through, newest first',
      nextHop: 'the address to send to when this route is used',
      localPreference: 'how much this network prefers this way out: higher wins',
      multiExitDisc: 'a hint to the neighbour about which entry point to use: lower wins',
      communities: 'labels the sender attaches so a policy can match on them',
      errorCode: 'why the sender is refusing the message or closing the connection',
      errorSubcode: 'the finer reason inside that code'
    },
    http: {
      startLine: 'the request line or status line, first line of the message',
      Host: 'which site on this server is wanted',
      'User-Agent': 'which client sent the request',
      Accept: 'which kinds of content it will accept',
      'Accept-Encoding': 'which compressions it understands',
      Connection: 'keep this connection open for the next request',
      'Content-Type': 'what the body is',
      'Content-Length': 'how many bytes the body is',
      Date: 'when the server made this response',
      ETag: 'version label for a cached copy',
      Server: 'which software answered'
    }
  };

  NETV.citationUrl = function (c) {
    const base = 'https://www.rfc-editor.org/rfc/rfc' + c.rfc + '.html';
    // Section anchors only exist on the RFCs published from 1988 on. Older ones
    // (768, 826, 894) have named sections and no anchors, so link the document.
    return /^[0-9]/.test(c.sec) ? base + '#section-' + c.sec : base;
  };

  NETV.scenarios = {};

  NETV.defineScenario = function (config) {
    NETV.scenarios[config.id] = config;
    return config;
  };

  NETV.scenario = function (id) {
    const s = NETV.scenarios[id];
    if (!s) throw new Error('unknown scenario: ' + id);
    if (!s.steps) s.steps = [];
    return s;
  };

  /**
   * The map a chapter is drawn on. A scenario with one map keeps its nodes and links on the
   * scenario itself (the HTTP walkthrough); a scenario whose chapters need different maps
   * declares `boards: { <phase>: { nodes, links, aria } }` and each chapter gets its own canvas.
   */
  NETV.boardOf = function (scenario, phase) {
    return (scenario.boards && scenario.boards[phase]) || scenario;
  };

  NETV.addSteps = function (scenarioId, steps) {
    const s = NETV.scenario(scenarioId);
    for (const step of steps) s.steps.push(step);
    return s;
  };

  NETV.stepIndex = function (scenarioId, stepId) {
    return NETV.scenario(scenarioId).steps.findIndex((s) => s.id === stepId);
  };
})(globalThis);
