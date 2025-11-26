/**
 * GameManager.ts - Central game state management
 *
 * Responsibilities:
 * - Game state (menu, playing, paused, game over)
 * - Score tracking
 * - Wave/level management
 * - Entity spawning coordination
 *
 * TODO: Implement full game management system
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

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public initialize(app: pc.Application): void {
    this._app = app;
    this.setState('menu');
  }

  public update(dt: number): void {
    if (this.state === 'playing') {
      this.stats.timeElapsed += dt;
    }
  }

  public setState(state: GameState): void {
    const prevState = this.state;
    this.state = state;

    // TODO: Fire state change events
    // TODO: Update UI
  }

  public getState(): GameState {
    return this.state;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public addScore(points: number): void {
    this.stats.score += points;
    // TODO: Update score UI
  }

  public incrementKills(): void {
    this.stats.enemiesKilled++;
  }

  public startGame(): void {
    this.resetStats();
    this.setState('playing');
  }

  public pauseGame(): void {
    if (this.state === 'playing') {
      this.setState('paused');
    }
  }

  public resumeGame(): void {
    if (this.state === 'paused') {
      this.setState('playing');
    }
  }

  public endGame(): void {
    this.setState('gameover');
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
