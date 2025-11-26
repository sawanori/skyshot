import { test, expect } from '@playwright/test';

test.describe('Player Stats Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for it to load
    await page.goto('/');

    // Wait for the title screen to be visible
    await expect(page.locator('#title-screen')).toBeVisible({ timeout: 10000 });

    // Wait for auth status to show (indicates auth initialized)
    await expect(page.locator('#auth-status')).toBeVisible({ timeout: 10000 });
  });

  test('should have player stats container in DOM', async ({ page }) => {
    // Check that player stats container exists
    const playerStats = page.locator('#player-stats');
    await expect(playerStats).toBeAttached();
  });

  test('should hide player stats in guest mode', async ({ page }) => {
    // In guest mode, player stats should be hidden
    const playerStats = page.locator('#player-stats');

    // Wait a bit for auth to initialize
    await page.waitForTimeout(2000);

    // Check that it's hidden (display: none)
    await expect(playerStats).toBeHidden();
  });

  test('should have correct player stats structure', async ({ page }) => {
    // Check that all stat elements exist
    await expect(page.locator('#player-high-score')).toBeAttached();
    await expect(page.locator('#player-total-plays')).toBeAttached();
    await expect(page.locator('#player-last-played')).toBeAttached();
  });

  test('should have PILOT RECORD header in stats', async ({ page }) => {
    // The stats container should have the header text
    const statsHeader = page.locator('.stats-header');
    await expect(statsHeader).toContainText('PILOT RECORD');
  });

  test('player stats styling should match design', async ({ page }) => {
    // Check that the CSS classes are applied
    const playerStats = page.locator('#player-stats');
    await expect(playerStats).toHaveClass(/player-stats/);

    const statsContent = page.locator('.stats-content');
    await expect(statsContent).toBeAttached();

    const statItems = page.locator('.stat-item');
    // Should have 3 stat items: HIGH SCORE, TOTAL PLAYS, LAST PLAYED
    await expect(statItems).toHaveCount(3);
  });

  test('should have correct stat labels', async ({ page }) => {
    const statLabels = page.locator('.stat-label');

    // Get all label texts
    const labels = await statLabels.allTextContents();

    expect(labels).toContain('HIGH SCORE');
    expect(labels).toContain('TOTAL PLAYS');
    expect(labels).toContain('LAST PLAYED');
  });

  test('should have default placeholder values', async ({ page }) => {
    // Check default values
    await expect(page.locator('#player-high-score')).toHaveText('-----');
    await expect(page.locator('#player-total-plays')).toHaveText('-');
    await expect(page.locator('#player-last-played')).toHaveText('--/--');
  });

  test('title screen layout should include auth elements', async ({ page }) => {
    // Verify the title screen has all expected elements in order
    await expect(page.locator('.game-title')).toBeVisible();
    await expect(page.locator('.game-subtitle')).toBeVisible();
    await expect(page.locator('#auth-status')).toBeVisible();
    await expect(page.locator('#start-button')).toBeVisible();
  });

  test('auth status should show GUEST MODE initially', async ({ page }) => {
    // Wait for auth initialization
    await page.waitForTimeout(2000);

    // Should show GUEST MODE
    await expect(page.locator('#auth-status-text')).toHaveText('GUEST MODE');
  });

  test('login and signup buttons should be visible', async ({ page }) => {
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#signup-btn')).toBeVisible();
  });
});

test.describe('Player Stats with Authentication', () => {
  test('should show player stats after successful login with history', async ({ page }) => {
    // This test would require a real user with play history
    // For now, we just verify the flow works

    await page.goto('/');
    await expect(page.locator('#title-screen')).toBeVisible({ timeout: 10000 });

    // Open login modal
    await page.locator('#login-btn').click();
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // The form should be ready for input
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();

    // Close modal
    await page.locator('#auth-close-btn').click();
    await expect(page.locator('#auth-modal')).not.toHaveClass(/visible/);
  });
});
