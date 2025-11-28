/**
 * EnemyManager.ts - Enemy entity management (Infinite Spawn Mode)
 *
 * New Game System:
 * - Enemies spawn infinitely from the front during the time limit
 * - Enemies flow toward the player (from front to back)
 * - No backward movement for player - pure forward shooting gallery
 */

import * as pc from 'playcanvas';
import { ENEMY_CONFIG } from '../config/GameConfig';

// Spawn configuration
const SPAWN_CONFIG = {
  // How often to spawn a new wave (seconds)
  spawnInterval: 1.5,
  // Minimum enemies per spawn
  minEnemiesPerSpawn: 2,
  // Maximum enemies per spawn
  maxEnemiesPerSpawn: 5,
  // Distance in front of player to spawn
  spawnDistanceMin: 40,
  spawnDistanceMax: 100,
  // Horizontal spread
  xSpread: 60,
  // Vertical range
  yMin: 5,
  yMax: 35,
  // Enemy movement speed toward player
  enemySpeed: 25,
  // Distance behind player at which enemies are removed
  despawnDistance: 30,
  // Maximum active enemies at once
  maxActiveEnemies: 50,
};

interface EnemyEntity extends pc.Entity {
  enemyData?: {
    speed: number;
    health: number;
  };
}

export class EnemyManager {
  private static instance: EnemyManager;
  private app: pc.Application | null = null;
  private player: pc.Entity | null = null;
  private enemies: EnemyEntity[] = [];
  private spawnTimer: number = 0;
  private colorIndex: number = 0;
  private isActive: boolean = false;

  private constructor() {}

  public static getInstance(): EnemyManager {
    if (!EnemyManager.instance) {
      EnemyManager.instance = new EnemyManager();
    }
    return EnemyManager.instance;
  }

  public initialize(app: pc.Application, player: pc.Entity): void {
    this.app = app;
    this.player = player;
    this.enemies = [];
    this.spawnTimer = 0;
    this.colorIndex = 0;
    this.isActive = false;

    // Listen for game events
    app.on('game:reset', this.onGameReset, this);
    app.on('game:over', this.onGameOver, this);
  }

  private onGameReset(): void {
    // Clear all existing enemies
    this.clearAllEnemies();
    // Start spawning
    this.isActive = true;
    this.spawnTimer = 0;
  }

  private onGameOver(): void {
    // Stop spawning
    this.isActive = false;
  }

  /**
   * Update - called every frame from main game loop
   */
  public update(dt: number): void {
    if (!this.isActive || !this.app || !this.player) return;

    // Update spawn timer
    this.spawnTimer += dt;

    // Spawn new enemies at interval
    if (this.spawnTimer >= SPAWN_CONFIG.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }

    // Update all enemies (move toward player)
    this.updateEnemies(dt);

    // Remove enemies that passed the player
    this.cleanupPassedEnemies();
  }

  /**
   * Spawn a wave of enemies in front of the player
   */
  private spawnEnemyWave(): void {
    if (!this.app || !this.player) return;

    // Don't spawn if at max capacity
    if (this.enemies.length >= SPAWN_CONFIG.maxActiveEnemies) return;

    const playerPos = this.player.getPosition();
    const playerForward = this.player.forward;

    // Determine number of enemies to spawn
    const count = Math.floor(
      SPAWN_CONFIG.minEnemiesPerSpawn +
        Math.random() * (SPAWN_CONFIG.maxEnemiesPerSpawn - SPAWN_CONFIG.minEnemiesPerSpawn + 1)
    );

    for (let i = 0; i < count; i++) {
      // Random distance in front of player
      const distance =
        SPAWN_CONFIG.spawnDistanceMin +
        Math.random() * (SPAWN_CONFIG.spawnDistanceMax - SPAWN_CONFIG.spawnDistanceMin);

      // Calculate spawn position in front of player
      const spawnX =
        playerPos.x + playerForward.x * distance + (Math.random() - 0.5) * SPAWN_CONFIG.xSpread;
      const spawnY =
        SPAWN_CONFIG.yMin + Math.random() * (SPAWN_CONFIG.yMax - SPAWN_CONFIG.yMin);
      const spawnZ =
        playerPos.z + playerForward.z * distance + (Math.random() - 0.5) * SPAWN_CONFIG.xSpread;

      this.createEnemy(spawnX, spawnY, spawnZ);
    }
  }

  /**
   * Create a single enemy at the specified position
   */
  private createEnemy(x: number, y: number, z: number): EnemyEntity | null {
    if (!this.app) return null;

    const cube = new pc.Entity('EnemyCube') as EnemyEntity;

    cube.addComponent('render', { type: 'box' });

    // Get color from config
    const color = ENEMY_CONFIG.colors[this.colorIndex % ENEMY_CONFIG.colors.length];
    this.colorIndex++;

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r * 0.2, color.g * 0.2, color.b * 0.2);
    material.emissive = color;
    material.emissiveIntensity = ENEMY_CONFIG.emissiveIntensity;
    material.update();

    if (cube.render) {
      cube.render.meshInstances[0].material = material;
    }

