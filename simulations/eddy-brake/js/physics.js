window.physics = (function () {
  "use strict";

  const INERTIA = 0.023;
  const T_MOTOR_MAX = 8.0;
  const MOTOR_KP = 0.05;
  const W_CRIT = 314.159;
  const K_BRAKE = 97.0;
  const B0 = 1.4;
  const G0 = 1.5;
  const GAP_PARKED = 60.0;
  const F_VISCOUS = 0.0005;
  const F_COULOMB = 0.1;
  const C_THERMAL = 8580.0;
  const H_COOL = 8.0;
  const T_AMBIENT = 25.0;
  const ENGAGE_RATE = 0.9;
  const SUBSTEP = 0.001;

  const state = {
    targetRpm: 12000,
    gapMm: 2.0,
    engaged: false,
    magnetPos: 0,
    coast: false,
    running: true,
    theta: 0,
    omega: 0,
    torqueBrake: 0,
    torqueMotor: 0,
    power: 0,
    fieldB: 0,
    eddyN: 0,
    temp: T_AMBIENT,
    time: 0,
    history: [],
  };

  function smooth(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function gapField(gMm) {
    return (B0 * G0) / (G0 + gMm);
  }

  function physGap() {
    return GAP_PARKED + (state.gapMm - GAP_PARKED) * smooth(state.magnetPos);
  }

  function step(h) {
    const want = state.engaged ? 1 : 0;
    const d = want - state.magnetPos;
    const stepSize = ENGAGE_RATE * h;
    state.magnetPos += Math.max(-stepSize, Math.min(stepSize, d));

    const B = gapField(physGap());
    const wTarget = (state.targetRpm * 2 * Math.PI) / 60;

    const Tm = state.coast ? 0 : Math.max(-T_MOTOR_MAX, Math.min(T_MOTOR_MAX, MOTOR_KP * (wTarget - state.omega)));
    const x = state.omega / W_CRIT;
    const Tb = K_BRAKE * B * B * ((2 * x) / (1 + x * x));
    const Tf = F_VISCOUS * state.omega + (state.omega > 1e-6 ? F_COULOMB : state.omega < -1e-6 ? -F_COULOMB : 0);

    const alpha = (Tm - Tb - Tf) / INERTIA;
    state.omega += alpha * h;
    if (state.omega < 0) state.omega = 0;
    state.theta += state.omega * h;

    const P = Math.abs(Tb * state.omega);
    state.temp += ((P - H_COOL * (state.temp - T_AMBIENT)) / C_THERMAL) * h;
    state.time += h;

    state.torqueBrake = Tb;
    state.torqueMotor = Tm;
    state.power = P;
    state.fieldB = B;
    state.eddyN = Math.min(1, Math.abs((2 * x) / (1 + x * x)) * Math.min(1, B / 0.6));
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
    h.push({ t: state.time, rpm: (state.omega * 60) / (2 * Math.PI), tb: Math.abs(state.torqueBrake) });
    while (h.length > 0 && h[0].t < state.time - 22) h.shift();
    if (h.length > 2400) h.splice(0, h.length - 2400);
  }

  function setTargetRpm(v) {
    state.targetRpm = Math.max(0, Math.min(20000, v));
  }

  function setGap(v) {
    state.gapMm = Math.max(1, Math.min(3, v));
  }

  function reset() {
    state.theta = 0;
    state.omega = 0;
    state.torqueBrake = 0;
    state.torqueMotor = 0;
    state.power = 0;
    state.eddyN = 0;
    state.temp = T_AMBIENT;
    state.time = 0;
    state.history = [];
  }

  return {
    state,
    INERTIA,
    W_CRIT,
    T_AMBIENT,
    advance,
    pushHistory,
    setTargetRpm,
    setGap,
    reset,
  };
})();