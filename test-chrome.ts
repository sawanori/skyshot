import { chromium } from 'playwright';

async function testChrome() {
  // Launch with Chrome instead of Chromium
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'  // Use actual Chrome browser
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('=== Opening game in Chrome ===');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // Focus canvas
  const canvas = await page.$('#game-canvas');
  if (canvas) {
    await canvas.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Testing Space (Ascend) ===');
  await page.keyboard.down('Space');
  await page.waitForTimeout(1000);
  await page.keyboard.up('Space');

  console.log('\n=== Testing F key (Fire) ===');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(500);

  console.log('\n=== Testing Left Click ===');
  if (canvas) {
    await canvas.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Keep open for 30s ===');
  await page.waitForTimeout(30000);
  await browser.close();
}

testChrome().catch(console.error);
