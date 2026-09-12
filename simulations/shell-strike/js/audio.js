(function () {
  "use strict";

  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBurst(dur, cutoff, gain) {
    const ac = ensure();
    if (!ac || muted) return;
    try {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const flt = ac.createBiquadFilter();
      flt.type = "lowpass";
      flt.frequency.value = cutoff;
      const g = ac.createGain();
      g.gain.value = gain;
      src.connect(flt);
      flt.connect(g);
      g.connect(ac.destination);
      src.start();
    } catch (err) {}
  }

  function tone(freq, dur, type, gain, slideTo) {
    const ac = ensure();
    if (!ac || muted) return;
    try {
      const o = ac.createOscillator();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + dur);
    } catch (err) {}
  }

  window.audio = {
    unlock: function () {
      ensure();
    },
    fire: function () {
      noiseBurst(0.5, 900, 0.5);
      tone(70, 0.5, "sine", 0.5, 32);
    },
    thud: function () {
      noiseBurst(0.3, 300, 0.4);
    },
    alarm: function () {
      tone(880, 0.15, "square", 0.18);
      const self = this;
      setTimeout(function () {
        tone(880, 0.15, "square", 0.18);
      }, 220);
    },
    boom: function () {
      noiseBurst(2.2, 1400, 0.7);
      tone(55, 1.8, "sine", 0.6, 28);
    },
    toggleMute: function () {
      muted = !muted;
      return muted;
    },
  };
})();