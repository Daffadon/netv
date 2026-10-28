import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@cloudflare/kumo/components/button';
import {
  CaretLeftIcon,
  CaretRightIcon,
  CornersOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PauseIcon,
  PlayIcon,
  SidebarSimpleIcon
} from '@phosphor-icons/react';
import { Anim } from '../anim';
import { LAYERS } from '../scenarios';
import type { EvidenceTable } from '../types';
import type { Journey } from '../useJourney';
import { BoardTable } from './BoardTable';
import { Topology } from './Topology';

const VIEW_ASPECT = 320 / 860;
const SLOP = 0.1;

interface TableInfo {
  at: number;
  table: EvidenceTable;
}

function tableFor(steps: Journey['steps'], index: number): TableInfo | null {
  const phase = steps[index].phase;
  for (let cursor = index; cursor >= 0 && steps[cursor].phase === phase; cursor--) {
    const table = steps[cursor].table;
    if (table) return { at: cursor, table };
  }
  return null;
}

export function Board({ journey }: { journey: Journey }) {
  const { steps, step, index, speed, playing, quiz, drawerOpen, board } = journey;
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const packetHostRef = useRef<SVGGElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const zoomedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoomLabel, setZoomLabel] = useState('100%');
  const [dragging, setDragging] = useState(false);
  const atStart = index === 0;
  const atEnd = index >= steps.length - 1;

  const tableInfo = useMemo(() => tableFor(steps, index), [steps, index]);

  const layoutCanvas = useCallback(() => {
    const scroll = scrollRef.current;
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    if (!scroll || !canvas || !svg) return;
    const width = scroll.clientWidth;
    const height = scroll.clientHeight;
    if (!width || !height) return;
    const mapWidth = zoomRef.current * width;
    const mapHeight = mapWidth * VIEW_ASPECT;
    const boxWidth = Math.max(mapWidth + 2 * width * SLOP, width * (1 + SLOP));
    const boxHeight = Math.max(mapHeight + 2 * height * SLOP, height * (1 + SLOP));
    canvas.style.width = boxWidth + 'px';
    canvas.style.height = boxHeight + 'px';
    svg.style.left = (boxWidth - mapWidth) / 2 + 'px';
    svg.style.top = (boxHeight - mapHeight) / 2 + 'px';
  }, []);

  const viewCentre = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) return { x: 0.5, y: 0.5 };
    const width = scroll.scrollWidth || 1;
    const height = scroll.scrollHeight || 1;
    return {
      x: (scroll.scrollLeft + scroll.clientWidth / 2) / width,
      y: (scroll.scrollTop + scroll.clientHeight / 2) / height
    };
  }, []);

  const scrollToCentre = useCallback((centre: { x: number; y: number }) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollLeft = centre.x * scroll.scrollWidth - scroll.clientWidth / 2;
    scroll.scrollTop = centre.y * scroll.scrollHeight - scroll.clientHeight / 2;
  }, []);

  const applyZoom = useCallback(() => {
    if (svgRef.current) svgRef.current.style.width = zoomRef.current * 100 + '%';
    layoutCanvas();
    setZoomLabel(Math.round(zoomRef.current * 100) + '%');
  }, [layoutCanvas]);

  const fit = useCallback(() => {
    const scroll = scrollRef.current;
    zoomedRef.current = false;
    zoomRef.current = scroll
      ? Math.min(1, scroll.clientHeight / (scroll.clientWidth * VIEW_ASPECT)) || 1
      : 1;
    applyZoom();
    scrollToCentre({ x: 0.5, y: 0.5 });
  }, [applyZoom, scrollToCentre]);

  const relayout = useCallback(() => {
    const centre = viewCentre();
    if (!zoomedRef.current) {
      fit();
      return;
    }
    layoutCanvas();
    scrollToCentre(centre);
  }, [fit, layoutCanvas, scrollToCentre, viewCentre]);

  const zoomBy = useCallback(
    (factor: number) => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const width = scroll.scrollWidth;
      const height = scroll.scrollHeight;
      zoomedRef.current = true;
      zoomRef.current = Math.min(3, Math.max(0.4, zoomRef.current * factor));
      if (!width || !height) {
        applyZoom();
        return;
      }
      const centre = {
        x: (scroll.scrollLeft + scroll.clientWidth / 2) / width,
        y: (scroll.scrollTop + scroll.clientHeight / 2) / height
      };
      applyZoom();
      scroll.scrollLeft = centre.x * scroll.scrollWidth - scroll.clientWidth / 2;
      scroll.scrollTop = centre.y * scroll.scrollHeight - scroll.clientHeight / 2;
    },
    [applyZoom]
  );

  useEffect(() => {
    const svg = svgRef.current;
    const packetHost = packetHostRef.current;
    const stack = stackRef.current;
    if (!svg || !packetHost || !stack) return;
    Anim.attach(svg, packetHost, stack, board);
  }, [board]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(fit);
    window.addEventListener('resize', relayout);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', relayout);
    };
  }, [fit, relayout]);

  useEffect(() => {
    const first = window.setTimeout(relayout, 0);
    const afterTransition = window.setTimeout(relayout, 240);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(afterTransition);
    };
  }, [drawerOpen, tableInfo, relayout]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    scroll.addEventListener('wheel', onWheel, { passive: false });
    return () => scroll.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  return (
    <section className="board" id="board" aria-label="The network this walkthrough follows">
      <div className="board-bar">
        <div className="transport">
          <Button
            id="btn-prev"
            variant="secondary"
            shape="square"
            aria-label="Previous step"
            title="Previous step"
            disabled={!!quiz || atStart}
            icon={<CaretLeftIcon />}
            onClick={journey.prev}
          />
          <Button
            id="btn-play"
            variant="primary"
            className="primary"
            disabled={!!quiz || (atEnd && !playing)}
            icon={playing ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
            onClick={journey.togglePlay}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            id="btn-next"
            variant="secondary"
            shape="square"
            aria-label="Next step"
            title="Next step"
            disabled={!!quiz || atEnd}
            icon={<CaretRightIcon />}
            onClick={journey.next}
          />
          <Button
            id="btn-speed"
            variant="ghost"
            title="Playback speed"
            disabled={!!quiz}
            onClick={journey.cycleSpeed}
          >
            {speed}×
          </Button>
        </div>

        <aside className="layer-rail" id="rail" aria-label="Layer stack">
          {LAYERS.map((layer) => {
            const active = layer.osi.some((number) => step.osi.includes(number));
            return (
              <span
                key={layer.name}
                className={'layer' + (active ? ' active' : '')}
                title={`${layer.name}: ${layer.help}`}
              >
                <span className="layer-name">{layer.name}</span>
              </span>
            );
          })}
        </aside>

        <div className="board-tools">
          <Button
            id="btn-zoom-out"
            variant="ghost"
            shape="square"
            aria-label="Zoom out"
            title="Zoom out"
            icon={<MagnifyingGlassMinusIcon />}
            onClick={() => zoomBy(1 / 1.25)}
          />
          <span className="zoom-level" id="zoom-level">
            {zoomLabel}
          </span>
          <Button
            id="btn-zoom-in"
            variant="ghost"
            shape="square"
            aria-label="Zoom in"
            title="Zoom in"
            icon={<MagnifyingGlassPlusIcon />}
            onClick={() => zoomBy(1.25)}
          />
          <Button
            id="btn-zoom-fit"
            variant="ghost"
            size="sm"
            title="Show the whole map"
            icon={<CornersOutIcon />}
            onClick={fit}
          >
            Fit
          </Button>
          <Button
            variant={drawerOpen ? 'secondary' : 'ghost'}
            size="sm"
            title="Step details"
            aria-expanded={drawerOpen}
            aria-controls="drawer"
            disabled={!!quiz}
            icon={<SidebarSimpleIcon />}
            onClick={journey.toggleDrawer}
          >
            Step details
          </Button>
        </div>
      </div>

      <div className={'board-stage' + (dragging ? ' dragging' : '')}>
        <BoardTable
          table={tableInfo?.table ?? null}
          fromIndex={tableInfo?.at ?? null}
          currentIndex={index}
          stepTitle={tableInfo ? steps[tableInfo.at].title : null}
        />
        <div
          className="board-scroll"
          id="board-scroll"
          ref={scrollRef}
          onPointerDown={(event) => {
            if (event.button) return;
            dragRef.current = {
              x: event.clientX,
              y: event.clientY,
              left: event.currentTarget.scrollLeft,
              top: event.currentTarget.scrollTop
            };
            setDragging(true);
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // A synthetic event or a stale pointer id has nothing to capture.
            }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag) return;
            event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
            event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y);
          }}
          onPointerUp={() => {
            dragRef.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            setDragging(false);
          }}
        >
          <div className="board-canvas" id="board-canvas" ref={canvasRef}>
            <Topology
              board={board}
              scenario={journey.scenario}
              index={index}
              showAll={tableInfo !== null}
              svgRef={svgRef}
              packetHostRef={packetHostRef}
            />
          </div>
        </div>
      </div>

      <div className="packet-stack" id="stack" ref={stackRef} aria-hidden="true" />

      <p className="board-say" id="say" aria-live="polite">
        <span className="say-where">
          {step.phase} · step {index + 1} of {steps.length}
        </span>{' '}
        {step.say || step.title}
      </p>

      <div className="ticks" id="ticks" role="group" aria-label="Jump to a step">
        {steps.map((candidate, candidateIndex) => (
          <Fragment key={candidate.id}>
            {candidateIndex === 0 || candidate.phase !== steps[candidateIndex - 1].phase ? (
              <i className="tick-gap" />
            ) : null}
            <button
              type="button"
              className={
                'tick' +
                (candidateIndex === index ? ' current' : '') +
                (candidateIndex < index ? ' done' : '')
              }
              title={`${candidateIndex + 1}. ${candidate.title}`}
              aria-label={`${candidateIndex + 1}. ${candidate.title}`}
              onClick={() => journey.go(candidateIndex)}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
