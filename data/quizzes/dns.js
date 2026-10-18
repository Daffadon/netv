NETV.addQuiz('http', 'DNS', [
  {
    id: 'dns-01',
    prompt: 'What does an IPv4 A record map to a name?',
    choices: ['A TCP port', 'An IPv4 address', 'A MAC address', 'A network route'],
    answer: 1,
    explanation: 'An A record maps a domain name to an IPv4 address.'
  },
  {
    id: 'dns-02',
    prompt: 'Which server does the laptop ask first in this uncached lookup?',
    choices: ['A root server', 'The authoritative server directly', 'Its configured recursive resolver', 'The datacentre edge router'],
    answer: 2,
    explanation: "The laptop's stub resolver sends the question to its configured recursive resolver."
  },
  {
    id: 'dns-03',
    prompt: "Who walks the root-to-authoritative delegation chain on the laptop's behalf?",
    choices: ['The recursive resolver', "The laptop's home router", 'The root server', 'The authoritative server'],
    answer: 0,
    explanation: 'The recursive resolver follows referrals and returns the result to the client.'
  },
  {
    id: 'dns-04',
    prompt: 'When asked about daffapn.my.id, what does the root server return first?',
    choices: ['The final IPv4 address', 'A referral to the .id name servers', "The laptop's DHCP lease", 'A route to the datacentre'],
    answer: 1,
    explanation: 'The root server refers the resolver to the name servers responsible for the .id top-level domain.'
  },
  {
    id: 'dns-05',
    prompt: 'What does the .id name server return when asked about daffapn.my.id?',
    choices: ["The laptop's private address", 'A TCP connection', 'A referral to the authoritative servers for daffapn.my.id', 'The HTTP response'],
    answer: 2,
    explanation: 'The .id servers refer the resolver to the servers responsible for the daffapn.my.id zone.'
  },
  {
    id: 'dns-06',
    prompt: "Which server holds the site's zone records and can return its A record?",
    choices: ['The root server', 'The ISP router', 'The recursive resolver only', 'The authoritative server'],
    answer: 3,
    explanation: 'The authoritative server holds the zone and returns its records rather than chasing referrals.'
  },
  {
    id: 'dns-07',
    prompt: "What does the answer's TTL of 3600 seconds allow a cache to do?",
    choices: ['Keep the record for up to one hour', 'Keep it forever', 'Use it only for 3600 more lookups', 'Treat it as a TCP timeout'],
    answer: 0,
    explanation: "3600 seconds is one hour; the cached record's stated lifetime is an upper bound, not a promise it must remain cached."
  },
  {
    id: 'dns-08',
    prompt: 'If a valid cached answer is available, what can the next lookup avoid?',
    choices: ['The TCP handshake', 'The DNS delegation walk', 'The Ethernet frame', 'The HTTP response'],
    answer: 1,
    explanation: 'A cached name-to-address record can satisfy the lookup without asking the root, TLD, and authoritative servers again.'
  },
  {
    id: 'dns-09',
    prompt: "Which transport is used for the walkthrough's ordinary DNS query to port 53?",
    choices: ['TCP only', 'ICMP', 'UDP; TCP is also used for cases such as zone transfers or oversized data', 'OSPF'],
    answer: 2,
    explanation: 'This query fits in one UDP datagram; DNS also uses TCP for cases including zone transfers and data too large for UDP.'
  },
  {
    id: 'dns-10',
    prompt: 'In the DNS flags, what does RD=1 in the query mean?',
    choices: ['The answer is authoritative', 'The resolver supports IPv6', 'The response is truncated', 'The client requests recursive service'],
    answer: 3,
    explanation: 'RD is the recursion-desired bit; RA in the response indicates that recursive service is available.'
  }
]);
