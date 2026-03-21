import type { TimerMode } from '../context/TimerContext';

interface Beep {
  freq: number;
  start: number; // seconds from now
  duration: number; // seconds
}

function scheduleBeeps(beeps: Beep[]): void {
  try {
    const ctx = new AudioContext();
    const end = Math.max(...beeps.map(b => b.start + b.duration)) + 0.1;

    beeps.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + 0.01);
      gain.gain.linearRampToValueAtTime(0, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration);
    });

    setTimeout(() => ctx.close(), end * 1000 + 200);
  } catch {
    // AudioContext unavailable (e.g. SSR or restricted environment)
  }
}

export function playModeSound(mode: TimerMode, enabled: boolean): void {
  if (!enabled) return;

  if (mode === 'focus') {
    // Two short high beeps — "time to focus"
    scheduleBeeps([
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 880, start: 0.18, duration: 0.12 },
    ]);
  } else if (mode === 'short_break') {
    // One soft mid tone — "short rest"
    scheduleBeeps([
      { freq: 528, start: 0, duration: 0.3 },
    ]);
  } else {
    // Three ascending tones — "long break, well done"
    scheduleBeeps([
      { freq: 528, start: 0,    duration: 0.15 },
      { freq: 659, start: 0.2,  duration: 0.15 },
      { freq: 784, start: 0.4,  duration: 0.25 },
    ]);
  }
}
