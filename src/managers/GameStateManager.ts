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
  private gyroPermissionGranted: boolean = false;
  private pendingStartAfterGyro: boolean = false;

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

    // Check if gyro permission is needed but not granted
    if (this.requiresGyroPermission() && !this.gyroPermissionGranted) {
      // Show message to user
      const gyroStatus = document.getElementById('gyro-status');
      if (gyroStatus) {
        gyroStatus.textContent = '↑ 先にジャイロを許可してください';
        gyroStatus.style.color = '#ff4444';
      }
      return;
    }

    this.showCountdownAndStart();
  }

  /**
   * Check if this device requires gyro permission (iOS 13+)
   */
  private requiresGyroPermission(): boolean {
    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      return false; // PC doesn't need gyro
    }

    // Check if DeviceOrientationEvent exists and requires permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      return true;
    }

    // Android and older iOS don't require explicit permission
    return false;
  }

  /**
   * Setup gyro permission button on title screen
   */
  private setupGyroButton(): void {
    const gyroButton = document.getElementById('gyro-button');
    const gyroStatus = document.getElementById('gyro-status');
    const startButton = document.getElementById('start-button');

    if (!gyroButton) return;

    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // PC: Hide gyro button, allow game start
    if (!isMobile) {
      gyroButton.style.display = 'none';
      if (gyroStatus) gyroStatus.style.display = 'none';
      this.gyroPermissionGranted = true;
      return;
    }

    // Check if iOS requires permission (iOS 13+)
    const requiresPermission = typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    // Android: Show button, allow game start, but still need click handler to enable gyro
    if (!requiresPermission) {
      gyroButton.style.display = 'flex';
      gyroButton.innerHTML = '<span class="gyro-icon">📱</span><span>ジャイロON</span>';
      if (gyroStatus) {
        gyroStatus.textContent = 'タップしてジャイロを有効にしてください';
        gyroStatus.style.color = '#00ffff';
      }
      this.gyroPermissionGranted = true;

      // Set up click handler for Android to actually enable gyro
      (window as any).__requestGyroPermission = async () => {
        try {
          const inputManager = InputManager.getInstance();
          const granted = await inputManager.requestGyroPermission();

          if (granted) {
            gyroButton.classList.add('enabled');
            gyroButton.innerHTML = '<span class="gyro-icon">✓</span><span>ジャイロON</span>';
            if (gyroStatus) {
              gyroStatus.textContent = 'ジャイロが有効になりました！';
              gyroStatus.style.color = '#00ff00';
            }
          }
        } catch (error) {
          console.error('Gyro enable error:', error);
        }
      };
      return;
    }

    // iOS: Show gyro button and disable start button until permission granted
    gyroButton.style.display = 'flex';
    if (startButton) {
      startButton.style.opacity = '0.5';
      startButton.style.pointerEvents = 'none';
    }
    if (gyroStatus) {
      gyroStatus.textContent = 'ゲームをプレイするにはジャイロの許可が必要です';
      gyroStatus.style.color = '#ffff00';
    }

    // Set up global callback for gyro permission button (iOS)
    (window as any).__requestGyroPermission = async () => {
      try {
        // Use InputManager to request permission and enable gyro
        const inputManager = InputManager.getInstance();
        const granted = await inputManager.requestGyroPermission();

        if (granted) {
          this.gyroPermissionGranted = true;

          // Update UI
          gyroButton.classList.add('enabled');
          gyroButton.innerHTML = '<span class="gyro-icon">✓</span><span>ジャイロ許可済み</span>';

          if (gyroStatus) {
            gyroStatus.textContent = 'ジャイロが有効になりました！';
            gyroStatus.style.color = '#00ff00';
          }

          // Enable start button
          if (startButton) {
            startButton.style.opacity = '1';
            startButton.style.pointerEvents = 'auto';
          }
        } else {
          if (gyroStatus) {
            gyroStatus.textContent = '許可されませんでした。もう一度お試しください。';
            gyroStatus.style.color = '#ff4444';
          }
        }
      } catch (error) {
        console.error('Gyro permission error:', error);
        if (gyroStatus) {
          gyroStatus.textContent = 'エラーが発生しました。もう一度お試しください。';
          gyroStatus.style.color = '#ff4444';
        }
      }
    };
  }

  /**
   * Restart game from game over state (called by retry button)
   */
  public restartGame(): void {
    // Hide result screen
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) {
      resultScreen.style.display = 'none';
    }

    // Set state to title temporarily to allow countdown
    this._state = GameState.Title;

    // Show countdown and start
    this.showCountdownAndStart();
  }

  /**
   * Show countdown overlay and start game after countdown
   */
  private showCountdownAndStart(): void {
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

}
