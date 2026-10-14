// Topology and framing text for the HTTP scenario. Step data lives in data/http/*.js.
(function (global) {
  const NETV = global.NETV;

  NETV.defineScenario({
    id: 'http',
    title: 'HTTP over TCP/IP',
    subtitle: 'What happens when a browser fetches http://daffapn.my.id/ — every layer, every hop, in order.',
    phases: ['DHCP', 'DNS', 'HTTP'],

    // kind picks the device glyph drawn for the node: host, switch, router, server, dns.
    // Labels stay short: they are centred under the glyph, not wrapped. `note` is the plain
    // sentence the drawer legend and the hover tooltip show for it.
    nodes: [
      { id: 'client', label: 'laptop', sub: '192.168.1.87', x: 60, y: 70, kind: 'host', note: 'your laptop, the device making the request' },
      { id: 'ap', label: 'switch / AP', sub: 'layer 2 only', x: 180, y: 70, kind: 'switch', note: 'switch or Wi-Fi point: forwards frames on this link only' },
      { id: 'gw', label: 'home router', sub: '192.168.1.1 · NAT', x: 300, y: 70, kind: 'router', note: 'home router: gives every home device one public address' },
      { id: 'isp', label: 'ISP access', sub: '198.51.100.1', x: 420, y: 70, kind: 'router', note: 'your internet provider: first router past your home' },
      { id: 'transit', label: 'backbone', sub: 'BGP routing', x: 535, y: 70, kind: 'router', note: 'backbone router: chooses a path across the internet' },
      { id: 'edge', label: 'edge router', sub: '203.0.113.1', x: 650, y: 70, kind: 'router', note: 'the front router of the datacentre holding the site' },
      { id: 'server', label: 'server', sub: 'daffapn.my.id', x: 770, y: 70, kind: 'server', note: 'the machine that hosts the site' },

      { id: 'resolver', label: 'resolver', sub: '198.51.100.53', x: 420, y: 215, kind: 'dns', note: 'the name server that does the lookups for you' },
      { id: 'root', label: 'root server', sub: 'delegates .id', x: 535, y: 215, kind: 'dns', note: 'first stop for an uncached name: which servers run .id' },
      { id: 'tld', label: '.id server', sub: 'referral', x: 650, y: 215, kind: 'dns', note: 'the .id name servers: which servers run daffapn.my.id' },
      { id: 'auth', label: 'authoritative', sub: 'holds the A record', x: 770, y: 215, kind: 'dns', note: 'the name server that holds the records for this site' }
    ],

    links: [
      { from: 'client', to: 'ap' },
      { from: 'ap', to: 'gw' },
      { from: 'gw', to: 'isp' },
      { from: 'isp', to: 'transit' },
      { from: 'transit', to: 'edge' },
      { from: 'edge', to: 'server' },
      { from: 'isp', to: 'resolver', dashed: true },
      { from: 'resolver', to: 'root', dashed: true },
      { from: 'root', to: 'tld', dashed: true },
      { from: 'tld', to: 'auth', dashed: true }
    ],

    // Short blast of context shown above the step list.
    preamble: 'The laptop has just joined the Wi-Fi. It has no IP address yet, so the walkthrough starts before HTTP does.'
  });
})(globalThis);
