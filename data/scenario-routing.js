// Topology and framing text for the routing scenario. Step data lives in data/routing/*.js.
// Two chapters, two maps: OSPF runs inside one network, BGP between two, and the packet never
// crosses both at once, so each chapter is drawn on its own canvas (src/schema.js boardOf).
(function (global) {
  const NETV = global.NETV;

  // The provider's own network: four routers in AS 64512 — an access router facing the home, two
  // core routers on one shared segment (that segment is where a designated router is elected) and
  // the border router at the edge of the network. The home router is drawn too, because this
  // walkthrough continues the packet the HTTP scenario sent. The shared segment is drawn as a
  // triangle — every router on it linked to every other — so no link has to cross a glyph.
  const OSPF_NODES = [
    { id: 'gw', label: 'home router', sub: '198.51.100.23', x: 160, y: 215, kind: 'router', note: 'the home router from the HTTP walkthrough: the last hop before the provider network' },
    { id: 'isp', label: 'ISP access', sub: '198.51.100.1', x: 160, y: 76, kind: 'router', note: 'the router your home router hands traffic to: the provider\'s own access router' },
    { id: 'core-a', label: 'core A · DR', sub: '192.0.2.5', x: 400, y: 76, kind: 'router', note: 'a core router of the provider, and the designated router of this shared segment' },
    { id: 'core-b', label: 'core B · BDR', sub: '192.0.2.4', x: 400, y: 215, kind: 'router', note: 'the second core router, and the backup designated router for the same segment' },
    { id: 'transit', label: 'border router', sub: '198.51.100.2', x: 640, y: 76, kind: 'router', note: 'the edge of the provider network: the router that speaks to other networks' }
  ];

  // `cost` is the interface output cost the operator set, printed on the link itself so the
  // figures in the tables can be pointed at on the map (docs/data-schema.md §2).
  const OSPF_LINKS = [
    { from: 'gw', to: 'isp', cost: 1 },
    { from: 'isp', to: 'core-a', cost: 1 },
    { from: 'isp', to: 'core-b', cost: 10 },
    { from: 'core-a', to: 'core-b', cost: 10 },
    { from: 'core-a', to: 'transit', cost: 1 },
    { from: 'core-b', to: 'transit', cost: 10 }
  ];

  // The two networks and the links between them: the same path the HTTP packet crossed, with the
  // provider's core router in it, plus the border router of the provider, the datacentre's two
  // front routers — one per link — and the server. Two links between the networks are what give the
  // last chapter its case: the same block offered twice, and a policy that picks between the offers.
  // `regions` is what the map draws a boundary around: the routers of one network, labelled with
  // the AS number the scenario's own tables use. The home router is in neither, so it sits outside
  // both sections. The rectangle itself is derived from the nodes it holds (src/ui.js), so moving a
  // router moves its section with it.
  const BGP_REGIONS = [
    { as: '64512', nodes: ['isp', 'core-a', 'transit'] },
    { as: '64520', nodes: ['edge', 'edge-b', 'server'] }
  ];

  const BGP_NODES = [
    { id: 'gw', label: 'home router', sub: '198.51.100.23', x: 110, y: 215, kind: 'router', note: 'the home router from the HTTP walkthrough: the packet starts its journey here' },
    { id: 'isp', label: 'ISP access', sub: '198.51.100.1', x: 250, y: 215, kind: 'router', note: 'the provider\'s access router: the first router the packet reaches' },
    { id: 'core-a', label: 'core A', sub: '192.0.2.5', x: 400, y: 215, kind: 'router', note: 'a core router of the provider, and an internal peer of the border router' },
    { id: 'transit', label: 'border router', sub: '198.51.100.2', x: 400, y: 70, kind: 'router', note: 'the edge of the provider network: it peers with the next network and decides what to accept' },
    { id: 'edge', label: 'edge router', sub: '203.0.113.1', x: 630, y: 70, kind: 'router', note: 'the datacentre\'s front router on the first link between the two networks' },
    { id: 'edge-b', label: 'edge router B', sub: '203.0.113.2', x: 790, y: 215, kind: 'router', note: 'the datacentre\'s front router on the second link between the two networks' },
    { id: 'server', label: 'server', sub: 'daffapn.my.id', x: 790, y: 70, kind: 'server', note: 'the machine that hosts the site, and the address the packet is trying to reach' }
  ];

  const BGP_LINKS = [
    { from: 'gw', to: 'isp' },
    { from: 'isp', to: 'core-a' },
    { from: 'transit', to: 'core-a' },
    { from: 'transit', to: 'edge' },
    { from: 'transit', to: 'edge-b' },
    { from: 'edge', to: 'server' },
    { from: 'edge-b', to: 'server' }
  ];

  NETV.defineScenario({
    id: 'routing',
    nav: 'Routing',
    title: 'OSPF and BGP',
    subtitle: 'Inside one network and between two: how the routers already knew where to send the HTTP packet.',
    phases: ['OSPF', 'BGP'],

    boards: {
      OSPF: {
        aria: 'One provider network: the home router below the access router, and two core routers on a shared segment with the border router at the edge.',
        nodes: OSPF_NODES,
        links: OSPF_LINKS
      },
      BGP: {
        aria: 'Two networks joined by two links: the provider\'s access and core routers, its border router peering with the datacentre\'s two edge routers, and the server at the end.',
        nodes: BGP_NODES,
        links: BGP_LINKS,
        regions: BGP_REGIONS
      }
    },

    // Short blast of context shown above the step list.
    preamble: 'This continues the HTTP walkthrough: the same request to daffapn.my.id, watched from the routers\' side instead of the packet\'s. Two networks carry it — the provider that moves it, and the datacentre that holds the server — and neither was born knowing the other exists. The first chapter is how one network agrees on a map of itself, and the second is how two networks tell each other what they can reach.'
  });
})(globalThis);
