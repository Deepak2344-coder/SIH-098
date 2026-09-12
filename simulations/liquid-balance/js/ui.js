(function () {
  "use strict";

  const physics = window.physics;
  if (!physics) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    fillL: $("fill-l"),
    fillR: $("fill-r"),
    fillB: $("fill-b"),
    barL: $("fill-bar-l"),
    barR: $("fill-bar-r"),
    barB: $("fill-bar-b"),
    com: $("com-out"),
    tilt: $("tilt-out"),
    mass: $("mass-out"),
    status: $("status-out"),
    graph: $("graph"),
    pumpVal: $("pump-val"),
    btnFillL: $("btn-fill-l"),
    btnFillR: $("btn-fill-r"),
    btnFillB: $("btn-fill-b"),
    btnStop: $("btn-stop"),
    btnFixed: $("btn-fixed"),
    btnDynamic: $("btn-dynamic"),
    btnPause: $("btn-pause"),
    btnReset: $("btn-reset"),
    rngPump: $("rng-pump"),
    chkFlow: $("chk-flow"),
    chkLabels: $("chk-labels"),
  };

  const gc = els.graph.getContext("2d");

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function frame(s) {
    const fL = (s.V.L / physics.CAP) * 100;
    const fR = (s.V.R / physics.CAP) * 100;
    const fB = (s.V.B / physics.CAP) * 100;
    els.fillL.textContent = fL.toFixed(0) + "%";
    els.fillR.textContent = fR.toFixed(0) + "%";
    els.fillB.textContent = fB.toFixed(0) + "%";
    els.barL.style.width = fL + "%";
    els.barR.style.width = fR + "%";
    els.barB.style.width = fB + "%";

    const w = physics.comWorld();
    els.com.textContent = w.x.toFixed(2) + ", " + w.y.toFixed(2);
    els.tilt.textContent = ((s.theta * 180) / Math.PI).toFixed(1) + "°";
    els.mass.textContent = s.massTotal.toFixed(1) + " kg";

    let st = "IDLE";
    if (s.flowing && s.target) st = "PUMPING → " + s.target;
    else if (s.target) st = "ARMED → " + s.target;
    els.status.textContent = st;
    els.status.style.color = s.flowing ? "#3fa9f5" : "#dce6f5";

    els.btnFillL.classList.toggle("armed", s.target === "L");
    els.btnFillR.classList.toggle("armed", s.target === "R");
    els.btnFillB.classList.toggle("armed", s.target === "B");
    els.btnFixed.classList.toggle("on", s.mode === "fixed");
    els.btnDynamic.classList.toggle("on", s.mode === "dynamic");

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
    const TILT_MAX = 65;
    const COM_MAX = 1.8;

    function trace(color, pick, max) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < hst.length; i++) {
        const p = hst[i];
        if (p.t < t0) continue;
        const u = (p.t - t0) / 15;
        const v = clamp(pick(p) / max, -1, 1);
        const x = mx + u * (w - 2 * mx);
        const y = ymid - v * amp;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    trace("#ffd94a", (p) => p.tilt, TILT_MAX);
    trace("#4dd8ff", (p) => p.comx, COM_MAX);

    ctx.font = "10px Consolas, monospace";
    ctx.fillStyle = "#ffd94a";
    ctx.fillText("θ", mx + 2, 10);
    ctx.fillStyle = "#4dd8ff";
    ctx.fillText("COM-x", mx + 2, 22);
  }

  function init(sceneAPI) {
    els.rngPump.addEventListener("input", function () {
      physics.state.pumpRate = +els.rngPump.value;
      els.pumpVal.textContent = physics.state.pumpRate.toFixed(1) + " L/s";
    });
    physics.state.pumpRate = +els.rngPump.value;

    function arm(t) {
      physics.state.target = physics.state.target === t ? null : t;
    }
    els.btnFillL.addEventListener("click", function () { arm("L"); });
    els.btnFillR.addEventListener("click", function () { arm("R"); });
    els.btnFillB.addEventListener("click", function () { arm("B"); });
    els.btnStop.addEventListener("click", function () {
      physics.state.target = null;
    });

    els.btnFixed.addEventListener("click", function () {
      physics.state.mode = "fixed";
    });
    els.btnDynamic.addEventListener("click", function () {
      physics.state.mode = "dynamic";
    });

    els.btnPause.addEventListener("click", function () {
      physics.state.running = !physics.state.running;
      els.btnPause.textContent = physics.state.running ? "Pause" : "Resume";
    });

    els.btnReset.addEventListener("click", function () {
      physics.reset();
    });

    els.chkFlow.addEventListener("change", function () {
      sceneAPI.packetGroup.visible = els.chkFlow.checked;
    });
    els.chkLabels.addEventListener("change", function () {
      sceneAPI.labelGroup.visible = els.chkLabels.checked;
    });
  }

  window.ui = { init, frame };
})();