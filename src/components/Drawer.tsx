import { Button } from '@cloudflare/kumo/components/button';
import { XIcon } from '@phosphor-icons/react';
import type { Journey } from '../useJourney';
import { DetailPanel } from './DetailPanel';
import { QuizPanel } from './QuizPanel';

const DIR_WORD = {
  out: 'leaving its sender',
  in: 'arriving at its receiver',
  none: 'happening inside one machine'
} as const;

export function Drawer({ journey }: { journey: Journey }) {
  const { drawerOpen, step, index, steps, quiz, toggleDrawer } = journey;
  const actor = journey.board.nodes.find((node) => node.id === step.actor);

  return (
    <aside
      id="drawer"
      className={'drawer' + (drawerOpen ? ' open' : '')}
      aria-label="Step details"
      aria-hidden={!drawerOpen}
      inert={!drawerOpen}
    >
      <div className="drawer-inner">
        <div className="drawer-head">
          <div className="step-head">
            <p className="eyebrow">
              <span id="phase">{step.phase}</span>
              <span className="dot">·</span>
              <span id="counter">
                Step {index + 1} of {steps.length}
              </span>
            </p>
            <p className="sub" id="subtitle">
              {step.title} — {DIR_WORD[step.dir]}
              {actor ? ` · at the ${actor.label}` : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            shape="square"
            aria-label="Close step details"
            title="Close step details"
            disabled={!!quiz}
            icon={<XIcon />}
            onClick={toggleDrawer}
          />
        </div>
        <div className="drawer-body">
          <QuizPanel journey={journey} />
          <div id="detail" hidden={!!quiz}>
            <DetailPanel journey={journey} />
          </div>
        </div>
      </div>
    </aside>
  );
}
