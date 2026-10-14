// Optional DOM smoke test: renders the real page, drives it, and checks the animation timeline.
//
//   JSDOM_PATH=/tmp/netv-dom/node_modules/jsdom node tools/smoke.mjs
//
// jsdom is deliberately NOT a project dependency (ADR 0005: the page itself has none), so it is
// installed outside the tree:
//   mkdir -p /tmp/netv-dom && cd /tmp/netv-dom && bun add jsdom
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let JSDOM;
try {
  ({ JSDOM } = require(process.env.JSDOM_PATH || 'jsdom'));
} catch (e) {
  console.error('jsdom not found. Install it outside the project:\n' +
    '  mkdir -p /tmp/netv-dom && cd /tmp/netv-dom && bun add jsdom\n' +
    'then:\n  JSDOM_PATH=/tmp/netv-dom/node_modules/jsdom node tools/smoke.mjs');
  process.exit(2);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const OPTS = { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true };
const HEADERS = ['ethernet', 'arp', 'ip', 'tcp', 'udp', 'dns', 'dhcp', 'http'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Let the page's own timers run until a condition holds, so a mid-animation state can be asserted
// without guessing a duration.
async function until(fn, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await wait(20);
  }
  return false;
}

let passed = 0;
const failures = [];

function checker(tag) {
  const c = { failures: [] };
  c.assert = (cond, what, detail) => {
    if (cond) passed++;
    else c.failures.push('[' + tag + '] ' + what + (detail !== undefined ? '  -> got: ' + JSON.stringify(detail) : ''));
  };
  return c;
}

async function load(target, fromFile) {
  const dom = fromFile ? await JSDOM.fromFile(target, OPTS) : await JSDOM.fromURL(target, OPTS);
  await new Promise((r) => dom.window.addEventListener('load', r, { once: true }));
  await wait(60);
  dom.window.NETV.Engine.pause();     // hold the story still while asserting
  return dom;
}

function helpers(dom) {
  const { window } = dom;
  const doc = window.document;
  const q = (s) => doc.querySelector(s);
  return {
    window, doc, q,
    NETV: window.NETV,
    text: (s) => (q(s) ? q(s).textContent.trim() : null),
    liveRails: () => [...doc.querySelectorAll('.wire-rail:not(.off)')]
      .map((r) => r.getAttribute('class').replace('wire-rail wire-rail-', '')),
    stack: () => [...doc.querySelectorAll('.stack-row:not(.off)')].map((r) => r.dataset.header),
    mode: () => q('.chip-mode').textContent,
    modeClass: () => q('.chip-mode').getAttribute('class'),
    waves: () => [...doc.querySelectorAll('.wave')].map((w) => w.parentNode.getAttribute('transform')),
    flowing: () => doc.querySelectorAll('.link.flow').length,
    cells: () => [...doc.querySelectorAll('.packet-cell')].map((c) => c.className.match(/packet-cell-([a-z]+)/)[1]),
    drawerMode: () => (q('.packet-mode') ? q('.packet-mode').textContent : null),
    layers: () => [...doc.querySelectorAll('.layer.active .layer-name')].map((e) => e.textContent),
    ticks: () => [...doc.querySelectorAll('.tick')],
    cites: () => [...doc.querySelectorAll('#detail .cites a')],
    click: (sel) => q(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
    key: (k) => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })),
    hash: (h) => { window.location.hash = h; window.dispatchEvent(new window.HashChangeEvent('hashchange')); },
    packetAt: () => q('.packet').getAttribute('transform'),
    ttl: () => q('.chip-ttl').textContent,
    ttlHidden: () => q('.chip-ttl').classList.contains('hidden')
  };
}

