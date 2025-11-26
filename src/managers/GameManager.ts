/**
 * GameManager.ts - Central game state management with Score Attack Mode
 *
 * Responsibilities:
 * - Game state (menu, playing, paused, game over)
 * - Score tracking with 60-second time limit
 * - DOM UI updates for score and timer
 * - Event handling for enemy deaths
 */

import * as pc from 'playcanvas';

export type GameState = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover';

export interface GameStats {
  score: number;
  wave: number;
  enemiesKilled: number;
  timeElapsed: number;
}

export class GameManager {
  private static instance: GameManager;

  private _app: pc.Application | null = null;
  private state: GameState = 'loading';
  private stats: GameStats = {
    score: 0,
    wave: 1,
    enemiesKilled: 0,
    timeElapsed: 0
  };

  // Score Attack Mode properties
  private readonly TIME_LIMIT: number = 60.0;
  private currentTime: number = 60.0;
  private currentScore: number = 0;
  private isPlaying: boolean = false;

  // DOM elements
  private scoreDisplay: HTMLElement | null = null;
  private timerDisplay: HTMLElement | null = null;
  private resultScreen: HTMLElement | null = null;
  private finalScoreDisplay: HTMLElement | null = null;
  private retryButton: HTMLElement | null = null;
  private scoreAttackUI: HTMLElement | null = null;

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public initialize(app: pc.Application): void {
    this._app = app;

    // Get DOM elements for Score Attack UI
    this.scoreDisplay = document.getElementById('score-display');
    this.timerDisplay = document.getElementById('timer-display');
    this.resultScreen = document.getElementById('result-screen');
    this.finalScoreDisplay = document.getElementById('final-score');
    this.retryButton = document.getElementById('retry-btn');
    this.scoreAttackUI = document.getElementById('score-attack-ui');

    // Hide Score Attack UI initially (until game starts)
    if (this.scoreAttackUI) {
      this.scoreAttackUI.style.display = 'none';
    }

    // Add retry button click listener
    if (this.retryButton) {
      this.retryButton.addEventListener('click', () => {
        this.gameStart();
      });
    }

    // Subscribe to enemy:hit event (score on hit)
    app.on('enemy:hit', this.onEnemyHit, this);

    // Subscribe to enemy:dead event (bonus score on kill)
    app.on('enemy:dead', this.onEnemyDead, this);

    // Subscribe to game:start event
    app.on('game:start', () => {
      this.gameStart();
    }, this);

    this.setState('menu');
  }

  public update(dt: number): void {
    if (this.state === 'playing' && this.isPlaying) {
      // Update time elapsed
      this.stats.timeElapsed += dt;

      // Decrement current time
      this.currentTime -= dt;

      // Update timer display
      this.updateTimerDisplay();

      // Check for game over
      if (this.currentTime <= 0) {
        this.currentTime = 0;
        this.gameFinish();
      }
    }
  }

  private updateTimerDisplay(): void {
    if (this.timerDisplay) {
      // Format time with 2 decimal places
      const timeStr = Math.max(0, this.currentTime).toFixed(2);
      this.timerDisplay.textContent = timeStr;

      // Change color to red when time <= 10 seconds
      if (this.currentTime <= 10) {
        this.timerDisplay.style.color = '#ff0000';
        this.timerDisplay.style.textShadow = '0 0 15px #ff0000';
      } else {
        this.timerDisplay.style.color = '#ffff00';
        this.timerDisplay.style.textShadow = '0 0 15px #ffff00';
      }
    }
  }

  private updateScoreDisplay(): void {
    if (this.scoreDisplay) {
      // Format score as 5-digit zero-padded
      const scoreStr = this.currentScore.toString().padStart(5, '0');
      this.scoreDisplay.textContent = scoreStr;
    }
  }

  private onEnemyHit(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.updateScoreDisplay();
    }
  }

  private onEnemyDead(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.stats.enemiesKilled++;
      this.updateScoreDisplay();
    }
  }

  public gameStart(): void {
    this.isPlaying = true;
    this.currentTime = this.TIME_LIMIT;
    this.currentScore = 0;
    this.resetStats();

    // Show Score Attack UI
    if (this.scoreAttackUI) {
      this.scoreAttackUI.style.display = 'block';
    }

    // Hide result screen
    if (this.resultScreen) {
      this.resultScreen.style.display = 'none';
    }

    // Reset displays
    this.updateScoreDisplay();
    this.updateTimerDisplay();

    this.setState('playing');

    // Fire game:reset event
    if (this._app) {
      this._app.fire('game:reset');
    }
  }

  private gameFinish(): void {
    this.isPlaying = false;
    this.setState('gameover');

    // Show result screen
    if (this.resultScreen) {
      this.resultScreen.style.display = 'flex';
    }

    // Update final score
    if (this.finalScoreDisplay) {
      const scoreStr = this.currentScore.toString().padStart(5, '0');
      this.finalScoreDisplay.textContent = scoreStr;
    }

    // Fire game:over event
    if (this._app) {
      this._app.fire('game:over');
    }
  }

  public setState(state: GameState): void {
    const prevState = this.state;
    this.state = state;

    if (this._app) {
      this._app.fire('game:statechange', state, prevState);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public addScore(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.updateScoreDisplay();
    }
  }

  public incrementKills(): void {
    this.stats.enemiesKilled++;
  }

  public startGame(): void {
    this.gameStart();
  }

  public pauseGame(): void {
    if (this.state === 'playing') {
      this.isPlaying = false;
      this.setState('paused');
    }
  }

  public resumeGame(): void {
    if (this.state === 'paused') {
      this.isPlaying = true;
      this.setState('playing');
    }
  }

  public endGame(): void {
    this.gameFinish();
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getCurrentScore(): number {
    return this.currentScore;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private resetStats(): void {
    this.stats = {
      score: 0,
      wave: 1,
      enemiesKilled: 0,
      timeElapsed: 0
    };
  }
}