    cube.setPosition(x, y, z);
    cube.setLocalScale(
      ENEMY_CONFIG.cubeSize,
      ENEMY_CONFIG.cubeSize,
      ENEMY_CONFIG.cubeSize
    );

    cube.tags.add('Enemy');

    // Store enemy data
    cube.enemyData = {
      speed: SPAWN_CONFIG.enemySpeed + (Math.random() - 0.5) * 10,
      health: 100,
    };

    // Listen for damage events
    cube.on('damage', () => {
      this.flashEnemy(cube);
    });

    this.app.root.addChild(cube);
    this.enemies.push(cube);

    return cube;
  }

  /**
   * Update all enemies - move them toward and past the player
   */
  private updateEnemies(dt: number): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    for (const enemy of this.enemies) {
      if (!enemy.enemyData) continue;

      const pos = enemy.getPosition();

      // Calculate direction toward player (roughly - we want them to flow past)
      const dirX = playerPos.x - pos.x;
      const dirZ = playerPos.z - pos.z;
      const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);

      if (dist > 0.1) {
        // Move toward player position
        const moveX = (dirX / dist) * enemy.enemyData.speed * dt;
        const moveZ = (dirZ / dist) * enemy.enemyData.speed * dt;

        enemy.setPosition(pos.x + moveX, pos.y, pos.z + moveZ);
      }

      // Slight rotation for visual effect
      const angles = enemy.getLocalEulerAngles();
      enemy.setLocalEulerAngles(angles.x + 90 * dt, angles.y + 120 * dt, angles.z);
    }
  }

  /**
   * Remove enemies that have passed behind the player
   */
  private cleanupPassedEnemies(): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    this.enemies = this.enemies.filter((enemy) => {
      const pos = enemy.getPosition();
      const distToPlayer = Math.sqrt(
        Math.pow(pos.x - playerPos.x, 2) + Math.pow(pos.z - playerPos.z, 2)
      );

      // Check if enemy has passed behind player (close enough and behind)
      const playerForward = this.player!.forward;
      const toEnemy = new pc.Vec3(pos.x - playerPos.x, 0, pos.z - playerPos.z);
      const dot = playerForward.x * toEnemy.x + playerForward.z * toEnemy.z;

      // If enemy is behind player and close, remove it
      if (dot < -SPAWN_CONFIG.despawnDistance || distToPlayer < 3) {
        enemy.destroy();
        return false;
      }

      return true;
    });
  }

  /**
   * Clear all enemies from the scene
   */
  public clearAllEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy) {
        enemy.destroy();
      }
    }
    this.enemies = [];
    this.colorIndex = 0;
  }

  /**
   * Flash effect when enemy is hit
   */
  private flashEnemy(cube: pc.Entity): void {
    if (!cube.render) return;

    const mat = cube.render.meshInstances[0].material as pc.StandardMaterial;
    const originalIntensity = mat.emissiveIntensity;
    mat.emissiveIntensity = ENEMY_CONFIG.hitFlashIntensity;
    mat.update();

    setTimeout(() => {
      if (cube && cube.render) {
        mat.emissiveIntensity = originalIntensity;
        mat.update();
      }
    }, ENEMY_CONFIG.hitFlashDuration);
  }

  /**
   * Get the current number of active enemies
   */
  public getEnemyCount(): number {
    return this.enemies.length;
  }

  /**
   * Get all active enemies
   */
  public getEnemies(): pc.Entity[] {
    return this.enemies;
  }
}

// Legacy exports for backward compatibility
export function createEnemyCube(
  app: pc.Application,
  x: number,
  y: number,
  z: number,
  color: pc.Color
): pc.Entity {
  const cube = new pc.Entity('EnemyCube');

  cube.addComponent('render', { type: 'box' });

  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(color.r * 0.2, color.g * 0.2, color.b * 0.2);
  material.emissive = color;
  material.emissiveIntensity = ENEMY_CONFIG.emissiveIntensity;
  material.update();

  if (cube.render) {
    cube.render.meshInstances[0].material = material;
  }

  cube.setPosition(x, y, z);
  cube.setLocalScale(
    ENEMY_CONFIG.cubeSize,
    ENEMY_CONFIG.cubeSize,
    ENEMY_CONFIG.cubeSize
  );

  cube.tags.add('Enemy');

  cube.on('damage', () => {
    if (!cube.render) return;
    const mat = cube.render.meshInstances[0].material as pc.StandardMaterial;
    const originalIntensity = mat.emissiveIntensity;
    mat.emissiveIntensity = ENEMY_CONFIG.hitFlashIntensity;
    mat.update();
    setTimeout(() => {
      mat.emissiveIntensity = originalIntensity;
      mat.update();
    }, ENEMY_CONFIG.hitFlashDuration);
  });

  app.root.addChild(cube);
  return cube;
}

// Legacy function - now creates initial enemies via EnemyManager
export function createEnemyWaves(app: pc.Application): void {
  // This is now handled by EnemyManager's infinite spawn system
  // Kept for backward compatibility but does nothing in new system
  console.log('[EnemyManager] createEnemyWaves called - using new infinite spawn system');
}
