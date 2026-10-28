import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Anim } from './anim';
import { boardOf, scenarios } from './scenarios';
import type { Board, QuizQuestion, Scenario, Step } from './types';

export type ThemeChoice = 'auto' | 'light' | 'dark';

export interface QuizRun {
  scenarioId: string;
  phase: string;
  questions: QuizQuestion[];
  index: number;
  score: number;
  answered: boolean;
  feedback: string;
}

const SPEEDS = [0.5, 1, 1.5, 2];
const THEME_KEY = 'netv.theme';

function routeFromHash() {
  const match = /^#\/([^/]+)(?:\/(.+))?$/.exec(window.location.hash);
  return match ? { scenarioId: match[1], stepId: match[2] || null } : null;
}

function stepIndex(scenario: Scenario, stepId: string | null) {
  if (!stepId) return 0;
  const index = scenario.steps.findIndex((step) => step.id === stepId);
  return index < 0 ? 0 : index;
}

function initialRoute() {
  const route = routeFromHash();
  const scenarioId = route && scenarios[route.scenarioId] ? route.scenarioId : 'http';
  return {
    scenarioId,
    index: stepIndex(scenarios[scenarioId], route?.stepId ?? null),
    hadStep: !!route?.stepId
  };
}

function themeChoice(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
  } catch {
    // file:// and privacy modes may refuse storage; the choice simply does not stick.
  }
  return 'auto';
}

function shuffle(pool: QuizQuestion[]) {
  const copy = pool.slice();
  for (let i = 0; i < 5; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 5);
}

export interface Journey {
  scenarioId: string;
  scenario: Scenario;
  steps: Step[];
  step: Step;
  previous: Step | null;
  board: Board;
  index: number;
  speed: number;
  playing: boolean;
  theme: ThemeChoice;
  setTheme: Dispatch<SetStateAction<ThemeChoice>>;
  drawerOpen: boolean;
  toggleDrawer: () => void;
  quiz: QuizRun | null;
  quizVisible: boolean;
  atBoundary: boolean;
  loadScenario: (id: string, stepId?: string) => void;
  go: (index: number) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  cycleSpeed: () => void;
  seekPhase: (phase: string) => void;
  startQuiz: () => void;
  answerQuiz: (choice: number) => void;
  nextQuestion: () => void;
  finishQuiz: () => void;
}