// Every step: a caption, the right chapter, one current tick, a citation, and wrappers that match
// exactly the headers its data declares.
async function walkAllSteps(h, c) {
  const NETV = h.NETV;
  const broken = [];
  const analogyMissing = [];
  const ttlJunk = [];
  const railMismatch = [];
  const stackMismatch = [];
  const total = NETV.scenarios.http.steps.length;
  for (const [i, step] of NETV.scenarios.http.steps.entries()) {
    NETV.Engine.go(i);
    NETV.Anim.settle(step);
    await wait(2);
    const say = h.text('#say');
    const current = h.doc.querySelectorAll('.tick.current').length;
    if (!say || h.text('#counter') !== 'Step ' + (i + 1) + ' of ' + total || h.cites().length < 1 || current !== 1) {
      broken.push((i + 1) + (say ? '' : ' no caption') + (h.cites().length < 1 ? ' no citation' : '') + (current !== 1 ? ' ticks=' + current : ''));
    }
    const want = HEADERS.filter((k) => step.fields && step.fields[k]);
    const got = h.liveRails();
    if (want.join(',') !== got.join(',')) railMismatch.push((i + 1) + ' ' + step.id + ' want[' + want + '] got[' + got + ']');
    const rows = h.stack();
    if (want.join(',') !== rows.join(',')) stackMismatch.push((i + 1) + ' ' + step.id + ' want[' + want + '] got[' + rows + ']');
    const analogy = h.text('.detail-analogy p');
    if (!analogy || analogy.length < 20) analogyMissing.push((i + 1) + ' ' + step.id);
    if (/NaN|undefined/.test(h.text('.chip-line'))) ttlJunk.push((i + 1) + ' ' + step.id + ' ' + h.text('.chip-line'));
  }
  c.assert(broken.length === 0, 'every step has a caption, a chapter, a citation and one current tick', broken);
  c.assert(analogyMissing.length === 0, 'every step opens the drawer with a plain-words analogy', analogyMissing);
  c.assert(ttlJunk.length === 0, 'no step prints a missing number on the packet', ttlJunk);
  c.assert(railMismatch.length === 0, 'every step wraps exactly the headers its data declares', railMismatch);
  c.assert(stackMismatch.length === 0, 'every step lists exactly those headers in the field-by-field stack', stackMismatch);
}

