import { test, expect } from '@playwright/test';

test.describe('Score Submission', () => {
  test('should show console logs during game', async ({ page }) => {
    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for auth to initialize
    await expect(page.locator('#auth-status')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Print auth-related logs
    console.log('=== Initial Logs ===');
    logs.forEach(log => {
      if (log.includes('Auth') || log.includes('Game') || log.includes('Leaderboard')) {
        console.log(log);
      }
    });

    // Click start button
    await page.locator('#start-button').click();

    // Wait for game to start
    await expect(page.locator('#score-attack-ui')).toBeVisible({ timeout: 5000 });
    console.log('Game started!');

    // Wait a bit for game to run, then wait for timer to hit 0
    // We'll use a short timeout and check periodically
    await page.waitForTimeout(5000);

    // Check timer value
    const timerText = await page.locator('#timer-display').textContent();
    console.log('Timer value:', timerText);

    // Print all logs so far
    console.log('=== All Logs ===');
    logs.forEach(log => console.log(log));
  });

  test('should play full game and check score submission', async ({ page }) => {
    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to the app
    await page.goto('/');
    await expect(page.locator('#auth-status')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Start game
    await page.locator('#start-button').click();
    await expect(page.locator('#score-attack-ui')).toBeVisible({ timeout: 5000 });

    // Wait for game to finish (60 seconds + buffer)
    console.log('Waiting 65 seconds for game to finish...');
    await page.waitForTimeout(65000);

    // Check if result screen appeared
    const resultScreen = page.locator('#result-screen');
    const isVisible = await resultScreen.isVisible();
    console.log('Result screen visible:', isVisible);

    // Print score submission related logs
    console.log('=== Score Submission Logs ===');
    logs.forEach(log => {
      if (log.includes('score') || log.includes('Score') || log.includes('submit') || log.includes('Leaderboard')) {
        console.log(log);
      }
    });

    expect(isVisible).toBe(true);
  });
});
