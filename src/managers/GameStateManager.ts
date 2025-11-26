/**
 * GameStateManager.ts - Game state and screen management
 *
 * Handles:
 * - Game state transitions (title, playing, paused)
 * - Title screen, pause menu logic
 * - Pointer lock management
 */

import * as pc from 'playcanvas';
import { InputManager } from './InputManager';

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
    this.setupGyroButton();
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
      resumeButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.resumeGame();
      });
    }

    if (quitButton) {
      quitButton.addEventListener('click', () => this.quitToTitle());
      quitButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.quitToTitle();
      });
    }

    if (pauseButton) {
      pauseButton.addEventListener('click', () => this.pauseGame());
      pauseButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.pauseGame();
      });
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

  private setupGyroButton(): void {
    const gyroButton = document.getElementById('gyro-button');
    const gyroStatus = document.getElementById('gyro-status');
    const inputManager = InputManager.getInstance();

    if (!gyroButton) return;

    // Detect in-app browsers (LINE, Facebook, Instagram, Twitter, etc.)
    const ua = navigator.userAgent;
    const isInAppBrowser =
      /\bLine\//i.test(ua) ||      // LINE app: "Line/12.0.0"
      /\bFBAV\//i.test(ua) ||      // Facebook app
      /\bFBAN\//i.test(ua) ||      // Facebook app
      /\bInstagram/i.test(ua) ||   // Instagram app
      /\bTwitter/i.test(ua);       // Twitter/X app

    if (isInAppBrowser) {
      gyroButton.setAttribute('disabled', 'true');
      if (gyroStatus) {
        gyroStatus.innerHTML = 'ブラウザで開いてください<br><small>右下 ⋮ → ブラウザで開く</small>';
      }
      return;
    }

    // Check if gyro is available
    if (!inputManager.isGyroAvailable()) {
      gyroButton.setAttribute('disabled', 'true');
      if (gyroStatus) {
        gyroStatus.textContent = 'ジャイロセンサー非対応';
      }
      return;
    }

    // Check if running on HTTP (not HTTPS) - gyro won't work
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!isSecure) {
      if (gyroStatus) {
        gyroStatus.textContent = 'HTTPS環境が必要です';
      }
    }

    // Handle gyro request - simple approach
    gyroButton.onclick = async () => {
      if (inputManager.isGyroEnabled()) {
        // Already enabled - recalibrate
        inputManager.recalibrateGyro();
        if (gyroStatus) {
          gyroStatus.textContent = 'キャリブレーション完了';
        }
        return;
      }

      if (gyroStatus) {
        gyroStatus.textContent = '許可をリクエスト中...';
      }

      const granted = await inputManager.requestGyroPermission();

      if (granted) {
        gyroButton.classList.add('enabled');
        gyroButton.innerHTML = '<span class="gyro-icon">✓</span><span>ジャイロON</span>';
        if (gyroStatus) {
          gyroStatus.textContent = 'ジャイロセンサー有効';
        }
      } else {
        if (gyroStatus) {
          if (!isSecure) {
            gyroStatus.textContent = 'HTTPS環境でのみ動作します';
          } else {
            gyroStatus.textContent = '設定からモーションを許可してください';
          }
        }
      }
    };
  }
}
