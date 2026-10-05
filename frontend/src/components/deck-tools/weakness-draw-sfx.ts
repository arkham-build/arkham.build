export type WeaknessDrawSound = {
  reveal: () => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
};

export function createWeaknessDrawSound(
  muted: boolean,
): WeaknessDrawSound | undefined {
  if (typeof AudioContext === "undefined") return undefined;

  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch (error) {
    console.warn("[weakness-draw] audio unavailable", error);
    return undefined;
  }

  const master = context.createGain();
  master.gain.value = muted ? 0 : 0.48;
  const compressor = context.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(context.destination);

  const noise = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate,
  );
  const samples = noise.getChannelData(0);
  let seed = 1977;
  for (let index = 0; index < samples.length; index++) {
    seed = (seed * 16807) % 2147483647;
    samples[index] = (seed / 2147483647) * 2 - 1;
  }

  const reverb = context.createConvolver();
  const impulse = context.createBuffer(
    2,
    context.sampleRate * 1.4,
    context.sampleRate,
  );
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const tail = impulse.getChannelData(channel);
    for (let index = 0; index < tail.length; index++) {
      seed = (seed * 16807) % 2147483647;
      tail[index] =
        ((seed / 2147483647) * 2 - 1) * (1 - index / tail.length) ** 3;
    }
  }
  reverb.buffer = impulse;
  const wet = context.createGain();
  wet.gain.value = 0.22;
  reverb.connect(wet);
  wet.connect(master);

  let disposed = false;

  function tone(
    delay: number,
    duration: number,
    frequency: number,
    endFrequency: number,
    volume: number,
    options: {
      type?: OscillatorType;
      attack?: number;
      pan?: number;
      echo?: boolean;
    } = {},
  ) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    panner.pan.value = options.pan ?? 0;
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration,
    );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(
      volume,
      start + (options.attack ?? 0.025),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(panner);
    panner.connect(master);
    if (options.echo) panner.connect(reverb);
    oscillator.start(start);
    oscillator.stop(start + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
  }

  function rush(
    delay: number,
    duration: number,
    frequency: number,
    endFrequency: number,
    volume: number,
    attack = duration * 0.35,
  ) {
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration,
    );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
    source.stop(start + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  // Resume in the draw's click handler so browser autoplay rules permit sound.
  void context.resume().catch((error: unknown) => {
    if (!disposed)
      console.warn("[weakness-draw] audio playback unavailable", error);
  });

  tone(0, 1.8, 55, 85, 0.5);
  tone(0, 1.95, 110, 880, 0.18, { type: "triangle", attack: 1.75, echo: true });
  rush(0.1, 1.9, 180, 4800, 0.6, 1.65);
  for (let index = 0; index < 12; index++) {
    const delay = 0.18 + 1.65 * (1 - (1 - index / 12) ** 2);
    const frequency = 146.83 * 2 ** (index / 6);
    tone(delay, 0.14, frequency, frequency / 2, 0.14, {
      type: "triangle",
      pan: index % 2 === 0 ? -0.35 : 0.35,
      echo: true,
    });
  }

  return {
    reveal() {
      if (disposed) return;
      tone(0, 1.2, 160, 32, 0.9);
      tone(0, 0.35, 75, 28, 0.6, { type: "triangle" });
      rush(0, 0.65, 6000, 160, 0.9, 0.008);
      rush(0.04, 0.22, 8000, 2200, 0.3, 0.005);
      for (const [index, frequency] of [
        261.63, 392, 523.25, 783.99, 1046.5,
      ].entries()) {
        const pan = index % 2 === 0 ? -0.5 : 0.5;
        tone(index * 0.055, 1.5, frequency, frequency * 0.995, 0.1, {
          type: "triangle",
          pan,
          echo: true,
        });
        tone(index * 0.055, 1.2, frequency * 2, frequency * 2, 0.035, {
          pan: -pan,
          echo: true,
        });
      }
      rush(0.25, 1.5, 2400, 600, 0.12);
    },
    setMuted(value) {
      if (disposed) return;
      master.gain.setTargetAtTime(value ? 0 : 0.48, context.currentTime, 0.015);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      master.disconnect();
      compressor.disconnect();
      reverb.disconnect();
      wet.disconnect();
      void context.close().catch((error: unknown) => {
        console.warn("[weakness-draw] audio cleanup failed", error);
      });
    },
  };
}
