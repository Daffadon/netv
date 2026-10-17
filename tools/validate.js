// Schema check for every scenario file. Run: node tools/validate.js
// This is the safety net: it is the only thing preventing an invented RFC section, an
// unknown header field, a step out of order or a missing step from reaching the page.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const SCENARIO_FILES = [
  'src/schema.js',
  'data/scenario-http.js',
  'data/http/1-boot.js',
  'data/http/2-resolve.js',
  'data/http/3-connect.js',
  'data/http/4-request.js',
  'data/http/5-response.js',
  'data/scenario-routing.js',
  'data/routing/1-ospf.js',
  'data/routing/2-bgp.js',
  'src/engine.js',
  'src/anim.js',
  'src/ui.js'
];

// From docs/data-schema.md §6. Verified against rfc-editor.org; do not add a section here
// without reading it out of the RFC first.
const CITATIONS = {
  768: ['Fields', 'Format', 'Protocol Number'],
  791: ['2.2', '3.1', '3.2'],
  792: ['Time Exceeded Message', 'Destination Unreachable Message'],
  826: ['Packet format', 'Related issue'],
  894: ['Frame Format', 'Address Mappings', 'Broadcast Address'],
  1035: ['3.4.1', '4.1', '4.1.1', '4.1.2', '4.1.3', '4.2.1'],
  1122: ['1.1.3'],
  1812: ['5.3.1'],
  1918: ['3'],
  2131: ['3.1', '4.3.1', '4.3.2', '4.4.1', '4.4.4'],
  2328: ['1.2', '3', '3.1', '4.3', '5', '6', '7.1', '7.2', '7.3', '7.4', '8.1', '9', '9.4',
    '9.5', '10.1', '10.3', '10.5', '10.6', '10.7', '10.8', '10.9', '12.1', '12.1.1', '12.1.6',
    '12.1.7', '12.4.1', '13', '13.1', '13.2', '13.5', '16', '16.1', 'A.1', 'A.3.1', 'A.3.2',
    'A.3.3', 'A.3.4', 'A.3.5', 'A.3.6', 'A.4.1', 'A.4.2'],
  3022: ['2.1', '2.2', '3.1', '3.2', '3.3'],
  4271: ['3', '3.1', '4', '4.1', '4.2', '4.3', '4.4', '4.5', '5', '5.1.1', '5.1.2', '5.1.3',
    '5.1.4', '5.1.5', '9.1', '9.1.1', '9.1.2', '9.1.2.1', '9.1.2.2', '9.3'],
  4987: ['2.2', '3.2'],
  5737: ['3'],
  6996: ['3', '5'],
  9110: ['1.1', '3.1', '5.2', '7.2', '7.3', '8.2', '8.3', '8.6', '8.8.3', '9.3.1', '12.5.1', '15.3.1'],
  9112: ['2.1', '2.2', '3', '3.1', '3.2', '4', '6.1', '6.2', '6.3', '9.1', '9.2', '9.3', '9.6'],
  9293: ['2.2', '3.1', '3.3', '3.3.2', '3.4.1', '3.5', '3.6', '3.6.1', '3.7', '3.7.1', '3.8', '3.8.2'],
  9499: ['4', '6']
};

// One entry per scenario: the chapters (tabs), the master step list (§7), and the TTLs the
// scenario's own constants allow (§2). Everything else is read off the data.
const SCENARIOS = {
  http: {
    phases: ['DHCP', 'DNS', 'HTTP'],
    ids: [
      'intent', 'dhcp-discover', 'dhcp-offer', 'dhcp-request-ack',
      'arp-request', 'arp-reply', 'dns-query', 'dns-recursion', 'dns-answer',
      'tcp-syn-build', 'syn-on-the-wire', 'tcp-syn-ack', 'tcp-ack-established',
      'http-request-message', 'wrap-tcp', 'wrap-ip', 'wrap-frame', 'request-crosses-internet',
      'server-receives', 'server-parses', 'app-handles',
      'http-response-message', 'response-wrap-tcp', 'response-wrap-ip', 'response-wrap-frame',
      'response-crosses-internet', 'client-receives', 'browser-renders', 'tcp-teardown', 'time-wait'
    ],
    ttl: [60, 61, 62, 63, 64]
  },
  routing: {
    phases: ['OSPF', 'BGP'],
    ids: [
      'ospf-process-up', 'ospf-hello', 'ospf-two-way', 'ospf-dbd', 'ospf-lsr',
      'ospf-lsa-flood', 'ospf-spf', 'ospf-route-install', 'ospf-tables', 'ospf-path',
      'ospf-convergence', 'ospf-boundary',
      'bgp-topology', 'bgp-tcp-peer', 'bgp-open', 'bgp-keepalive', 'bgp-update-advertise',
      'bgp-second-offer', 'bgp-policy', 'bgp-select', 'bgp-local-pref', 'bgp-loop-prevention',
      'bgp-next-hop', 'bgp-withdraw', 'bgp-forwarding'
    ],
    // OSPF messages are link-local (TTL 1); everything BGP, and the packet BGP forwards, starts at 64.
    ttl: [1, 60, 61, 62, 63, 64]
  }
};

