(function () {
  "use strict";

  const physics = window.physics;
  if (!physics) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    rpm: $("rpm-out"),
    ang: $("ang-out"),
    theta: $("theta-out"),
    flux: $("flux-out"),
    emf: $("emf-out"),
    dc: $("dc-out"),
    dcBar: $("dc-bar"),
    osc: $("osc"),
    spdVal: $("spd-val"),
    fldVal: $("fld-val"),
    btnPause: $("btn-pause"),
    btnReset: $("btn-reset"),
    rngSpeed: $("rng-speed"),
    rngField: $("rng-field"),
    chkField: $("chk-field"),
    chkEnergy: $("chk-energy"),
  };

  const oc = els.osc.getContext("2d");

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function frame(s) {
    els.rpm.textContent = s.rpm.toFixed(0) + " RPM";
    els.ang.textContent = s.omega.toFixed(2) + " rad/s";
    let deg = ((s.theta * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    els.theta.textContent = deg.toFixed(1) + "° · " + s.revs.toFixed(1) + " rev";
    els.flux.textContent = (s.flux * 1000).toFixed(2) + " mWb";
    els.emf.textContent = s.emf.toFixed(3) + " V AC";
    const mag = s.emfPeak > 1e-9 ? Math.abs(s.emf) / s.emfPeak : 0;
    els.dc.textContent = (mag * 100).toFixed(0) + "%";
    els.dcBar.style.width = clamp(mag * 100, 0, 100) + "%";
    drawOsc();
  }

  function drawOsc() {
    const c = els.osc;
    const w = c.width;
    const h = c.height;
    const ctx = oc;
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

    const thetaNow = physics.state.theta;
    const span = 4 * Math.PI;
    const seg = 150;

    function trace(color, pick) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        const th = thetaNow - span * (1 - u);
        const v = pick(th);
        const x = mx + u * (w - 2 * mx);
        const y = ymid - v * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    trace("#4dd8ff", (th) => physics.normalize(th).fx);
    trace("#ffb45c", (th) => physics.normalize(th).em);

    const n = physics.normalize(thetaNow);
    ctx.fillStyle = "#4dd8ff";
    ctx.beginPath();
    ctx.arc(w - mx, ymid - n.fx * amp, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb45c";
    ctx.beginPath();
    ctx.arc(w - mx, ymid - n.em * amp, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "10px Consolas, monospace";
    ctx.fillStyle = "#4dd8ff";
    ctx.fillText("Φ/Φmax", mx + 2, 10);
    ctx.fillStyle = "#ffb45c";
    ctx.fillText("ε/εmax", mx + 2, 22);
  }

  function init(sceneAPI) {
    function syncSpeed() {
      physics.setRpm(+els.rngSpeed.value);
      els.spdVal.textContent = physics.state.rpm.toFixed(0) + " RPM";
    }
    function syncField() {
      physics.setField(+els.rngField.value);
      els.fldVal.textContent = physics.state.fieldT.toFixed(2) + " T";
    }

    els.rngSpeed.addEventListener("input", syncSpeed);
    els.rngField.addEventListener("input", syncField);
    syncSpeed();
    syncField();

    els.btnPause.addEventListener("click", function () {
      physics.state.running = !physics.state.running;
      els.btnPause.textContent = physics.state.running ? "Pause" : "Resume";
      els.btnPause.classList.toggle("off", !physics.state.running);
    });

    els.btnReset.addEventListener("click", function () {
      physics.reset();
      sceneAPI.resetPackets();
    });

    els.chkField.addEventListener("change", function () {
      sceneAPI.fieldGroup.visible = els.chkField.checked;
    });

    els.chkEnergy.addEventListener("change", function () {
      sceneAPI.packetGroup.visible = els.chkEnergy.checked;
    });
  }

  window.ui = { init, frame };
})();