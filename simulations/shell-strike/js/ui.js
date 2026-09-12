(function () {
  "use strict";

  const scenario = window.scenario;
  if (!scenario) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    phase: $("phase-out"),
    spd: $("spd-out"),
    imp: $("imp-out"),
    sens: $("sens-out"),
    log: $("log-list"),
    angleVal: $("angle-val"),
    velVal: $("vel-val"),
    sensVal: $("sens-val"),
    btnFire: $("btn-fire"),
    btnReset: $("btn-reset"),
    btnMute: $("btn-mute"),
    rngAngle: $("rng-angle"),
    rngVel: $("rng-vel"),
    rngSens: $("rng-sens"),
    chkFollow: $("chk-follow"),
  };

  let followCam = true;
  const seenEvents = { count: 0 };

  function pushLog(ev) {
    const li = document.createElement("li");
    const t = ev.t.toFixed(1);
    li.textContent = "[" + t + "s] " + ev.msg;
    if (ev.hot) li.className = "hot";
    if (ev.type === "dormant" || ev.type === "passed") li.className = "good";
    els.log.appendChild(li);
    while (els.log.children.length > 7) els.log.removeChild(els.log.firstChild);
  }

  function frame(s) {
    els.phase.textContent = s.phase;
    els.phase.style.color =
      s.phase === "DETONATED" || s.phase === "DETECTED" ? "#ff8a7a" : s.phase === "DORMANT" ? "#a8e0b0" : "#dce6f5";

    if (s.phase === "FLIGHT") {
      const v = Math.sqrt(
        s.shell.vx * s.shell.vx + s.shell.vy * s.shell.vy + s.shell.vz * s.shell.vz
      );
      els.spd.textContent = v.toFixed(1) + " m/s · " + Math.max(0, s.shell.y).toFixed(1) + " m";
    } else if (s.phase === "IDLE") {
      els.spd.textContent = "loaded · " + s.vel + " m/s @" + s.angleDeg + "°";
    } else {
      els.spd.textContent = "—";
    }

    els.imp.textContent = s.impact ? "x=" + s.impact.x.toFixed(1) + "m, z=" + s.impact.z.toFixed(1) + "m" : "—";

    let sensTxt = s.sensors.length ? s.sensors.length + " pucks live" : "—";
    if (s.vehicle.destroyed) sensTxt += " · truck DOWN";
    else if (s.vehicle.active) sensTxt += " · truck z=" + s.vehicle.z.toFixed(0) + "m";
    els.sens.textContent = sensTxt;

    while (seenEvents.count < s.events.length) {
      pushLog(s.events[seenEvents.count]);
      seenEvents.count++;
    }

    els.btnFire.disabled = s.phase !== "IDLE";
  }

  function init() {
    function syncAngle() {
      scenario.state.angleDeg = +els.rngAngle.value;
      els.angleVal.textContent = scenario.state.angleDeg + "°";
      if (window.syncHowitzer) window.syncHowitzer();
    }
    function syncVel() {
      scenario.state.vel = +els.rngVel.value;
      els.velVal.textContent = scenario.state.vel + " m/s";
    }
    function syncSens() {
      scenario.state.sensorRadius = +els.rngSens.value;
      els.sensVal.textContent = scenario.state.sensorRadius + " m";
    }
    els.rngAngle.addEventListener("input", syncAngle);
    els.rngVel.addEventListener("input", syncVel);
    els.rngSens.addEventListener("input", syncSens);
    syncAngle();
    syncVel();
    syncSens();

    els.btnFire.addEventListener("click", function () {
      window.audio.unlock();
      scenario.fire();
    });
    els.btnReset.addEventListener("click", function () {
      scenario.reset();
      seenEvents.count = 0;
      els.log.innerHTML = "";
      if (window.resetVisuals) window.resetVisuals();
    });
    els.btnMute.addEventListener("click", function () {
      const m = window.audio.toggleMute();
      els.btnMute.textContent = m ? "Unmute" : "Mute";
    });
    els.chkFollow.addEventListener("change", function () {
      followCam = els.chkFollow.checked;
    });
  }

  window.ui = {
    init: init,
    frame: frame,
    isFollowCam: function () {
      return followCam;
    },
  };
})();