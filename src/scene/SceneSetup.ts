/**
 * SceneSetup.ts - Scene initialization and environment setup
 *
 * Handles:
 * - Grid floor creation
 * - Lighting setup
 * - Fog configuration
 */

import * as pc from 'playcanvas';
import { SCENE_CONFIG, LIGHT_CONFIG, GRID_CONFIG } from '../config/GameConfig';

/**
 * Creates the neon grid floor with collision
 */
export function createGridFloor(app: pc.Application): void {
  const floor = new pc.Entity('GridFloor');

  floor.addComponent('render', {
    type: 'plane',
  });

  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(0.0, 0.1, 0.1);
  material.emissive = new pc.Color(0, 0.5, 0.5);
  material.emissiveIntensity = 0.5;
  material.update();

  if (floor.render) {
    floor.render.meshInstances[0].material = material;
  }

  floor.setLocalScale(GRID_CONFIG.size, 1, GRID_CONFIG.size);
  floor.setPosition(0, 0, 0);

  app.root.addChild(floor);

  createGridLines(app);
}

/**
 * Creates the neon grid lines
 */
function createGridLines(app: pc.Application): void {
  const gridMaterial = new pc.StandardMaterial();
  gridMaterial.diffuse = new pc.Color(0, 0, 0);
  gridMaterial.emissive = GRID_CONFIG.lineColor;
  gridMaterial.emissiveIntensity = 1;
  gridMaterial.update();

  const gridSize = 200;
  const gridSpacing = 10;

  for (let i = -gridSize; i <= gridSize; i += gridSpacing) {
    // X-axis lines
    const lineX = new pc.Entity(`GridLineX_${i}`);
    lineX.addComponent('render', { type: 'box' });
    if (lineX.render) {
      lineX.render.meshInstances[0].material = gridMaterial;
    }
    lineX.setLocalScale(0.1, 0.02, gridSize * 2);
    lineX.setPosition(i, 0.01, 0);
    app.root.addChild(lineX);

    // Z-axis lines
    const lineZ = new pc.Entity(`GridLineZ_${i}`);
    lineZ.addComponent('render', { type: 'box' });
    if (lineZ.render) {
      lineZ.render.meshInstances[0].material = gridMaterial;
    }
    lineZ.setLocalScale(gridSize * 2, 0.02, 0.1);
    lineZ.setPosition(0, 0.01, i);
    app.root.addChild(lineZ);
  }
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
