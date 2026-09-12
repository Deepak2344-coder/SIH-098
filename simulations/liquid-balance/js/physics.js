window.physics = (function () {
  "use strict";

  const GRAV = 9.81;
  const CAP = 12.0;
  const V_TOTAL = 9.0;
  const RHO = 1.0;
  const TANK = {
    L: { x: -1.7, y: 0 },
    R: { x: 1.7, y: 0 },
    B: { x: 0, y: -1.7 },
  };
  const TANK_H = 1.3;
  const FRAME_M = 2.0, FRAME_X = 0, FRAME_Y = -0.4;
  const SHELL_M = 1.2;
  const TUBES_M = 1.4, TUBES_X = 0, TUBES_Y = -0.9;
  const KEEL_M = 5.0, KEEL_X = 0, KEEL_Y = -2.0;
  const TILT_MAX = 1.047;
  const SUBSTEP = 0.001;

  const state = {
    V: { L: 0, R: 0, B: V_TOTAL },
    target: null,
    flowing: false,
    pumpRate: 1.0,
    mode: "fixed",
    theta: 0,
    omega: 0,
    comX: 0,
    comY: -1.26,
    massTotal: 21,
    inertia: 60,
    time: 0,
    running: true,
    history: [],
  };

  function masses() {
    const pts = [
      { m: FRAME_M, x: FRAME_X, y: FRAME_Y },
      { m: SHELL_M, x: TANK.L.x, y: TANK.L.y },
      { m: SHELL_M, x: TANK.R.x, y: TANK.R.y },
      { m: SHELL_M, x: TANK.B.x, y: TANK.B.y },
      { m: TUBES_M, x: TUBES_X, y: TUBES_Y },
      { m: KEEL_M, x: KEEL_X, y: KEEL_Y },
    ];
    for (const k of ["L", "R", "B"]) {
      const fill = state.V[k] / CAP;
      pts.push({
        m: RHO * state.V[k],
        x: TANK[k].x,
        y: TANK[k].y + (fill - 0.5) * TANK_H,
      });
    }
    return pts;
  }

  function recompute() {
    const pts = masses();
    let M = 0, mx = 0, my = 0, I = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      M += p.m;
      mx += p.m * p.x;
      my += p.m * p.y;
      I += p.m * (p.x * p.x + p.y * p.y);
    }
    state.massTotal = M;
    state.comX = mx / M;
    state.comY = my / M;
    state.inertia = I;
  }

  function transfer(h) {
    state.flowing = false;
    const T = state.target;
    if (!T) return;
    const others = ["L", "R", "B"].filter(function (k) { return k !== T; });
    let srcVol = 0;
    for (let i = 0; i < others.length; i++) srcVol += state.V[others[i]];
    const space = CAP - state.V[T];
    if (space <= 1e-9 || srcVol <= 1e-9) {
      state.target = null;
      return;
    }
    const move = Math.min(state.pumpRate * h, space, srcVol);
    state.V[T] += move;
    for (let i = 0; i < others.length; i++) {
      state.V[others[i]] -= move * (state.V[others[i]] / srcVol);
    }
    state.flowing = true;
    if (CAP - state.V[T] <= 1e-9) state.target = null;
  }

  function tiltStep(h) {
    const c = Math.cos(state.theta);
    const s = Math.sin(state.theta);
    const xw = state.comX * c - state.comY * s;
    if (state.mode === "dynamic") {
      const r = Math.sqrt(state.comX * state.comX + state.comY * state.comY);
      const damp = 0.8 * Math.sqrt(Math.max(state.inertia * state.massTotal * GRAV * r, 1e-9));
      const torque = -state.massTotal * GRAV * xw - damp * state.omega;
      state.omega += (torque / Math.max(state.inertia, 1e-9)) * h;
      state.theta += state.omega * h;
      if (state.theta > TILT_MAX) { state.theta = TILT_MAX; state.omega = 0; }
      if (state.theta < -TILT_MAX) { state.theta = -TILT_MAX; state.omega = 0; }
    } else {
      state.theta += (0 - state.theta) * Math.min(1, 4 * h);
      if (Math.abs(state.theta) < 1e-4) state.theta = 0;
      state.omega = 0;
    }
  }

  function step(h) {
    transfer(h);
    recompute();
    tiltStep(h);
    state.time += h;
  }

  function advance(dt) {
    if (!state.running) return;
    let remaining = Math.min(dt, 0.05);
    while (remaining > 1e-9) {
      const h = Math.min(SUBSTEP, remaining);
      step(h);
      remaining -= h;
    }
  }

  function pushHistory() {
    const h = state.history;
    const c = Math.cos(state.theta);
    const s = Math.sin(state.theta);
    h.push({
      t: state.time,
      tilt: (state.theta * 180) / Math.PI,
      comx: state.comX * c - state.comY * s,
    });
    while (h.length > 0 && h[0].t < state.time - 17) h.shift();
    if (h.length > 2400) h.splice(0, h.length - 2400);
  }

  function comWorld() {
    const c = Math.cos(state.theta);
    const s = Math.sin(state.theta);
    return {
      x: state.comX * c - state.comY * s,
      y: state.comX * s + state.comY * c,
    };
  }

  function reset() {
    state.V = { L: 0, R: 0, B: V_TOTAL };
    state.target = null;
    state.flowing = false;
    state.theta = 0;
    state.omega = 0;
    state.time = 0;
    state.history = [];
    recompute();
  }

  recompute();
  return {
    state,
    CAP,
    V_TOTAL,
    TANK,
    advance,
    pushHistory,
    comWorld,
    reset,
  };
})();