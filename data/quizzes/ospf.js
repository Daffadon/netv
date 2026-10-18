NETV.addQuiz('routing', 'OSPF', [
  {
    id: 'ospf-01',
    prompt: 'What does OSPF let routers in one area build together?',
    choices: ["A map of the area's links", "A list of every website's HTTP pages", 'One global Internet-wide address book', 'A shared TCP connection'],
    answer: 0,
    explanation: 'OSPF distributes link-state information so routers in an area can build the same network map.'
  },
  {
    id: 'ospf-02',
    prompt: 'What is the main purpose of OSPF Hello messages?',
    choices: ['Advertise web pages', 'Discover neighbors and check that their link settings agree', 'Choose a BGP exit policy', 'Carry application data'],
    answer: 1,
    explanation: 'Routers send Hellos to discover neighbors; matching area and timer settings are required before adjacency forms.'
  },
  {
    id: 'ospf-03',
    prompt: 'How is an OSPF packet carried?',
    choices: ['Inside UDP port 53', 'Inside TCP port 179', 'Directly in IP using protocol number 89', 'Inside HTTP'],
    answer: 2,
    explanation: 'OSPF is carried directly by IP protocol 89, with no TCP or UDP header.'
  },
  {
    id: 'ospf-04',
    prompt: 'Why does an OSPF Hello use IP TTL 1?',
    choices: ['It is encrypted after one hop', 'It counts the number of routers in the area', 'It forces the receiver to become the DR', 'It is link-local and must not be forwarded beyond the link'],
    answer: 3,
    explanation: 'OSPF Hello traffic is intended for neighbors on the local link; TTL 1 prevents it from being routed farther.'
  },
  {
    id: 'ospf-05',
    prompt: "Which multicast group do the walkthrough's OSPF Hellos target?",
    choices: ['224.0.0.5, AllSPFRouters', '224.0.0.6, AllDRouters only', '255.255.255.255', '203.0.113.80'],
    answer: 0,
    explanation: 'AllSPFRouters is 224.0.0.5; 224.0.0.6 is the group for designated and backup designated routers.'
  },
  {
    id: 'ospf-06',
    prompt: 'Why elect a designated router on a shared segment?',
    choices: ["To replace every router's route table", 'To coordinate map exchanges and reduce the number of full relationships', 'To forward all Internet packets itself', 'To assign client DHCP leases'],
    answer: 1,
    explanation: 'The DR coordinates database exchange on the shared segment, with a BDR ready to take over.'
  },
  {
    id: 'ospf-07',
    prompt: 'How is the designated router selected in the scenario?',
    choices: ['Lowest IP address, regardless of priority', 'Randomly on every Hello', 'Highest router priority, with highest router ID breaking a tie', 'The router with the most interfaces'],
    answer: 2,
    explanation: 'The highest priority wins the election; tied priorities are settled by the highest router ID.'
  },
  {
    id: 'ospf-08',
    prompt: 'What does a Database Description packet summarize?',
    choices: ['The full HTTP request body', "Only the router's default route", 'Every packet currently in flight', 'The LSA headers each router holds, so the peers can find missing entries'],
    answer: 3,
    explanation: 'Database Description packets list LSA headers as a summary; they are not the full link-state entries.'
  },
  {
    id: 'ospf-09',
    prompt: 'What does a Link State Request ask a neighbor for?',
    choices: ['Specific link-state entries the router is missing', 'A new TCP port', 'A DHCP address', 'A BGP local-preference value'],
    answer: 0,
    explanation: 'After comparing summaries, a router requests missing LSAs by their identifying fields.'
  },
  {
    id: 'ospf-10',
    prompt: 'From ISP to the border router, which route has the lower OSPF cost in this map?',
    choices: ['Through core B, cost 20', 'Through core A, cost 2', 'Both cost 10', 'There is no path to the border router'],
    answer: 1,
    explanation: 'The path through core A adds link costs 1 + 1 = 2; the route through core B costs 10 + 10 = 20.'
  }
]);
