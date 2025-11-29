const { chromium } = require('playwright');

async function testRadar() {
  const browser = await chromium.launch({ headless: false });
  // Use mobile viewport (9:16 aspect ratio like the game)
  const page = await browser.newPage({
    viewport: { width: 450, height: 800 }
  });

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Radar') || text.includes('radar') || text.includes('GLB') || text.includes('error')) {
      console.log(`[Browser Console] ${text}`);
    }
  });

  console.log('Opening game...');
  await page.goto('http://localhost:3001');

  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Take screenshot of title screen
  await page.screenshot({ path: 'test-results/01-title-screen.png' });
  console.log('Screenshot: Title screen saved');

  // Check if old 2D radar exists in DOM
  const oldRadarInDOM = await page.evaluate(() => {
    const hud = document.getElementById('hud');
    if (!hud) return 'HUD not found';
    // Look for canvas element that would be the old 2D radar
    const canvases = hud.querySelectorAll('canvas');
    return `Found ${canvases.length} canvas elements in HUD`;
  });
  console.log('Old 2D radar check:', oldRadarInDOM);

  // Click start button
  console.log('Starting game...');
  const startButton = await page.$('#start-button');
  if (startButton) {
    await startButton.click();
    console.log('Clicked start button');
  } else {
    console.log('Start button not found');
  }

  // Wait for countdown and game to start
  await page.waitForTimeout(5000);

  // Take screenshot during gameplay
  await page.screenshot({ path: 'test-results/02-gameplay.png' });
  console.log('Screenshot: Gameplay saved');

  // Check for 3D radar in the scene
  const radar3DInfo = await page.evaluate(() => {
    // Access PlayCanvas app through the global scope
    if (typeof pc === 'undefined') return 'PlayCanvas not loaded';

    // Try to find RadarContainer entity
    const app = pc.Application.getApplication();
    if (!app) return 'PlayCanvas app not found';

    const radarContainer = app.root.findByName('RadarContainer');
    const radarBase = app.root.findByName('RadarBase');
    const fallback = app.root.findByName('RadarBaseFallback');

    let result = [];
    if (radarContainer) {
      result.push(`RadarContainer: found (enabled: ${radarContainer.enabled})`);
      result.push(`Position: ${radarContainer.getLocalPosition()}`);
    } else {
      result.push('RadarContainer: NOT found');
    }

    if (radarBase) {
      result.push('RadarBase (GLB): found');
    }
    if (fallback) {
      result.push('RadarBaseFallback: found (GLB failed to load)');
    }

    return result.join('\n');
  });
  console.log('\n3D Radar check:\n' + radar3DInfo);

  // Wait a bit more and check for enemies
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/03-gameplay-later.png' });
  console.log('Screenshot: Later gameplay saved');

  // Check for enemies and markers
  const enemyInfo = await page.evaluate(() => {
    if (typeof pc === 'undefined') return 'PlayCanvas not loaded';
    const app = pc.Application.getApplication();
    if (!app) return 'App not found';

    const enemies = app.root.findByTag('Enemy');
    const markers = app.root.find((node) => node.name === 'EnemyMarker');

    return `Enemies in scene: ${enemies.length}, Enemy markers: ${markers.length}`;
  });
  console.log('Enemy/Marker info:', enemyInfo);

  // Check if old 2D radar canvas still exists
  const canvas2DCheck = await page.evaluate(() => {
    const hud = document.getElementById('hud');
    if (!hud) return 'HUD not found';
    const canvases = hud.querySelectorAll('canvas');
    if (canvases.length > 0) {
      return `WARNING: Old 2D radar may still exist (${canvases.length} canvas elements found in HUD)`;
    }
    return 'No canvas in HUD - Old 2D radar removed';
  });
  console.log('2D Radar status:', canvas2DCheck);

  console.log('\n--- Test Complete ---');
  console.log('Check test-results folder for screenshots');

  await browser.close();
}

testRadar().catch(console.error);
