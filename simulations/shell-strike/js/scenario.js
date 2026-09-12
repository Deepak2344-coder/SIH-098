window.scenario = (function () {
  "use strict";

  const G = 9.81;
  const DRAG = 0.0022;
  const HOW_X = -50;
  const PIVOT_H = 1.8;
  const BARREL_LEN = 7;
  const ROAD_X = 20;
  const VEH_SPEED = 7;
  const VEH_Z0 = -48;
  const VEH_Z1 = 48;
  const REST_H = 0.45;
  const N_SENSORS = 5;
  const SUBSTEP = 0.001;

  const state = {
    phase: "IDLE",
    time: 0,
    running: true,
    angleDeg: 45,
    vel: 25,
    sensorRadius: 5,
    shell: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 },
    settleT: 0,
    impact: null,
    noseOut: false,
    sensors: [],
    vehicle: { z: VEH_Z0, active: false, destroyed: false },
    vehicleTimer: 0,
    detectT: -1,
    boomT: -1,
    events: [],
  };

  function emit(type, msg, hot) {
    state.events.push({ t: state.time, type: type, msg: msg, hot: !!hot });
  }

  function muzzle() {
    const a = (state.angleDeg * Math.PI) / 180;
    return {
      x: HOW_X + Math.cos(a) * BARREL_LEN,
      y: PIVOT_H + Math.sin(a) * BARREL_LEN,
      z: 0,
      vx: state.vel * Math.cos(a),
      vy: state.vel * Math.sin(a),
      vz: 0,
    };
  }

  function fire() {
    if (state.phase !== "IDLE") return false;
    const m = muzzle();
    state.shell.x = m.x;
    state.shell.y = m.y;
    state.shell.z = m.z;
    state.shell.vx = m.vx;
    state.shell.vy = m.vy;
    state.shell.vz = m.vz;
    state.shell.spin = 0;
    state.phase = "FLIGHT";
    emit("fired", "FIRED — shell away, " + state.vel + " m/s at " + state.angleDeg + "°", true);
    return true;
  }

  function deploySensors() {
    state.sensors = [];
    for (let k = 0; k < N_SENSORS; k++) {
      const a = (k * 2 * Math.PI) / N_SENSORS + (Math.random() - 0.5) * 0.5;
      const r = 7.5 + (k % 2) * 1.5 + (Math.random() - 0.5) * 1.5;
      state.sensors.push({
        x: state.impact.x + Math.cos(a) * r,
        z: state.impact.z + Math.sin(a) * r,
        hop: 0,
      });
    }
  }

  function dist2(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function flightStep(h) {
    const s = state.shell;
    const v = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
    const drag = DRAG * v;
    s.vx -= drag * s.vx * h;
    s.vy -= (G + drag * s.vy) * h;
    s.vz -= drag * s.vz * h;
    s.x += s.vx * h;
    s.y += s.vy * h;
    s.z += s.vz * h;
    s.spin += 12 * h;
    if (s.y <= REST_H + 0.15 && s.vy < 0) {
      s.y = REST_H + 0.15;
      state.impact = { x: s.x, z: s.z };
      state.noseOut = true;
      state.settleT = 0;
      state.phase = "SETTLE";
      emit("impact", "IMPACT at x=" + s.x.toFixed(1) + "m — nose section torn off", true);
      emit("nose", "Nose break scattered " + N_SENSORS + " ultrasonic sensor pucks");
      deploySensors();
    }
  }

  function vehicleStep(h) {
    const v = state.vehicle;
    if (!v.active || v.destroyed) return;
    v.z += VEH_SPEED * h;
    if (v.z > VEH_Z1) {
      v.z = VEH_Z0;
      emit("passed", "Convoy passed through — no trigger in range");
    }
    if (state.impact && dist2(ROAD_X, v.z, state.impact.x, state.impact.z) < state.sensorRadius) {
      state.phase = "DETECTED";
      state.detectT = state.time;
      v.detected = true;
      emit("detected", "PROXIMITY ALERT — vehicle inside sensor field!", true);
    }
  }

  function step(h) {
    state.time += h;
    if (state.phase === "FLIGHT") {
      flightStep(h);
    } else if (state.phase === "SETTLE") {
      state.settleT += h;
      if (state.settleT > 0.6) {
        state.phase = "DORMANT";
        state.vehicleTimer = 3.0;
        emit("dormant", "Dud dormant — sensors listening…", false);
      }
    } else if (state.phase === "DORMANT") {
      if (!state.vehicle.active) {
        state.vehicleTimer -= h;
        if (state.vehicleTimer <= 0) {
          state.vehicle.active = true;
          emit("vehicle", "Patrol truck dispatched on the road");
        }
      }
      vehicleStep(h);
    } else if (state.phase === "DETECTED") {
      vehicleStep(h);
      if (state.time - state.detectT > 0.5 && state.phase === "DETECTED") {
        state.phase = "DETONATED";
        state.boomT = state.time;
        state.vehicle.destroyed = true;
        emit("boom", "DETONATION — dormant shell exploded!", true);
      }
    } else if (state.phase === "DETONATED") {
      if (state.time - state.boomT > 6) {
        state.phase = "DONE";
        emit("done", "Aftermath recorded — press Reset to replay", false);
      }
    }
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

  function reset() {
    state.phase = "IDLE";
    state.time = 0;
    state.shell = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 };
    state.settleT = 0;
    state.impact = null;
    state.noseOut = false;
    state.sensors = [];
    state.vehicle = { z: VEH_Z0, active: false, destroyed: false };
    state.vehicleTimer = 0;
    state.detectT = -1;
    state.boomT = -1;
    state.events = [];
  }

  return {
    state,
    G,
    ROAD_X,
    HOW_X,
    PIVOT_H,
    BARREL_LEN,
    VEH_SPEED,
    REST_H,
    muzzle,
    fire,
    advance,
    reset,
  };
})();