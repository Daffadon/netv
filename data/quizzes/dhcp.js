NETV.addQuiz('http', 'DHCP', [
  {
    id: 'dhcp-01',
    prompt: 'What source IPv4 address does the laptop use before it has an address?',
    choices: ['255.255.255.255', '0.0.0.0', '192.168.1.87', '192.168.1.1'],
    answer: 1,
    explanation: 'The client has no assigned address yet, so DHCPDISCOVER uses 0.0.0.0 as its source.'
  },
  {
    id: 'dhcp-02',
    prompt: 'What destination IPv4 address lets every host on the local link receive DHCPDISCOVER?',
    choices: ['0.0.0.0', '192.168.1.255', '255.255.255.255', '198.51.100.1'],
    answer: 2,
    explanation: 'DHCPDISCOVER uses the limited-broadcast address because the client does not yet know which server can answer.'
  },
  {
    id: 'dhcp-03',
    prompt: "Which UDP ports carry the client's DHCP message to the server?",
    choices: ['68 to 67', '67 to 68', '53 to 53', '80 to 49152'],
    answer: 0,
    explanation: 'The DHCP client sends from UDP port 68 to server port 67.'
  },
  {
    id: 'dhcp-04',
    prompt: 'Why does this address-less client use UDP instead of opening TCP first?',
    choices: ['UDP assigns the laptop its address', 'TCP only works on Wi-Fi', 'The client needs an IP address before it can establish the TCP connection', 'TCP cannot carry short messages'],
    answer: 2,
    explanation: "DHCP must work before the client has an IP address; TCP's connection setup needs addressed endpoints."
  },
  {
    id: 'dhcp-05',
    prompt: 'What is the DHCP message order shown in this walkthrough?',
    choices: ['Offer, Discover, ACK, Request', 'Discover, Offer, Request, ACK', 'Request, ACK, Discover, Offer', 'Discover, Request, Offer, ACK'],
    answer: 1,
    explanation: "The client discovers servers, receives an offer, requests one offer, and receives the server's acknowledgement."
  },
  {
    id: 'dhcp-06',
    prompt: 'In the DHCP offer, what does yiaddr contain?',
    choices: ['The offered client IPv4 address, 192.168.1.87', "The resolver's address, 198.51.100.53", "The server's MAC address", 'The public address after NAT'],
    answer: 0,
    explanation: 'yiaddr is the address being offered to the client: 192.168.1.87 in this scenario.'
  },
  {
    id: 'dhcp-07',
    prompt: 'Which DHCP option tells the laptop where to send traffic for destinations outside its subnet?',
    choices: ['The lease time', 'The DNS resolver', 'The subnet mask', 'The router option, 192.168.1.1'],
    answer: 3,
    explanation: 'The router option names the default gateway for destinations outside the local subnet.'
  },
  {
    id: 'dhcp-08',
    prompt: 'Why does the client broadcast DHCPREQUEST after receiving an offer?',
    choices: ['To name its chosen offer and server so other servers can release their offers', 'To ask the DNS root server for the website', 'To discover the gateway MAC address', 'To start the TCP connection'],
    answer: 0,
    explanation: 'The request identifies the selected server and offered address; other DHCP servers can then withdraw their offers.'
  },
  {
    id: 'dhcp-09',
    prompt: 'When does the laptop begin using the offered IPv4 address?',
    choices: ['As soon as it sees DHCPDISCOVER', 'When any server sends an offer', "After the selected server acknowledges the request", 'Only after the first DNS answer'],
    answer: 2,
    explanation: "The client adopts 192.168.1.87 after the selected server's DHCPACK commits the lease."
  },
  {
    id: 'dhcp-10',
    prompt: 'After configuring its gateway IP, which protocol finds the gateway\'s local hardware address?',
    choices: ['DNS', 'ARP', 'BGP', 'TCP'],
    answer: 1,
    explanation: 'ARP resolves the next-hop IPv4 address to a MAC address on the local link.'
  }
]);
