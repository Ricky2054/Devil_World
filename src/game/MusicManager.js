// Music and Sound Manager for Fantasy Knight Adventure
export class MusicManager {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.3;
    this.musicVolume = 0.2;
    this.sfxVolume = 0.4;
    this.currentTrack = null;
    this.isPlaying = false;
    this.tracks = {};
    this.soundEffects = {};
    this.ambientSounds = {};
    this.externalTracks = {}; // decoded AudioBuffers keyed by name
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();
      this.ambientGain = this.audioContext.createGain();
      
      // Connect gain nodes
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      
      // Set initial volumes
      this.masterGain.gain.value = this.masterVolume;
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.ambientGain.gain.value = 0.15;
      
      // Generate procedural music tracks
      this.generateTracks();
      // Try to load external title music (if present in public/music)
      await this.loadExternalTrack('title', '/music/home-screen.mp3');
      
      this.initialized = true;
      console.log('🎵 Music Manager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  async loadExternalTrack(name, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await this.audioContext.decodeAudioData(arrayBuf);
      this.externalTracks[name] = audioBuf;
      console.log(`🎵 Loaded external track: ${name} from ${url}`);
    } catch (e) {
      // Non-fatal; fallback to procedural
      console.warn(`Could not load external track ${name} from ${url}`, e);
    }
  }

  generateTracks() {
    // Generate different atmospheric tracks for different game states
    this.tracks = {
      title: this.createTitleTheme(),
      gameplay_day: this.createDayTheme(),
      gameplay_night: this.createNightTheme(),
      combat: this.createCombatTheme(),
      gameOver: this.createGameOverTheme(),
      victory: this.createVictoryTheme()
    };
    
    // Generate ambient sounds
    this.ambientSounds = {
      wind: this.createWindSound(),
      night_crickets: this.createCricketSound(),
      fire: this.createFireSound(),
      water: this.createWaterSound(),
      forest: this.createForestSound()
    };
  }

  // Create dark, epic title theme
  createTitleTheme() {
    const duration = 30; // 30 second loop
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Deep bass foundation (devil's world feel)
        signal += Math.sin(t * 0.5) * 0.3 * Math.sin(t * 0.1);
        
        // Ominous melody
        const melody = [55, 58, 62, 65, 69, 73, 77, 82]; // Dark minor scale
        const noteIndex = Math.floor(t * 2) % melody.length;
        const freq = melody[noteIndex];
        signal += Math.sin(t * freq * 0.1) * 0.2 * (1 + Math.sin(t * 0.3) * 0.5);
        
        // Atmospheric pad
        signal += Math.sin(t * 0.8) * 0.15 * Math.sin(t * 0.05);
        signal += Math.sin(t * 1.2) * 0.1 * Math.sin(t * 0.07);
        
        // Epic drums
        const drumBeat = Math.floor(t * 4) % 8;
        if (drumBeat === 0 || drumBeat === 4) {
          signal += Math.sin(t * 60) * 0.4 * Math.exp(-(t % 0.25) * 10);
        }
        
        return signal * 0.3;
      }
    };
    return track;
  }

  // Create peaceful day theme
  createDayTheme() {
    const duration = 45;
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Gentle melody
        const melody = [261, 294, 330, 349, 392, 440, 494, 523]; // C major scale
        const noteIndex = Math.floor(t * 1.5) % melody.length;
        const freq = melody[noteIndex];
        signal += Math.sin(t * freq * 0.01) * 0.25 * (1 + Math.sin(t * 0.2) * 0.3);
        
        // Harmony
        signal += Math.sin(t * freq * 0.015) * 0.15;
        
        // Soft percussion
        if (Math.floor(t * 2) % 4 === 0) {
          signal += Math.sin(t * 80) * 0.1 * Math.exp(-(t % 0.5) * 8);
        }
        
        return signal * 0.25;
      }
    };
    return track;
  }

  // Create dark, intense night theme
  createNightTheme() {
    const duration = 40;
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Dark bass line
        signal += Math.sin(t * 0.7) * 0.4 * Math.sin(t * 0.08);
        
        // Eerie melody
        const darkMelody = [110, 117, 123, 131, 139, 147, 156, 165]; // Dark frequencies
        const noteIndex = Math.floor(t * 1.2) % darkMelody.length;
        const freq = darkMelody[noteIndex];
        signal += Math.sin(t * freq * 0.01) * 0.3 * (1 + Math.sin(t * 0.15) * 0.7);
        
        // Whispers and wind
        signal += Math.sin(t * 3.7) * 0.1 * Math.sin(t * 0.03);
        signal += Math.sin(t * 5.1) * 0.08 * Math.sin(t * 0.04);
        
        // Distant thunder
        if (Math.random() < 0.002) {
          signal += Math.sin(t * 30) * 0.5 * Math.exp(-(t % 1) * 3);
        }
        
        return signal * 0.35;
      }
    };
    return track;
  }

  // Create intense combat theme
  createCombatTheme() {
    const duration = 25;
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Aggressive bass
        signal += Math.sin(t * 1.2) * 0.5;
        
        // Fast melody
        const combatMelody = [220, 247, 262, 294, 330, 370, 415, 466];
        const noteIndex = Math.floor(t * 4) % combatMelody.length;
        const freq = combatMelody[noteIndex];
        signal += Math.sin(t * freq * 0.01) * 0.4;
        
        // Heavy drums
        const beat = Math.floor(t * 8) % 4;
        if (beat === 0 || beat === 2) {
          signal += Math.sin(t * 50) * 0.6 * Math.exp(-(t % 0.125) * 15);
        }
        
        return signal * 0.4;
      }
    };
    return track;
  }

  // Create somber game over theme
  createGameOverTheme() {
    const duration = 20;
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Sad melody
        const sadMelody = [196, 208, 220, 233, 247, 262, 277, 294];
        const noteIndex = Math.floor(t * 0.8) % sadMelody.length;
        const freq = sadMelody[noteIndex];
        signal += Math.sin(t * freq * 0.01) * 0.3 * (1 - t / duration * 0.5);
        
        // Fading harmony
        signal += Math.sin(t * freq * 0.015) * 0.2 * (1 - t / duration * 0.3);
        
        return signal * 0.25;
      }
    };
    return track;
  }

  // Create triumphant victory theme
  createVictoryTheme() {
    const duration = 15;
    const track = {
      duration,
      generate: (time) => {
        const t = time % duration;
        let signal = 0;
        
        // Triumphant melody
        const victoryMelody = [523, 587, 659, 698, 784, 880, 988, 1047];
        const noteIndex = Math.floor(t * 3) % victoryMelody.length;
        const freq = victoryMelody[noteIndex];
        signal += Math.sin(t * freq * 0.01) * 0.4;
        
        // Fanfare
        signal += Math.sin(t * freq * 0.02) * 0.3;
        
        // Victory drums
        if (Math.floor(t * 4) % 2 === 0) {
          signal += Math.sin(t * 70) * 0.3 * Math.exp(-(t % 0.25) * 8);
        }
        
        return signal * 0.35;
      }
    };
    return track;
  }

  // Create ambient wind sound
  createWindSound() {
    return {
      generate: (time) => {
        return (Math.random() - 0.5) * 0.1 * (1 + Math.sin(time * 0.3) * 0.5);
      }
    };
  }

  // Create cricket sounds for night
  createCricketSound() {
    return {
      generate: (time) => {
        let signal = 0;
        if (Math.random() < 0.02) {
          signal = Math.sin(time * 800) * 0.05 * Math.exp(-(time % 0.1) * 20);
        }
        return signal;
      }
    };
  }

  // Create fire crackling sound
  createFireSound() {
    return {
      generate: (time) => {
        return (Math.random() - 0.5) * 0.08 * Math.sin(time * 0.5);
      }
    };
  }

  // Create water flowing sound
  createWaterSound() {
    return {
      generate: (time) => {
        return (Math.random() - 0.5) * 0.06 * (1 + Math.sin(time * 0.8) * 0.3);
      }
    };
  }

  // Create forest ambient sound
  createForestSound() {
    return {
      generate: (time) => {
        let signal = (Math.random() - 0.5) * 0.04;
        // Occasional bird chirp
        if (Math.random() < 0.001) {
          signal += Math.sin(time * 1200) * 0.03 * Math.exp(-(time % 0.2) * 15);
        }
        return signal;
      }
    };
  }

  async playTrack(trackName, loop = true) {
    if (!this.initialized || !this.audioContext) return;
    
    // Stop current track
    this.stopCurrentTrack();
    
    // Prefer external decoded track if available
    const external = this.externalTracks[trackName];
    if (external) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = external;
        source.loop = loop;
        source.connect(this.musicGain);
        source.start();
        this.currentTrack = { source, name: trackName };
        this.isPlaying = true;
        console.log(`🎵 Playing external track: ${trackName}`);
        return;
      } catch (error) {
        console.warn(`Failed to play external track ${trackName}:`, error);
      }
    }

    const track = this.tracks[trackName];
    if (!track) {
      console.warn(`Track ${trackName} not found`);
      return;
    }
    
    try {
      // Create buffer for the track
      const sampleRate = this.audioContext.sampleRate;
      const bufferLength = track.duration * sampleRate;
      const buffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Generate audio data
      for (let i = 0; i < bufferLength; i++) {
        const time = i / sampleRate;
        channelData[i] = track.generate(time);
      }
      
      // Create and configure source
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(this.musicGain);
      
      // Start playback
      source.start();
      this.currentTrack = { source, name: trackName };
      this.isPlaying = true;
      
      console.log(`🎵 Playing track: ${trackName}`);
    } catch (error) {
      console.warn(`Failed to play track ${trackName}:`, error);
    }
  }

  stopCurrentTrack() {
    if (this.currentTrack && this.currentTrack.source) {
      try {
        this.currentTrack.source.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.currentTrack = null;
      this.isPlaying = false;
    }
  }

  playAmbient(soundName) {
    if (!this.initialized || !this.audioContext) return;
    
    const sound = this.ambientSounds[soundName];
    if (!sound) return;
    
    // Create a continuous ambient sound
    const bufferLength = this.audioContext.sampleRate * 2; // 2 second loop
    const buffer = this.audioContext.createBuffer(1, bufferLength, this.audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferLength; i++) {
      const time = i / this.audioContext.sampleRate;
      channelData[i] = sound.generate(time);
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.ambientGain);
    source.start();
    
    // Store reference to stop later if needed
    if (!this.activeAmbients) this.activeAmbients = [];
    this.activeAmbients.push(source);
  }

  playSFX(type, frequency = 440, duration = 0.2) {
    if (!this.initialized || !this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.sfxGain);
      
      // Configure sound based on type
      switch (type) {
        case 'attack':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + duration);
          break;
        case 'defend':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          break;
        case 'hit':
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(frequency, this.audioContext.currentTime + duration);
          break;
        case 'heal':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          oscillator.frequency.linearRampToValueAtTime(frequency * 1.5, this.audioContext.currentTime + duration);
          break;
        default:
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      }
      
      // Envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play SFX:', error);
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  // Resume audio context (required for user interaction)
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Clean up resources
  destroy() {
    this.stopCurrentTrack();
    if (this.activeAmbients) {
      this.activeAmbients.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
