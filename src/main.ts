/**
 * main.ts - Entry point for Vertical Retro Shooter
 * PlayCanvas Engine initialization and game orchestration
 */

import * as pc from 'playcanvas';
import { InputManager } from './managers/InputManager';
import { PlayerController } from './components/PlayerController';
import { WeaponSystem } from './components/WeaponSystem';
import { GameStateManager, GameState } from './managers/GameStateManager';
import { GameManager } from './managers/GameManager';
import { HUDManager } from './ui/HUDManager';
import { createGridFloor, createDirectionalLight, configureSceneEnvironment } from './scene/SceneSetup';
import { createEnemyWaves } from './managers/EnemyManager';
import { SCENE_CONFIG, CAMERA_CONFIG, PLAYER_CONFIG } from './config/GameConfig';

// Global app reference
let app: pc.Application;

// Manager instances
let hudManager: HUDManager;
let gameStateManager: GameStateManager;
let gameManager: GameManager;

// Player controller reference for HUD updates
let playerControllerRef: PlayerController | null = null;

/**
 * Initialize PlayCanvas application
 */
async function init(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  app = createApplication(canvas);

  setupScene();
  initializeManagers();
  setupUpdateLoop();

  hideLoadingOverlay();
}

/**
 * Create and configure the PlayCanvas application
 */
function createApplication(canvas: HTMLCanvasElement): pc.Application {
  const application = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    keyboard: new pc.Keyboard(window),
    graphicsDeviceOptions: {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      preferWebGl2: true,
    },
  });

  application.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  application.setCanvasResolution(pc.RESOLUTION_AUTO);

  window.addEventListener('resize', () => {
    application.resizeCanvas();
  });

  application.start();

  return application;
}

/**
 * Initialize all game managers
 */
function initializeManagers(): void {
  InputManager.getInstance().initialize(app);

  hudManager = new HUDManager(app);
  hudManager.initialize();

  gameStateManager = GameStateManager.getInstance();
  gameStateManager.initialize(app);

  // Initialize Score Attack GameManager
  gameManager = GameManager.getInstance();
  gameManager.initialize(app);

  const hud = document.getElementById('hud');
  if (hud) {
    hud.style.display = 'none';
  }
}

/**
 * Set up the main update loop
 */
function setupUpdateLoop(): void {
  app.on('update', (dt: number) => {
    const state = gameStateManager.state;

    if (state === GameState.Playing) {
      InputManager.getInstance().update();

      // Update GameManager for Score Attack timer
      gameManager.update(dt);

      if (playerControllerRef) {
        hudManager.setGameStartTime(gameStateManager.gameStartTime);
        hudManager.update({
          position: playerControllerRef.getPosition(),
          yaw: playerControllerRef.getYaw(),
          pitch: playerControllerRef.getPitch(),
        });
      }
    }
  });
}

/**
 * Set up the scene with camera, lights, and game objects
 */
function setupScene(): void {
  const camera = createCamera();
  setupPlayerComponents(camera);

  createDirectionalLight(app);
  configureSceneEnvironment(app);
  createGridFloor(app);
  createEnemyWaves(app);
}

/**
 * Create and configure the main camera
 */
function createCamera(): pc.Entity {
  const camera = new pc.Entity('MainCamera');
  camera.addComponent('camera', {
    clearColor: SCENE_CONFIG.clearColor,
    fov: CAMERA_CONFIG.fov,
    nearClip: CAMERA_CONFIG.nearClip,
    farClip: CAMERA_CONFIG.farClip,
  });
  camera.setPosition(
    PLAYER_CONFIG.startPosition.x,
    PLAYER_CONFIG.startPosition.y,
    PLAYER_CONFIG.startPosition.z
  );
  camera.lookAt(pc.Vec3.ZERO);
  app.root.addChild(camera);

  return camera;
}

/**
 * Set up player controller and weapon system
 */
function setupPlayerComponents(camera: pc.Entity): void {
  const playerController = new PlayerController(camera, app);
  playerControllerRef = playerController;

  const weaponSystem = new WeaponSystem(camera, app);
  weaponSystem.setPlayerController(playerController);

  app.on('update', (dt: number) => {
    const state = gameStateManager?.state;
    if (state === GameState.Playing) {
      playerController.update(dt);
      weaponSystem.update(dt);
    }
  });
}

/**
 * Hide the loading overlay with fade effect
 */
function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay');
  const progress = document.getElementById('loading-progress');

  if (progress) {
    progress.style.width = '100%';
  }

  setTimeout(() => {
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }, 500);
}

/**
 * Update loading progress (exported for external use)
 */
export function updateLoadingProgress(percent: number): void {
  const progress = document.getElementById('loading-progress');
  if (progress) {
    progress.style.width = `${percent}%`;
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
