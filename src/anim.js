// The animation layer: one timeline per step, no framework.
// Everything here is derived from the step data (ADR 0006) - no step file describes motion, and
// the same derivation feeds the field-by-field stack and the delivery mode.
(function (global) {
  const NETV = global.NETV;
  const SVGNS = 'http://www.w3.org/2000/svg';

  // Geometry of the moving packet, in viewBox units (the topology is 860x320).
  const RAIL_STEP = 5;      // how far each header outline sits inside the previous one
  const PACKET_W = 100;
  const PACKET_H = 46;
  const PACKET_DY = 58;     // drawn below its node so it never covers the boxes
  const EDGE_MS = 430;      // glide time between two nodes
  const RAIL_MS = 300;      // one header wrapping itself around the payload
  const DWELL_MS = 1500;    // reading time on top of the animation

  let layer = null;         // <g> holding the packet
  let packet = null;        // <g> the packet itself
  let rails = {};           // header key -> <rect>
  let rows = {};            // header key -> the stack row listing that header's fields
  let stackHost = null;     // HTML element under the topology that holds the rows
  let links = [];           // <line> per link, for the unicast flow trace
  let chipText = null;
  let chipLine = null;
  let chipMode = null;
  let chipSep = null;
  let ttlText = null;
  let nodeXY = {};
  let nodeKind = {};
  let timers = [];
  let seq = 0;              // guards against a stale timeline mutating the DOM

  function el(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function reduced() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function attach(svg, stack) {
    stackHost = stack;
    links = svg.querySelectorAll('.link');
    nodeXY = {};
    nodeKind = {};
    // The map of the chapter currently on screen: a scenario may draw a different canvas per phase.
    const board = NETV.boardOf(NETV.Engine.scenario(), NETV.Engine.current().phase);
    for (const n of board.nodes) {
      nodeXY[n.id] = { x: n.x, y: n.y };
      nodeKind[n.id] = n.kind;
    }
    layer = el('g', { class: 'packet-layer' });
    packet = el('g', { class: 'packet hidden' });
    for (const key of NETV.HEADER_ORDER) {
      const r = el('rect', {
        class: 'wire-rail wire-rail-' + key, x: -PACKET_W / 2, y: -PACKET_H / 2,
        width: PACKET_W, height: PACKET_H, rx: 8
      });
      rails[key] = r;
      packet.appendChild(r);
    }
    chipText = el('text', { class: 'chip-text', 'text-anchor': 'middle', y: 4 });
    // One line under the packet carries how it travels and, when it is routed, its remaining TTL.
    chipLine = el('text', { class: 'chip-line', 'text-anchor': 'middle', y: PACKET_H / 2 + 14 });
    chipMode = el('tspan', { class: 'chip-mode' });
    chipSep = el('tspan', { class: 'chip-sep' });
    chipSep.textContent = ' · ';
    ttlText = el('tspan', { class: 'chip-ttl' });
    chipLine.append(chipMode, chipSep, ttlText);
    packet.append(chipText, chipLine);
    layer.appendChild(packet);
    svg.appendChild(layer);
  }

  function stop() {
    seq++;
    for (const t of timers) clearTimeout(t);
    timers = [];
    // The timeline owns these marks, so a step change or a seek has to take them with it -
    // otherwise a ring or a marching link outlives the step that drew it.
    if (layer) for (const g of layer.querySelectorAll('.transient')) g.remove();
    for (const l of links) l.classList.remove('flow');
  }

  function later(fn, ms) {
    const mine = seq;
    timers.push(setTimeout(() => { if (mine === seq) fn(); }, Math.max(0, ms)));
  }

  let moveMs = EDGE_MS;     // set per playback speed so the glide lasts one beat

  function place(nodeId, animate) {
    const p = nodeXY[nodeId];
    if (!p) return;
    if (animate && !reduced()) {
      packet.style.transition = 'transform ' + moveMs + 'ms ease-in-out';
      packet.setAttribute('transform', 'translate(' + p.x + ',' + (p.y + PACKET_DY) + ')');
    } else {
      packet.style.transition = 'none';
      packet.setAttribute('transform', 'translate(' + p.x + ',' + (p.y + PACKET_DY) + ')');
      void packet.getBoundingClientRect();   // flush, so the next move still animates
      packet.style.transition = '';
    }
  }

  // Which header is on the outside, and which key is the payload's own label.
  function headersOf(step) {
    return NETV.HEADER_ORDER.filter((k) => step.fields && step.fields[k]);
  }

  /**
   * Whether this hop shows a remaining TTL at all: something on the hop is a router, so the packet
   * is travelling between networks. A broadcast never leaves its link, so it never shows one.
   */
  function routed(step) {
    if (!step.hop || step.hop.length < 2 || NETV.delivery(step) === 'broadcast') return false;
    return step.hop.some((id) => nodeKind[id] === 'router');
  }

  /**
   * The routers on this hop whose work costs the packet a TTL: the ones strictly between the ends.
   * The node it comes from has not forwarded it yet, and the node it arrives at is receiving it,
   * not passing it on - so an OSPF hello read by its neighbour keeps the TTL it was sent with.
   * Derived from the data: no step declares this.
   */
  function forwarders(step) {
    if (!step.hop || step.hop.length < 3 || NETV.delivery(step) === 'broadcast') return [];
    return step.hop.slice(1, -1).filter((id) => nodeKind[id] === 'router');
  }

  // Build the nested outlines for this step: outermost header first. Each header also gets a row
  // in the stack below the map, listing the fields it carries - the packet, field by field.
  function buildRails(step) {
    const headers = headersOf(step);
    const innermost = headers[headers.length - 1];
    for (const key of NETV.HEADER_ORDER) rails[key].classList.add('off');
    headers.forEach((key, i) => {
      const inset = i * RAIL_STEP;
      const r = rails[key];
      r.removeAttribute('width');
      r.setAttribute('x', -PACKET_W / 2 + inset);
      r.setAttribute('y', -PACKET_H / 2 + inset);
      r.setAttribute('width', PACKET_W - inset * 2);
      r.setAttribute('height', PACKET_H - inset * 2);
      r.setAttribute('rx', Math.max(3, 8 - inset));
    });
    buildStack(step, headers);
    chipText.textContent = innermost ? NETV.HEADER_CHIP[innermost] : '';
    packet.classList.remove('hidden');
    return headers;
  }

  // Rows stay in catalogue order, outermost first, so a wrapper added further out appears above
  // the ones already listed and the stack visibly grows around the payload.
  function buildStack(step, headers) {
    rows = {};
    if (!stackHost) return;
    stackHost.innerHTML = '';
    for (const key of headers) {
      const row = document.createElement('div');
      row.className = 'stack-row stack-row-' + key + ' off';
      row.dataset.header = key;
      const chip = document.createElement('span');
      chip.className = 'stack-chip';
      chip.textContent = NETV.HEADER_LABELS[key];
      const fields = document.createElement('span');
      fields.className = 'stack-fields';
      fields.textContent = Object.keys(step.fields[key]).join(' · ');
      row.append(chip, fields);
      stackHost.appendChild(row);
      rows[key] = row;
    }
  }

  function reveal(key, on) {
    rails[key].classList.toggle('off', !on);
    if (rows[key]) rows[key].classList.toggle('off', !on);
  }

  // The chip on the packet names how these bytes travel, from the derivation in schema.js.
  function delivery(mode) {
    chipMode.textContent = NETV.DELIVERY[mode].word;
    chipMode.setAttribute('class', 'chip-mode chip-mode-' + mode);
  }

  // null hides the TTL and the separator that would otherwise trail the delivery word.
  function setTtl(text) {
    const on = text !== null;
    ttlText.textContent = on ? text : '';
    ttlText.classList.toggle('hidden', !on);
    chipSep.classList.toggle('hidden', !on);
  }

  // A unicast frame is read by one station, so it traces the single link it crosses; a broadcast
  // or multicast frame is read by more than the next station, so it leaves a ring at each one.
  function flow(from, to, mode, life) {
    if (mode === 'unicast') {
      const line = Array.prototype.find.call(links, (l) =>
        (l.dataset.from === from && l.dataset.to === to) ||
        (l.dataset.from === to && l.dataset.to === from));
      if (!line) return;
      line.classList.add('flow');
      later(() => line.classList.remove('flow'), life);
      return;
    }
    wave(to, mode, life);
  }

  function wave(nodeId, mode, life) {
    const p = nodeXY[nodeId];
    if (!p) return;
    const g = el('g', { class: 'transient', transform: 'translate(' + p.x + ',' + p.y + ')' });
    g.appendChild(el('circle', { class: 'wave wave-' + mode, r: 34 }));
    layer.appendChild(g);
    later(() => g.remove(), life);
  }

  function failBadge(nodeId, text) {
    const p = nodeXY[nodeId];
    // Two groups: the outer one positions and is what `stop` sweeps up, the inner one is what CSS animates.
    const g = el('g', { class: 'transient', transform: 'translate(' + p.x + ',' + (p.y + PACKET_DY) + ')' });
    const inner = el('g', { class: 'badge' });
    const w = 15 + text.length * 6;
    inner.appendChild(el('rect', { x: -w / 2, y: -12, width: w, height: 20, rx: 10 }));
    const t = el('text', { 'text-anchor': 'middle', y: 2 });
    t.textContent = text;
    inner.appendChild(t);
    g.appendChild(inner);
    layer.appendChild(g);
    later(() => g.remove(), 1100);
  }

  /**
   * Play one step. Returns the total duration in milliseconds so the caller can schedule the
   * next step and keep playback and animation in step with each other.
   */
  function play(step, opts) {
    stop();
    const speed = (opts && opts.speed) || 1;
    const ms = (v) => Math.round(v / speed);
    const still = reduced();
    moveMs = ms(EDGE_MS);
    const headers = buildRails(step);

    if (headers.length === 0) {           // nothing on the wire: local work only
      packet.classList.add('hidden');
      return ms(DWELL_MS + 900);
    }

    const traveling = !!(step.hop && step.hop.length > 1);
    const arriving = step.dir === 'in';
    const fwd = new Set(forwarders(step));
    const showsTtl = routed(step);
    const mode = NETV.delivery(step);
    delivery(mode);
    let t = 0;

    if (still) {                          // no motion: show the finished packet and move on
      headers.forEach((k) => reveal(k, true));
      if (traveling) place(step.hop[step.hop.length - 1], false);
      else place(step.actor, false);
      return ms(DWELL_MS + 900);
    }

    place(traveling ? step.hop[0] : step.actor, false);

    // 1. wrap, inside out
    if (arriving && headers.length > 1) {
      headers.forEach((k) => reveal(k, true));       // arrive fully wrapped, then unwrap later
    } else if (headers.length > 1) {
      for (let i = headers.length - 1; i >= 0; i--) {
        const key = headers[i];
        later(() => reveal(key, true), t);
        t += ms(RAIL_MS);
      }
    } else {
      headers.forEach((k) => reveal(k, true));
    }

    // 2. travel, one hop at a time, dropping the TTL at every router that forwards it
    let ttl = step.fields.ip && typeof step.fields.ip.ttl === 'number' ? step.fields.ip.ttl : null;
    if (ttl !== null && showsTtl && traveling) setTtl('TTL ' + ttl);
    else setTtl(null);

    if (traveling) {
      const life = ms(1000);
      for (let i = 1; i < step.hop.length; i++) {
        const from = step.hop[i - 1];
        const node = step.hop[i];
        later(() => {
          place(node, true);
          flow(from, node, mode, life);
          if (fwd.has(node) && ttl !== null) {
            ttl--;
            setTtl('TTL ' + ttl);
            failBadge(node, '−1');
          }
        }, t);
        t += ms(EDGE_MS);
      }
    }

    // 3. unwrap, outside in, one layer at a time
    if (arriving && headers.length > 1) {
      headers.forEach((k, i) => {
        if (i < headers.length - 1) later(() => reveal(k, false), t + i * ms(RAIL_MS));
      });
      t += ms(RAIL_MS * headers.length);
    }

    t += ms(DWELL_MS + (step.say ? step.say.length * 22 : 0));
    return t;
  }

  /** Jump straight to the end state of a step (used when pausing or seeking). */
  function settle(step) {
    stop();
    const headers = buildRails(step);
    delivery(NETV.delivery(step));
    headers.forEach((k) => reveal(k, true));
    chipText.textContent = headers.length ? NETV.HEADER_CHIP[headers[headers.length - 1]] : '';
    const ip = step.fields && step.fields.ip;
    const ttl = ip && typeof ip.ttl === 'number' ? ip.ttl : null;
    const crossed = forwarders(step).length;
    if (ttl !== null && routed(step)) setTtl('TTL ' + Math.max(0, ttl - crossed));
    else {
      setTtl(null);
    }
    if (!step.hop || !step.hop.length) packet.classList.add('hidden');
    else place(step.hop[step.hop.length - 1], false);
  }

  NETV.Anim = { attach, play, settle, stop, reduced };
})(globalThis);
