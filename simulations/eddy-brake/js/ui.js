(function () {
  "use strict";

  const physics = window.physics;
  if (!physics) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    rpm: $("rpm-out"),
    ang: $("ang-out"),
    torque: $("torque-out"),
    power: $("power-out"),
    field: $("field-out"),
    temp: $("temp-out"),
    status: $("status-out"),
    eddy: $("eddy-out"),
    eddyBar: $("eddy-bar"),
    graph: $("graph"),
    rpmVal: $("rpm-val"),
    gapVal: $("gap-val"),
    btnEngage: $("btn-engage"),
    btnReset: $("btn-reset"),
    rngRpm: $("rng-rpm"),
    rngGap: $("rng-gap"),
    chkCoast: $("chk-coast"),
    chkField: $("chk-field"),
    chkEddy: $("chk-eddy"),
  };

  const gc = els.graph.getContext("2d");

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function fmtPower(p) {
    if (p >= 1000) return (p / 1000).toFixed(2) + " kW";
    return p.toFixed(0) + " W";
  }

  function frame(s) {
    const rpm = (s.omega * 60) / (2 * Math.PI);
    els.rpm.textContent = rpm.toFixed(0) + " RPM";
    els.ang.textContent = s.omega.toFixed(2) + " rad/s";
    els.torque.textContent = Math.abs(s.torqueBrake).toFixed(2) + " N·m";
    els.power.textContent = fmtPower(s.power);
    els.field.textContent = s.fieldB.toFixed(3) + " T";
    els.temp.textContent = s.temp.toFixed(1) + " °C";
    let st = "PARKED";
    if (s.magnetPos > 0.95) st = "ENGAGED";
    else if (s.magnetPos > 0.05) st = "MOVING…";
    els.status.textContent = st;
    els.status.style.color = s.magnetPos > 0.95 ? "#ff8c3a" : "#dce6f5";
    els.eddy.textContent = (s.eddyN * 100).toFixed(0) + "%";
    els.eddyBar.style.width = clamp(s.eddyN * 100, 0, 100) + "%";
    drawGraph();
  }

  function drawGraph() {
    const c = els.graph;
    const w = c.width;
    const h = c.height;
    const ctx = gc;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0f17";
    ctx.fillRect(0, 0, w, h);

    const mx = 16;
    const ymid = h / 2;
    const amp = h / 2 - 12;

    ctx.strokeStyle = "#16233a";
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      const y = ymid + (g - 2) * (amp / 2);
      ctx.beginPath();
      ctx.moveTo(mx, y);
      ctx.lineTo(w - mx, y);
      ctx.stroke();
    }

    const s = physics.state;
    const hst = s.history;
    if (hst.length < 2) return;

    const t1 = s.time;
    const t0 = t1 - 15;
    let rpmMax = Math.max(500, s.targetRpm * 1.05);
    let tbMax = 1;
    for (let i = 0; i < hst.length; i++) {
      if (hst[i].t < t0) continue;
      if (hst[i].rpm > rpmMax) rpmMax = hst[i].rpm;
      if (hst[i].tb > tbMax) tbMax = hst[i].tb;
    }

    function trace(color, pick, max) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < hst.length; i++) {
        const p = hst[i];
        if (p.t < t0) continue;
        const u = (p.t - t0) / 15;
        const v = clamp(pick(p) / max, 0, 1);
        const x = mx + u * (w - 2 * mx);
        const y = ymid + amp - v * 2 * amp;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    trace("#ffd94a", (p) => p.rpm, rpmMax);
    trace("#4dd8ff", (p) => p.tb, tbMax);

    ctx.font = "10px Consolas, monospace";
    ctx.fillStyle = "#ffd94a";
    ctx.fillText("RPM", mx + 2, 10);
    ctx.fillStyle = "#4dd8ff";
    ctx.fillText("T_b", mx + 2, 22);
  }

  function init(sceneAPI) {
    function syncRpm() {
      physics.setTargetRpm(+els.rngRpm.value);
      els.rpmVal.textContent = physics.state.targetRpm.toFixed(0) + " RPM";
    }
    function syncGap() {
      physics.setGap(+els.rngGap.value);
      els.gapVal.textContent = physics.state.gapMm.toFixed(1) + " mm";
      sceneAPI.updateGapLabel();
    }

    els.rngRpm.addEventListener("input", syncRpm);
    els.rngGap.addEventListener("input", syncGap);
    syncRpm();
    syncGap();

    els.btnEngage.addEventListener("click", function () {
      physics.state.engaged = !physics.state.engaged;
      els.btnEngage.textContent = physics.state.engaged ? "RELEASE MAGNET" : "ENGAGE MAGNET";
      els.btnEngage.classList.toggle("on", physics.state.engaged);
    });

    els.btnReset.addEventListener("click", function () {
      physics.reset();
    });

    els.chkCoast.addEventListener("change", function () {
      physics.state.coast = els.chkCoast.checked;
    });

    els.chkField.addEventListener("change", function () {
      sceneAPI.fieldGroup.visible = els.chkField.checked;
    });

    els.chkEddy.addEventListener("change", function () {
      sceneAPI.eddyGroup.visible = els.chkEddy.checked;
    });
  }

  window.ui = { init, frame };
})();