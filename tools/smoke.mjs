// Browser smoke test for the built site. Run: npm run build && npm run smoke
// Needs a Chromium that playwright-core can launch:
//   npx playwright-core install chromium
// On a machine that already has one, point CHROMIUM_PATH at it.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/index.html is missing. Run: npm run build');
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(request.url.split('?')[0].split('#')[0]);
  const file = join(ROOT, normalize(pathname === '/' ? 'index.html' : pathname).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const executablePath = process.env.CHROMIUM_PATH || chromium.executablePath();
if (!existsSync(executablePath)) {
  console.error(
    `Chromium not found at ${executablePath}.\n` +
      'Run: npx playwright-core install chromium\n' +
      'or set CHROMIUM_PATH to an existing Chromium binary.'
  );
  server.close();
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
page.on('console', (message) => {
  if (message.type() === 'error') pageErrors.push(message.text());
});

let passed = 0;
function assert(condition, label, detail) {
  if (condition) passed++;
  else failures.push(label + (detail === undefined ? '' : `  -> got: ${JSON.stringify(detail)}`));
}

const liveRails = () =>
  page
    .locator('.wire-rail:not(.off)')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('class').replace('wire-rail wire-rail-', ''))
    );
const stackRows = () =>
  page
    .locator('.stack-row:not(.off)')
    .evaluateAll((elements) => elements.map((element) => element.dataset.header));

async function openHash(hash, expectedCounter) {
  await page.evaluate((value) => {
    window.location.hash = value;
  }, hash);
  await page.waitForFunction(
    (counter) => document.querySelector('#counter')?.textContent === counter,
    expectedCounter,
    { timeout: 5000 }
  );
  await page.waitForTimeout(40);
}

// The page explains itself on arrival unless the URL names a step.
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(1100);
assert((await page.locator('#btn-play').innerText()) === 'Pause', 'arrival autoplay starts');
await page.locator('#btn-play').click();

// Structure: every step in both walkthroughs, with reduced motion so each animation is at its end.
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(base + '#/http/intent', { waitUntil: 'networkidle' });
await page.waitForTimeout(150);

assert((await page.title()).includes('netv'), 'page title');
assert((await page.locator('#scenarios button').allTextContents()).join(',') === 'HTTP,Routing', 'scenario tabs');
assert((await page.locator('#themes button').allTextContents()).join(',') === 'Auto,Light,Dark', 'theme tabs');

const NETV = await page.evaluate(() => window.NETV);
const HEADERS = NETV.HEADER_ORDER;
const broken = [];
for (const scenarioId of ['http', 'routing']) {
  const scenario = NETV.scenarios[scenarioId];
  for (const [index, step] of scenario.steps.entries()) {
    await openHash(`#/${scenarioId}/${step.id}`, `Step ${index + 1} of ${scenario.steps.length}`);
    const caption = (await page.locator('#say').innerText()).trim();
    const cites = await page.locator('#detail .cites a').count();
    const currents = await page.locator('.tick.current').count();
    const want = HEADERS.filter((key) => step.fields && step.fields[key]);
    const rails = await liveRails();
    const rows = await stackRows();
    if (!caption || cites < 1 || currents !== 1 || want.join() !== rails.join() || want.join() !== rows.join()) {
      broken.push({
        step: `${scenarioId}/${step.id}`,
        caption: !!caption,
        cites,
        currents,
        want,
        rails,
        rows
      });
    }
    const chip = await page.locator('.chip-line').textContent();
    if (/NaN|undefined/.test(chip)) broken.push({ step: step.id, chip });
  }
}
assert(broken.length === 0, 'every step has a caption, citation, one tick, and matching packet rails', broken);

await page.emulateMedia({ reducedMotion: 'no-preference' });
await openHash('#/http/syn-on-the-wire', 'Step 11 of 30');
const start = await page.locator('.packet').getAttribute('transform');
await page.waitForTimeout(2600);
const end = await page.locator('.packet').getAttribute('transform');
assert(start !== end, 'the packet moves during a step', [start, end]);

