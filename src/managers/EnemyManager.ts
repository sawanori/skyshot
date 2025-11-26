/**
 * EnemyManager.ts - Enemy entity management
 *
 * Handles:
 * - Enemy spawning and positioning
 * - Enemy wave patterns
 * - Formation generation
 */

import * as pc from 'playcanvas';
import { ENEMY_CONFIG } from '../config/GameConfig';

/**
 * Creates a single enemy cube at the specified position
 */
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

  // Listen for damage events
  cube.on('damage', () => {
    flashEnemy(cube);
  });

  app.root.addChild(cube);
  return cube;
}

/**
 * Flash effect when enemy is hit
 */
function flashEnemy(cube: pc.Entity): void {
  if (!cube.render) return;

  const mat = cube.render.meshInstances[0].material as pc.StandardMaterial;
  const originalIntensity = mat.emissiveIntensity;
  mat.emissiveIntensity = ENEMY_CONFIG.hitFlashIntensity;
  mat.update();

  setTimeout(() => {
    mat.emissiveIntensity = originalIntensity;
    mat.update();
  }, ENEMY_CONFIG.hitFlashDuration);
}

/**
 * Creates all enemy cubes in wave patterns
 */
export function createEnemyWaves(app: pc.Application): void {
  let colorIndex = 0;

  const addEnemy = (x: number, y: number, z: number) => {
    const color = ENEMY_CONFIG.colors[colorIndex % ENEMY_CONFIG.colors.length];
    createEnemyCube(app, x, y, z, color);
    colorIndex++;
  };

  // Wave 1: Close range
  const w1 = ENEMY_CONFIG.waves.wave1;
  for (let i = 0; i < w1.count; i++) {
    addEnemy(
      (Math.random() - 0.5) * w1.xSpread,
      w1.yMin + Math.random() * (w1.yMax - w1.yMin),
      w1.zStart - Math.random() * w1.zRange
    );
  }

  // Wave 2: Medium range
  const w2 = ENEMY_CONFIG.waves.wave2;
  for (let i = 0; i < w2.count; i++) {
    addEnemy(
      (Math.random() - 0.5) * w2.xSpread,
      w2.yMin + Math.random() * (w2.yMax - w2.yMin),
      w2.zStart - Math.random() * w2.zRange
    );
  }

  // Wave 3: Long range
  const w3 = ENEMY_CONFIG.waves.wave3;
  for (let i = 0; i < w3.count; i++) {
    addEnemy(
      (Math.random() - 0.5) * w3.xSpread,
      w3.yMin + Math.random() * (w3.yMax - w3.yMin),
      w3.zStart - Math.random() * w3.zRange
    );
  }

  // Wave 4: Far range
  const w4 = ENEMY_CONFIG.waves.wave4;
  for (let i = 0; i < w4.count; i++) {
    addEnemy(
      (Math.random() - 0.5) * w4.xSpread,
      w4.yMin + Math.random() * (w4.yMax - w4.yMin),
      w4.zStart - Math.random() * w4.zRange
    );
  }

  // Wave 5: Very far
  const w5 = ENEMY_CONFIG.waves.wave5;
  for (let i = 0; i < w5.count; i++) {
    addEnemy(
      (Math.random() - 0.5) * w5.xSpread,
      w5.yMin + Math.random() * (w5.yMax - w5.yMin),
      w5.zStart - Math.random() * w5.zRange
    );
  }

  // V Formations
  createVFormation(addEnemy, ENEMY_CONFIG.formations.v1);
  createVFormation(addEnemy, ENEMY_CONFIG.formations.v2);

  // Line formation
  const line = ENEMY_CONFIG.formations.line;
  const halfCount = Math.floor(line.count / 2);
  for (let i = -halfCount; i <= halfCount; i++) {
    addEnemy(i * line.spacing, line.y, line.z);
  }

  // High altitude targets
  for (const target of ENEMY_CONFIG.highAltitudeTargets) {
    addEnemy(target.x, target.y, target.z);
  }
}

/**
 * Creates a V formation of enemies
 */
function createVFormation(
  addEnemy: (x: number, y: number, z: number) => void,
  config: { y: number; zBase: number; spacing: number }
): void {
  // Center
  addEnemy(0, config.y, config.zBase);
  // Left and right wings
  addEnemy(-config.spacing, config.y, config.zBase - 10);
  addEnemy(config.spacing, config.y, config.zBase - 10);
  addEnemy(-config.spacing * 2, config.y - 2, config.zBase - 20);
  addEnemy(config.spacing * 2, config.y - 2, config.zBase - 20);
}
