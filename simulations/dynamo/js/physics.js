window.physics = (function () {
  "use strict";

  const nLoops = 8;
  const area = 0.0135;
  const visualHalfHeight = 0.8;
  const visualHalfWidth = 0.5;

  const gammas = [];
  for (let k = 0; k < nLoops; k++) gammas.push((k * Math.PI) / nLoops);

  let peakRow = 0;
  for (let s = 0; s < 3142; s++) {
    const th = (s / 3142) * Math.PI;
    let sum = 0;
    for (let k = 0; k < nLoops; k++) sum += Math.cos(th + gammas[k]);
    peakRow = Math.max(peakRow, Math.abs(sum));
  }

  const state = {
    rpm: 480,
    fieldT: 0.35,
    running: true,
    theta: 0,
    omega: 0,
    flux: 0,
    emf: 0,
    fluxPeak: 0,
    emfPeak: 0,
    windowFlux: 0,
    time: 0,
    revs: 0,
  };

  function updateDerived() {
    state.omega = (state.rpm * 2 * Math.PI) / 60;
    state.fluxPeak = area * peakRow * state.fieldT;
    state.emfPeak = area * peakRow * state.fieldT * state.omega;
  }

  function setRpm(v) {
    state.rpm = Math.max(0, v);
    updateDerived();
  }

  function setField(v) {
    state.fieldT = Math.max(0, v);
    updateDerived();
  }

  function normalize(theta) {
    let c = 0;
    let s = 0;
    for (let k = 0; k < nLoops; k++) {
      const a = theta + gammas[k];
      c += Math.cos(a);
      s += Math.sin(a);
    }
    return { fx: -c / peakRow, em: -s / peakRow };
  }

  function step(dt) {
    if (!state.running) return;
    state.theta += state.omega * dt;
    state.revs += (state.omega * dt) / (2 * Math.PI);
    let cosSum = 0;
    let sinSum = 0;
    for (let k = 0; k < nLoops; k++) {
      const a = state.theta + gammas[k];
      cosSum += Math.cos(a);
      sinSum += Math.sin(a);
    }
    state.flux = -state.fieldT * area * cosSum;
    state.emf = -state.fieldT * area * state.omega * sinSum;
    state.windowFlux = -Math.cos(state.theta) * state.fieldT * (visualHalfHeight * visualHalfWidth);
    state.time += dt;
  }

  function reset() {
    state.theta = 0;
    state.revs = 0;
    updateDerived();
  }

  updateDerived();
  return {
    state,
    nLoops,
    visualHalfHeight,
    visualHalfWidth,
    normalize,
    setRpm,
    setField,
    step,
    reset,
  };
})();