await openHash('#/http/dhcp-discover', 'Step 2 of 30');
if ((await page.locator('#drawer').getAttribute('aria-hidden')) === 'true') {
  await page.getByRole('button', { name: 'Step details', exact: true }).click();
}
await page.waitForTimeout(300);
assert((await page.locator('#drawer').getAttribute('aria-hidden')) === 'false', 'the details drawer is open');
assert((await page.locator('#detail').innerText()).includes('IPv4 header'), 'the drawer carries the explanation');
assert((await page.locator('#detail .fields-name').count()) === (await page.locator('#detail .fields-help').count()), 'every field has a hint');
await page.getByText('Who is who on the map').click();
await page.waitForTimeout(80);
assert((await page.locator('#detail .legend-list li').count()) === 11, 'the legend names every device on the map');
const firstCitation = await page.locator('#detail .cites a').first().getAttribute('href');
assert(firstCitation?.startsWith('https://www.rfc-editor.org/rfc/rfc'), 'citations link to the RFC', firstCitation);

await page.locator('#btn-zoom-in').click();
assert((await page.locator('#zoom-level').innerText()) === '125%', 'zoom in');
assert((await page.locator('#topology').evaluate((element) => element.style.width)) === '125%', 'the map widens');
await page.locator('#btn-zoom-fit').click();
assert((await page.locator('#zoom-level').innerText()) === '100%', 'Fit restores the whole map');

await page.getByRole('button', { name: 'Dark' }).click();
assert((await page.locator('html').getAttribute('data-mode')) === 'dark', 'Dark switches the Kumo palette');
assert((await page.evaluate(() => localStorage.getItem('netv.theme'))) === 'dark', 'the theme is remembered');
await page.getByRole('button', { name: 'Light' }).click();
assert((await page.locator('html').getAttribute('data-mode')) === 'light', 'Light switches back');

await page.emulateMedia({ reducedMotion: 'reduce' });
await openHash('#/routing/ospf-hello', 'Step 2 of 25');
assert(
  (await page.locator('#topology .node').evaluateAll((elements) => elements.map((element) => element.dataset.id))).join(',') ===
    'gw,isp,core-a,core-b,transit',
  'the OSPF chapter draws the provider network'
);
assert((await page.locator('.link-cost').allTextContents()).join(',') === '1,1,10,10,1,10', 'OSPF costs print on the links');
assert((await liveRails()).join(' > ') === 'ethernet > ip > ospf', 'OSPF wraps Ethernet, IP and OSPF');
assert((await page.locator('.chip-mode').textContent()) === 'multicast', 'OSPF hello is multicast');
assert((await page.locator('.chip-ttl').textContent()) === 'TTL 1', 'OSPF hello starts at TTL 1');

await openHash('#/routing/ospf-route-install', 'Step 8 of 25');
assert((await page.locator('#board-table tbody tr').count()) === 4, 'the route table stays beside the map');
assert((await page.locator('#board-table .board-table-from').innerText()).includes('Calculated at step 7'), 'the table names its step');

await openHash('#/http/arp-reply', 'Step 6 of 30');
assert(await page.locator('.quiz-panel').isVisible(), 'a chapter boundary opens its quiz panel');
const guidance = await page.locator('.quiz-guidance').innerText();
assert(guidance.includes('continue to DNS'), 'the quiz explains where to go next', guidance);
await page.getByRole('button', { name: 'Start quiz' }).click();
const pool = NETV.scenarios.http.quizzes.DHCP;
for (let index = 0; index < 5; index++) {
  const prompt = await page.locator('.quiz-question').innerText();
  const question = pool.find((candidate) => candidate.prompt === prompt);
  assert(!!question, `quiz question ${index + 1} belongs to the DHCP pool`, prompt);
  if (!question) break;
  await page.locator('.quiz-choice').nth(question.answer).click();
  if (index < 4) await page.getByRole('button', { name: 'Next question' }).click();
}
assert((await page.locator('.quiz-score').innerText()) === 'Score: 5/5', 'the quiz reports the score');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(150);
assert((await page.locator('#counter').innerText()) === 'Step 7 of 30', 'Continue enters the next chapter');

await openHash('#/http/intent', 'Step 1 of 30');
await page.locator('#btn-speed').click();
await page.locator('#btn-speed').click();
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(3200);
assert((await page.locator('#counter').innerText()) !== 'Step 1 of 30', 'playback advances without being clicked');
await page.getByRole('button', { name: 'Pause' }).click().catch(() => {});

assert(pageErrors.length === 0, 'no page errors', pageErrors);

await browser.close();
server.close();

console.log(`${passed} checks passed, ${failures.length} failed`);
for (const failure of failures) console.log('FAIL ' + failure);
process.exit(failures.length ? 1 : 0);
