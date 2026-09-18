// A hard material click, like a marble or knuckle tapped on wood: one very
// short contact transient plus two lower, damped wood resonances. No elastic bend, no wobble, no glide — nothing rubbery.
// No audio resources exist until a spinner click.
export function createWoodClick(getWindow = () => window) {
  let context = null;
  let noise = null;
  let disposed = false;
  let resuming = false;
  const voices = new Set();
  const tail = 0.06; // Bounded voice length: the click is over in well under 100 ms.
  const grainLength = 0.02; // Length of the hard contact transient.
  const maxVoices = 4;
  const masterLevel = 0.14; // Keeps four overlapping taps comfortably quiet.

  const sound = () => {
    if (disposed || context?.state !== 'running') return;
    // Bound the combined volume even when clicks arrive faster than taps decay.
    if (voices.size >= maxVoices) voices.values().next().value();
    const nodes = [];
    const sources = [];
    const schedule = [];
    const release = () => {
      voices.delete(release);
      for (const source of sources) {
        source.onended = null;
        try { source.stop(); } catch { /* Already ended. */ }
      }
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* Partial/unsupported graph. */ }
      }
    };
    voices.add(release);
    try {
      const now = context.currentTime;
      const make = method => { const node = context[method](); nodes.push(node); return node; };
      const bus = make('createGain');
      bus.gain.setValueAtTime(masterLevel, now);
      bus.connect(context.destination);

      // A short grain keeps a solid contact edge while the lower body gives
      // the tap depth. Keep the fast attack: deeper need not mean squishy.
      const grain = make('createBufferSource');
      sources.push(grain);
      grain.buffer = noise;
      const knockTone = make('createBiquadFilter');
      knockTone.type = 'bandpass';
      knockTone.frequency.setValueAtTime(1600, now);
      knockTone.Q.setValueAtTime(1.1, now);
      const knockGain = make('createGain');
      knockGain.gain.setValueAtTime(0, now);
      knockGain.gain.linearRampToValueAtTime(0.5, now + 0.0005);
      knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      grain.connect(knockTone);
      knockTone.connect(knockGain);
      knockGain.connect(bus);
      schedule.push([grain, now, now + grainLength]);

      // The body. Two lower damped wood partials ring just after the transient;
      // a tiny random detune keeps repeated taps from sounding machine-made.
      const detune = 1 + (Math.random() - 0.5) * 0.03; // Within ±1.5% of centre; fixed for each tap.
      const partials = [
        { frequency: 950, peak: 0.22, decay: 0.05, hold: tail },
        { frequency: 1550, peak: 0.12, decay: 0.035, hold: 0.045 },
      ];
      for (const partial of partials) {
        const tone = make('createOscillator');
        sources.push(tone);
        tone.type = 'sine';
        tone.frequency.setValueAtTime(partial.frequency * detune, now); // Fixed: never glides.
        const toneGain = make('createGain');
        toneGain.gain.setValueAtTime(0, now);
        toneGain.gain.linearRampToValueAtTime(partial.peak, now + 0.001);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
        tone.connect(toneGain);
        toneGain.connect(bus);
        schedule.push([tone, now, now + partial.hold]);
      }

      sources[1].onended = release; // The lower partial is the longest source.
      // Build the whole graph before starting any source, so a failed graph
      // cannot leave half a click playing.
      for (const [source, start, stop] of schedule) {
        source.start(start);
        source.stop(stop);
      }
    } catch {
      release(); // Audio failure must never interrupt the toy.
    }
  };

  return {
    play() {
      if (disposed) return;
      try {
        if (!context) {
          const host = getWindow();
          const AudioContext = host?.AudioContext || host?.webkitAudioContext;
          if (!AudioContext) return;
          context = new AudioContext();
        }
        if (!noise) {
          noise = context.createBuffer(1, Math.ceil(context.sampleRate * grainLength), context.sampleRate);
          const data = noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        if (context.state === 'running') sound();
        else if (context.state === 'suspended' && !resuming) {
          resuming = true;
          // Only a deliberate click attempts unlock. Do not queue a burst of
          // stale taps while the browser blocks sound or a tab is muted.
          Promise.resolve(context.resume()).then(sound, () => {}).finally(() => { resuming = false; });
        }
      } catch {
        resuming = false; // Unsupported devices and denied audio stay silent.
      }
    },
    dispose() {
      disposed = true;
      for (const release of voices) release();
      noise = null;
      try {
        if (context && context.state !== 'closed') Promise.resolve(context.close()).catch(() => {});
      } catch { /* Closing may be unavailable or already in progress. */ }
      context = null;
    },
  };
}
