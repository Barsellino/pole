import { Injectable } from '@angular/core';
import topicsJson from '../../public/topics.json';

export interface ImageItem {
  src: string;
  alt: string;
}

export interface Topic {
  id: string;
  name: string;
  imageUrl?: string;     // fallback для старих тем
  images?: ImageItem[];  // новий формат
}

interface TopicsResponse {
  settings?: { perPlayerSec?: number; roundDurationSec?: number };
  topics: Topic[];
}

@Injectable({ providedIn: 'root' })
export class TopicService {
  private readonly data: TopicsResponse = (topicsJson as unknown) as TopicsResponse;

  loadTopicsSync(): Topic[] {
    // Перетворення старого формату (масив рядків) у новий (об'єкти), якщо таке трапиться
    return (this.data.topics ?? []).map(t => {
      if (Array.isArray((t as any).images)) {
        const arr = (t as any).images;
        if (arr.length && typeof arr[0] === 'string') {
          const name = t.name ?? 'Тема';
          const normalized: ImageItem[] = arr.map((src: string, i: number) => ({
            src,
            alt: `${name} — кадр ${i + 1}`
          }));
          return { ...t, images: normalized };
        }
      }
      return t;
    });
  }

  loadPerPlayerSecSync(): number {
    const s = this.data.settings;
    return s?.perPlayerSec ?? s?.roundDurationSec ?? 60;
  }
}
