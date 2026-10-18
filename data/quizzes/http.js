NETV.addQuiz('http', 'HTTP', [
  {
    id: 'http-01',
    prompt: "What is the order of TCP's three-way connection handshake?",
    choices: ['SYN, SYN-ACK, ACK', 'ACK, SYN, FIN', 'SYN, ACK, SYN-ACK', 'FIN, FIN-ACK, ACK'],
    answer: 0,
    explanation: 'The client sends SYN, the server answers SYN-ACK, and the client finishes with ACK.'
  },
  {
    id: 'http-02',
    prompt: 'If a listening server receives a SYN with sequence number N, what acknowledgement number does its SYN-ACK use?',
    choices: ['N', 'N + 1', 'N + 2', '0'],
    answer: 1,
    explanation: 'SYN consumes one sequence number, so the server acknowledges the next number, N + 1.'
  },
  {
    id: 'http-03',
    prompt: 'What does the HTTP Host field identify when several sites share one IP address?',
    choices: ["The client's MAC address", 'The next router', 'The requested site name', 'The TCP sequence number'],
    answer: 2,
    explanation: 'Host names the site the request targets, allowing the server to distinguish sites on one address.'
  },
  {
    id: 'http-04',
    prompt: 'What is the intended effect of repeating this GET request?',
    choices: ['Create another account', 'Delete the requested page', "Change the server's routing table", 'Read the resource again without intending to change server state'],
    answer: 3,
    explanation: 'GET is a safe, idempotent method: repeating it has the same intended read effect, though response caching depends on cache rules.'
  },
  {
    id: 'http-05',
    prompt: 'Which layer numbers the request bytes and carries the source and destination ports?',
    choices: ['TCP', 'Ethernet', 'DNS', 'IP'],
    answer: 0,
    explanation: 'TCP carries the application bytes, numbers them, and uses ports to identify the two programs.'
  },
  {
    id: 'http-06',
    prompt: 'Which order describes the request as it is wrapped on the way out?',
    choices: ['Ethernet, then IP, then TCP, then HTTP from inside out', 'HTTP inside TCP inside IP inside Ethernet', 'IP inside HTTP inside Ethernet inside TCP', 'TCP inside Ethernet inside HTTP inside IP'],
    answer: 1,
    explanation: 'The application writes HTTP first; TCP, IP, and Ethernet each add their wrapper outside it.'
  },
  {
    id: 'http-07',
    prompt: "On the laptop's first Ethernet link, what does the destination MAC address identify?",
    choices: ['The final web server across the Internet', 'The DNS root server', 'The next device on this local link, the home router', 'The target TCP port'],
    answer: 2,
    explanation: 'Ethernet addresses apply to one link; the first destination is the home router, and each hop builds a new frame.'
  },
  {
    id: 'http-08',
    prompt: 'What happens to the IP TTL at a forwarding router?',
    choices: ['It increases by one', 'It is replaced by the TCP port', 'It stays unchanged at every router', 'It decreases by one; the access point does not change it'],
    answer: 3,
    explanation: 'Each router that forwards the packet subtracts one from TTL; the layer-2 access point does not.'
  },
  {
    id: 'http-09',
    prompt: "What does the home router do to the outgoing packet's source address for this Internet trip?",
    choices: ['It translates 192.168.1.87 to 198.51.100.23 and records a mapping', 'It changes the destination to the DNS resolver', 'It replaces the IP address with a MAC address', 'It leaves the private source address unchanged'],
    answer: 0,
    explanation: "NAPT substitutes the home router's public address and records enough mapping state to send the reply back to the laptop."
  },
  {
    id: 'http-10',
    prompt: 'What is TCP TIME-WAIT for after the client closes first?',
    choices: ['To retransmit the original HTTP request forever', 'To allow a repeated server FIN to be acknowledged and old duplicate segments to expire', 'To keep the DNS cache alive', 'To elect a new default gateway'],
    answer: 1,
    explanation: 'TIME-WAIT retains the connection record for twice the maximum segment lifetime, covering a repeated FIN and the lifetime of old duplicates.'
  }
]);
