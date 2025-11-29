import { chromium } from 'playwright';

async function testRadar() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

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
  console.log('Old radar check:', oldRadarInDOM);

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

  // Check console for 3D radar logs
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.text().toLowerCase().includes('radar')) {
      logs.push(msg.text());
    }
  });

  // Check if 3D radar container exists by looking at PlayCanvas entities
  const radar3DInfo = await page.evaluate(() => {
    // Check if there's a RadarContainer in the scene
    const app = (window as any).pc?.app;
    if (!app) return 'PlayCanvas app not found';

    const radarContainer = app.root.findByName('RadarContainer');
    if (radarContainer) {
      return `3D Radar found: RadarContainer exists, enabled: ${radarContainer.enabled}`;
    }

    return '3D Radar not found in scene';
  });
  console.log('3D Radar check:', radar3DInfo);

  // Wait a bit more and take another screenshot
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/03-gameplay-later.png' });
  console.log('Screenshot: Later gameplay saved');

  // Check for enemies and radar markers
  const enemyInfo = await page.evaluate(() => {
    const app = (window as any).pc?.app;
    if (!app) return 'App not found';

    const enemies = app.root.findByTag('Enemy');
    const markers = app.root.findByName('EnemyMarker');

    return `Enemies: ${enemies.length}, Markers found: ${markers ? 'yes' : 'no'}`;
  });
  console.log('Enemy/Marker info:', enemyInfo);

  console.log('\n--- Test Complete ---');
  console.log('Check test-results folder for screenshots');

  await browser.close();
}

testRadar().catch(console.error);
