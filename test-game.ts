import { chromium } from 'playwright';

async function testGame() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console logs
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  console.log('=== Opening game ===');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000); // Wait for game to load

  // Focus canvas
  const canvas = await page.$('#game-canvas');
  if (canvas) {
    await canvas.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Testing Space (Ascend) ===');
  await page.keyboard.down('Space');
  await page.waitForTimeout(2000);
  await page.keyboard.up('Space');
  await page.waitForTimeout(500);

  console.log('\n=== Testing F key (Fire) ===');
  await page.keyboard.down('KeyF');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyF');
  await page.waitForTimeout(500);

  await page.keyboard.down('KeyF');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyF');
  await page.waitForTimeout(500);

  console.log('\n=== Testing Left Click (Fire) ===');
  if (canvas) {
    await canvas.click();
    await page.waitForTimeout(500);
    await canvas.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Waiting for inspection ===');
  await page.waitForTimeout(60000);
  await browser.close();
}

testGame().catch(console.error);
