// Rendering. The stage carries the story; the technical detail lives behind one disclosure.
(function (global) {
  const NETV = global.NETV;
  const Engine = NETV.Engine;
  const Anim = NETV.Anim;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const DIR_WORD = { out: 'leaving your device', in: 'arriving at your device', none: 'happening inside one machine' };

  let svg, railHost, tickHost, nodeEls = {}, linkEls = [];
  let knownAt = [];        // per step index: the set of nodes the story has already used
  let lastStep = null, lastSpeed = null, wasPlaying = false, advanceTimer = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // ---------- board: drag to pan, zoom the map around the middle of the view ----------

  let board, boardScroll, zoomLabel;
  let zoom = 1;             // 1 = the whole map fits the width
  let zoomed = false;       // true once the user has zoomed, so resize stops re-fitting

  function applyZoom() {
    svg.style.width = zoom * 100 + '%';
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

  /**
   * Show the whole map: 100% fills the width, and if the canvas is shorter than the map's own
   * proportion it shrinks until the whole map is in view again.
   */
  function fit() {
    zoomed = false;
    zoom = Math.min(1, boardScroll.clientHeight / (boardScroll.clientWidth * (320 / 860))) || 1;
    applyZoom();
  }

  function zoomBy(factor) {
    const w = boardScroll.scrollWidth;
    const h = boardScroll.scrollHeight;
    if (!w || !h) { zoomed = true; zoom = Math.min(3, Math.max(.4, zoom * factor)); applyZoom(); return; }
    // Keep whatever is under the middle of the board in the middle.
    const cx = (boardScroll.scrollLeft + boardScroll.clientWidth / 2) / w;
    const cy = (boardScroll.scrollTop + boardScroll.clientHeight / 2) / h;
    zoomed = true;
    zoom = Math.min(3, Math.max(.4, zoom * factor));
    applyZoom();
    boardScroll.scrollLeft = cx * boardScroll.scrollWidth - boardScroll.clientWidth / 2;
    boardScroll.scrollTop = cy * boardScroll.scrollHeight - boardScroll.clientHeight / 2;
  }

  function wireBoard() {
    board = document.getElementById('board');
    boardScroll = document.getElementById('board-scroll');
    zoomLabel = document.getElementById('zoom-level');

    let drag = null;
    boardScroll.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      drag = { x: e.clientX, y: e.clientY, left: boardScroll.scrollLeft, top: boardScroll.scrollTop };
      board.classList.add('dragging');
      // Optional: it keeps the pan going when the pointer leaves the board. A synthetic event
      // (a test, a stale pointer id) has nothing to capture, and that is fine.
      try { if (boardScroll.setPointerCapture) boardScroll.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    boardScroll.addEventListener('pointermove', (e) => {
      if (!drag) return;
      boardScroll.scrollLeft = drag.left - (e.clientX - drag.x);
      boardScroll.scrollTop = drag.top - (e.clientY - drag.y);
    });
    const release = () => { drag = null; board.classList.remove('dragging'); };
    boardScroll.addEventListener('pointerup', release);
    boardScroll.addEventListener('pointercancel', release);

    // Plain wheel scrolls the board; holding ctrl or ⌘ zooms it, as drawing apps do.
    boardScroll.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomBy(1.25));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(1 / 1.25));
    document.getElementById('btn-zoom-fit').addEventListener('click', fit);
    global.addEventListener('resize', () => { if (!zoomed) fit(); });

    // Opening the panel takes width from the canvas, so the map is fitted into what is left.
    const drawer = document.getElementById('drawer');
    drawer.addEventListener('toggle', () => {
      board.parentNode.classList.toggle('drawer-open', drawer.open);
      if (!zoomed) fit();
    });

    setTimeout(fit, 0);       // after the first layout, so board measures are real
  }

  // ---------- stage ----------

  // The glyphs the map is drawn from: no boxes, the device itself. Every shape is stroked and never
  // filled, so an icon takes the state colour of the node it belongs to, and all of them are laid
  // out in the same 42-by-32 space above the label (see ICON_* below).
  const NODE_ICONS = {
    host: [['rect', { x: -16, y: -30, width: 32, height: 21, rx: 2 }],
           ['path', { d: 'M-6 -9 v5 M6 -9 v5 M-13 -4 h26' }]],
    switch: [['rect', { x: -19, y: -28, width: 38, height: 20, rx: 3 }],
             ['path', { d: 'M-13 -28 v-5 M-4 -28 v-5 M5 -28 v-5 M13 -28 v-5 M-9 -18 h18 M-5 -21 l-4 3 4 3 M5 -21 l4 3 -4 3' }]],
    router: [['ellipse', { cx: 0, cy: -19, rx: 19, ry: 12 }],
             ['path', { d: 'M-9 -19 h18 M-6 -22 l-3 3 3 3 M6 -22 l3 3 -3 3 M0 -26 v14 M-3 -23 l3 -3 3 3 M-3 -12 l3 3 3 -3' }]],
    server: [['rect', { x: -13, y: -32, width: 26, height: 26, rx: 3 }],
             ['path', { d: 'M-13 -23 h26 M-13 -14 h26' }]],
    dns: [['circle', { cx: 0, cy: -19, r: 13 }],
          ['path', { d: 'M-13 -19 h26 M0 -32 a18 13 0 0 1 0 26 a18 13 0 0 1 0 -26' }]]
  };
  const ICON_MID = -19;    // the glyphs' vertical centre
  const ICON_SIDE = 21;    // half their width, where a sideways link stops
  const ICON_TOP = -34;
  const ICON_BOTTOM = -4;

  function buildTopology() {
    const sc = Engine.scenario();
    svg.innerHTML = '';
    nodeEls = {};
    linkEls = [];
    const linkLayer = svgEl('g', { class: 'links' });
    const nodeLayer = svgEl('g', { class: 'nodes' });
    svg.append(linkLayer, nodeLayer);

    const byId = {};
    for (const n of sc.nodes) byId[n.id] = n;

    for (const l of sc.links) {
      const a = byId[l.from], b = byId[l.to];
      // A link meets the glyphs, not a box: sideways along a row, straight down between rows.
      const sideways = Math.abs(a.y - b.y) < 1;
      const line = svgEl('line', {
        x1: sideways ? a.x + (a.x < b.x ? ICON_SIDE : -ICON_SIDE) : a.x,
        y1: sideways ? a.y + ICON_MID : a.y + ICON_BOTTOM,
        x2: sideways ? b.x + (b.x < a.x ? ICON_SIDE : -ICON_SIDE) : b.x,
        y2: sideways ? b.y + ICON_MID : b.y + ICON_TOP,
        class: 'link' + (l.dashed ? ' link-dashed' : '')
      });
      line.dataset.from = l.from;
      line.dataset.to = l.to;
      linkEls.push(line);
      linkLayer.appendChild(line);
    }

    for (const n of sc.nodes) {
      const g = svgEl('g', { class: 'node node-' + n.kind, transform: 'translate(' + n.x + ',' + n.y + ')' });
      g.dataset.id = n.id;
      const tip = svgEl('title', {});
      tip.textContent = n.label + ' — ' + (n.note || '');
      g.appendChild(tip);
      const icon = svgEl('g', { class: 'node-icon' });
      for (const [tag, attrs] of NODE_ICONS[n.kind] || NODE_ICONS.host) icon.appendChild(svgEl(tag, attrs));
      const label = svgEl('text', { class: 'node-label', y: 8, 'text-anchor': 'middle' });
      label.textContent = n.label;
      const sub = svgEl('text', { class: 'node-sub', y: 19, 'text-anchor': 'middle' });
      sub.textContent = n.sub;
      g.append(icon, label, sub);
      nodeEls[n.id] = g;
      nodeLayer.appendChild(g);
    }

    // Which nodes the story has introduced by each step, so the map can grow as it goes.
    const known = new Set();
    knownAt = sc.steps.map((s) => {
      known.add(s.actor);
      (s.hop || []).forEach((id) => known.add(id));
      return new Set(known);
    });
  }

  function paintTopology(step, index) {
    const onPath = new Set(step.hop || []);
    onPath.add(step.actor);
    const known = knownAt[index] || new Set();
    for (const id in nodeEls) {
      const g = nodeEls[id];
      g.classList.toggle('current', onPath.has(id));
      g.classList.toggle('known', !onPath.has(id) && known.has(id));
      g.classList.toggle('unknown', !known.has(id));
    }
    for (const line of linkEls) {
      const active = onPath.has(line.dataset.from) && onPath.has(line.dataset.to) &&
        (!step.hop || (step.hop.includes(line.dataset.from) && step.hop.includes(line.dataset.to)));
      line.classList.toggle('traversed', active);
      const used = known.has(line.dataset.from) && known.has(line.dataset.to);
      line.classList.toggle('unknown', !used);
    }
  }

  function renderRail(step) {
    railHost.innerHTML = '';
    for (const layer of NETV.LAYERS) {
      const active = layer.osi.some((n) => step.osi.includes(n));
      const row = el('div', 'layer' + (active ? ' active' : ''));
      row.title = layer.name + ': ' + layer.help;
      row.appendChild(el('span', 'layer-name', layer.name));
      railHost.appendChild(row);
    }
  }

  // ---------- the caption line on the board, and the step head inside the drawer ----------

  function renderCaption(step, index, total) {
    document.getElementById('phase').textContent = step.phase;
    document.getElementById('counter').textContent = 'Step ' + (index + 1) + ' of ' + total;
    const say = document.getElementById('say');
    say.innerHTML = '';
    say.appendChild(el('span', 'say-where', step.phase + ' · step ' + (index + 1) + ' of ' + total));
    say.appendChild(document.createTextNode(' ' + (step.say || step.title)));
    const actor = Engine.scenario().nodes.find((n) => n.id === step.actor);
    document.getElementById('subtitle').textContent =
      step.title + ' — ' + DIR_WORD[step.dir] + (actor ? ' · at the ' + actor.label : '');
  }

  // ---------- tick bar ----------

  function buildTicks() {
    tickHost.innerHTML = '';
    let phase = null;
    Engine.steps().forEach((s, i) => {
      if (s.phase !== phase) {
        phase = s.phase;
        tickHost.appendChild(el('i', 'tick-gap'));
      }
      const b = el('button', 'tick');
      b.type = 'button';
      b.dataset.phase = s.phase;
      b.title = (i + 1) + '. ' + s.title;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => { Engine.pause(); Engine.go(i); });
      tickHost.appendChild(b);
    });
  }

  function paintTicks(index) {
    const ticks = tickHost.querySelectorAll('.tick');
    ticks.forEach((t, i) => {
      t.classList.toggle('current', i === index);
      t.classList.toggle('done', i < index);
    });
  }

  // ---------- disclosure ----------

  function renderDetail(step, prev, index) {
    const host = document.getElementById('detail');
    host.innerHTML = '';

    // On the first step, say what the whole walkthrough is about before any of it starts.
    const preamble = index === 0 && Engine.scenario().preamble;
    if (preamble) {
      const box = el('div', 'detail-block detail-preamble');
      box.appendChild(el('h3', null, 'Before we start'));
      box.appendChild(el('p', null, preamble));
      host.appendChild(box);
    }

    if (step.analogy) {
      const box = el('div', 'detail-block detail-analogy');
      box.appendChild(el('h3', null, 'In plain words'));
      box.appendChild(el('p', null, step.analogy));
      host.appendChild(box);
    }

    host.appendChild(el('p', 'detail-say', step.explain));

    if (step.changes && step.changes.length) {
      const box = el('div', 'detail-block');
      box.appendChild(el('h3', null, 'What changes here'));
      const ul = el('ul');
      for (const c of step.changes) ul.appendChild(el('li', null, c));
      box.appendChild(ul);
      host.appendChild(box);
    }

    const headers = NETV.HEADER_ORDER.filter((k) => step.fields && step.fields[k]);
    if (headers.length) {
      const box = el('div', 'detail-block');
      box.appendChild(el('h3', null, 'The packet, field by field'));

      // The walk the animation takes. Leaving, the innermost header is added first and the
      // outermost last; arriving, the outermost header is stripped first. The delivery mode is
      // derived from the addresses the step declares, so the drawer and the packet agree.
      const walk = step.dir === 'in' ? headers : headers.slice().reverse();
      const mode = NETV.delivery(step);
      const note = el('p', 'walk-note');
      note.appendChild(el('span', 'packet-mode packet-mode-' + mode, NETV.DELIVERY[mode].word));
      note.appendChild(el('span', null, NETV.DELIVERY[mode].note +
        (headers.length > 1
          ? ' · walked ' + (step.dir === 'in' ? 'from the outermost header inward' : 'from the innermost header outward')
          : '')));
      box.appendChild(note);

      const wrap = el('div', 'packets');
      walk.forEach((key, i) => {
        if (i) wrap.appendChild(el('span', 'walk-arrow', '→'));
        const cell = el('div', 'packet-cell packet-cell-' + key);
        cell.style.setProperty('--d', (i * 90) + 'ms');
        const head = el('div', 'packet-head');
        head.appendChild(el('span', null, NETV.HEADER_LABELS[key]));
        head.appendChild(el('span', 'packet-osi', NETV.HEADER_ROW[key]));
        cell.appendChild(head);
        const table = el('table', 'fields');
        const values = step.fields[key];
        for (const name in values) {
          const changed = prev && prev.fields && prev.fields[key] &&
            prev.fields[key][name] !== undefined && String(prev.fields[key][name]) !== String(values[name]);
          const tr = el('tr', changed ? 'changed' : null);
          const th = el('th', null, null);
          th.appendChild(el('span', 'fields-name', name));
          const help = (NETV.FIELD_HELP[key] || {})[name];
          if (help) th.appendChild(el('span', 'fields-help', help));
          tr.appendChild(th);
          const td = el('td', null, String(values[name]));
          if (changed) td.title = 'was ' + prev.fields[key][name] + ' in the previous step';
          tr.appendChild(td);
          table.appendChild(tr);
        }
        cell.appendChild(table);
        wrap.appendChild(cell);
      });
      box.appendChild(wrap);
      host.appendChild(box);
    }

    if (step.note) {
      const box = el('div', 'detail-block detail-note');
      box.appendChild(el('h3', null, 'Worth knowing'));
      box.appendChild(el('p', null, step.note));
      host.appendChild(box);
    }

    const cites = el('div', 'detail-block');
    cites.appendChild(el('h3', null, 'Where this is defined'));
    const ul = el('ul', 'cites');
    for (const c of step.cite) {
      const li = el('li');
      const a = el('a', null, 'RFC ' + c.rfc + ' §' + c.sec + ' — ' + c.title);
      a.href = NETV.citationUrl(c);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      ul.appendChild(li);
    }
    cites.appendChild(ul);
    host.appendChild(cites);

    // The map's own vocabulary, for a reader who does not yet know what a resolver or a backbone is.
    const who = el('details', 'legend');
    who.appendChild(el('summary', null, 'Who is who on the map'));
    const list = el('ul', 'legend-list');
    for (const n of Engine.scenario().nodes) {
      const li = el('li');
      li.appendChild(el('span', 'legend-name', n.label));
      li.appendChild(document.createTextNode(' — ' + (n.note || n.sub)));
      list.appendChild(li);
    }
    who.appendChild(list);
    host.appendChild(who);
  }

  // ---------- playback ----------

  function clearAdvance() {
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
  }

  function advance() {
    if (!Engine.isPlaying()) return;
    if (Engine.atEnd()) {
      Anim.settle(Engine.current());
      Engine.pause();
      return;
    }
    Engine.next();
  }

  function onEmit(step, index, total) {
    const playing = Engine.isPlaying();
    clearAdvance();

    paintTopology(step, index);
    renderRail(step);
    renderCaption(step, index, total);
    paintTicks(index);

    const stepChanged = step !== lastStep;
    const speedChanged = Engine.speed !== lastSpeed;
    const startedPlaying = playing && !wasPlaying;

    if (stepChanged) renderDetail(step, Engine.previous(), index);

    if (stepChanged || speedChanged || startedPlaying) {
      lastStep = step;
      lastSpeed = Engine.speed;
      const total_ms = Anim.play(step, { speed: Engine.speed });
      if (playing) advanceTimer = setTimeout(advance, total_ms);
    } else if (!playing) {
      Anim.settle(step);   // pausing settles the current step so it can be inspected
    }

    wasPlaying = playing;

    document.getElementById('btn-prev').disabled = Engine.atStart();
    document.getElementById('btn-next').disabled = Engine.atEnd();
    const play = document.getElementById('btn-play');
    play.textContent = playing ? '❙❙ Pause' : '▶ Play';
    play.disabled = Engine.atEnd() && !playing;
    document.getElementById('btn-speed').textContent = Engine.speed + '×';
    document.querySelectorAll('.pip').forEach((p, i) => {
      p.classList.toggle('active', Engine.phases()[i] === step.phase);
    });
  }

  function buildPips() {
    const host = document.getElementById('phases');
    host.innerHTML = '';
    const steps = Engine.steps();
    Engine.phases().forEach((phase) => {
      const first = steps.findIndex((s) => s.phase === phase);
      const last = steps.length - 1 - steps.slice().reverse().findIndex((s) => s.phase === phase);
      const b = el('button', 'pip');
      b.type = 'button';
      b.textContent = phase;
      b.title = phase + ' · steps ' + (first + 1) + ' to ' + (last + 1);
      b.addEventListener('click', () => {
        Engine.pause();
        if (first >= 0) Engine.go(first);
      });
      host.appendChild(b);
    });
  }

  function boot(scenarioId) {
    const sc = NETV.scenario(scenarioId || 'http');
    document.getElementById('tagline').textContent = sc.subtitle;
    svg = document.getElementById('topology');
    railHost = document.getElementById('rail');
    tickHost = document.getElementById('ticks');
    for (const id of ['btn-prev', 'btn-next', 'btn-play', 'btn-speed']) {
      document.getElementById(id).addEventListener('click', () => {
        if (id === 'btn-prev') { Engine.pause(); Engine.prev(); }
        else if (id === 'btn-next') { Engine.pause(); Engine.next(); }
        else if (id === 'btn-play') Engine.toggle();
        else { clearAdvance(); Anim.stop(); lastSpeed = null; Engine.cycleSpeed(); }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { Engine.pause(); Engine.next(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { Engine.pause(); Engine.prev(); e.preventDefault(); }
      else if (e.key === ' ') { Engine.toggle(); e.preventDefault(); }
      else if (e.key === 'Home') { Engine.pause(); Engine.go(0); e.preventDefault(); }
      else if (e.key === 'End') { Engine.pause(); Engine.go(Engine.steps().length - 1); e.preventDefault(); }
    });

    Engine.start(scenarioId);
    buildTopology();
    wireBoard();
    Anim.attach(svg, document.getElementById('stack'));
    buildTicks();
    buildPips();
    Engine.onchange(onEmit);
    onEmit(Engine.current(), Engine.index, Engine.steps().length);

    // Let the page explain itself on arrival, unless motion is unwelcome or a step was linked to.
    if (!Anim.reduced() && Engine.atStart() && !/^#\/[^/]+\/.+/.test(location.hash)) {
      setTimeout(() => { if (Engine.atStart()) Engine.play(); }, 700);
    }
  }

  NETV.UI = { boot: boot };
})(globalThis);