// ---------- serve the project so the http:// path can be tested ----------
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const file = join(ROOT, normalize(rel === '/' ? 'index.html' : rel).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/index.html';

// ---------- 1. over http:// ----------
{
  const c = checker('http');
  const dom = await load(base, false);
  const h = helpers(dom);
  const NETV = h.NETV;
  const pageErrors = [];
  dom.window.addEventListener('error', (e) => pageErrors.push(String((e.error && e.error.stack) || e.message)));

  c.assert(NETV.scenarios.http.steps.length === 26, 'master step list still has 26 steps');
  c.assert(h.ticks().length === 26, 'one tick per step', h.ticks().length);
  c.assert(h.text('#counter') === 'Step 1 of 26', 'opens on step 1', h.text('#counter'));
  c.assert(/browser/i.test(h.text('#say')), 'the opening caption is plain language', h.text('#say'));
  c.assert(h.layers().join(',') === 'Application', 'step 1 lights only the Application row', h.layers());
  c.assert(h.q('.packet').classList.contains('hidden'), 'no packet drawn where nothing is on the wire');
  c.assert(h.doc.querySelectorAll('.node.unknown').length > 0, 'nodes the story has not reached are dimmed');
  c.assert(h.q('.node.current').dataset.id === 'client', 'the acting node is highlighted');
  c.assert(/http:\/\/daffapn\.my\.id/.test(h.text('#detail')), 'the drawer carries the technical explanation');
  c.assert(h.cites()[0].href === 'https://www.rfc-editor.org/rfc/rfc9110.html#section-1.1',
    'numeric sections deep-link into the RFC', h.cites()[0] && h.cites()[0].href);
  c.assert(h.doc.querySelectorAll('.pip').length === 3, 'three chapters', h.doc.querySelectorAll('.pip').length);
  c.assert([...h.doc.querySelectorAll('.pip')].map((p) => p.textContent).join(',') === 'DHCP,DNS,HTTP',
    'the chapters are the three protocols', [...h.doc.querySelectorAll('.pip')].map((p) => p.textContent));
  c.assert([...h.doc.querySelectorAll('.pip')].map((p) => p.title).join(' | ') ===
    'DHCP · steps 1 to 6 | DNS · steps 7 to 9 | HTTP · steps 10 to 26',
    'each chapter says which steps it holds', [...h.doc.querySelectorAll('.pip')].map((p) => p.title));
  c.assert(h.text('#say').startsWith('DHCP · step 1 of 26 '), 'the caption says where the story is', h.text('#say'));
  c.assert(/joined the Wi-Fi/.test(h.text('#detail')), 'step 1 says what the walkthrough is about', h.text('#detail'));
  c.assert(NETV.scenarios.http.steps[4].phase === 'DHCP' && NETV.scenarios.http.steps[6].phase === 'DNS',
    'the ARP steps sit in the network chapter, not under DNS');
  const drawer = h.q('#drawer');
  drawer.open = true;
  c.assert(drawer.open === true, 'the packet drawer opens');
  drawer.open = false;

  // step 2: DHCP, wrapped eth > ip > udp > dhcp
  h.click('#btn-next');
  await wait(30);
  NETV.Anim.settle(NETV.Engine.current());
  c.assert(h.text('#counter') === 'Step 2 of 26', 'Next advances the story', h.text('#counter'));
  c.assert(h.window.location.hash === '#/http/dhcp-discover', 'the URL tracks the step', h.window.location.hash);
  c.assert(h.liveRails().join(' > ') === 'ethernet > ip > udp > dhcp', 'DHCP wraps eth > ip > udp > dhcp', h.liveRails());
  c.assert(h.layers().length === 4, 'a DHCP broadcast lights all four TCP/IP rows', h.layers());
  const widths = h.liveRails().map((k) => Number(h.q('.wire-rail-' + k).getAttribute('width')));
  c.assert(widths.join(',') === '100,90,80,70', 'each wrapper sits inside the previous one', widths);
  c.assert(h.text('.chip-text') === 'DHCP', 'the packet is labelled with what it is', h.text('.chip-text'));
  c.assert(h.ttlHidden(), 'no TTL is shown for a broadcast that is never routed');
  c.assert(/IPv4 header/.test(h.text('#detail')), 'DHCP does carry an IP header');
  c.assert(h.stack().join(' > ') === 'ethernet > ip > udp > dhcp',
    'the stack lists the headers it wrapped, field by field', h.stack());
  c.assert(h.q('.stack-row-ethernet .stack-fields').textContent === 'dst · src · type',
    'a stack row lists that header\'s fields', h.q('.stack-fields').textContent);
  const nameCount = h.doc.querySelectorAll('#detail .fields-name').length;
  c.assert(nameCount > 6 && h.doc.querySelectorAll('#detail .fields-help').length === nameCount,
    'every field in the drawer explains itself in plain words',
    nameCount + ' names, ' + h.doc.querySelectorAll('#detail .fields-help').length + ' hints');
  c.assert(h.doc.querySelectorAll('#detail .legend-list li').length === 11,
    'the drawer lists who is who on the map', h.doc.querySelectorAll('#detail .legend-list li').length);
  c.assert(/resolver/.test(h.text('#detail .legend-list')), 'the legend explains the map\'s own words');
  c.assert(h.mode() === 'broadcast', 'a DHCPDISCOVER is shown as a broadcast', h.mode());
  c.assert(h.modeClass() === 'chip-mode chip-mode-broadcast', 'the broadcast has its own colour', h.modeClass());
  c.assert(h.drawerMode() === 'broadcast', 'the drawer names the same delivery mode', h.drawerMode());
  c.assert(h.cells().join(' > ') === 'dhcp > udp > ip > ethernet',
    'leaving, the drawer walks the stack from the innermost header outward', h.cells());

  // ARP: an Ethernet frame with no IP header at all
  NETV.Engine.goToId('arp-request');
  NETV.Anim.settle(NETV.Engine.current());
  c.assert(h.liveRails().join(' > ') === 'ethernet > arp', 'ARP has no IP header', h.liveRails());
  c.assert(h.layers().join(',') === 'Internet,Link', 'ARP lights the Internet and Link rows', h.layers());
  c.assert(!/IPv4 header/.test(h.text('#detail')), 'the drawer shows no IPv4 header for ARP');
  c.assert(h.mode() === 'broadcast', 'an ARP request is a broadcast with no IP header to read it from', h.mode());

  // arriving is unwrapped the other way round, outermost header first
  NETV.Engine.goToId('client-receives');
  NETV.Anim.settle(NETV.Engine.current());
  c.assert(h.mode() === 'unicast', 'a response is addressed to one station', h.mode());
  c.assert(h.cells().join(' > ') === 'ethernet > ip > tcp > http',
    'arriving, the drawer walks the stack from the outermost header inward', h.cells());

  // the mode is derived from the addresses the data declares
  const derived = NETV.scenarios.http.steps.map((s) => NETV.delivery(s));
  c.assert(derived.filter((m) => m === 'broadcast').length === 4, 'four steps go out as broadcast', derived);
  c.assert(derived.filter((m) => m === 'unicast').length === 12, 'twelve are unicast', derived);
  c.assert(derived.filter((m) => m === 'local').length === 10, 'ten never reach a wire', derived);

  // ---------- the board: the map is the page, zoomable, with the details in the drawer ----------
  c.assert(h.q('#say').closest('.board') !== null,
    'the caption is a line pinned to the board, not a card beside it');
  c.assert(h.q('#subtitle').closest('#drawer') !== null,
    'the step title, chapter and explanation live in the drawer');
  const svgWidth = () => h.q('#topology').style.width;
  c.assert(svgWidth() === '100%', 'the map is fitted to the board on arrival', svgWidth());
  h.click('#btn-zoom-in');
  c.assert(svgWidth() === '125%', 'zoom in widens the map', svgWidth());
  c.assert(h.text('#zoom-level') === '125%', 'the board shows the zoom level', h.text('#zoom-level'));
  h.click('#btn-zoom-out');
  c.assert(svgWidth() === '100%', 'zoom out narrows it again', svgWidth());
  h.click('#btn-zoom-in');
  h.click('#btn-zoom-fit');
  c.assert(svgWidth() === '100%' && h.text('#zoom-level') === '100%', 'Fit shows the whole map', svgWidth());

  // ---------- the animation actually runs ----------
  NETV.Engine.speed = 2;                        // shorten the timing test
  NETV.Engine.goToId('syn-on-the-wire');
  await wait(15);
  const startPos = h.packetAt();
  await wait(2400);                             // 3 wrappers + 6 hops at 2x
  const endPos = h.packetAt();
  const serverNode = NETV.scenarios.http.nodes.find((n) => n.id === 'server');
  c.assert(startPos !== endPos, 'the packet moves during a step', [startPos, endPos]);
  c.assert(endPos === 'translate(' + serverNode.x + ',' + (serverNode.y + 58) + ')',
    'it finishes at the far end of the route', endPos);
  c.assert(h.ttl() === 'TTL 60', 'the TTL counts down to 60 across four routers', h.ttl());
  c.assert(!h.ttlHidden(), 'the TTL is shown while the packet is on the wire');
  c.assert(h.doc.querySelectorAll('.badge').length === 0, 'the router badges clean themselves up');
  c.assert(h.liveRails().length === 3, 'the travelling SYN still carries three wrappers', h.liveRails());

  // ---------- what the wire shows while the packet flows ----------
  NETV.Engine.speed = 1;                        // one beat per hop, so a mark lives a full second
  NETV.Engine.goToId('dhcp-discover');
  const rang = await until(() => h.waves().length > 0, 3000);
  const reached = ['ap', 'gw'].map((id) => {
    const n = NETV.scenarios.http.nodes.find((x) => x.id === id);
    return 'translate(' + n.x + ',' + n.y + ')';
  });
  c.assert(rang, 'a broadcast rings at each station that reads it', h.waves());
  c.assert(h.waves().every((t) => reached.includes(t)),
    'the ring is drawn on the station the frame reached', h.waves());
  c.assert(await until(() => h.waves().length === 0, 3000), 'the rings clean themselves up', h.waves());

  NETV.Engine.goToId('syn-on-the-wire');
  c.assert(await until(() => h.flowing() > 0, 3000),
    'a unicast frame traces the one link it crosses', h.flowing());
  c.assert(await until(() => h.flowing() === 0 && h.waves().length === 0, 6000),
    'the unicast trace cleans itself up', h.flowing());
  NETV.Engine.speed = 1;

  // ---------- playback advances without being clicked ----------
  NETV.Engine.go(0);
  await wait(10);
  h.click('#btn-play');
  c.assert(NETV.Engine.isPlaying(), 'Play starts playback');
  await wait(3400);
  c.assert(h.text('#counter') !== 'Step 1 of 26', 'playback advances on its own', h.text('#counter'));
  h.click('#btn-play');
  c.assert(!NETV.Engine.isPlaying(), 'Pause stops playback');
  h.key('ArrowRight');
  await wait(20);
  c.assert(NETV.Engine.isPlaying() === false, 'keyboard stepping pauses playback');

  // ---------- deep link, chapters, the end ----------
  h.hash('#/http/time-wait');
  await wait(20);
  c.assert(h.text('#counter') === 'Step 26 of 26', 'deep link lands on the last step', h.text('#counter'));
  c.assert(h.q('#btn-play').disabled === true, 'Play is disabled at the end');
  c.assert(/wait|forget/i.test(h.text('#say')), 'the closing caption reads plainly', h.text('#say'));

  const pips = [...h.doc.querySelectorAll('.pip')];
  pips[2].dispatchEvent(new h.window.MouseEvent('click', { bubbles: true }));
  await wait(20);
  c.assert(h.text('#phase') === 'HTTP', 'a chapter jumps to its first step', h.text('#phase'));

  await walkAllSteps(h, c);
  c.assert(pageErrors.length === 0, 'no page errors over http', pageErrors);
  c.assert(h.doc.querySelectorAll('.node').length === 11, 'the map has 11 nodes');
  c.assert(h.doc.querySelectorAll('.link').length === 10, 'the map has 10 links');

  failures.push(...c.failures);
  dom.window.close();
}

// ---------- 2. opening straight onto a deep link ----------
{
  const dom = await load(base + '#/http/tcp-syn-ack', false);
  const h = helpers(dom);
  if (h.text('#counter') === 'Step 12 of 26') passed++;
  else failures.push('[deep-link] cold load of #/http/tcp-syn-ack should open step 12  -> got: ' + h.text('#counter'));
  dom.window.close();
}

// ---------- 3. from file:// : the double-click path ----------
{
  const c = checker('file');
  const dom = await load(join(ROOT, 'index.html'), true);
  const h = helpers(dom);
  const pageErrors = [];
  dom.window.addEventListener('error', (e) => pageErrors.push(String((e.error && e.error.stack) || e.message)));

  c.assert(h.text('#counter') === 'Step 1 of 26', 'file:// renders instead of failing silently', h.text('#counter'));
  h.click('#btn-next');
  h.click('#btn-next');
  await wait(30);
  c.assert(h.text('#counter') === 'Step 3 of 26', 'file:// navigation works', h.text('#counter'));
  c.assert(h.liveRails().length > 0, 'file:// draws the packet');
  await walkAllSteps(h, c);
  c.assert(pageErrors.length === 0, 'no page errors over file://', pageErrors);

  failures.push(...c.failures);
  dom.window.close();
}

server.close();
for (const f of failures) console.log('FAIL  ' + f);
console.log(passed + ' passed, ' + failures.length + ' failed');
process.exit(failures.length ? 1 : 0);
