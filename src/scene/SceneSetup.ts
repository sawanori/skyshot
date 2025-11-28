/**
 * SceneSetup.ts - Scene initialization and environment setup
 *
 * Handles:
 * - Infinite grid floor that follows the player
 * - Lighting setup
 * - Fog configuration
 */

import * as pc from 'playcanvas';
import { SCENE_CONFIG, LIGHT_CONFIG, GRID_CONFIG } from '../config/GameConfig';

// Infinite grid configuration
const INFINITE_GRID_CONFIG = {
  // Size of each grid tile
  tileSize: 200,
  // Number of tiles in each direction (3x3 grid around player)
  tilesPerSide: 3,
  // Grid line spacing
  lineSpacing: 10,
  // Line thickness
  lineWidth: 0.1,
  lineHeight: 0.02,
};

// Grid manager for infinite scrolling
class InfiniteGridManager {
  private static instance: InfiniteGridManager;
  private app: pc.Application | null = null;
  private player: pc.Entity | null = null;
  private gridTiles: pc.Entity[] = [];
  private gridLines: pc.Entity[] = [];
  private gridMaterial: pc.StandardMaterial | null = null;
  private floorMaterial: pc.StandardMaterial | null = null;
  private lastPlayerTileX: number = 0;
  private lastPlayerTileZ: number = 0;

  private constructor() {}

  public static getInstance(): InfiniteGridManager {
    if (!InfiniteGridManager.instance) {
      InfiniteGridManager.instance = new InfiniteGridManager();
    }
    return InfiniteGridManager.instance;
  }

  public initialize(app: pc.Application): void {
    this.app = app;
    this.createMaterials();
    this.createInitialGrid();

    // Set up update loop
    app.on('update', this.update, this);
  }

  public setPlayer(player: pc.Entity): void {
    this.player = player;
  }

  private createMaterials(): void {
    // Floor material
    this.floorMaterial = new pc.StandardMaterial();
    this.floorMaterial.diffuse = new pc.Color(0.0, 0.1, 0.1);
    this.floorMaterial.emissive = new pc.Color(0, 0.5, 0.5);
    this.floorMaterial.emissiveIntensity = 0.5;
    this.floorMaterial.update();

    // Grid line material
    this.gridMaterial = new pc.StandardMaterial();
    this.gridMaterial.diffuse = new pc.Color(0, 0, 0);
    this.gridMaterial.emissive = GRID_CONFIG.lineColor;
    this.gridMaterial.emissiveIntensity = 1;
    this.gridMaterial.update();
  }

  private createInitialGrid(): void {
    if (!this.app) return;

    const tileSize = INFINITE_GRID_CONFIG.tileSize;
    const tilesPerSide = INFINITE_GRID_CONFIG.tilesPerSide;
    const halfTiles = Math.floor(tilesPerSide / 2);

    // Create grid tiles around origin
    for (let x = -halfTiles; x <= halfTiles; x++) {
      for (let z = -halfTiles; z <= halfTiles; z++) {
        this.createGridTile(x * tileSize, z * tileSize);
      }
    }
  }

  private createGridTile(centerX: number, centerZ: number): void {
    if (!this.app || !this.floorMaterial || !this.gridMaterial) return;

    const tileSize = INFINITE_GRID_CONFIG.tileSize;
    const lineSpacing = INFINITE_GRID_CONFIG.lineSpacing;
    const lineWidth = INFINITE_GRID_CONFIG.lineWidth;
    const lineHeight = INFINITE_GRID_CONFIG.lineHeight;

    // Create floor plane
    const floor = new pc.Entity(`GridFloor_${centerX}_${centerZ}`);
    floor.addComponent('render', { type: 'plane' });
    if (floor.render) {
      floor.render.meshInstances[0].material = this.floorMaterial;
    }
    floor.setLocalScale(tileSize, 1, tileSize);
    floor.setPosition(centerX, 0, centerZ);
    this.app.root.addChild(floor);
    this.gridTiles.push(floor);

    // Create grid lines for this tile
    const halfSize = tileSize / 2;

    for (let i = -halfSize; i <= halfSize; i += lineSpacing) {
      // X-axis lines (running along Z)
      const lineX = new pc.Entity(`GridLineX_${centerX}_${centerZ}_${i}`);
      lineX.addComponent('render', { type: 'box' });
      if (lineX.render) {
        lineX.render.meshInstances[0].material = this.gridMaterial;
      }
      lineX.setLocalScale(lineWidth, lineHeight, tileSize);
      lineX.setPosition(centerX + i, 0.01, centerZ);
      this.app.root.addChild(lineX);
      this.gridLines.push(lineX);

      // Z-axis lines (running along X)
      const lineZ = new pc.Entity(`GridLineZ_${centerX}_${centerZ}_${i}`);
      lineZ.addComponent('render', { type: 'box' });
      if (lineZ.render) {
        lineZ.render.meshInstances[0].material = this.gridMaterial;
      }
      lineZ.setLocalScale(tileSize, lineHeight, lineWidth);
      lineZ.setPosition(centerX, 0.01, centerZ + i);
      this.app.root.addChild(lineZ);
      this.gridLines.push(lineZ);
    }
  }

