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
  compressor.threshold.value = -16;
  compressor.knee.value = 4;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;
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

  const distortionCurve = Float32Array.from({ length: 1024 }, (_, index) => {
    const sample = (index / 1023) * 2 - 1;
    return Math.tanh(sample * 5) / Math.tanh(5);
  });

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
      grit?: boolean;
      cutoff?: number;
    } = {},
  ) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = options.cutoff ?? 6000;
    const distortion = options.grit ? context.createWaveShaper() : undefined;
    if (distortion) distortion.curve = distortionCurve;
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
    if (distortion) {
      oscillator.connect(distortion);
      distortion.connect(filter);
    } else {
      oscillator.connect(filter);
    }
    filter.connect(envelope);
    envelope.connect(panner);
    panner.connect(master);
    if (options.echo) panner.connect(reverb);
    oscillator.start(start);
    oscillator.stop(start + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      distortion?.disconnect();
      filter.disconnect();
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

  tone(0, 1.72, 41, 27, 0.62, { attack: 0.45 });
  tone(0.08, 1.62, 104, 57, 0.12, {
    type: "sawtooth",
    attack: 1.2,
    grit: true,
    cutoff: 400,
    pan: -0.25,
  });
  tone(0.12, 1.55, 109, 61, 0.1, {
    type: "sawtooth",
    attack: 1.15,
    grit: true,
    cutoff: 400,
    pan: 0.25,
  });
  rush(0.2, 1.5, 350, 2100, 0.3, 1.2);
  for (const delay of [0.12, 0.62, 1.04, 1.37]) {
    tone(delay, 0.16, 76, 35, 0.38, { type: "triangle", cutoff: 160 });
    tone(delay + 0.09, 0.13, 62, 30, 0.24, { cutoff: 140 });
  }
  for (const delay of [0.4, 0.95, 1.33, 1.55]) {
    rush(delay, 0.08, 3500, 900, 0.12, 0.005);
  }

  return {
    reveal() {
      if (disposed) return;
      tone(0, 1.6, 98, 23, 0.95, { attack: 0.01 });
      tone(0.02, 0.9, 67, 31, 0.35, { type: "triangle", cutoff: 350 });
      tone(0, 0.8, 165, 46, 0.3, {
        type: "sawtooth",
        cutoff: 900,
        grit: true,
        echo: true,
      });
      rush(0, 0.8, 4100, 180, 0.7, 0.008);
      rush(0.04, 0.18, 8000, 900, 0.2, 0.005);
      for (const [index, frequency] of [311, 329, 466, 497].entries()) {
        tone(index * 0.025, 0.65, frequency, frequency * 0.52, 0.075, {
          type: "sawtooth",
          grit: true,
          cutoff: 1600,
          pan: index % 2 === 0 ? -0.6 : 0.6,
          echo: true,
        });
      }
      rush(0.25, 1.4, 2100, 240, 0.25, 0.12);
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
