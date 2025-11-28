/**
 * EnemyManager.ts - Advanced Enemy Entity System
 *
 * Revolutionary enemy design with:
 * - Dynamic geometric morphing shapes
 * - Particle trail effects
 * - Energy shield visuals
 * - Pulsating core animations
 * - Hit reaction systems
 */

import * as pc from 'playcanvas';
import { ENEMY_CONFIG } from '../config/GameConfig';

// Spawn configuration
const SPAWN_CONFIG = {
  spawnInterval: 1.5,
  minEnemiesPerSpawn: 2,
  maxEnemiesPerSpawn: 5,
  spawnDistanceMin: 40,
  spawnDistanceMax: 100,
  xSpread: 60,
  yMin: 5,
  yMax: 35,
  enemySpeed: 12,
  despawnDistance: 30,
  maxActiveEnemies: 50,
};

// Enemy type definitions for variety
enum EnemyType {
  Drone = 'drone',           // Small, fast, single core
  Sentinel = 'sentinel',     // Medium, rotating shields
  Titan = 'titan',           // Large, multiple cores
  Phantom = 'phantom',       // Ethereal, phase-shifting
  Prism = 'prism',           // Crystalline, refractive
}

interface EnemyEntity extends pc.Entity {
  enemyData?: {
    speed: number;
    health: number;
    type: EnemyType;
    phase: number;
    pulsePhase: number;
    rotationSpeed: pc.Vec3;
    orbitPhase: number;
    shieldRotation: number;
  };
  coreEntity?: pc.Entity;
  shieldEntities?: pc.Entity[];
  orbitEntities?: pc.Entity[];
  trailEntities?: pc.Entity[];
  energyRings?: pc.Entity[];
}

export class EnemyManager {
  private static instance: EnemyManager;
  private app: pc.Application | null = null;
  private player: pc.Entity | null = null;
  private enemies: EnemyEntity[] = [];
  private spawnTimer: number = 0;
  private colorIndex: number = 0;
  private isActive: boolean = false;
  private elapsedTime: number = 0;

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
    this.elapsedTime = 0;

