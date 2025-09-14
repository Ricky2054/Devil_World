// Simple audio manager for ambience and sfx

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ambience = null;
  }

  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }

  playFootstep() {
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200 + Math.random() * 40, ctx.currentTime);
    g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.06);
  }

  playPickup() {
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(900, ctx.currentTime);
    g.gain.value = 0.06;
    o.connect(g); g.connect(ctx.destination);
    o.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.15);
    o.start(); o.stop(ctx.currentTime + 0.18);
  }

  lightning() {
    const ctx = this.ensure();
    const g = ctx.createGain();
    const n = ctx.createBufferSource();
    n.buffer = this._noise(ctx, 0.2);
    g.gain.value = 0.15;
    n.connect(g); g.connect(ctx.destination);
    n.start();
  }

  ambienceSeason(season) {
    const ctx = this.ensure();
    if (this.ambience) this.ambience.stop();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const base = season === 'Winter' ? 80 : season === 'Rain' ? 120 : 40;
    o.frequency.value = base;
    g.gain.value = 0.01;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    this.ambience = o;
  }

  _noise(ctx, seconds) {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}


