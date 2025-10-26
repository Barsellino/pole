import { Injectable } from '@angular/core';

type SoundKey = 'tick' | 'correct' | 'wrong' | 'end';

interface LoadedSound {
  buffer: AudioBuffer;
}

@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private masterMuted = false;
  private masterVolume = 0.8;

  private sounds = new Map<SoundKey, LoadedSound>();
  private srcMap: Record<SoundKey, string> = {
    tick: 'assets/sounds/tick.mp3',
    correct: 'assets/sounds/correct.mp3',
    wrong: 'assets/sounds/wrong.mp3',
    end: 'assets/sounds/end.mp3'
  };

  // Щоб не дублювати "end" кілька разів підряд
  private lastPlayed: { key: SoundKey; ts: number } | null = null;

  // Потребує корист. взаємодії (тап/клік) у вкладці Display
  async init(): Promise<void> {
    if (this.ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ctx = new Ctx();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.masterMuted ? 0 : this.masterVolume;
    this.gainNode.connect(this.ctx.destination);

    await this.preloadAll();
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.masterMuted = muted;
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : this.masterVolume;
    try { localStorage.setItem('sound-muted', String(muted)); } catch {}
  }

  setVolume(volume01: number) {
    this.masterVolume = Math.min(1, Math.max(0, volume01));
    if (this.gainNode && !this.masterMuted) this.gainNode.gain.value = this.masterVolume;
    try { localStorage.setItem('sound-volume', String(this.masterVolume)); } catch {}
  }

  getMuted(): boolean { return this.masterMuted; }
  getVolume(): number { return this.masterVolume; }

  async play(key: SoundKey) {
    if (!this.ctx || !this.gainNode) return;
    // захист від спаму однаковим довгим звуком
    const now = performance.now();
    if (this.lastPlayed && this.lastPlayed.key === key && now - this.lastPlayed.ts < 120) {
      // дозволяємо тикати часто; але для інших ефектів є невеликий ліміт
      if (key !== 'tick') return;
    }
    this.lastPlayed = { key, ts: now };

    const loaded = this.sounds.get(key);
    if (!loaded) return;
    const src = this.ctx.createBufferSource();
    src.buffer = loaded.buffer;
    src.connect(this.gainNode);
    src.start();
  }

  // -------- Private --------

  private async preloadAll() {
    // відновити налаштування
    try {
      const m = localStorage.getItem('sound-muted');
      if (m != null) this.masterMuted = m === 'true';
      const v = localStorage.getItem('sound-volume');
      if (v != null) this.masterVolume = Math.min(1, Math.max(0, Number(v)));
      if (this.gainNode) this.gainNode.gain.value = this.masterMuted ? 0 : this.masterVolume;
    } catch {}

    // послідовно або паралельно
    await Promise.all(Object.keys(this.srcMap).map(async k => {
      const key = k as SoundKey;
      const url = this.srcMap[key];
      const buf = await this.fetchDecode(url);
      if (buf) this.sounds.set(key, { buffer: buf });
    }));
  }

  private async fetchDecode(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(arr);
    } catch {
      return null;
    }
  }
}
