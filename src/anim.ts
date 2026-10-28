// The animation layer: one timeline per step. Every visual is derived from the step data.
import {
  DELIVERY,
  HEADER_CHIP,
  HEADER_ORDER,
  delivery as deriveDelivery
} from './scenarios';
import type { Board, HeaderKey, Step } from './types';

const SVGNS = 'http://www.w3.org/2000/svg';

const RAIL_STEP = 5;
const PACKET_W = 100;
const PACKET_H = 46;
const PACKET_DY = 58;
const EDGE_MS = 430;
const RAIL_MS = 300;
const DWELL_MS = 1500;

let layer: SVGGElement | null = null;
let packet: SVGGElement | null = null;
const rails: Partial<Record<HeaderKey, SVGRectElement>> = {};
const rows: Partial<Record<HeaderKey, HTMLElement>> = {};
let stackHost: HTMLElement | null = null;
let links: Element[] = [];
let chipText: SVGTextElement | null = null;
let chipLine: SVGTextElement | null = null;
let chipMode: SVGTSpanElement | null = null;
let chipSep: SVGTSpanElement | null = null;
let ttlText: SVGTSpanElement | null = null;
let nodeXY: Record<string, { x: number; y: number }> = {};
let nodeKind: Record<string, string> = {};
let timers: number[] = [];
let seq = 0;
let moveMs = EDGE_MS;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const key in attrs) node.setAttribute(key, String(attrs[key]));
  return node;
}

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function attach(
  svg: SVGSVGElement,
  layerHost: SVGGElement,
  nextStackHost: HTMLElement,
  board: Board
) {
  stop();
  stackHost = nextStackHost;
  links = Array.from(svg.querySelectorAll('.link'));
  nodeXY = {};
  nodeKind = {};
  for (const node of board.nodes) {
    nodeXY[node.id] = { x: node.x, y: node.y };
    nodeKind[node.id] = node.kind;
  }

  layer = layerHost;
  layer.replaceChildren();
  packet = svgEl('g', { class: 'packet hidden' });
  for (const key of HEADER_ORDER) {
    const rail = svgEl('rect', {
      class: 'wire-rail wire-rail-' + key,
      x: -PACKET_W / 2,
      y: -PACKET_H / 2,
      width: PACKET_W,
      height: PACKET_H,
      rx: 8
    });
    rails[key] = rail;
    packet.appendChild(rail);
  }
  chipText = svgEl('text', { class: 'chip-text', 'text-anchor': 'middle', y: 4 });
  chipLine = svgEl('text', { class: 'chip-line', 'text-anchor': 'middle', y: PACKET_H / 2 + 14 });
  chipMode = svgEl('tspan', { class: 'chip-mode' });
  chipSep = svgEl('tspan', { class: 'chip-sep' });
  chipSep.textContent = ' · ';
  ttlText = svgEl('tspan', { class: 'chip-ttl' });
  chipLine.append(chipMode, chipSep, ttlText);
  packet.append(chipText, chipLine);
  layer.appendChild(packet);
}

function stop() {
  seq++;
  for (const timer of timers) window.clearTimeout(timer);
  timers = [];
  if (layer) layer.querySelectorAll('.transient').forEach((node) => node.remove());
  for (const link of links) link.classList.remove('flow');
}

function later(fn: () => void, ms: number) {
  const mine = seq;
  timers.push(
    window.setTimeout(() => {
      if (mine === seq) fn();
    }, Math.max(0, ms))
  );
}

function place(nodeId: string, animate: boolean) {
  if (!packet) return;
  const point = nodeXY[nodeId];
  if (!point) return;
  if (animate && !reduced()) {
    packet.style.transition = 'transform ' + moveMs + 'ms ease-in-out';
  } else {
    packet.style.transition = 'none';
  }
  packet.setAttribute('transform', `translate(${point.x},${point.y + PACKET_DY})`);
  if (!animate || reduced()) {
    void packet.getBoundingClientRect();
    packet.style.transition = '';
  }
}

