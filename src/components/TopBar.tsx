import { Button } from '@cloudflare/kumo/components/button';
import { scenarios } from '../scenarios';
import type { Journey, ThemeChoice } from '../useJourney';

const THEMES: { id: ThemeChoice; label: string; title: string }[] = [
  { id: 'auto', label: 'Auto', title: 'Follow the system setting' },
  { id: 'light', label: 'Light', title: 'The white console palette' },
  { id: 'dark', label: 'Dark', title: 'The charcoal palette' }
];

export function TopBar({ journey }: { journey: Journey }) {
  const { scenarioId, scenario, steps, step, theme, setTheme, loadScenario, seekPhase } = journey;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>netv</span>
      </div>

      <nav id="scenarios" className="segmented" aria-label="Walkthroughs">
        {Object.values(scenarios).map((candidate) => {
          const active = candidate.id === scenarioId;
          return (
            <Button
              key={candidate.id}
              className={'pip' + (active ? ' active' : '')}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={active}
              title={candidate.subtitle}
              onClick={() => loadScenario(candidate.id)}
            >
              {candidate.nav || candidate.title}
            </Button>
          );
        })}
      </nav>

      <nav id="phases" className="chapters" aria-label="Chapters">
        {scenario.phases.map((phase) => {
          const first = steps.findIndex((candidate) => candidate.phase === phase);
          const last = steps.length - 1 - steps.slice().reverse().findIndex((candidate) => candidate.phase === phase);
          const active = step.phase === phase;
          return (
            <Button
              key={phase}
              className={'pip' + (active ? ' active' : '')}
              variant="ghost"
              size="sm"
              aria-current={active ? 'step' : undefined}
              title={`${phase} · steps ${first + 1} to ${last + 1}`}
              onClick={() => seekPhase(phase)}
            >
              {phase}
            </Button>
          );
        })}
      </nav>

      <p className="tagline">{scenario.subtitle}</p>

      <nav id="themes" className="segmented" aria-label="Colour theme">
        {THEMES.map((choice) => {
          const active = choice.id === theme;
          return (
            <Button
              key={choice.id}
              className={'pip' + (active ? ' active' : '')}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={active}
              title={choice.title}
              onClick={() => setTheme(choice.id)}
            >
              {choice.label}
            </Button>
          );
        })}
      </nav>
    </header>
  );
}
