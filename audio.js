// ============================================================================
// FORZA HORIZON UZ - PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
// Hech qanday tashqi audio fayllarsiz to'liq realistik dvigatel, shina, signal va effektlar
// ============================================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.engineVolume = 0.7;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.4;

    // Nodes
    this.masterGain = null;
    this.engineGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    // Drift / Tire screech
    this.tireNoise = null;
    this.tireGain = null;
    this.tireFilter = null;

    // Turn signal relay
    this.turnSignalTimer = null;
    this.turnSignalPhase = 0;

    // Radio music state
    this.radioPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Channel Gains
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initEngineAudio();
      this.initTireAudio();

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API is not supported or blocked:", e);
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  initEngineAudio() {
    if (!this.ctx) return;

    // Dual oscillator for rich throaty engine harmonics
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = "sawtooth";
    this.engineOsc1.frequency.setValueAtTime(35, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "triangle";
    this.engineOsc2.frequency.setValueAtTime(70, this.ctx.currentTime);

    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = "sine";
    this.engineSub.frequency.setValueAtTime(30, this.ctx.currentTime);

    // Lowpass filter simulates exhaust and air intake
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  initTireAudio() {
    if (!this.ctx) return;

    // White noise generator for tire drift and asphalt friction
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.tireNoise = this.ctx.createBufferSource();
    this.tireNoise.buffer = noiseBuffer;
    this.tireNoise.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = "bandpass";
    this.tireFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoise.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.sfxGain);

    this.tireNoise.start();
  }

  startEngine() {
    this.init();
    this.resumeContext();
    if (!this.ctx) return;

    this.isEngineRunning = true;

    // Starter crank sound (Crank-crank-vroom!)
    const now = this.ctx.currentTime;
    this.playStarterCrank();

    // Fade engine gain in
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setValueAtTime(0, now);
    this.engineGain.gain.linearRampToValueAtTime(this.engineVolume * 0.4, now + 0.6);
    this.engineGain.gain.linearRampToValueAtTime(this.engineVolume * 0.6, now + 1.2);
  }

  stopEngine() {
    if (!this.ctx || !this.isEngineRunning) return;
    this.isEngineRunning = false;
    const now = this.ctx.currentTime;

    // Fade down
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.linearRampToValueAtTime(0, now + 0.5);

    // Rumble down frequency
    this.engineOsc1.frequency.linearRampToValueAtTime(15, now + 0.5);
    this.engineOsc2.frequency.linearRampToValueAtTime(20, now + 0.5);
  }

  playStarterCrank() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(18, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  updateEngine(rpmRatio, throttle, speedKmh) {
    if (!this.ctx || !this.isEngineRunning) return;

    const now = this.ctx.currentTime;
    // Base frequency from 30Hz (idle) up to 280Hz (redline 8000 RPM)
    const baseFreq = 30 + rpmRatio * 220 + (throttle ? 25 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Filter opens up with throttle and speed
    const cutoff = 250 + rpmRatio * 2200 + (throttle ? 800 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

    // Dynamic volume
    const targetGain = this.engineVolume * (0.35 + rpmRatio * 0.45 + (throttle ? 0.2 : 0));
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  updateTireDrift(slipAmount) {
    if (!this.ctx || !this.tireGain) return;
    const now = this.ctx.currentTime;
    // SlipAmount is 0 to 1
    const clampedSlip = Math.min(Math.max(slipAmount, 0), 1);
    const targetGain = clampedSlip > 0.15 ? Math.pow(clampedSlip, 1.5) * this.sfxVolume * 0.6 : 0;
    this.tireGain.gain.setTargetAtTime(targetGain, now, 0.08);

    // Pitch changes with intensity
    const freq = 900 + clampedSlip * 800;
    this.tireFilter.frequency.setTargetAtTime(freq, now, 0.08);
  }

  playHorn(start) {
    this.init();
    this.resumeContext();
    if (!this.ctx) return;

    if (start) {
      if (this.hornOsc1) return;
      const now = this.ctx.currentTime;
      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();
      this.hornGain = this.ctx.createGain();

      this.hornOsc1.type = "sawtooth";
      this.hornOsc2.type = "sawtooth";
      this.hornOsc1.frequency.setValueAtTime(392, now); // G4
      this.hornOsc2.frequency.setValueAtTime(493.88, now); // B4

      this.hornGain.gain.setValueAtTime(0, now);
      this.hornGain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, now + 0.05);

      this.hornOsc1.connect(this.hornGain);
      this.hornOsc2.connect(this.hornGain);
      this.hornGain.connect(this.sfxGain);

      this.hornOsc1.start();
      this.hornOsc2.start();
    } else {
      if (this.hornGain) {
        const now = this.ctx.currentTime;
        this.hornGain.gain.linearRampToValueAtTime(0, now + 0.08);
        setTimeout(() => {
          if (this.hornOsc1) {
            this.hornOsc1.stop();
            this.hornOsc2.stop();
            this.hornOsc1 = null;
            this.hornOsc2 = null;
            this.hornGain = null;
          }
        }, 100);
      }
    }
  }

  playTurnSignalClick(isHigh) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(isHigh ? 1300 : 950, now);

    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playWiperSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.25);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, now);

    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playCrash() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Metallic punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    oscGain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playTurboBlowoff() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // High hiss whoosh
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 0.35);
    filter.Q.setValueAtTime(5.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  playCheckpointSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }

  playVictorySound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chords = [
      [523.25, 659.25, 783.99], // C
      [587.33, 739.99, 880.00], // D
      [659.25, 830.61, 987.77], // E
      [783.99, 987.77, 1174.66] // G
    ];

    chords.forEach((chord, step) => {
      const stepTime = now + step * 0.22;
      chord.forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, stepTime);

        gain.gain.setValueAtTime(0.15 * this.sfxVolume, stepTime);
        gain.gain.linearRampToValueAtTime(0, stepTime + (step === 3 ? 0.8 : 0.2));

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(stepTime);
        osc.stop(stepTime + (step === 3 ? 0.85 : 0.22));
      });
    });
  }

  playCoinSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  toggleRadio() {
    this.init();
    this.resumeContext();
    if (this.radioPlaying) {
      this.stopRadio();
    } else {
      this.startRadio();
    }
    return this.radioPlaying;
  }

  startRadio() {
    if (!this.ctx) return;
    this.radioPlaying = true;
    this.musicStep = 0;

    // Synthwave procedural bass & lead chords
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 98.0, 123.47]; // A minor vibe
    const tempo = 125; // BPM
    const stepInterval = (60 / tempo) * 1000 / 2; // eighth notes

    this.musicTimer = setInterval(() => {
      if (!this.radioPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const noteFreq = bassline[this.musicStep % bassline.length];

      // Bass synth
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(noteFreq / 2, now);

      filt.type = "lowpass";
      filt.frequency.setValueAtTime(450, now);
      filt.frequency.exponentialRampToValueAtTime(150, now + 0.2);

      gain.gain.setValueAtTime(0.2 * this.musicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filt);
      filt.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.24);

      // Hi-hat noise on offbeats
      if (this.musicStep % 2 === 1) {
        this.playHiHat(now);
      }

      this.musicStep++;
    }, stepInterval);
  }

  playHiHat(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(7500, time);

    gain.gain.setValueAtTime(0.05 * this.musicVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.055);
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setEngineVolume(val) {
    this.engineVolume = Math.max(0, Math.min(1, val));
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }
}

export const soundManager = new SoundManager();
