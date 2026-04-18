// Synthesized audio for the quiz game using WebAudio
window.QuizAudio = (function() {
  let ctx = null;
  let masterGain = null;
  let tensionNodes = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({freq=440, dur=0.2, type='sine', vol=0.3, attack=0.01, decay=0.1, delay=0}) {
    if (muted) return;
    ensureCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function click() {
    tone({freq: 800, dur: 0.05, type: 'square', vol: 0.15, attack: 0.001});
  }

  function lockIn() {
    // Dramatic descending then resolving stab
    tone({freq: 220, dur: 0.4, type: 'sawtooth', vol: 0.2});
    tone({freq: 165, dur: 0.5, type: 'sawtooth', vol: 0.2, delay: 0.05});
    tone({freq: 110, dur: 0.6, type: 'sine', vol: 0.3, delay: 0.1});
  }

  function correct() {
    // Triumphant ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone({freq: f, dur: 0.4, type: 'triangle', vol: 0.3, delay: i * 0.08}));
    // Bass thud
    tone({freq: 130, dur: 0.6, type: 'sine', vol: 0.4});
  }

  function wrong() {
    // Buzzer / dissonant fall
    tone({freq: 196, dur: 0.6, type: 'sawtooth', vol: 0.3});
    tone({freq: 185, dur: 0.6, type: 'sawtooth', vol: 0.3});
    tone({freq: 98, dur: 0.8, type: 'square', vol: 0.25, delay: 0.1});
    tone({freq: 87, dur: 0.8, type: 'square', vol: 0.25, delay: 0.1});
  }

  function startTension() {
    if (muted) return;
    stopTension();
    ensureCtx();
    const now = ctx.currentTime;

    // Ticking clock only - clean tick-tock, no drone
    let beat = now + 1.0;
    const beats = [];
    let tickCount = 0;
    const scheduleBeats = () => {
      const ahead = ctx.currentTime + 4;
      while (beat < ahead) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(tickCount % 2 === 0 ? 1000 : 750, beat);
        g.gain.setValueAtTime(0.0001, beat);
        g.gain.linearRampToValueAtTime(0.02, beat + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, beat + 0.08);
        o.connect(g).connect(masterGain);
        o.start(beat);
        o.stop(beat + 0.1);
        beats.push(o);
        beat += 1.0;
        tickCount++;
      }
    };
    scheduleBeats();
    const interval = setInterval(scheduleBeats, 2000);

    tensionNodes = { interval };
  }

  function stopTension() {
    if (!tensionNodes) return;
    try {
      clearInterval(tensionNodes.interval);
    } catch (e) {}
    tensionNodes = null;
  }

  function lifeline() {
    tone({freq: 440, dur: 0.15, type: 'triangle', vol: 0.25});
    tone({freq: 660, dur: 0.2, type: 'triangle', vol: 0.25, delay: 0.08});
    tone({freq: 880, dur: 0.3, type: 'triangle', vol: 0.25, delay: 0.16});
  }

  function intro() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((f, i) => tone({freq: f, dur: 0.3, type: 'triangle', vol: 0.3, delay: i * 0.1}));
  }

  function setMuted(m) {
    muted = m;
    if (m) stopTension();
  }

  function isMuted() { return muted; }

  return { click, lockIn, correct, wrong, startTension, stopTension, lifeline, intro, setMuted, isMuted, ensureCtx };
})();
