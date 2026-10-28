import { createElement, useMemo, type RefObject } from 'react';
import type { Board, Link, Node, Scenario, Step } from '../types';

const ICON_MID = -19;
const ICON_SIDE = 21;
const ICON_TOP = -34;
const ICON_BOTTOM = -4;
const REGION_PAD_X = 52;
const REGION_PAD_TOP = 66;
const REGION_PAD_BOTTOM = 40;

type IconPart = [keyof SVGElementTagNameMap, Record<string, string | number>];

const NODE_ICONS: Record<Node['kind'], IconPart[]> = {
  host: [
    ['rect', { x: -16, y: -30, width: 32, height: 21, rx: 2 }],
    ['path', { d: 'M-6 -9 v5 M6 -9 v5 M-13 -4 h26' }]
  ],
  switch: [
    ['rect', { x: -19, y: -28, width: 38, height: 20, rx: 3 }],
    [
      'path',
      {
        d: 'M-13 -28 v-5 M-4 -28 v-5 M5 -28 v-5 M13 -28 v-5 M-9 -18 h18 M-5 -21 l-4 3 4 3 M5 -21 l4 3 -4 3'
      }
    ]
  ],
  router: [
    ['ellipse', { cx: 0, cy: -19, rx: 19, ry: 12 }],
    [
      'path',
      {
        d: 'M-9 -19 h18 M-6 -22 l-3 3 3 3 M6 -22 l3 3 -3 3 M0 -26 v14 M-3 -23 l3 -3 3 3 M-3 -12 l3 3 3 -3'
      }
    ]
  ],
  server: [
    ['rect', { x: -13, y: -32, width: 26, height: 26, rx: 3 }],
    ['path', { d: 'M-13 -23 h26 M-13 -14 h26' }]
  ],
  dns: [
    ['circle', { cx: 0, cy: -19, r: 13 }],
    ['path', { d: 'M-13 -19 h26 M0 -32 a18 13 0 0 1 0 26 a18 13 0 0 1 0 -26' }]
  ]
};

function linkGeometry(link: Link, byId: Record<string, Node>) {
  const from = byId[link.from];
  const to = byId[link.to];
  if (!from || !to) return null;
  const sideways = Math.abs(from.y - to.y) < 1;
  const start = {
    x: sideways ? from.x + (from.x < to.x ? ICON_SIDE : -ICON_SIDE) : from.x,
    y: sideways ? from.y + ICON_MID : from.y + ICON_BOTTOM
  };
  const end = {
    x: sideways ? to.x + (to.x < from.x ? ICON_SIDE : -ICON_SIDE) : to.x,
    y: sideways ? to.y + ICON_MID : to.y + ICON_TOP
  };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    start,
    end,
    cost: {
      x: (start.x + end.x) / 2 + (dy / length) * 7,
      y: (start.y + end.y) / 2 - (dx / length) * 7
    }
  };
}

function knownNodes(scenario: Scenario, index: number, showAll: boolean, nodes: Node[]) {
  if (showAll) return new Set(nodes.map((node) => node.id));
  const known = new Set<string>();
  const at = Math.max(0, Math.min(index, scenario.steps.length - 1));
  for (let cursor = 0; cursor <= at; cursor++) {
    const step: Step = scenario.steps[cursor];
    known.add(step.actor);
    step.hop?.forEach((id) => known.add(id));
  }
  return known;
}

interface TopologyProps {
  board: Board;
  scenario: Scenario;
  index: number;
  showAll: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  packetHostRef: RefObject<SVGGElement | null>;
}

export function Topology({ board, scenario, index, showAll, svgRef, packetHostRef }: TopologyProps) {
  const step = scenario.steps[index];
  const byId = useMemo(() => {
    const nodes: Record<string, Node> = {};
    for (const node of board.nodes) nodes[node.id] = node;
    return nodes;
  }, [board.nodes]);

  const known = useMemo(
    () => knownNodes(scenario, index, showAll, board.nodes),
    [scenario, index, showAll, board.nodes]
  );
  const onPath = new Set<string>(step.hop ?? []);
  onPath.add(step.actor);

  return (
    <svg
      ref={svgRef}
      id="topology"
      viewBox="0 0 860 320"
      role="img"
      aria-label={board.aria || scenario.subtitle}
    >
      <g className="regions">
        {(board.regions ?? []).map((region) => {
          const members = region.nodes.map((id) => byId[id]).filter(Boolean);
          if (!members.length) return null;
          const xs = members.map((node) => node.x);
          const ys = members.map((node) => node.y);
          const left = Math.min(...xs) - REGION_PAD_X;
          const top = Math.min(...ys) - REGION_PAD_TOP;
          return (
            <g key={region.as}>
              <rect
                className="region"
                x={left}
                y={top}
                width={Math.max(...xs) - Math.min(...xs) + 2 * REGION_PAD_X}
                height={Math.max(...ys) - Math.min(...ys) + REGION_PAD_TOP + REGION_PAD_BOTTOM}
                rx={14}
              />
              <text className="region-label" x={left + 14} y={top + 25}>
                AS {region.as}
              </text>
            </g>
          );
        })}
      </g>
      <g className="links">
        {board.links.map((link) => {
          const geometry = linkGeometry(link, byId);
          if (!geometry) return null;
          const active =
            onPath.has(link.from) &&
            onPath.has(link.to) &&
            (!step.hop || (step.hop.includes(link.from) && step.hop.includes(link.to)));
          const used = known.has(link.from) && known.has(link.to);
          return (
            <g key={`${link.from}-${link.to}`}>
              <line
                className={
                  'link' + (link.dashed ? ' link-dashed' : '') + (active ? ' traversed' : '') + (used ? '' : ' unknown')
                }
                x1={geometry.start.x}
                y1={geometry.start.y}
                x2={geometry.end.x}
                y2={geometry.end.y}
                data-from={link.from}
                data-to={link.to}
              />
              {link.cost !== undefined ? (
                <text
                  className={
                    'link-cost' +
                    (used ? '' : ' unknown') +
                    (active ? ' traversed' : '')
                  }
                  x={geometry.cost.x.toFixed(1)}
                  y={geometry.cost.y.toFixed(1)}
                  dy="0.35em"
                  textAnchor="middle"
                >
                  {link.cost}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
      <g className="nodes">
        {board.nodes.map((node) => {
          const current = onPath.has(node.id);
          const isKnown = known.has(node.id);
          const at = node.subFrom
            ? scenario.steps.findIndex((candidate) => candidate.id === node.subFrom)
            : -1;
          const sub = at >= 0 && index < at ? node.subBefore ?? '' : node.sub;
          return (
            <g
              key={node.id}
              className={
                'node node-' +
                node.kind +
                (current ? ' current' : isKnown ? ' known' : ' unknown')
              }
              transform={`translate(${node.x},${node.y})`}
              data-id={node.id}
            >
              <title>{`${node.label} — ${node.note ?? ''}`}</title>
              <g className="node-icon">
                {(NODE_ICONS[node.kind] ?? NODE_ICONS.host).map(([tag, attrs], part) =>
                  createElement(tag, { ...attrs, key: part })
                )}
              </g>
              <text className="node-label" y={8} textAnchor="middle">
                {node.label}
              </text>
              <text className="node-sub" y={19} textAnchor="middle">
                {sub}
              </text>
            </g>
          );
        })}
      </g>
      <g ref={packetHostRef} className="packet-layer" />
    </svg>
  );
}
