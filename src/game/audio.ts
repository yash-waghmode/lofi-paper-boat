/**
 * Procedural Web Audio Engine for Lo-Fi Paper Drift
 * Zero external audio files — 100% synthesized in real time.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Continuous ambient & engine nodes
  private riverGain: GainNode | null = null;
  private riverSource: AudioBufferSourceNode | null = null;
  
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;

  private driftGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupContinuousAudio();
      this.isInitialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  private setupContinuousAudio() {
    if (!this.ctx || !this.masterGain) return;

    // 1. River Ambient Hum (Pink/Brown noise loop)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.15;
    }

    const riverSource = this.ctx.createBufferSource();
    riverSource.buffer = noiseBuffer;
    riverSource.loop = true;

    const riverFilter = this.ctx.createBiquadFilter();
    riverFilter.type = 'lowpass';
    riverFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const riverGain = this.ctx.createGain();
    riverGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    riverSource.connect(riverFilter);
    riverFilter.connect(riverGain);
    riverGain.connect(this.masterGain);
    riverSource.start();

    this.riverSource = riverSource;
    this.riverGain = riverGain;

    // 2. Boat Water Glide / Engine tone
    const engineOsc = this.ctx.createOscillator();
    engineOsc.type = 'triangle';
    engineOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    const engineGain = this.ctx.createGain();
    engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(this.masterGain);
    engineOsc.start();

    this.engineOsc = engineOsc;
    this.engineGain = engineGain;

    // 3. Drift Spray Sound
    const driftSource = this.ctx.createBufferSource();
    driftSource.buffer = noiseBuffer;
    driftSource.loop = true;

    const driftFilter = this.ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    driftFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    const driftGain = this.ctx.createGain();
    driftGain.gain.setValueAtTime(0, this.ctx.currentTime);

    driftSource.connect(driftFilter);
    driftFilter.connect(driftGain);
    driftGain.connect(this.masterGain);
    driftSource.start();

    this.driftGain = driftGain;
    this.driftFilter = driftFilter;
  }

  public updateMotorAndDrift(speed: number, maxSpeed: number, isDrifting: boolean, driftFactor: number) {
    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;
    const normSpeed = Math.min(1.0, Math.max(0, speed / maxSpeed));

    // Update boat glide sound
    if (this.engineOsc && this.engineGain) {
      const targetFreq = 70 + normSpeed * 120;
      const targetGain = normSpeed > 0.05 ? 0.08 + normSpeed * 0.18 : 0;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }

    // Update drift spray sound
    if (this.driftGain && this.driftFilter) {
      const targetGain = isDrifting ? 0.22 * driftFactor * normSpeed : 0;
      const targetFreq = 1000 + driftFactor * 800;
      this.driftGain.gain.setTargetAtTime(targetGain, now, 0.04);
      this.driftFilter.frequency.setTargetAtTime(targetFreq, now, 0.04);
    }
  }

  public playSplash(intensity: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.3 + intensity * 0.25;

      // Resonant noise splash
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 300, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noiseSource.start();
    } catch {
      // Audio playback safety
    }
  }

  public playBump(intensity: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140 * intensity, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

      gain.gain.setValueAtTime(0.5 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(now + 0.2);
    } catch {
      // Safety
    }
  }

  public playCheckpointChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Soft cozy pentatonic arpeggio: F5, A5, C6
      const freqs = [698.46, 880.0, 1046.5];
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.65);
      });
    } catch {
      // Safety
    }
  }

  public playLapFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Uplifting cozy lo-fi chords (Maj7)
      const chord = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.18, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 1.25);
      });
    } catch {
      // Safety
    }
  }

  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const melody = [
        { f: 523.25, t: 0.0, d: 0.2 }, // C5
        { f: 659.25, t: 0.18, d: 0.2 }, // E5
        { f: 783.99, t: 0.36, d: 0.25 }, // G5
        { f: 1046.5, t: 0.58, d: 0.8 }, // C6
      ];

      melody.forEach(note => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        gain.gain.setValueAtTime(0.3, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d + 0.1);
      });
    } catch {
      // Safety
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const sound = new SoundEngine();
