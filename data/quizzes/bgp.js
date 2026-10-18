NETV.addQuiz('routing', 'BGP', [
  {
    id: 'bgp-01',
    prompt: 'What does BGP exchange between networks?',
    choices: ['Reachable address blocks and paths to them', 'The Ethernet frame for every packet', 'A complete map of every router on Earth', 'DHCP leases'],
    answer: 0,
    explanation: 'BGP advertises reachable prefixes between networks; it does not distribute a complete Internet topology.'
  },
  {
    id: 'bgp-02',
    prompt: 'Which transport and port carry the BGP session?',
    choices: ['UDP port 53', 'TCP port 179', 'IP protocol 89 with no transport', 'TCP port 80'],
    answer: 1,
    explanation: 'BGP uses a TCP session on port 179.'
  },
  {
    id: 'bgp-03',
    prompt: 'What do BGP peers exchange in OPEN before they exchange routes?',
    choices: ['Only the destination web page', 'Only a DNS answer', 'Their AS number, BGP identifier, hold time, and supported capabilities', 'The entire forwarding table as Ethernet frames'],
    answer: 2,
    explanation: 'OPEN messages identify the peers and negotiate session parameters before route exchange begins.'
  },
  {
    id: 'bgp-04',
    prompt: 'With a 180-second hold time in this scenario, how often is a KEEPALIVE expected?',
    choices: ['Every 180 minutes', 'Every 10 seconds', 'Only after a route is withdrawn', 'Every 60 seconds, one third of the hold time'],
    answer: 3,
    explanation: 'The scenario sends KEEPALIVE every 60 seconds, one third of the agreed 180-second hold time.'
  },
  {
    id: 'bgp-05',
    prompt: 'What does the NLRI 203.0.113.0/24 in an UPDATE describe?',
    choices: ['A reachable block of destination addresses', 'The HTTP response body', 'A single Ethernet source address', 'The number of TCP retransmissions'],
    answer: 0,
    explanation: 'NLRI names the address prefix being advertised; it is a route announcement, not the website content.'
  },
  {
    id: 'bgp-06',
    prompt: 'What does AS_PATH record, and how does it help prevent loops?',
    choices: ["The packet's TTL; reject when it reaches zero", "The networks a route has passed through; reject an offer containing the receiver's own AS", "The router's interface costs; reject the highest cost", 'The DNS delegation chain; reject a repeated name'],
    answer: 1,
    explanation: 'AS_PATH records the AS sequence; a router refuses a route that already contains its own AS number.'
  },
  {
    id: 'bgp-07',
    prompt: "What must be true for a BGP route's NEXT_HOP to be usable?",
    choices: ['It must equal the HTTP Host field', 'It must be reachable through DNS alone', "The network's internal routing must have a route to that next-hop address", 'It must be the lowest-numbered AS'],
    answer: 2,
    explanation: "BGP names the next hop, but the network's internal routing must make that address reachable."
  },
  {
    id: 'bgp-08',
    prompt: 'If two usable offers differ in LOCAL_PREF 100 versus 200, which does the provider prefer?',
    choices: ['The route with 100 because lower always wins', 'Whichever has the lower MED, even before LOCAL_PREF', 'The route with the shorter physical distance', 'The route with 200; higher local preference wins first'],
    answer: 3,
    explanation: "The provider's local policy gives the route with LOCAL_PREF 200 higher preference before later tie-breakers are considered."
  },
  {
    id: 'bgp-09',
    prompt: 'If earlier attributes tie and both offers came from AS 64520, which MED does BGP prefer?',
    choices: ['MED 0, the lower value; it is a hint rather than a command', 'MED 100 because higher always wins', 'Both offers must be discarded', 'MED is compared across every neighboring AS without restriction'],
    answer: 0,
    explanation: "For these offers from the same neighboring AS, lower MED is preferred when earlier attributes tie; the receiving network still applies its own policy."
  },
  {
    id: 'bgp-10',
    prompt: 'What happens after the preferred prefix is withdrawn?',
    choices: ['All packets for that address are permanently dropped', 'The withdrawn path is removed and the next usable offer can take over', 'The server changes its MAC address', 'The BGP session becomes an OSPF area'],
    answer: 1,
    explanation: 'The router removes the withdrawn path, compares the remaining usable offers, and can install the next best route.'
  }
]);
