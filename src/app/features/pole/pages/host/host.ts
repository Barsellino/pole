import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { GameStateService, Player, Topic } from '../../../../service/GameStateService';
import { TopicService } from '../../../../service/TopicService';
import { SoundService } from '../../../../service/SoundService';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './host.html',
  styleUrl: './host.css'
})
export class Host implements OnInit, OnDestroy {
  private gs = inject(GameStateService);
  private topicSvc = inject(TopicService);
  private sound = inject(SoundService);

  topic: Topic | null = null;
  activePlayer: Player = 'A';
  perPlayerSec = 60;
  timeA = 60;
  timeB = 60;
  running = false;

  topics: Topic[] = [];

  // прев’ю поточного кадру з Display
  currentImageSrc: string | null = null;
  currentImageAlt: string = '';

  private sub?: any;

  ngOnInit(): void {
    // розблокувати звук у вкладці Host після першого жесту
    const unlock = () => {
      this.sound.init().then(() => this.sound.resume()).catch(() => {});
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);

    this.sub = this.gs.gameState$.subscribe(s => {
      this.topic = s.topic;
      this.activePlayer = s.activePlayer;
      this.perPlayerSec = s.perPlayerTotalSec;
      this.timeA = Math.floor(s.timeA);
      this.timeB = Math.floor(s.timeB);
      this.running = s.running;

      // оновити прев’ю зображення та alt
      if (s.images?.length) {
        const item = s.images[s.imageIndex % s.images.length];
        this.currentImageSrc = item?.src ?? null;
        this.currentImageAlt = item?.alt ?? (this.topic?.name ?? '');
      } else {
        this.currentImageSrc = this.topic?.imageUrl ?? null;
        this.currentImageAlt = this.topic?.name ?? '';
      }
    });

    // Завантажити теми (синхронно, без subscribe)
    this.topics = this.topicSvc.loadTopicsSync();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }

  chooseTopic(t: Topic) {
    this.gs.setTopic(t);
  }

  setPerPlayerTime(val: string | number) { this.gs.setPerPlayerTime(Number(val) || 60); }
  resetTimes() { this.gs.resetTimes(); }
  startTurn(p: Player) { this.gs.startTurn(p); }
  pauseAll() { this.gs.pauseAll(); }

  // при натисканні "Правильно" — позитивний звук
  correct() {
    this.sound.play('correct');
    this.gs.correct();
  }

  // при натисканні "Пас/Хибно" — негативний звук
  passOrWrong() {
    this.sound.play('wrong');
    this.gs.passOrWrong();
  }

  togglePlayer() { this.gs.startTurn(this.activePlayer === 'A' ? 'B' : 'A'); }
  setTopicName(name: string) {
    const topic = { ...(this.topic ?? { id: 'custom', imageUrl: '' }), name };
    this.gs.setTopic(topic);
  }
  setTopicImage(imageUrl: string) {
    const topic = { ...(this.topic ?? { id: 'custom', name: '' }), imageUrl };
    this.gs.setTopic(topic);
  }
  openDisplay() { window.open('/display', 'pole-display', 'noopener,noreferrer'); }
}
