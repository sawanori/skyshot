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

    // Hide title screen and show countdown
    const titleScreen = document.getElementById('title-screen');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownNumber = document.getElementById('countdown-number');
    const countdownText = document.getElementById('countdown-text');
    const progressBar = document.getElementById('countdown-progress-bar');
    const particlesContainer = document.getElementById('countdown-particles');

    if (titleScreen) {
      titleScreen.classList.add('hidden');
    }

    if (countdownOverlay) {
      countdownOverlay.style.display = 'flex';
    }

    // Create floating particles
    this.createCountdownParticles(particlesContainer);

    // Start 5 second countdown
    const totalSeconds = 5;
    let count = totalSeconds;

    if (countdownNumber) {
      countdownNumber.textContent = count.toString();
      countdownNumber.classList.remove('go-state');
    }
    if (countdownText) {
      countdownText.textContent = 'LAUNCHING';
    }
    if (progressBar) {
      progressBar.style.width = '0%';
    }

    const countdownInterval = setInterval(() => {
      count--;

      // Update progress bar
      if (progressBar) {
        const progress = ((totalSeconds - count) / totalSeconds) * 100;
        progressBar.style.width = `${progress}%`;
      }

      if (countdownNumber) {
        if (count > 0) {
          countdownNumber.textContent = count.toString();

          // Update text based on count
          if (countdownText) {
            if (count === 4) countdownText.textContent = 'SYSTEMS CHECK';
            else if (count === 3) countdownText.textContent = 'ENGINES READY';
            else if (count === 2) countdownText.textContent = 'WEAPONS HOT';
            else if (count === 1) countdownText.textContent = 'STANDBY';
          }
        } else {
          countdownNumber.textContent = 'GO!';
          countdownNumber.classList.add('go-state');
          if (countdownText) {
            countdownText.textContent = 'ENGAGE';
          }
        }
      }

      if (count <= 0) {
        clearInterval(countdownInterval);

        // Hide countdown after a brief delay
        setTimeout(() => {
          if (countdownOverlay) {
            countdownOverlay.style.display = 'none';
          }
          // Reset countdown style for next time
          if (countdownNumber) {
            countdownNumber.classList.remove('go-state');
          }
          // Clear particles
          if (particlesContainer) {
            particlesContainer.innerHTML = '';
          }

          // Actually start the game
          this.actuallyStartGame();
        }, 500);
      }
    }, 1000);
  }

  private createCountdownParticles(container: HTMLElement | null): void {
    if (!container) return;

    // Clear existing particles
    container.innerHTML = '';

    // Create 20 floating particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 3}s`;
      particle.style.animationDuration = `${2 + Math.random() * 2}s`;
      container.appendChild(particle);
    }
  }

  private actuallyStartGame(): void {
    this._state = GameState.Playing;
    this._gameStartTime = Date.now();

    const hud = document.getElementById('hud');

    if (hud) {
      hud.style.display = 'block';
    }

    // Fire game:start event for Score Attack mode
    if (this.app) {
      this.app.fire('game:start');
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
        gyroStatus.innerHTML = '外部ブラウザ（ex:Safari, Chrome）で<br>開いてください';
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
