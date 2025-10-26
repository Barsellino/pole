import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { GameStateService, Player, Topic } from '../../../../service/GameStateService';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [NgIf],
  templateUrl: './display.html',
  styleUrl: './display.css'
})
export class Display implements OnInit, OnDestroy {
  private gs = inject(GameStateService);

  topic: Topic | null = null;
  activePlayer: Player = 'A';
  timeA = 60;
  timeB = 60;
  running = false;

  currentImageSrc: string | null = null;
  currentImageAlt: string = 'Зображення теми';

  private sub?: any;

  ngOnInit(): void {
    this.sub = this.gs.gameState$.subscribe(s => {
      this.topic = s.topic;
      this.activePlayer = s.activePlayer;
      this.timeA = Math.floor(s.timeA);
      this.timeB = Math.floor(s.timeB);
      this.running = s.running;

      if (s.images?.length) {
        const item = s.images[s.imageIndex % s.images.length];
        this.currentImageSrc = item?.src ?? null;
        this.currentImageAlt = item?.alt ?? (this.topic?.name ?? 'Зображення теми');
      } else {
        this.currentImageSrc = this.topic?.imageUrl ?? null;
        this.currentImageAlt = this.topic?.name ?? 'Зображення теми';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }
}
