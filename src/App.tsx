import { useEffect } from 'react';
import { Board } from './components/Board';
import { Drawer } from './components/Drawer';
import { TopBar } from './components/TopBar';
import { useJourney } from './useJourney';

export function App() {
  const journey = useJourney();
  const { quiz, next, prev, togglePlay, go, steps } = journey;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const keys = ['ArrowRight', 'ArrowLeft', ' ', 'Home', 'End'];
      if (quiz && keys.includes(event.key)) {
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'Home') {
        event.preventDefault();
        go(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        go(steps.length - 1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [quiz, next, prev, togglePlay, go, steps.length]);

  return (
    <div className="app-shell">
      <TopBar journey={journey} />
      <main className={'app' + (journey.drawerOpen ? ' drawer-open' : '')}>
        <Board journey={journey} />
        <Drawer journey={journey} />
      </main>
    </div>
  );
}