    app.on('game:reset', this.onGameReset, this);
    app.on('game:over', this.onGameOver, this);
  }

  private onGameReset(): void {
    this.clearAllEnemies();
    this.isActive = true;
    this.spawnTimer = 0;
    this.elapsedTime = 0;
  }

  private onGameOver(): void {
    this.isActive = false;
  }

  public update(dt: number): void {
    if (!this.isActive || !this.app || !this.player) return;

    this.elapsedTime += dt;
    this.spawnTimer += dt;

    if (this.spawnTimer >= SPAWN_CONFIG.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }

    this.updateEnemies(dt);
    this.cleanupPassedEnemies();
  }

  private spawnEnemyWave(): void {
    if (!this.app || !this.player) return;
    if (this.enemies.length >= SPAWN_CONFIG.maxActiveEnemies) return;

    const playerPos = this.player.getPosition();
    const playerForward = this.player.forward;

    const count = Math.floor(
      SPAWN_CONFIG.minEnemiesPerSpawn +
        Math.random() * (SPAWN_CONFIG.maxEnemiesPerSpawn - SPAWN_CONFIG.minEnemiesPerSpawn + 1)
    );

    for (let i = 0; i < count; i++) {
      const distance =
        SPAWN_CONFIG.spawnDistanceMin +
        Math.random() * (SPAWN_CONFIG.spawnDistanceMax - SPAWN_CONFIG.spawnDistanceMin);

      const spawnX =
        playerPos.x + playerForward.x * distance + (Math.random() - 0.5) * SPAWN_CONFIG.xSpread;
      const spawnY =
        SPAWN_CONFIG.yMin + Math.random() * (SPAWN_CONFIG.yMax - SPAWN_CONFIG.yMin);
      const spawnZ =
        playerPos.z + playerForward.z * distance + (Math.random() - 0.5) * SPAWN_CONFIG.xSpread;

      // Randomly select enemy type
      const types = Object.values(EnemyType);
      const type = types[Math.floor(Math.random() * types.length)];

      this.createAdvancedEnemy(spawnX, spawnY, spawnZ, type);
    }
  }

  /**
   * Create an advanced enemy with dynamic geometry and effects
   */
  private createAdvancedEnemy(x: number, y: number, z: number, type: EnemyType): EnemyEntity | null {
    if (!this.app) return null;

    const enemy = new pc.Entity('AdvancedEnemy') as EnemyEntity;

    // Get base color
    const color = ENEMY_CONFIG.colors[this.colorIndex % ENEMY_CONFIG.colors.length];
    this.colorIndex++;

    // Create different enemy types
    switch (type) {
      case EnemyType.Drone:
        this.buildDroneEnemy(enemy, color);
        break;
      case EnemyType.Sentinel:
        this.buildSentinelEnemy(enemy, color);
        break;
      case EnemyType.Titan:
        this.buildTitanEnemy(enemy, color);
        break;
      case EnemyType.Phantom:
        this.buildPhantomEnemy(enemy, color);
        break;
      case EnemyType.Prism:
        this.buildPrismEnemy(enemy, color);
        break;
    }

    enemy.setPosition(x, y, z);
    enemy.tags.add('Enemy');

    // Initialize enemy data
    enemy.enemyData = {
      speed: SPAWN_CONFIG.enemySpeed + (Math.random() - 0.5) * 10,
      health: 100,
      type: type,
      phase: Math.random() * Math.PI * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      rotationSpeed: new pc.Vec3(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      ),
      orbitPhase: Math.random() * Math.PI * 2,
      shieldRotation: 0,
    };

    // Listen for damage events
    enemy.on('damage', () => {
      this.onEnemyHit(enemy);
    });

    this.app.root.addChild(enemy);
    this.enemies.push(enemy);

    return enemy;
  }

  /**
   * Build Drone enemy - Small, fast, icosahedron core with energy trails
   */
  private buildDroneEnemy(enemy: EnemyEntity, color: pc.Color): void {
    if (!this.app) return;

    // Central core - sphere with inner glow
    const core = new pc.Entity('DroneCore');
    core.addComponent('render', { type: 'sphere' });

    const coreMat = this.createGlowMaterial(color, 2.5);
    if (core.render) {
      core.render.meshInstances[0].material = coreMat;
    }
    core.setLocalScale(1.5, 1.5, 1.5);
    enemy.addChild(core);
    enemy.coreEntity = core;

    // Outer energy shell
    const shell = new pc.Entity('DroneShell');
    shell.addComponent('render', { type: 'sphere' });

    const shellMat = this.createHologramMaterial(color, 0.3);
    if (shell.render) {
      shell.render.meshInstances[0].material = shellMat;
    }
    shell.setLocalScale(2.2, 2.2, 2.2);
    enemy.addChild(shell);

    // Energy spikes
    enemy.orbitEntities = [];
    for (let i = 0; i < 6; i++) {
      const spike = new pc.Entity(`Spike_${i}`);
      spike.addComponent('render', { type: 'cone' });

      const spikeMat = this.createGlowMaterial(color, 1.8);
      if (spike.render) {
        spike.render.meshInstances[0].material = spikeMat;
      }
      spike.setLocalScale(0.3, 1.2, 0.3);

      // Position spikes around core
      const angle = (i / 6) * Math.PI * 2;
      spike.setLocalPosition(
        Math.cos(angle) * 1.5,
        0,
        Math.sin(angle) * 1.5
      );
      spike.lookAt(new pc.Vec3(0, 0, 0));

      enemy.addChild(spike);
      enemy.orbitEntities.push(spike);
    }

    // Trail particles
    this.addEnergyTrails(enemy, color, 3);
  }

  /**
   * Build Sentinel enemy - Medium size with rotating shield rings
   */
  private buildSentinelEnemy(enemy: EnemyEntity, color: pc.Color): void {
    if (!this.app) return;

    // Central octahedron-like core (using box rotated)
    const core = new pc.Entity('SentinelCore');
    core.addComponent('render', { type: 'box' });

    const coreMat = this.createGlowMaterial(color, 3.0);
    if (core.render) {
      core.render.meshInstances[0].material = coreMat;
    }
    core.setLocalScale(1.5, 1.5, 1.5);
    core.setLocalEulerAngles(45, 45, 0);
    enemy.addChild(core);
    enemy.coreEntity = core;

    // Shield rings
    enemy.shieldEntities = [];
    const ringConfigs = [
      { radius: 2.5, axis: 'x' },
      { radius: 2.8, axis: 'y' },
      { radius: 3.1, axis: 'z' },
    ];

    ringConfigs.forEach((config, idx) => {
      const ring = this.createEnergyRing(color, config.radius);
      if (config.axis === 'x') ring.setLocalEulerAngles(90, 0, 0);
      else if (config.axis === 'z') ring.setLocalEulerAngles(0, 0, 90);
      enemy.addChild(ring);
      enemy.shieldEntities!.push(ring);
    });

    // Floating shield nodes
    for (let i = 0; i < 4; i++) {
      const node = new pc.Entity(`ShieldNode_${i}`);
      node.addComponent('render', { type: 'sphere' });

      const nodeMat = this.createGlowMaterial(
        new pc.Color(color.r * 0.5 + 0.5, color.g * 0.5 + 0.5, color.b * 0.5 + 0.5),
        2.0
      );
      if (node.render) {
        node.render.meshInstances[0].material = nodeMat;
      }
      node.setLocalScale(0.4, 0.4, 0.4);
      enemy.addChild(node);
      enemy.shieldEntities!.push(node);
    }

    this.addEnergyTrails(enemy, color, 4);
  }

  /**
   * Build Titan enemy - Large with multiple pulsing cores
   */
  private buildTitanEnemy(enemy: EnemyEntity, color: pc.Color): void {
    if (!this.app) return;

    // Main body - large cube
    const body = new pc.Entity('TitanBody');
    body.addComponent('render', { type: 'box' });

    const bodyMat = this.createGlowMaterial(color, 1.5);
    if (body.render) {
      body.render.meshInstances[0].material = bodyMat;
    }
    body.setLocalScale(3, 3, 3);
    enemy.addChild(body);
    enemy.coreEntity = body;

    // Multiple inner cores
    enemy.orbitEntities = [];
    const corePositions = [
      new pc.Vec3(1, 1, 1),
      new pc.Vec3(-1, 1, 1),
      new pc.Vec3(1, -1, 1),
      new pc.Vec3(-1, -1, 1),
      new pc.Vec3(1, 1, -1),
      new pc.Vec3(-1, 1, -1),
      new pc.Vec3(1, -1, -1),
      new pc.Vec3(-1, -1, -1),
    ];

    corePositions.forEach((pos, idx) => {
      const innerCore = new pc.Entity(`InnerCore_${idx}`);
      innerCore.addComponent('render', { type: 'sphere' });

      const innerMat = this.createGlowMaterial(
        new pc.Color(1, 1, 1),
        4.0
      );
      if (innerCore.render) {
        innerCore.render.meshInstances[0].material = innerMat;
      }
      innerCore.setLocalScale(0.5, 0.5, 0.5);
      innerCore.setLocalPosition(pos.x, pos.y, pos.z);
      enemy.addChild(innerCore);
      enemy.orbitEntities!.push(innerCore);
    });

    // Armor plates
    const plateDirections = [
      { pos: new pc.Vec3(2, 0, 0), rot: new pc.Vec3(0, 0, 90) },
      { pos: new pc.Vec3(-2, 0, 0), rot: new pc.Vec3(0, 0, -90) },
      { pos: new pc.Vec3(0, 2, 0), rot: new pc.Vec3(0, 0, 0) },
      { pos: new pc.Vec3(0, -2, 0), rot: new pc.Vec3(180, 0, 0) },
      { pos: new pc.Vec3(0, 0, 2), rot: new pc.Vec3(90, 0, 0) },
      { pos: new pc.Vec3(0, 0, -2), rot: new pc.Vec3(-90, 0, 0) },
    ];

    plateDirections.forEach((dir, idx) => {
      const plate = new pc.Entity(`ArmorPlate_${idx}`);
      plate.addComponent('render', { type: 'box' });

      const plateMat = this.createHologramMaterial(color, 0.6);
      if (plate.render) {
        plate.render.meshInstances[0].material = plateMat;
      }
      plate.setLocalScale(1.5, 0.1, 1.5);
      plate.setLocalPosition(dir.pos.x, dir.pos.y, dir.pos.z);
      plate.setLocalEulerAngles(dir.rot.x, dir.rot.y, dir.rot.z);
      enemy.addChild(plate);
    });

    this.addEnergyTrails(enemy, color, 6);
  }

  /**
   * Build Phantom enemy - Ethereal with phase-shifting appearance
   */
  private buildPhantomEnemy(enemy: EnemyEntity, color: pc.Color): void {
    if (!this.app) return;

    // Ghost-like layered spheres
    enemy.shieldEntities = [];

    for (let layer = 0; layer < 5; layer++) {
      const ghost = new pc.Entity(`GhostLayer_${layer}`);
      ghost.addComponent('render', { type: 'sphere' });

      const opacity = 0.15 + (layer * 0.15);
      const scale = 2.5 - (layer * 0.3);

      const ghostMat = new pc.StandardMaterial();
      ghostMat.diffuse = new pc.Color(0, 0, 0);
      ghostMat.emissive = color;
      ghostMat.emissiveIntensity = 1.5 + layer * 0.5;
      ghostMat.opacity = opacity;
      ghostMat.blendType = pc.BLEND_ADDITIVE;
      ghostMat.depthWrite = false;
      ghostMat.cull = pc.CULLFACE_NONE;
      ghostMat.update();

      if (ghost.render) {
        ghost.render.meshInstances[0].material = ghostMat;
      }
      ghost.setLocalScale(scale, scale, scale);
      enemy.addChild(ghost);
      enemy.shieldEntities.push(ghost);
    }

    // Core eye
    const eye = new pc.Entity('PhantomEye');
    eye.addComponent('render', { type: 'sphere' });

    const eyeMat = this.createGlowMaterial(new pc.Color(1, 1, 1), 5.0);
    if (eye.render) {
      eye.render.meshInstances[0].material = eyeMat;
    }
    eye.setLocalScale(0.3, 0.3, 0.3);
    enemy.addChild(eye);
    enemy.coreEntity = eye;

    // Wisp trails
    enemy.orbitEntities = [];
    for (let i = 0; i < 8; i++) {
      const wisp = new pc.Entity(`Wisp_${i}`);
      wisp.addComponent('render', { type: 'sphere' });

      const wispMat = new pc.StandardMaterial();
      wispMat.diffuse = new pc.Color(0, 0, 0);
      wispMat.emissive = color;
      wispMat.emissiveIntensity = 2.0;
      wispMat.opacity = 0.4;
      wispMat.blendType = pc.BLEND_ADDITIVE;
      wispMat.depthWrite = false;
      wispMat.update();

      if (wisp.render) {
        wisp.render.meshInstances[0].material = wispMat;
      }
      wisp.setLocalScale(0.2, 0.2, 0.2);
      enemy.addChild(wisp);
      enemy.orbitEntities.push(wisp);
    }

    this.addEnergyTrails(enemy, color, 5);
  }

  /**
   * Build Prism enemy - Crystalline structure with refractive effects
   */
  private buildPrismEnemy(enemy: EnemyEntity, color: pc.Color): void {
    if (!this.app) return;

    // Central crystal (elongated box rotated)
    const crystal = new pc.Entity('PrismCrystal');
    crystal.addComponent('render', { type: 'box' });

    const crystalMat = new pc.StandardMaterial();
    crystalMat.diffuse = new pc.Color(color.r * 0.3, color.g * 0.3, color.b * 0.3);
    crystalMat.emissive = color;
    crystalMat.emissiveIntensity = 2.0;
    crystalMat.opacity = 0.8;
    crystalMat.blendType = pc.BLEND_NORMAL;
    crystalMat.update();

    if (crystal.render) {
      crystal.render.meshInstances[0].material = crystalMat;
    }
    crystal.setLocalScale(1, 3, 1);
    crystal.setLocalEulerAngles(0, 45, 35);
    enemy.addChild(crystal);
    enemy.coreEntity = crystal;

    // Orbiting crystal shards
    enemy.orbitEntities = [];
    for (let i = 0; i < 6; i++) {
      const shard = new pc.Entity(`Shard_${i}`);
      shard.addComponent('render', { type: 'box' });

      // Rainbow color shift for each shard
      const hue = (i / 6) * 360;
      const shardColor = this.hslToRgb(hue, 1, 0.5);

      const shardMat = new pc.StandardMaterial();
      shardMat.diffuse = new pc.Color(0, 0, 0);
      shardMat.emissive = shardColor;
      shardMat.emissiveIntensity = 3.0;
      shardMat.opacity = 0.7;
      shardMat.blendType = pc.BLEND_ADDITIVE;
      shardMat.depthWrite = false;
      shardMat.update();

      if (shard.render) {
        shard.render.meshInstances[0].material = shardMat;
      }
      shard.setLocalScale(0.3, 1.2, 0.3);
      shard.setLocalEulerAngles(
        Math.random() * 90,
        Math.random() * 90,
        Math.random() * 90
      );
      enemy.addChild(shard);
      enemy.orbitEntities.push(shard);
    }

    // Energy beams between shards
    enemy.energyRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = this.createEnergyRing(color, 2.5 + i * 0.5);
      ring.setLocalEulerAngles(
        Math.random() * 360,
        Math.random() * 360,
        Math.random() * 360
      );
      enemy.addChild(ring);
      enemy.energyRings.push(ring);
    }

    this.addEnergyTrails(enemy, color, 4);
  }

  /**
   * Create glowing material
   */
  private createGlowMaterial(color: pc.Color, intensity: number): pc.StandardMaterial {
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(color.r * 0.1, color.g * 0.1, color.b * 0.1);
    mat.emissive = color;
    mat.emissiveIntensity = intensity;
    mat.update();
    return mat;
  }

  /**
   * Create hologram-style transparent material
   */
  private createHologramMaterial(color: pc.Color, opacity: number): pc.StandardMaterial {
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0, 0, 0);
    mat.emissive = color;
    mat.emissiveIntensity = 1.5;
    mat.opacity = opacity;
    mat.blendType = pc.BLEND_ADDITIVE;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    return mat;
  }

  /**
   * Create an energy ring using torus-like structure
   */
  private createEnergyRing(color: pc.Color, radius: number): pc.Entity {
    const ring = new pc.Entity('EnergyRing');

    // Create ring from multiple small spheres
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const segment = new pc.Entity(`RingSegment_${i}`);
      segment.addComponent('render', { type: 'sphere' });

      const segMat = new pc.StandardMaterial();
      segMat.diffuse = new pc.Color(0, 0, 0);
      segMat.emissive = color;
      segMat.emissiveIntensity = 2.0;
      segMat.opacity = 0.6;
      segMat.blendType = pc.BLEND_ADDITIVE;
      segMat.depthWrite = false;
      segMat.update();

      if (segment.render) {
        segment.render.meshInstances[0].material = segMat;
      }

      const angle = (i / segments) * Math.PI * 2;
      segment.setLocalPosition(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      segment.setLocalScale(0.15, 0.15, 0.15);
      ring.addChild(segment);
    }

    return ring;
  }

  /**
   * Add energy trail effects to enemy
   */
  private addEnergyTrails(enemy: EnemyEntity, color: pc.Color, count: number): void {
    enemy.trailEntities = [];

    for (let i = 0; i < count; i++) {
      const trail = new pc.Entity(`Trail_${i}`);
      trail.addComponent('render', { type: 'sphere' });

      const trailMat = new pc.StandardMaterial();
      trailMat.diffuse = new pc.Color(0, 0, 0);
      trailMat.emissive = color;
      trailMat.emissiveIntensity = 1.0;
      trailMat.opacity = 0.3;
      trailMat.blendType = pc.BLEND_ADDITIVE;
      trailMat.depthWrite = false;
      trailMat.update();

      if (trail.render) {
        trail.render.meshInstances[0].material = trailMat;
      }

      trail.setLocalScale(0.3, 0.3, 0.3);
      trail.setLocalPosition(0, 0, 1 + i * 0.5);
      enemy.addChild(trail);
      enemy.trailEntities.push(trail);
    }
  }

  /**
   * HSL to RGB color conversion
   */
  private hslToRgb(h: number, s: number, l: number): pc.Color {
    h = h / 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return new pc.Color(r, g, b);
  }

  /**
   * Update all enemies with animations
   */
  private updateEnemies(dt: number): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    for (const enemy of this.enemies) {
      if (!enemy.enemyData) continue;

      const pos = enemy.getPosition();
      const data = enemy.enemyData;

      // Movement toward player
      const dirX = playerPos.x - pos.x;
      const dirZ = playerPos.z - pos.z;
      const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);

      if (dist > 0.1) {
        const moveX = (dirX / dist) * data.speed * dt;
        const moveZ = (dirZ / dist) * data.speed * dt;
        enemy.setPosition(pos.x + moveX, pos.y, pos.z + moveZ);
      }

      // Update phase
      data.phase += dt;
      data.pulsePhase += dt * 3;
      data.orbitPhase += dt * 2;
      data.shieldRotation += dt * 100;

      // Animate based on enemy type
      this.animateEnemy(enemy, dt);
    }
  }

  /**
   * Animate enemy components based on type
   */
  private animateEnemy(enemy: EnemyEntity, dt: number): void {
    const data = enemy.enemyData;
    if (!data) return;

    // Rotate main entity
    const angles = enemy.getLocalEulerAngles();
    enemy.setLocalEulerAngles(
      angles.x + data.rotationSpeed.x * dt,
      angles.y + data.rotationSpeed.y * dt,
      angles.z + data.rotationSpeed.z * dt
    );

    // Pulse core
    if (enemy.coreEntity) {
      const pulse = 1 + Math.sin(data.pulsePhase) * 0.2;
      const baseScale = enemy.coreEntity.getLocalScale();
      // Keep aspect ratio while pulsing
      enemy.coreEntity.setLocalScale(
        baseScale.x * (1 + (pulse - 1) * 0.1),
        baseScale.y * (1 + (pulse - 1) * 0.1),
        baseScale.z * (1 + (pulse - 1) * 0.1)
      );
    }

    // Animate orbit entities
    if (enemy.orbitEntities) {
      enemy.orbitEntities.forEach((orbit, idx) => {
        const orbitAngle = data.orbitPhase + (idx / enemy.orbitEntities!.length) * Math.PI * 2;

        if (data.type === EnemyType.Prism) {
          // Crystal shards orbit
          const radius = 2 + Math.sin(data.phase * 2 + idx) * 0.5;
          orbit.setLocalPosition(
            Math.cos(orbitAngle) * radius,
            Math.sin(orbitAngle * 0.5) * 0.5,
            Math.sin(orbitAngle) * radius
          );
          orbit.rotate(0, 180 * dt, 0);
        } else if (data.type === EnemyType.Phantom) {
          // Wisps float around
          const radius = 1.5 + Math.sin(data.phase + idx) * 0.5;
          orbit.setLocalPosition(
            Math.cos(orbitAngle) * radius,
            Math.sin(data.phase * 2 + idx) * 0.5,
            Math.sin(orbitAngle) * radius
          );
        } else if (data.type === EnemyType.Titan) {
          // Inner cores pulse independently
          const innerPulse = 1 + Math.sin(data.pulsePhase + idx * 0.5) * 0.3;
          orbit.setLocalScale(0.5 * innerPulse, 0.5 * innerPulse, 0.5 * innerPulse);
        }
      });
    }

    // Animate shield rings
    if (enemy.shieldEntities) {
      enemy.shieldEntities.forEach((shield, idx) => {
        if (data.type === EnemyType.Sentinel) {
          // Rotate shields at different speeds
          const currentAngles = shield.getLocalEulerAngles();
          shield.setLocalEulerAngles(
            currentAngles.x + (50 + idx * 30) * dt,
            currentAngles.y + (30 + idx * 20) * dt,
            currentAngles.z
          );

          // Position floating nodes
          if (idx >= 3) {
            const nodeIdx = idx - 3;
            const nodeAngle = data.orbitPhase + (nodeIdx / 4) * Math.PI * 2;
            const nodeRadius = 3.5;
            shield.setLocalPosition(
              Math.cos(nodeAngle) * nodeRadius,
              Math.sin(data.phase * 2) * 0.5,
              Math.sin(nodeAngle) * nodeRadius
            );
          }
        } else if (data.type === EnemyType.Phantom) {
          // Phase-shift effect
          const phase = Math.sin(data.pulsePhase + idx * 0.3);
          const scale = (2.5 - idx * 0.3) * (1 + phase * 0.15);
          shield.setLocalScale(scale, scale, scale);
        }
      });
    }

    // Animate energy rings
    if (enemy.energyRings) {
      enemy.energyRings.forEach((ring, idx) => {
        ring.rotate(
          (30 + idx * 20) * dt,
          (40 + idx * 15) * dt,
          (20 + idx * 25) * dt
        );
      });
    }

    // Animate trails
    if (enemy.trailEntities) {
      enemy.trailEntities.forEach((trail, idx) => {
        const trailOffset = 1 + idx * 0.5 + Math.sin(data.phase + idx) * 0.3;
        trail.setLocalPosition(0, 0, trailOffset);

        // Fade trails
        const opacity = 0.4 - (idx * 0.08);
        const scale = 0.4 - (idx * 0.05);
        trail.setLocalScale(scale, scale, scale);
      });
    }
  }

  /**
   * Handle enemy hit with dramatic effect
   */
  private onEnemyHit(enemy: EnemyEntity): void {
    if (!enemy.enemyData) return;

    // Flash all components
    const flashColor = new pc.Color(1, 1, 1);

    // Flash core
    if (enemy.coreEntity?.render) {
      const mat = enemy.coreEntity.render.meshInstances[0].material as pc.StandardMaterial;
      const originalEmissive = mat.emissive.clone();
      const originalIntensity = mat.emissiveIntensity;

      mat.emissive = flashColor;
      mat.emissiveIntensity = 8;
      mat.update();

      setTimeout(() => {
        if (enemy.coreEntity?.render) {
          mat.emissive = originalEmissive;
          mat.emissiveIntensity = originalIntensity;
          mat.update();
        }
      }, 100);
    }

    // Expand shields momentarily
    if (enemy.shieldEntities) {
      enemy.shieldEntities.forEach(shield => {
        if (shield.render) {
          const mat = shield.render.meshInstances[0].material as pc.StandardMaterial;
          const originalIntensity = mat.emissiveIntensity;
          mat.emissiveIntensity = 5;
          mat.update();

          setTimeout(() => {
            if (shield.render) {
              mat.emissiveIntensity = originalIntensity;
              mat.update();
            }
          }, 100);
        }
      });
    }

    // Create hit particles effect
    this.createHitParticles(enemy);
  }

  /**
   * Create particle burst on hit
   */
  private createHitParticles(enemy: EnemyEntity): void {
    if (!this.app) return;

    const pos = enemy.getPosition();
    const color = ENEMY_CONFIG.colors[Math.floor(Math.random() * ENEMY_CONFIG.colors.length)];

    // Create burst of small spheres
    for (let i = 0; i < 8; i++) {
      const particle = new pc.Entity('HitParticle');
      particle.addComponent('render', { type: 'sphere' });

      const particleMat = new pc.StandardMaterial();
      particleMat.diffuse = new pc.Color(0, 0, 0);
      particleMat.emissive = color;
      particleMat.emissiveIntensity = 4;
      particleMat.opacity = 0.8;
      particleMat.blendType = pc.BLEND_ADDITIVE;
      particleMat.depthWrite = false;
      particleMat.update();

      if (particle.render) {
        particle.render.meshInstances[0].material = particleMat;
      }

      particle.setPosition(pos.x, pos.y, pos.z);
      particle.setLocalScale(0.3, 0.3, 0.3);
      this.app.root.addChild(particle);

      // Random velocity
      const velocity = new pc.Vec3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      // Animate particle
      let life = 0;
      const maxLife = 0.5;

      const updateParticle = (dt: number) => {
        life += dt;
        if (life >= maxLife) {
          particle.destroy();
          this.app?.off('update', updateParticle);
          return;
        }

        const p = particle.getPosition();
        particle.setPosition(
          p.x + velocity.x * dt,
          p.y + velocity.y * dt,
          p.z + velocity.z * dt
        );

        // Fade and shrink
        const alpha = 1 - (life / maxLife);
        const scale = 0.3 * alpha;
        particle.setLocalScale(scale, scale, scale);

        if (particle.render) {
          const mat = particle.render.meshInstances[0].material as pc.StandardMaterial;
          mat.opacity = alpha * 0.8;
          mat.update();
        }
      };

      this.app.on('update', updateParticle);
    }
  }

  private cleanupPassedEnemies(): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    this.enemies = this.enemies.filter((enemy) => {
      const pos = enemy.getPosition();
      const distToPlayer = Math.sqrt(
        Math.pow(pos.x - playerPos.x, 2) + Math.pow(pos.z - playerPos.z, 2)
      );

      const playerForward = this.player!.forward;
      const toEnemy = new pc.Vec3(pos.x - playerPos.x, 0, pos.z - playerPos.z);
      const dot = playerForward.x * toEnemy.x + playerForward.z * toEnemy.z;

      if (dot < -SPAWN_CONFIG.despawnDistance || distToPlayer < 3) {
        enemy.destroy();
        return false;
      }

      return true;
    });
  }

  public clearAllEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy) {
        enemy.destroy();
      }
    }
    this.enemies = [];
    this.colorIndex = 0;
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }

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

export function createEnemyWaves(app: pc.Application): void {
  console.log('[EnemyManager] createEnemyWaves called - using new infinite spawn system');
}