const KINDS = ['host', 'switch', 'router', 'server', 'dns'];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const sandbox = vm.createContext({ console });
for (const f of SCENARIO_FILES) {
  const full = path.join(root, f);
  if (!fs.existsSync(full)) { err('missing file: ' + f); continue; }
  try {
    vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    err(f + ' threw: ' + e.message);
  }
}

const NETV = sandbox.NETV;
if (!NETV) { console.error('NETV never defined; data files aborted'); process.exit(1); }

// --- 1. every catalogued field name needs a plain-language hint (NETV.FIELD_HELP)
for (const key of NETV.HEADER_ORDER) {
  const fields = NETV.FIELDS[key];
  if (!fields) continue;
  for (const f of fields) {
    if (!(NETV.FIELD_HELP[key] || {})[f]) err('no plain-language hint for ' + key + '.' + f + ' in NETV.FIELD_HELP');
  }
}

/**
 * The routers on a hop that had to forward the packet. This mirrors the derivation in src/anim.js
 * exactly: the node the packet comes from has not forwarded it yet and the node it arrives at is
 * receiving it, so only the routers strictly between the two ends cost it a TTL. A broadcast never
 * leaves its link, so it costs none either.
 */
function forwarders(step, kindById) {
  if (!step.hop || step.hop.length < 3 || NETV.delivery(step) === 'broadcast') return [];
  return step.hop.slice(1, -1).filter((id) => kindById.get(id) === 'router');
}

