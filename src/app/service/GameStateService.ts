import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Player = 'A' | 'B';

export interface ImageItem {
  src: string;
  alt: string;
}

export interface Topic {
  id: string;
  name: string;
  imageUrl?: string;     // fallback
  images?: ImageItem[];  // новий формат
}

export interface GameState {
  topic: Topic | null;
  activePlayer: Player;
  timeA: number;
  timeB: number;
  perPlayerTotalSec: number;
  running: boolean;
  images: ImageItem[];   // актуальний список кадрів
  imageIndex: number;    // поточний індекс
}

const STORAGE_KEY = 'pole-game-state-v3';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private state$ = new BehaviorSubject<GameState>(this.loadInitialState());
  readonly gameState$ = this.state$.asObservable();

  private intervalId: any = null;

  get snapshot(): GameState { return this.state$.value; }

  private emit(next: GameState) {
    this.state$.next(next);
    this.persist(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  private patch(p: Partial<GameState>) {
    const next = { ...this.snapshot, ...p };
    this.emit(next);
  }

  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && typeof e.newValue === 'string') {
        try {
          const incoming: GameState = JSON.parse(e.newValue);
          this.state$.next(incoming);
          if (!incoming.running) this.stopInterval();
        } catch {}
      }
    });
  }

  setTopic(topic: Topic | null) {
    // Збираємо images: якщо новий формат є — беремо його; якщо ні — будуємо з imageUrl
    let imgs: ImageItem[] = [];
    if (topic?.images?.length) {
      imgs = topic.images;
    } else if (topic?.imageUrl) {
      imgs = [{ src: topic.imageUrl, alt: topic.name || 'Тема' }];
    }
    // скидаємо таймери і зупиняємо гру при зміні теми
    const s = this.snapshot;
    this.stopInterval();
    this.patch({
      topic,
      images: imgs,
      imageIndex: 0,
      timeA: s.perPlayerTotalSec,
      timeB: s.perPlayerTotalSec,
      running: false,
      activePlayer: 'A'
    });
  }

  setPerPlayerTime(sec: number) {
    const s = Math.max(5, Math.floor(sec));
    this.stopInterval();
    this.patch({ perPlayerTotalSec: s, timeA: s, timeB: s, running: false });
  }

  resetTimes() {
    const s = this.snapshot.perPlayerTotalSec;
    this.stopInterval();
    this.patch({ timeA: s, timeB: s, running: false, imageIndex: 0 });
  }

  startTurn(p: Player) {
    const { images, imageIndex } = this.snapshot;
    const nextIdx = images.length ? (imageIndex + 1) % images.length : 0;
    this.patch({ activePlayer: p, running: true, imageIndex: nextIdx });
    this.startInterval();
  }

  pauseAll() {
    this.patch({ running: false });
    this.stopInterval();
  }

  correct() {
    const next = this.snapshot.activePlayer === 'A' ? 'B' : 'A';
    const canRun = next === 'A' ? this.snapshot.timeA > 0 : this.snapshot.timeB > 0;
    if (canRun) this.startTurn(next);
    else this.pauseAll();
  }

  passOrWrong() {
    // -3 сек активному, перемикаємо картинку, хід не змінюємо
    const s = this.snapshot;
    const penalty = 3;
    const { images, imageIndex } = s;
    const nextIdx = images.length ? (imageIndex + 1) % images.length : imageIndex;

    if (s.activePlayer === 'A') {
      const nextA = Math.max(0, s.timeA - penalty);
      this.patch({ timeA: nextA, imageIndex: nextIdx });
      if (nextA === 0) this.pauseAll();
    } else {
      const nextB = Math.max(0, s.timeB - penalty);
      this.patch({ timeB: nextB, imageIndex: nextIdx });
      if (nextB === 0) this.pauseAll();
    }
  }

  private startInterval() {
    this.stopInterval();
    this.intervalId = setInterval(() => this.tickOnce(), 1000);
  }

  private stopInterval() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tickOnce() {
    const s = this.snapshot;
    if (!s.running) { this.stopInterval(); return; }
    if (s.activePlayer === 'A') {
      const nextA = Math.max(0, s.timeA - 1);
      const next = { ...s, timeA: nextA };
      this.emit(next);
      if (nextA === 0) { if (next.timeB > 0) this.startTurn('B'); else this.pauseAll(); }
    } else {
      const nextB = Math.max(0, s.timeB - 1);
      const next = { ...s, timeB: nextB };
      this.emit(next);
      if (nextB === 0) { if (next.timeA > 0) this.startTurn('A'); else this.pauseAll(); }
    }
  }

  private loadInitialState(): GameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as GameState;
    } catch {}
    return {
      topic: null,
      activePlayer: 'A',
      timeA: 60,
      timeB: 60,
      perPlayerTotalSec: 60,
      running: false,
      images: [],
      imageIndex: 0
    };
  }

  private persist(state: GameState) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
}
