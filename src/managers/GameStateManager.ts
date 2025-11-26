/**
 * GameStateManager.ts - Game state and screen management
 *
 * Handles:
 * - Game state transitions (title, playing, paused)
 * - Title screen, pause menu logic
 * - Pointer lock management
 */

import * as pc from 'playcanvas';

export enum GameState {
  Title = 'title',
  Playing = 'playing',
  Paused = 'paused',
}

export class GameStateManager {
  private static instance: GameStateManager;

  private _state: GameState = GameState.Title;
  private _gameStartTime: number = 0;
  private app: pc.Application | null = null;

  private constructor() {}

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public initialize(app: pc.Application): void {
    this.app = app;
    this.setupTitleScreen();
    this.setupPauseMenu();
    this.setupKeyboardShortcuts();
  }

  public get state(): GameState {
    return this._state;
  }

  public get gameStartTime(): number {
    return this._gameStartTime;
  }

  public get isPlaying(): boolean {
    return this._state === GameState.Playing;
  }

  public get isPaused(): boolean {
    return this._state === GameState.Paused;
  }

  public startGame(): void {
    if (this._state !== GameState.Title) return;

    this._state = GameState.Playing;
    this._gameStartTime = Date.now();

    const titleScreen = document.getElementById('title-screen');
    const hud = document.getElementById('hud');

    if (titleScreen) {
      titleScreen.classList.add('hidden');
    }

    if (hud) {
      hud.style.display = 'block';
    }

    this.requestPointerLock();
  }

  public pauseGame(): void {
    if (this._state !== GameState.Playing) return;

    this._state = GameState.Paused;

    const pauseMenu = document.getElementById('pause-menu');
    const pauseTime = document.getElementById('pause-time');
    const pauseTargets = document.getElementById('pause-targets');

    if (pauseTime) {
      const elapsed = Math.floor((Date.now() - this._gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      pauseTime.textContent = `${minutes}:${seconds}`;
    }

    if (pauseTargets && this.app) {
      const enemies = this.app.root.findByTag('Enemy');
      pauseTargets.textContent = String(enemies.length);
    }

    if (pauseMenu) {
      pauseMenu.classList.add('visible');
    }

    this.exitPointerLock();
  }

  public resumeGame(): void {
    if (this._state !== GameState.Paused) return;

    this._state = GameState.Playing;

    const pauseMenu = document.getElementById('pause-menu');

    if (pauseMenu) {
      pauseMenu.classList.remove('visible');
    }

    this.requestPointerLock();
  }

  public quitToTitle(): void {
    this._state = GameState.Title;

    const pauseMenu = document.getElementById('pause-menu');
    const titleScreen = document.getElementById('title-screen');
    const hud = document.getElementById('hud');

    if (pauseMenu) {
      pauseMenu.classList.remove('visible');
    }

    if (hud) {
      hud.style.display = 'none';
    }

    if (titleScreen) {
      titleScreen.classList.remove('hidden');
    }

    this.exitPointerLock();
  }

  public togglePause(): void {
    if (this._state === GameState.Playing) {
      this.pauseGame();
    } else if (this._state === GameState.Paused) {
      this.resumeGame();
    }
  }

  private setupTitleScreen(): void {
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.addEventListener('click', () => this.startGame());
      startButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.startGame();
      });
    }
  }

  private setupPauseMenu(): void {
    const resumeButton = document.getElementById('resume-button');
    const quitButton = document.getElementById('quit-button');
    const pauseButton = document.getElementById('pause-button');

    if (resumeButton) {
      resumeButton.addEventListener('click', () => this.resumeGame());
    }

    if (quitButton) {
      quitButton.addEventListener('click', () => this.quitToTitle());
    }

    if (pauseButton) {
      pauseButton.addEventListener('click', () => this.pauseGame());
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.togglePause();
      }
    });
  }

  private requestPointerLock(): void {
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.requestPointerLock?.();
    }
  }

  private exitPointerLock(): void {
    document.exitPointerLock?.();
  }
}
