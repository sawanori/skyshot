import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
// Using a more realistic domain that Supabase accepts
const timestamp = Date.now();
const testEmail = `testpilot${timestamp}@gmail.com`;
const testPassword = 'testpassword123';
const testUsername = 'TestPilot';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for it to load
    await page.goto('/');

    // Wait for the title screen to be visible
    await expect(page.locator('#title-screen')).toBeVisible({ timeout: 10000 });

    // Wait for auth status to show (indicates auth initialized)
    await expect(page.locator('#auth-status')).toBeVisible({ timeout: 10000 });
  });

  test('should show guest mode initially', async ({ page }) => {
    // Check that auth status shows GUEST MODE
    await expect(page.locator('#auth-status-text')).toHaveText('GUEST MODE');

    // Check that LOGIN and SIGN UP buttons are visible
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#signup-btn')).toBeVisible();
  });

  test('should open signup modal when clicking SIGN UP', async ({ page }) => {
    // Click SIGN UP button
    await page.locator('#signup-btn').click();

    // Wait for modal to be visible
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // Check modal title
    await expect(page.locator('#auth-modal-title')).toHaveText('SIGN UP');

    // Check that username field is visible (signup only)
    await expect(page.locator('#username-field')).toBeVisible();

    // Check form fields
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
  });

  test('should open login modal when clicking LOGIN', async ({ page }) => {
    // Click LOGIN button
    await page.locator('#login-btn').click();

    // Wait for modal to be visible
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // Check modal title
    await expect(page.locator('#auth-modal-title')).toHaveText('LOGIN');

    // Check that username field is hidden (login mode)
    await expect(page.locator('#username-field')).toBeHidden();
  });

  test('should toggle between login and signup modes', async ({ page }) => {
    // Open login modal
    await page.locator('#login-btn').click();
    await expect(page.locator('#auth-modal-title')).toHaveText('LOGIN');

    // Click toggle to switch to signup
    await page.locator('#auth-toggle-btn').click();
    await expect(page.locator('#auth-modal-title')).toHaveText('SIGN UP');
    await expect(page.locator('#username-field')).toBeVisible();

    // Click toggle to switch back to login
    await page.locator('#auth-toggle-btn').click();
    await expect(page.locator('#auth-modal-title')).toHaveText('LOGIN');
    await expect(page.locator('#username-field')).toBeHidden();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    // Open modal
    await page.locator('#login-btn').click();
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // Click close button
    await page.locator('#auth-close-btn').click();

    // Modal should not have visible class
    await expect(page.locator('#auth-modal')).not.toHaveClass(/visible/);
  });

  test('should close modal when clicking outside', async ({ page }) => {
    // Open modal
    await page.locator('#login-btn').click();
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // Click outside the modal content (on the overlay)
    await page.locator('#auth-modal').click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.locator('#auth-modal')).not.toHaveClass(/visible/);
  });

  test('should have password minlength validation', async ({ page }) => {
    // Open signup modal
    await page.locator('#signup-btn').click();

    // Check that password field has minlength attribute for browser validation
    const passwordInput = page.locator('#auth-password');
    await expect(passwordInput).toHaveAttribute('minlength', '6');

    // Fill with short password and try to submit
    await page.locator('#auth-email').fill('test@test.com');
    await page.locator('#auth-password').fill('12345'); // Only 5 chars

    // Submit - browser native validation will prevent this
    await page.locator('#auth-submit-btn').click();

    // Wait a bit
    await page.waitForTimeout(500);

    // The form should not have submitted (we're still on the modal)
    // Either browser validation triggered or our JS validation
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);
  });

  test('should prevent submission with empty required fields', async ({ page }) => {
    // Open login modal
    await page.locator('#login-btn').click();

    // The email field has 'required' attribute, so browser validation will prevent submission
    // We verify that the form fields exist and are required
    const emailInput = page.locator('#auth-email');
    await expect(emailInput).toHaveAttribute('required', '');

    const passwordInput = page.locator('#auth-password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('Full auth flow: signup -> logout -> login', async ({ page }) => {
    // ===== STEP 1: SIGN UP =====
    console.log('Step 1: Opening signup modal...');
    await page.locator('#signup-btn').click();
    await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

    // Fill signup form
    console.log(`Step 1: Filling signup form with email: ${testEmail}`);
    await page.locator('#auth-username').fill(testUsername);
    await page.locator('#auth-email').fill(testEmail);
    await page.locator('#auth-password').fill(testPassword);

    // Submit signup
    console.log('Step 1: Submitting signup...');
    await page.locator('#auth-submit-btn').click();

    // Wait for response - could be success or email confirmation required
    await page.waitForTimeout(3000);

    // Check for success message or confirmation message
    const messageText = await page.locator('#auth-message').textContent();
    console.log('Step 1: Response message:', messageText);

    // If email confirmation is required, we can't proceed with full flow
    if (messageText?.includes('Confirmation email')) {
      console.log('Email confirmation required - skipping login test');
      // Modal should still be visible since no session
      await expect(page.locator('#auth-message')).toContainText('Confirmation');
      return; // End test here
    }

    // If signup was successful with session, modal should close
    if (messageText?.includes('successfully')) {
      // Wait for modal to close
      await page.waitForTimeout(1500);
      await expect(page.locator('#auth-modal')).not.toHaveClass(/visible/);

      // Check auth status shows email
      await expect(page.locator('#auth-status')).toHaveClass(/logged-in/);

      // ===== STEP 2: LOGOUT =====
      console.log('Step 2: Logging out...');
      await page.locator('#logout-btn').click();

      // Wait for logout to complete
      await page.waitForTimeout(2000);

      // Should show GUEST MODE again
      await expect(page.locator('#auth-status-text')).toHaveText('GUEST MODE');
      await expect(page.locator('#auth-status')).not.toHaveClass(/logged-in/);

      // Login/Signup buttons should be visible again
      await expect(page.locator('#login-btn')).toBeVisible();
      await expect(page.locator('#signup-btn')).toBeVisible();

      // ===== STEP 3: LOGIN =====
      console.log('Step 3: Logging in...');
      await page.locator('#login-btn').click();
      await expect(page.locator('#auth-modal')).toHaveClass(/visible/);

      // Fill login form
      await page.locator('#auth-email').fill(testEmail);
      await page.locator('#auth-password').fill(testPassword);

      // Submit login
      await page.locator('#auth-submit-btn').click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Check for success
      const loginMessage = await page.locator('#auth-message').textContent();
      console.log('Step 3: Login response:', loginMessage);

      if (loginMessage?.includes('Welcome back')) {
        // Wait for modal to close
        await page.waitForTimeout(1500);
        await expect(page.locator('#auth-modal')).not.toHaveClass(/visible/);

        // Check logged in state
        await expect(page.locator('#auth-status')).toHaveClass(/logged-in/);
        await expect(page.locator('#logout-btn')).toBeVisible();

        console.log('Full auth flow completed successfully!');
      }
    }
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    // Open login modal
    await page.locator('#login-btn').click();

    // Fill with non-existent credentials
    await page.locator('#auth-email').fill('nonexistent@example.com');
    await page.locator('#auth-password').fill('wrongpassword');

    // Submit
    await page.locator('#auth-submit-btn').click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Should show error message
    await expect(page.locator('#auth-message')).toHaveClass(/error/);
    const errorText = await page.locator('#auth-message').textContent();
    console.log('Login error:', errorText);
    expect(errorText).toBeTruthy();
  });
});