for (const scenarioId of Object.keys(SCENARIOS)) {
  const want = SCENARIOS[scenarioId];
  const scenario = NETV.scenarios[scenarioId];
  if (!scenario) { err('scenario "' + scenarioId + '" is never defined'); continue; }
  const tag = '[' + scenarioId + '] ';
  const steps = scenario.steps || [];

  // --- 2. the master step list: ids, order, uniqueness
  if (steps.length !== want.ids.length) {
    err(tag + 'expected ' + want.ids.length + ' steps, got ' + steps.length);
  }
  const seen = new Set();
  steps.forEach((s, i) => {
    if (s.id !== want.ids[i]) err(tag + 'step #' + (i + 1) + ' is "' + s.id + '", expected "' + want.ids[i] + '"');
    if (seen.has(s.id)) err(tag + 'duplicate step id: ' + s.id);
    seen.add(s.id);
  });
  for (const id of want.ids) if (!seen.has(id)) err(tag + 'missing step: ' + id);

  // --- 3. the chapters are exactly the scenario's own tab list, in order
  if ((scenario.phases || []).join('|') !== want.phases.join('|')) {
    err(tag + 'phases should be exactly ' + want.phases.join(' · ') + ', got ' + (scenario.phases || []).join(' · '));
  }

  // --- 4. boards: one map per chapter when the scenario declares boards, else one map for all.
  // Each board's nodes need a kind the map can draw and a plain-language note for the legend,
  // and each board's links must join two of its own nodes.
  const boards = {};
  const kindById = new Map();
  for (const phase of want.phases) {
    const board = NETV.boardOf(scenario, phase);
    boards[phase] = board;
    if (!board.nodes || !board.nodes.length) { err(tag + 'chapter ' + phase + ' has no map'); continue; }
    const here = new Set(board.nodes.map((n) => n.id));
    for (const n of board.nodes) {
      if (!KINDS.includes(n.kind)) err(tag + phase + ' node ' + n.id + ' has kind "' + n.kind + '", which the map cannot draw');
      if (!n.note) err(tag + phase + ' node ' + n.id + ' has no plain-language note for the legend');
      if (n.subBefore !== undefined && n.subFrom === undefined) {
        err(tag + phase + ' node ' + n.id + ' has a before-label but no step that earns it (subFrom)');
      }
      if (n.subFrom !== undefined) {
        if (n.subBefore === undefined) err(tag + phase + ' node ' + n.id + ' has subFrom but no subBefore line to show first');
        else if (!(scenario.steps || []).some((s) => s.id === n.subFrom)) {
          err(tag + phase + ' node ' + n.id + ' earns its line at "' + n.subFrom + '", which is not a step of this scenario');
        }
      }
      if (kindById.has(n.id) && kindById.get(n.id) !== n.kind) {
        err(tag + 'node ' + n.id + ' is drawn with two different kinds on different maps');
      }
      kindById.set(n.id, n.kind);
    }
    for (const l of board.links || []) {
      if (!here.has(l.from) || !here.has(l.to)) {
        err(tag + phase + ' link ' + l.from + ' - ' + l.to + ' joins a node that map does not draw');
      }
      if (l.cost !== undefined && !(Number.isInteger(l.cost) && l.cost > 0)) {
        err(tag + phase + ' link ' + l.from + ' - ' + l.to + ' has cost "' + l.cost + '", and an interface cost is a whole number above zero');
      }
    }
    // A section is drawn around the nodes it groups, so it can only hold nodes of this map.
    for (const r of board.regions || []) {
      if (!/^[0-9]+$/.test(r.as)) err(tag + phase + ' section "' + r.as + '" is not an AS number');
      if (!r.nodes || !r.nodes.length) {
        err(tag + phase + ' section AS ' + r.as + ' groups no node, so there is nothing to draw a boundary around');
        continue;
      }
      for (const id of r.nodes) {
        if (!here.has(id)) err(tag + phase + ' section AS ' + r.as + ' groups ' + id + ', which is not a node of this chapter\'s map');
      }
    }
  }
  if (scenario.boards) {
    for (const phase of Object.keys(scenario.boards)) {
      if (!want.phases.includes(phase)) err(tag + 'board for unknown chapter: ' + phase);
    }
  }

  // --- 5. per-step schema conformance
  steps.forEach((s, i) => {
    const where = tag + '[' + (i + 1) + ' ' + s.id + '] ';
    const board = boards[s.phase];
    const nodeIds = new Set((board && board.nodes ? board.nodes : []).map((n) => n.id));
    const linked = new Set();
    for (const l of (board && board.links) || []) {
      linked.add(l.from + '|' + l.to);
      linked.add(l.to + '|' + l.from);
    }

    for (const key of ['id', 'phase', 'title', 'actor', 'dir', 'osi', 'pdu', 'explain', 'cite']) {
      if (s[key] === undefined || s[key] === null || s[key] === '') err(where + 'missing "' + key + '"');
    }
    if (!want.phases.includes(s.phase)) err(where + 'unknown phase: ' + s.phase);
    if (!['out', 'in', 'none'].includes(s.dir)) err(where + 'bad dir: ' + s.dir);
    if (!nodeIds.has(s.actor)) err(where + 'actor is not on the map of its chapter: ' + s.actor);
    if (!Array.isArray(s.osi) || s.osi.length === 0) err(where + 'osi must be a non-empty array');
    else if (s.osi.some((n) => !Number.isInteger(n) || n < 1 || n > 7)) err(where + 'osi out of range: ' + s.osi);

    if (kindById.get(s.actor) === 'switch' && s.hop && s.hop.length > 1) {
      warn(where + 'actor is the L2 switch, which forwards without understanding the packet');
    }

    if (s.hop) {
      for (const id of s.hop) if (!nodeIds.has(id)) err(where + 'hop references a node that is not on this map: ' + id);
      for (let k = 0; k < s.hop.length - 1; k++) {
        const pair = s.hop[k] + '|' + s.hop[k + 1];
        if (nodeIds.has(s.hop[k]) && nodeIds.has(s.hop[k + 1]) && !linked.has(pair)) {
          err(where + 'hop jumps across a link that does not exist: ' + s.hop[k] + ' -> ' + s.hop[k + 1]);
        }
      }
      // A TTL may only differ from the previous step when a router actually forwarded the packet —
      // and only two steps carrying the same headers can be the same packet, so a protocol message
      // arriving after a forwarded frame (an OSPF update behind a packet) is not compared.
      const ttl = s.fields && s.fields.ip ? s.fields.ip.ttl : undefined;
      const before = i > 0 ? steps[i - 1] : null;
      const prevTtl = before && before.fields && before.fields.ip ? before.fields.ip.ttl : undefined;
      const sameHeaders = !!before &&
        Object.keys(before.fields || {}).sort().join() === Object.keys(s.fields || {}).sort().join();
      if (ttl !== undefined && prevTtl !== undefined && sameHeaders && ttl !== prevTtl &&
          forwarders(s, kindById).length === 0) {
        warn(where + 'TTL changed ' + prevTtl + ' -> ' + ttl + ' but no router forwards this hop');
      }
    }

    // fields: header keys and field names must exist in the catalogue
    if (s.fields) {
      for (const key of Object.keys(s.fields)) {
        if (!NETV.HEADER_ORDER.includes(key)) err(where + 'unknown header key: ' + key);
        const allowed = NETV.FIELDS[key];
        if (allowed) {
          for (const f of Object.keys(s.fields[key])) {
            if (!allowed.includes(f)) err(where + 'unknown field "' + f + '" in ' + key);
          }
          if (Object.keys(s.fields[key]).length === 0) err(where + 'empty header object: ' + key);
        }
        if (key === 'ip' && s.fields.ip.ttl !== undefined && !want.ttl.includes(s.fields.ip.ttl)) {
          err(where + 'invented TTL ' + s.fields.ip.ttl + ' (allowed: ' + want.ttl.join(', ') + ')');
        }
        if (key === 'http') {
          for (const f of Object.keys(s.fields.http)) {
            if (!NETV.FIELD_HELP.http[f]) warn(where + 'no plain-language hint for the http field "' + f + '"');
          }
        }
      }
    }

    // The delivery mode shown on the packet and in the drawer is derived from the addresses, so it
    // must resolve for every step and must exist for anything that is on the wire.
    const mode = NETV.delivery(s);
    if (!NETV.DELIVERY[mode]) err(where + 'delivery mode "' + mode + '" has no label in NETV.DELIVERY');
    if (s.hop && s.hop.length > 1 && mode === 'local') err(where + 'travels but derives no delivery mode');

    // An optional evidence table (route tables, comparison of offers): fixed columns, and every row
    // filled to the same width, so the drawer can render it without inventing a cell.
    if (s.table) {
      const cols = s.table.columns;
      if (!Array.isArray(cols) || cols.length === 0) err(where + 'table needs a non-empty columns array');
      else if (!Array.isArray(s.table.rows) || s.table.rows.length === 0) err(where + 'table needs a non-empty rows array');
      else for (const row of s.table.rows) {
        if (!Array.isArray(row) || row.length !== cols.length) {
          err(where + 'table row has ' + (Array.isArray(row) ? row.length : 'no') + ' cell(s), expected ' + cols.length);
        } else if (row.some((c) => typeof c !== 'string' && typeof c !== 'number')) {
          err(where + 'table cell is neither text nor a number');
        }
      }
      if (s.table.caption !== undefined && typeof s.table.caption !== 'string') {
        err(where + 'table caption must be text');
      }
    }

    // citations: closed set, verified sections only
    if (!Array.isArray(s.cite) || s.cite.length === 0) err(where + 'needs at least one citation');
    else for (const c of s.cite) {
      if (!c || typeof c.rfc !== 'number' || typeof c.sec !== 'string' || !c.title) {
        err(where + 'malformed citation');
        continue;
      }
      const allowed = CITATIONS[c.rfc];
      if (!allowed) err(where + 'RFC ' + c.rfc + ' is not on the verified list');
      else if (!allowed.includes(c.sec)) err(where + 'RFC ' + c.rfc + ' §' + c.sec + ' is not a verified section');
    }

    // style rules from docs/data-schema.md §9
    const banned = /\b(simply|just|obviously|basically|clearly)\b|!|—the Internet\b/i;
    if (banned.test(s.explain)) warn(where + 'filler word in explain');
    if (s.explain.split(/\.\s/).length < 2) warn(where + 'explain is a single sentence');
    if (s.title.length > 70) warn(where + 'title is ' + s.title.length + ' chars');

    // `say` is the one line a learner sees without opening anything: keep it short and plain.
    if (!s.say) err(where + 'missing plain-language "say" caption');
    else {
      const words = s.say.trim().split(/\s+/).length;
      if (words < 6 || words > 20) warn(where + 'say is ' + words + ' words (want 6-20)');
      if (!/[.?!]$/.test(s.say)) warn(where + 'say does not end in a sentence stop');
      if (banned.test(s.say)) warn(where + 'filler word in say');
      if (/[A-Z]{3,}/.test(s.say)) warn(where + 'say leans on an acronym: ' + s.say.match(/[A-Z]{3,}/)[0]);
    }

    // `analogy` is the everyday comparison the drawer shows before the explanation.
    if (!s.analogy) err(where + 'missing plain-language "analogy"');
    else {
      const words = s.analogy.trim().split(/\s+/).length;
      if (words < 8 || words > 25) warn(where + 'analogy is ' + words + ' words (want 8-25)');
      if (!/[.?!]$/.test(s.analogy)) warn(where + 'analogy does not end in a sentence stop');
      if (banned.test(s.analogy)) warn(where + 'filler word in analogy');
      if (/[A-Z]{2}/.test(s.analogy)) warn(where + 'analogy uses an acronym: ' + s.analogy.match(/[A-Z]{2}/)[0]);
      if (/\d/.test(s.analogy)) warn(where + 'analogy uses a number: ' + s.analogy.match(/\S*\d\S*/)[0]);
    }

    const explainWords = s.explain.trim().split(/\s+/).length;
    if (explainWords > 110) warn(where + 'explain is ' + explainWords + ' words (want <= 110)');

    // A packet that crosses a router arrives with fewer TTLs left than it left with. When the next
    // step is the receiving host processing *that* packet (arrived, so no hop of its own), its
    // declared value has to agree with the arithmetic. A reply is a different packet and is skipped.
    const ttl = s.fields && s.fields.ip ? s.fields.ip.ttl : undefined;
    const following = steps[i + 1];
    const continues = following && following.dir === 'in' && !following.hop;
    const crossed = forwarders(s, kindById).length;
    if (ttl !== undefined && continues && crossed > 0) {
      const arrival = ttl - crossed;
      const declared = following.fields && following.fields.ip ? following.fields.ip.ttl : undefined;
      if (declared !== undefined && declared !== arrival) {
        err(where + 'arrives with TTL ' + arrival + ' but the next step declares ' + declared);
      }
      if (arrival < 1) err(where + 'TTL would expire before arrival');
    }
  });
}

// --- 6. index.html must load every source and data file that exists on disk
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const onDisk = [];
function collect(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p, rel + '/' + e.name);
    else if (e.name.endsWith('.js')) onDisk.push(rel + '/' + e.name);
  }
}
collect(path.join(root, 'src'), 'src');
collect(path.join(root, 'data'), 'data');

for (const f of onDisk) {
  if (!SCENARIO_FILES.includes(f)) err('file exists but the validator never loads it: ' + f);
  if (!html.includes('src="' + f + '"')) err('index.html does not load ' + f);
}
for (const f of SCENARIO_FILES) {
  if (!f.startsWith('src/') && !f.startsWith('data/')) continue;
  if (!onDisk.includes(f)) err('validator loads a file that does not exist: ' + f);
}

// --- report
for (const w of warnings) console.log('warn  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log('\n' + Object.keys(SCENARIOS).map((id) => {
  const s = NETV.scenarios[id];
  return (s ? (s.steps || []).length : 0) + ' ' + id;
}).join(' · ') + ' steps · ' + errors.length + ' errors · ' + warnings.length + ' warnings');
process.exit(errors.length ? 1 : 0);
