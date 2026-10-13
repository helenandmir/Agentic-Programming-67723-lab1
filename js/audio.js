// Synthesized sound effects (Web Audio API, no audio files) + mute toggle.

export function createAudio(ctx) {
  let ac = null;
  let master = null;
  let noise = null;
  let muted = false;
  try { muted = localStorage.getItem('uhab-muted') === '1'; } catch { /* storage unavailable */ }
  const VOL = 0.5;
  const btn = document.getElementById('mute');

  function renderBtn() {
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }
  renderBtn();
  btn.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem('uhab-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOL, ac.currentTime, 0.02);
    renderBtn();
    if (!muted) chime();
  });

  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      ac = null;
    }
  }

  const ok = () => {
    if (!ac) return false;
    if (ac.state === 'suspended') ac.resume();
    return true;
  };

  function env(gainNode, t0, peak, attack, release) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
  }

  function tone({ type = 'sine', f0, f1, dur, peak = 0.3, delay = 0, vibrato = 0, vibratoDepth = 0, filter = null }) {
    if (!ok()) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    let lfo;
    if (vibrato) {
      lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = vibratoDepth;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    const g = ac.createGain();
    env(g, t0, peak, 0.01, dur);
    let node = o;
    if (filter) {
      const f = ac.createBiquadFilter();
      Object.assign(f, { type: filter.type });
      f.frequency.value = filter.freq;
      f.Q.value = filter.q ?? 1;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noiseBurst({ dur, peak = 0.5, delay = 0, type = 'lowpass', f0 = 800, f1 = 60, q = 1, attack = 0.01 }) {
    if (!ok()) return;
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain();
    env(g, t0, peak, attack, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + attack + dur + 0.05);
  }

  function quack(delay = 0) {
    for (const d of [0, 0.22]) {
      tone({ type: 'sawtooth', f0: 430, f1: 250, dur: 0.18, peak: 0.35, delay: delay + d, vibrato: 18, vibratoDepth: 35, filter: { type: 'bandpass', freq: 1200, q: 2.5 } });
    }
  }
  function boom() {
    noiseBurst({ dur: 0.9, peak: 0.9, f0: 900, f1: 50 });
    tone({ type: 'sine', f0: 120, f1: 38, dur: 0.8, peak: 0.8 });
  }
  function boing() {
    tone({ type: 'sine', f0: 180, f1: 520, dur: 0.35, peak: 0.22, vibrato: 14, vibratoDepth: 30 });
  }
  function whoosh() {
    noiseBurst({ dur: 1.3, peak: 0.35, type: 'bandpass', f0: 300, f1: 2600, q: 1.5, attack: 0.5 });
  }
  function chime() {
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.7, peak: 0.16, delay: i * 0.08 }));
  }
  function rumble(dur = 3) {
    noiseBurst({ dur, peak: 0.6, f0: 160, f1: 60, attack: dur * 0.6 });
  }
  function cluck() {
    tone({ type: 'square', f0: 950, f1: 600, dur: 0.07, peak: 0.08, filter: { type: 'lowpass', freq: 2200 } });
  }
  function glitch() {
    for (let i = 0; i < 5; i++) tone({ type: 'square', f0: 200 + Math.random() * 1400, dur: 0.05, peak: 0.1, delay: i * 0.06 });
  }

  return { init, quack, boom, boing, whoosh, chime, rumble, cluck, glitch, get muted() { return muted; } };
}