function routed(step: Step) {
  if (!step.hop || step.hop.length < 2 || deriveDelivery(step) === 'broadcast') return false;
  return step.hop.some((id) => nodeKind[id] === 'router');
}

function forwarders(step: Step) {
  if (!step.hop || step.hop.length < 3 || deriveDelivery(step) === 'broadcast') return [];
  return step.hop.slice(1, -1).filter((id) => nodeKind[id] === 'router');
}

function buildRails(step: Step) {
  const headers = HEADER_ORDER.filter((key) => step.fields?.[key]);
  const innermost = headers[headers.length - 1];
  for (const key of HEADER_ORDER) rails[key]?.classList.add('off');
  headers.forEach((key, index) => {
    const inset = index * RAIL_STEP;
    const rail = rails[key];
    if (!rail) return;
    rail.removeAttribute('width');
    rail.setAttribute('x', String(-PACKET_W / 2 + inset));
    rail.setAttribute('y', String(-PACKET_H / 2 + inset));
    rail.setAttribute('width', String(PACKET_W - inset * 2));
    rail.setAttribute('height', String(PACKET_H - inset * 2));
    rail.setAttribute('rx', String(Math.max(3, 8 - inset)));
  });
  buildStack(step, headers);
  if (chipText) chipText.textContent = innermost ? HEADER_CHIP[innermost] : '';
  packet?.classList.remove('hidden');
  return headers;
}

function buildStack(step: Step, headers: HeaderKey[]) {
  for (const key of HEADER_ORDER) delete rows[key];
  if (!stackHost) return;
  stackHost.replaceChildren();
  for (const key of headers) {
    const fields = step.fields?.[key];
    if (!fields) continue;
    const row = document.createElement('div');
    row.className = 'stack-row stack-row-' + key + ' off';
    row.dataset.header = key;
    const chip = document.createElement('span');
    chip.className = 'stack-chip';
    chip.textContent = HEADER_CHIP[key];
    const names = document.createElement('span');
    names.className = 'stack-fields';
    names.textContent = Object.keys(fields).join(' · ');
    row.append(chip, names);
    stackHost.appendChild(row);
    rows[key] = row;
  }
}

function reveal(key: HeaderKey, on: boolean) {
  rails[key]?.classList.toggle('off', !on);
  rows[key]?.classList.toggle('off', !on);
}

function setDelivery(mode: keyof typeof DELIVERY) {
  if (!chipMode) return;
  chipMode.textContent = DELIVERY[mode].word;
  chipMode.setAttribute('class', 'chip-mode chip-mode-' + mode);
}

function setTtl(text: string | null) {
  if (!ttlText || !chipSep) return;
  const on = text !== null;
  ttlText.textContent = on ? text : '';
  ttlText.classList.toggle('hidden', !on);
  chipSep.classList.toggle('hidden', !on);
}

function flow(from: string, to: string, mode: keyof typeof DELIVERY, life: number) {
  if (mode === 'unicast') {
    const line = links.find((candidate) => {
      const element = candidate as SVGLineElement;
      return (
        (element.dataset.from === from && element.dataset.to === to) ||
        (element.dataset.from === to && element.dataset.to === from)
      );
    });
    if (!line) return;
    line.classList.add('flow');
    later(() => line.classList.remove('flow'), life);
    return;
  }
  wave(to, mode, life);
}

function wave(nodeId: string, mode: keyof typeof DELIVERY, life: number) {
  const point = nodeXY[nodeId];
  if (!point || !layer) return;
  const group = svgEl('g', {
    class: 'transient',
    transform: `translate(${point.x},${point.y})`
  });
  group.appendChild(svgEl('circle', { class: 'wave wave-' + mode, r: 34 }));
  layer.appendChild(group);
  later(() => group.remove(), life);
}