export function useJourney(): Journey {
  const [initial] = useState(initialRoute);
  const [scenarioId, setScenarioId] = useState(initial.scenarioId);
  const [index, setIndex] = useState(initial.index);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [theme, setTheme] = useState<ThemeChoice>(themeChoice);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizRun | null>(null);
  const [closedBoundary, setClosedBoundary] = useState<string | null>(null);

  const scenario = scenarios[scenarioId] ?? scenarios.http;
  const steps = scenario.steps;
  const step: Step = steps[Math.min(index, steps.length - 1)];
  const previous = index > 0 ? steps[index - 1] : null;
  const board = boardOf(scenario, step.phase);
  const nextStep = steps[index + 1] ?? null;
  const atBoundary = !nextStep || nextStep.phase !== step.phase;
  const boundaryKey = `${scenarioId}:${index}`;
  const quizVisible = !!quiz || (atBoundary && closedBoundary !== boundaryKey);

  const lastPlaying = useRef(playing);
  const animKey = useRef('');
  const advanceRef = useRef<() => void>(() => undefined);
  const started = useRef(false);

  const advance = useCallback(() => {
    if (quiz) return;
    if (atBoundary) {
      setPlaying(false);
      return;
    }
    if (index >= steps.length - 1) {
      Anim.settle(step);
      setPlaying(false);
      return;
    }
    setIndex(index + 1);
  }, [quiz, atBoundary, index, steps.length, step]);

  advanceRef.current = advance;

  useEffect(() => {
    const onHashChange = () => {
      const route = routeFromHash();
      if (!route || !scenarios[route.scenarioId]) return;
      const nextScenario = scenarios[route.scenarioId];
      setPlaying(false);
      setQuiz(null);
      setClosedBoundary(null);
      setScenarioId(route.scenarioId);
      setIndex(stepIndex(nextScenario, route.stepId));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const want = `#/${scenarioId}/${step.id}`;
    if (window.location.hash === want) return;
    try {
      window.history.replaceState(null, '', want);
    } catch {
      try {
        window.location.hash = want;
      } catch {
        // A file:// document may refuse history changes; the story still works.
      }
    }
  }, [scenarioId, step.id]);

  useEffect(() => {
    const dark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // no storage: the choice simply does not stick
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'auto') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const mode = query.matches ? 'dark' : 'light';
      document.documentElement.dataset.mode = mode;
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.colorScheme = mode;
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    setClosedBoundary((current) => (current && current !== boundaryKey ? null : current));
  }, [boundaryKey]);

  useEffect(() => {
    if (atBoundary && playing) setPlaying(false);
  }, [atBoundary, playing]);

  useEffect(() => {
    if (quizVisible) setDrawerOpen(true);
  }, [quizVisible]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initial.hadStep || Anim.reduced()) return;
    const timer = window.setTimeout(() => setPlaying(true), 700);
    return () => window.clearTimeout(timer);
  }, [initial.hadStep]);

  useEffect(() => {
    const key = `${scenarioId}:${step.id}:${speed}`;
    const same = animKey.current === key;
    const wasPlaying = lastPlaying.current;
    lastPlaying.current = playing;

    if (same && !playing && wasPlaying) {
      Anim.settle(step);
      return;
    }

    const duration = Anim.play(step, { speed });
    animKey.current = key;
    if (!playing) return;

    const timer = window.setTimeout(() => advanceRef.current(), duration);
    return () => window.clearTimeout(timer);
  }, [scenarioId, step, speed, playing]);

  const loadScenario = useCallback((id: string, stepId?: string) => {
    if (!scenarios[id]) return;
    setPlaying(false);
    setQuiz(null);
    setClosedBoundary(null);
    setDrawerOpen(false);
    setScenarioId(id);
    setIndex(stepIndex(scenarios[id], stepId ?? null));
  }, []);

  const go = useCallback(
    (next: number) => {
      if (quiz) return;
      setPlaying(false);
      setIndex(Math.max(0, Math.min(steps.length - 1, next)));
    },
    [quiz, steps.length]
  );

  const next = useCallback(() => {
    if (quiz) return;
    setPlaying(false);
    if (atBoundary) return;
    if (index < steps.length - 1) setIndex(index + 1);
  }, [quiz, atBoundary, index, steps.length]);

  const prev = useCallback(() => {
    if (quiz) return;
    setPlaying(false);
    if (index > 0) setIndex(index - 1);
  }, [quiz, index]);

  const togglePlay = useCallback(() => {
    if (quiz || index >= steps.length - 1) return;
    setPlaying((current) => !current);
  }, [quiz, index, steps.length]);

  const cycleSpeed = useCallback(() => {
    setSpeed((current) => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length]);
  }, []);

  const startQuiz = useCallback(() => {
    if (!scenario.quizzes?.[step.phase]) return;
    setPlaying(false);
    setQuiz({
      scenarioId,
      phase: step.phase,
      questions: shuffle(scenario.quizzes[step.phase]),
      index: 0,
      score: 0,
      answered: false,
      feedback: ''
    });
  }, [scenario, scenarioId, step.phase]);

  const answerQuiz = useCallback((choice: number) => {
    setQuiz((run) => {
      if (!run || run.answered) return run;
      const question = run.questions[run.index];
      const correct = choice === question.answer;
      return {
        ...run,
        answered: true,
        score: run.score + (correct ? 1 : 0),
        feedback: correct
          ? 'Correct.'
          : `Not quite. Correct answer: ${question.choices[question.answer]}.`
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setQuiz((run) =>
      run ? { ...run, index: run.index + 1, answered: false, feedback: '' } : run
    );
  }, []);

  const finishQuiz = useCallback(() => {
    const completed = !!quiz && quiz.answered && quiz.index === 4;
    setQuiz(null);
    if (nextStep) {
      setIndex(index + 1);
      return;
    }
    if (!completed) setClosedBoundary(boundaryKey);
  }, [quiz, nextStep, index, boundaryKey]);

  const toggleDrawer = useCallback(() => {
    if (quiz) return;
    setDrawerOpen((current) => !current);
  }, [quiz]);

  const seekPhase = useCallback(
    (phase: string) => {
      if (quiz) return;
      const first = steps.findIndex((candidate) => candidate.phase === phase);
      setPlaying(false);
      if (first >= 0) setIndex(first);
    },
    [quiz, steps]
  );

  return {
    scenarioId,
    scenario,
    steps,
    step,
    previous,
    board,
    index,
    speed,
    playing,
    theme,
    setTheme,
    drawerOpen,
    toggleDrawer,
    quiz,
    quizVisible,
    atBoundary,
    loadScenario,
    go,
    next,
    prev,
    togglePlay,
    cycleSpeed,
    seekPhase,
    startQuiz,
    answerQuiz,
    nextQuestion,
    finishQuiz
  };
}
