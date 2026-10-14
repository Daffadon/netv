// Step state and URL routing. Holds no timers: playback is scheduled by the UI, which knows how
// long each step's animation lasts.
(function (global) {
  const NETV = global.NETV;
  const SPEEDS = [0.5, 1, 1.5, 2];

  const Engine = {
    scenarioId: null,
    index: 0,
    playing: false,
    speed: 1,
    _listeners: [],

    load: function (scenarioId, stepId) {
      this.scenarioId = scenarioId;
      const steps = this.steps();
      const i = stepId ? steps.findIndex((s) => s.id === stepId) : -1;
      this.index = i >= 0 ? i : 0;
      this._emit();
    },

    scenario: function () {
      return NETV.scenario(this.scenarioId);
    },

    steps: function () {
      return NETV.scenario(this.scenarioId).steps;
    },

    current: function () {
      return this.steps()[this.index];
    },

    previous: function () {
      return this.index > 0 ? this.steps()[this.index - 1] : null;
    },

    atStart: function () {
      return this.index === 0;
    },

    atEnd: function () {
      return this.index === this.steps().length - 1;
    },

    phases: function () {
      return this.scenario().phases;
    },

    /** The map the current step is drawn on: per-phase when the scenario declares boards. */
    board: function () {
      return NETV.boardOf(this.scenario(), this.current().phase);
    },

    nodes: function () {
      return this.board().nodes;
    },

    go: function (i) {
      const next = Math.max(0, Math.min(this.steps().length - 1, i));
      if (next === this.index) return;
      this.index = next;
      if (this.atEnd()) this.playing = false;
      this._emit();
    },

    goToId: function (id) {
      const i = NETV.stepIndex(this.scenarioId, id);
      if (i >= 0) this.go(i);
    },

    next: function () {
      this.go(this.index + 1);
    },

    prev: function () {
      this.go(this.index - 1);
    },

    isPlaying: function () {
      return this.playing;
    },

    play: function () {
      if (this.playing || this.atEnd()) return;
      this.playing = true;
      this._emit();
    },

    pause: function () {
      if (!this.playing) return;
      this.playing = false;
      this._emit();
    },

    toggle: function () {
      this.playing ? this.pause() : this.play();
    },

    cycleSpeed: function () {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      this._emit();
    },

    /** Index of the first step of the phase that step `i` belongs to (for the phase pips). */
    phaseStart: function (i) {
      const phase = this.steps()[i].phase;
      return this.steps().findIndex((s) => s.phase === phase);
    },

    onchange: function (fn) {
      this._listeners.push(fn);
    },

    _emit: function () {
      const step = this.current();
      const want = '#/' + this.scenarioId + '/' + step.id;
      // Never let URL bookkeeping break rendering: replaceState() throws a SecurityError on
      // file:// documents (opaque origin), and this page is meant to be double-clicked open.
      if (location.hash !== want) {
        try {
          history.replaceState(null, '', want);
        } catch (err) {
          try { location.hash = want; } catch (err2) { /* URL simply stays put */ }
        }
      }
      for (const fn of this._listeners) fn(step, this.index, this.steps().length);
    }
  };

  // #/http/tcp-syn-build
  function parseHash() {
    const m = /^#\/([^/]+)(?:\/(.+))?$/.exec(location.hash);
    return m ? { scenarioId: m[1], stepId: m[2] || null } : null;
  }

  Engine.start = function (defaultId) {
    const fallback = defaultId || 'http';
    const route = parseHash() || { scenarioId: fallback, stepId: null };
    if (!NETV.scenarios[route.scenarioId]) route.scenarioId = fallback;
    this.load(route.scenarioId, route.stepId);

    global.addEventListener('hashchange', () => {
      const r = parseHash();
      if (!r || r.scenarioId !== this.scenarioId) return;
      if (r.stepId) this.goToId(r.stepId);
    });
  };

  NETV.Engine = Engine;
})(globalThis);
