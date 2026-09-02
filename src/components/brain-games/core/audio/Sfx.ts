/**
 * Tiny WebAudio blip synth.
 *
 * Synthesised rather than sampled so the bundle carries no audio assets and
 * 20 games can share one voice. The context is created lazily on first play
 * because browsers refuse to start audio before a user gesture.
 */
type Voice = 'correct' | 'wrong' | 'levelup' | 'tick' | 'finish';

interface Note {
  freq: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
  slideTo?: number;
}

const VOICES: Record<Voice, Note[]> = {
  correct: [{ freq: 880, slideTo: 1320, dur: 0.11, type: 'sine', gain: 0.16 }],
  wrong: [{ freq: 260, slideTo: 150, dur: 0.2, type: 'triangle', gain: 0.18 }],
  levelup: [
    { freq: 660, dur: 0.09, type: 'sine', gain: 0.14 },
    { freq: 880, dur: 0.09, type: 'sine', gain: 0.14, delay: 0.08 },
    { freq: 1320, dur: 0.16, type: 'sine', gain: 0.14, delay: 0.16 },
  ],
  tick: [{ freq: 520, dur: 0.07, type: 'sine', gain: 0.1 }],
  finish: [
    { freq: 523, dur: 0.14, type: 'sine', gain: 0.14 },
    { freq: 784, dur: 0.24, type: 'sine', gain: 0.14, delay: 0.13 },
  ],
};

/**
 * Movement sounds: waves, wind, a cup sliding.
 *
 * These are noise, not notes. The standard way to synthesise a wave or a
 * whoosh is filtered white noise whose amplitude is shaped by a slow envelope —
 * the filter sweep gives the movement its direction, the envelope gives it its
 * swell. Sampling them instead would mean audio files, licences to track and a
 * heavier bundle, for sounds that are mostly noise anyway.
 *
 * They sit a little under the blips, but only a little. A band-pass throws away
 * most of white noise's amplitude — roughly 70% of it here — so a gain that
 * looks modest next to an oscillator's is inaudible in practice. These numbers
 * were set by measuring peak output against the existing voices, not by eye.
 */
type NoiseVoice = 'wave' | 'swipe' | 'shuffle';

interface Whoosh {
  dur: number;
  /** Band-pass centre at the start and at the end, in Hz. */
  from: number;
  to: number;
  /** Filter resonance. Higher is narrower and more whistle-like. */
  q: number;
  gain: number;
  /** Share of the duration spent swelling, before it falls away. */
  attack: number;
}

const NOISES: Record<NoiseVoice, Whoosh> = {
  // A swell that rolls in and recedes: low, slow, and never sharp.
  wave: { dur: 1.7, from: 480, to: 150, q: 0.7, gain: 0.38, attack: 0.42 },
  // Air moving past — a bird turning, a leaf carried. Short and bright.
  swipe: { dur: 0.24, from: 700, to: 2100, q: 1.1, gain: 0.3, attack: 0.28 },
  // A cup dragged across the table: brief, low, no whistle to it.
  shuffle: { dur: 0.13, from: 900, to: 320, q: 0.9, gain: 0.24, attack: 0.2 },
};

let ctx: AudioContext | null = null;
let muted = false;

/**
 * Run `emit` against a *running* context.
 *
 * Browsers hand back a suspended context until a user gesture, and its clock
 * does not advance while suspended — so a sound scheduled at `currentTime` in
 * that state is scheduled into a moment that never arrives, and is simply lost.
 * That is why the first blip of a session went missing. Resuming is a promise,
 * so when the context is not running yet the work waits for it.
 */
function withAudio(emit: (context: AudioContext) => void): void {
  if (muted) return;
  try {
    if (!ctx) {
      // Safari only exposes the prefixed constructor. Named rather than cast
      // through `any`, so the reach for it says what it is looking for.
      const AudioCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
    }
    const context = ctx;
    if (context.state === 'running') {
      emit(context);
    } else {
      void context.resume().then(() => emit(context)).catch(() => {});
    }
  } catch {
    /* audio is a nice-to-have; never let it break the round */
  }
}
/** Two seconds of white noise, made once and shared by every whoosh. */
let noiseBuffer: AudioBuffer | null = null;

function whiteNoise(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const frames = context.sampleRate * 2;
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

export function setMuted(next: boolean): void {
  muted = next;
}

export function play(voice: Voice): void {
  withAudio((ctx) => {
    for (const note of VOICES[voice]) {
      const at = ctx.currentTime + (note.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, at);
      if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, at + note.dur);

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(note.gain, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + note.dur + 0.02);
    }
  });
}

/**
 * Play a movement sound.
 *
 * Each call starts the noise at a random offset in the shared buffer, so a
 * sound repeated quickly — a cup shuffled eight times in a row — does not comb
 * into an obvious loop.
 */
export function playNoise(voice: NoiseVoice): void {
  withAudio((ctx) => {
    const n = NOISES[voice];
    const at = ctx.currentTime;
    const src = ctx.createBufferSource();
    const buffer = whiteNoise(ctx);
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = n.q;
    filter.frequency.setValueAtTime(n.from, at);
    filter.frequency.exponentialRampToValueAtTime(n.to, at + n.dur);

    const gain = ctx.createGain();
    const peak = at + n.dur * n.attack;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(n.gain, peak);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.dur);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(at, Math.random() * (buffer.duration - n.dur - 0.05));
    src.stop(at + n.dur + 0.02);
  });
}