  private update(): void {
    if (!this.player || !this.app) return;

    const playerPos = this.player.getPosition();
    const tileSize = INFINITE_GRID_CONFIG.tileSize;

    // Calculate which tile the player is in
    const currentTileX = Math.floor(playerPos.x / tileSize);
    const currentTileZ = Math.floor(playerPos.z / tileSize);

    // Check if player moved to a different tile
    if (currentTileX !== this.lastPlayerTileX || currentTileZ !== this.lastPlayerTileZ) {
      this.repositionGrid(currentTileX, currentTileZ);
      this.lastPlayerTileX = currentTileX;
      this.lastPlayerTileZ = currentTileZ;
    }
  }

  private repositionGrid(playerTileX: number, playerTileZ: number): void {
    if (!this.app) return;

    // Remove all existing grid elements
    for (const tile of this.gridTiles) {
      tile.destroy();
    }
    for (const line of this.gridLines) {
      line.destroy();
    }
    this.gridTiles = [];
    this.gridLines = [];

    // Create new grid tiles around player's current tile
    const tileSize = INFINITE_GRID_CONFIG.tileSize;
    const tilesPerSide = INFINITE_GRID_CONFIG.tilesPerSide;
    const halfTiles = Math.floor(tilesPerSide / 2);

    for (let x = -halfTiles; x <= halfTiles; x++) {
      for (let z = -halfTiles; z <= halfTiles; z++) {
        const tileX = (playerTileX + x) * tileSize;
        const tileZ = (playerTileZ + z) * tileSize;
        this.createGridTile(tileX, tileZ);
      }
    }
  }
}

// Export singleton instance
export const infiniteGridManager = InfiniteGridManager.getInstance();

/**
 * Creates the infinite neon grid floor
 * NOTE: Disabled for sky-only background
 */
export function createGridFloor(app: pc.Application): void {
  // Grid floor disabled - flying in open sky
  // infiniteGridManager.initialize(app);
}

/**
 * Set the player entity for grid to follow
 */
export function setGridPlayer(player: pc.Entity): void {
  infiniteGridManager.setPlayer(player);
}

/**
 * Sets up the directional light (sun)
 */
export function createDirectionalLight(app: pc.Application): pc.Entity {
  const light = new pc.Entity('DirectionalLight');
  light.addComponent('light', {
    type: 'directional',
    color: LIGHT_CONFIG.directional.color,
    intensity: LIGHT_CONFIG.directional.intensity,
    castShadows: LIGHT_CONFIG.directional.castShadows,
    shadowBias: LIGHT_CONFIG.directional.shadowBias,
    shadowDistance: LIGHT_CONFIG.directional.shadowDistance,
    shadowResolution: LIGHT_CONFIG.directional.shadowResolution,
  });
  light.setEulerAngles(
    LIGHT_CONFIG.directional.eulerAngles.x,
    LIGHT_CONFIG.directional.eulerAngles.y,
    LIGHT_CONFIG.directional.eulerAngles.z
  );
  app.root.addChild(light);
  return light;
}

/**
 * Configures scene ambient and fog settings
 */
export function configureSceneEnvironment(app: pc.Application): void {
  app.scene.ambientLight = SCENE_CONFIG.ambientLight;
  app.scene.fog = SCENE_CONFIG.fog.type;
  app.scene.fogColor = SCENE_CONFIG.fog.color;
  app.scene.fogStart = SCENE_CONFIG.fog.start;
  app.scene.fogEnd = SCENE_CONFIG.fog.end;
}