function failBadge(nodeId: string, text: string) {
  const point = nodeXY[nodeId];
  if (!point || !layer) return;
  const group = svgEl('g', {
    class: 'transient',
    transform: `translate(${point.x},${point.y + PACKET_DY})`
  });
  const inner = svgEl('g', { class: 'badge' });
  const width = 15 + text.length * 6;
  inner.appendChild(
    svgEl('rect', { x: -width / 2, y: -12, width, height: 20, rx: 10 })
  );
  const label = svgEl('text', { 'text-anchor': 'middle', y: 2 });
  label.textContent = text;
  inner.appendChild(label);
  group.appendChild(inner);
  layer.appendChild(group);
  later(() => group.remove(), 1100);
}

function play(step: Step, opts?: { speed?: number }) {
  stop();
  const speed = opts?.speed || 1;
  const ms = (value: number) => Math.round(value / speed);
  const still = reduced();
  moveMs = ms(EDGE_MS);
  const headers = buildRails(step);

  if (headers.length === 0) {
    packet?.classList.add('hidden');
    return ms(DWELL_MS + 900);
  }

  const traveling = !!step.hop && step.hop.length > 1;
  const arriving = step.dir === 'in';
  const forwarderSet = new Set(forwarders(step));
  const showsTtl = routed(step);
  const mode = deriveDelivery(step);
  setDelivery(mode);
  let time = 0;

  if (still) {
    headers.forEach((key) => reveal(key, true));
    if (traveling && step.hop) place(step.hop[step.hop.length - 1], false);
    else place(step.actor, false);
    const ip = step.fields?.ip;
    const ttl = ip && typeof ip.ttl === 'number' ? ip.ttl : null;
    const crossed = forwarders(step).length;
    if (ttl !== null && showsTtl) setTtl('TTL ' + Math.max(0, ttl - crossed));
    else setTtl(null);
    return ms(DWELL_MS + 900);
  }

  place(traveling && step.hop ? step.hop[0] : step.actor, false);

  if (arriving && headers.length > 1) {
    headers.forEach((key) => reveal(key, true));
  } else if (headers.length > 1) {
    for (let index = headers.length - 1; index >= 0; index--) {
      const key = headers[index];
      later(() => reveal(key, true), time);
      time += ms(RAIL_MS);
    }
  } else {
    headers.forEach((key) => reveal(key, true));
  }

  const ip = step.fields?.ip;
  let ttl = ip && typeof ip.ttl === 'number' ? ip.ttl : null;
  if (ttl !== null && showsTtl && traveling) setTtl('TTL ' + ttl);
  else setTtl(null);

  if (traveling && step.hop) {
    const life = ms(1000);
    for (let index = 1; index < step.hop.length; index++) {
      const from = step.hop[index - 1];
      const node = step.hop[index];
      later(() => {
        place(node, true);
        flow(from, node, mode, life);
        if (forwarderSet.has(node) && ttl !== null) {
          ttl -= 1;
          setTtl('TTL ' + ttl);
          failBadge(node, '−1');
        }
      }, time);
      time += ms(EDGE_MS);
    }
  }

  if (arriving && headers.length > 1) {
    headers.forEach((key, index) => {
      if (index < headers.length - 1) later(() => reveal(key, false), time + index * ms(RAIL_MS));
    });
    time += ms(RAIL_MS * headers.length);
  }

  time += ms(DWELL_MS + (step.say ? step.say.length * 22 : 0));
  return time;
}

function settle(step: Step) {
  stop();
  const headers = buildRails(step);
  setDelivery(deriveDelivery(step));
  headers.forEach((key) => reveal(key, true));
  if (chipText) chipText.textContent = headers.length ? HEADER_CHIP[headers[headers.length - 1]] : '';
  const ip = step.fields?.ip;
  const ttl = ip && typeof ip.ttl === 'number' ? ip.ttl : null;
  const crossed = forwarders(step).length;
  if (ttl !== null && routed(step)) setTtl('TTL ' + Math.max(0, ttl - crossed));
  else setTtl(null);
  if (!step.hop?.length) packet?.classList.add('hidden');
  else place(step.hop[step.hop.length - 1], false);
}

export const Anim = { attach, play, settle, stop, reduced };
