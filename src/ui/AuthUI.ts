/**
 * AuthUI.ts - Authentication UI Controller
 *
 * Handles the login/signup modal UI and auth state display.
 */

import { AuthManager } from '../managers/AuthManager';
import { GameManager } from '../managers/GameManager';

type AuthMode = 'login' | 'signup';

export class AuthUI {
  private static instance: AuthUI;
  private authManager: AuthManager;
  private mode: AuthMode = 'login';
  private isLoading: boolean = false;

  // DOM Elements
  private authModal: HTMLElement | null = null;
  private authStatus: HTMLElement | null = null;
  private authStatusText: HTMLElement | null = null;
  private authButtons: HTMLElement | null = null;
  private loginBtn: HTMLElement | null = null;
  private signupBtn: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private authForm: HTMLFormElement | null = null;
  private usernameField: HTMLElement | null = null;
  private usernameInput: HTMLInputElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private authMessage: HTMLElement | null = null;
  private submitBtn: HTMLElement | null = null;
  private submitText: HTMLElement | null = null;
  private loadingIndicator: HTMLElement | null = null;
  private modalTitle: HTMLElement | null = null;
  private toggleText: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;

  private constructor() {
    this.authManager = AuthManager.getInstance();
  }

  public static getInstance(): AuthUI {
    if (!AuthUI.instance) {
      AuthUI.instance = new AuthUI();
    }
    return AuthUI.instance;
  }

  public initialize(): void {
    this.cacheElements();
    this.bindEvents();
    this.updateAuthStatus();
  }

  private cacheElements(): void {
    this.authModal = document.getElementById('auth-modal');
    this.authStatus = document.getElementById('auth-status');
    this.authStatusText = document.getElementById('auth-status-text');
    this.loginBtn = document.getElementById('login-btn');
    this.signupBtn = document.getElementById('signup-btn');
    this.closeBtn = document.getElementById('auth-close-btn');
    this.authForm = document.getElementById('auth-form') as HTMLFormElement;
    this.usernameField = document.getElementById('username-field');
    this.usernameInput = document.getElementById('auth-username') as HTMLInputElement;
    this.emailInput = document.getElementById('auth-email') as HTMLInputElement;
    this.passwordInput = document.getElementById('auth-password') as HTMLInputElement;
    this.authMessage = document.getElementById('auth-message');
    this.submitBtn = document.getElementById('auth-submit-btn');
    this.submitText = document.getElementById('auth-submit-text');
    this.loadingIndicator = document.getElementById('auth-loading');
    this.modalTitle = document.getElementById('auth-modal-title');
    this.toggleText = document.getElementById('auth-toggle-text');
    this.toggleBtn = document.getElementById('auth-toggle-btn');

    // Cache auth buttons container
    this.authButtons = this.loginBtn?.parentElement || null;
  }

  private bindEvents(): void {
    // Open modal buttons
    this.loginBtn?.addEventListener('click', () => this.openModal('login'));
    this.signupBtn?.addEventListener('click', () => this.openModal('signup'));

    // Close modal
    this.closeBtn?.addEventListener('click', () => this.closeModal());
    this.authModal?.addEventListener('click', (e) => {
      if (e.target === this.authModal) {
        this.closeModal();
      }
    });

    // Toggle auth mode
    this.toggleBtn?.addEventListener('click', () => {
      this.setMode(this.mode === 'login' ? 'signup' : 'login');
    });

    // Form submission
    this.authForm?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Clear message on input
    [this.emailInput, this.passwordInput, this.usernameInput].forEach(input => {
      input?.addEventListener('input', () => this.clearMessage());
    });
  }

  private openModal(mode: AuthMode): void {
    this.setMode(mode);
    this.clearForm();
    this.authModal?.classList.add('visible');
    this.emailInput?.focus();
  }

  private closeModal(): void {
    this.authModal?.classList.remove('visible');
    this.clearForm();
  }

  private setMode(mode: AuthMode): void {
    this.mode = mode;

    if (mode === 'login') {
      if (this.modalTitle) this.modalTitle.textContent = 'LOGIN';
      if (this.submitText) this.submitText.textContent = 'LOGIN';
      if (this.usernameField) this.usernameField.style.display = 'none';
      if (this.toggleText) this.toggleText.textContent = "Don't have an account?";
      if (this.toggleBtn) this.toggleBtn.textContent = 'SIGN UP';
    } else {
      if (this.modalTitle) this.modalTitle.textContent = 'SIGN UP';
      if (this.submitText) this.submitText.textContent = 'CREATE ACCOUNT';
      if (this.usernameField) this.usernameField.style.display = 'block';
      if (this.toggleText) this.toggleText.textContent = 'Already have an account?';
      if (this.toggleBtn) this.toggleBtn.textContent = 'LOGIN';
    }
  }

  private clearForm(): void {
    if (this.usernameInput) this.usernameInput.value = '';
    if (this.emailInput) this.emailInput.value = '';
    if (this.passwordInput) this.passwordInput.value = '';
    this.clearMessage();
  }

  private clearMessage(): void {
    if (this.authMessage) {
      this.authMessage.textContent = '';
      this.authMessage.className = 'auth-message';
    }
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    if (this.authMessage) {
      this.authMessage.textContent = message;
      this.authMessage.className = `auth-message ${type}`;
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (this.submitBtn) {
      (this.submitBtn as HTMLButtonElement).disabled = loading;
    }

    if (this.submitText && this.loadingIndicator) {
      this.submitText.style.display = loading ? 'none' : 'inline';
      this.loadingIndicator.style.display = loading ? 'flex' : 'none';
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isLoading) return;

    const email = this.emailInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const username = this.usernameInput?.value.trim() || '';

    // Validate
    if (!email || !password) {
      this.showMessage('Please fill in all required fields.', 'error');
      return;
    }

    if (password.length < 6) {
      this.showMessage('Password must be at least 6 characters.', 'error');
      return;
    }

    this.setLoading(true);

    try {
      let result;

      if (this.mode === 'login') {
        result = await this.authManager.signIn(email, password);
      } else {
        result = await this.authManager.signUp(email, password, username || undefined);
      }

      if (result.success) {
        this.showMessage(result.message || 'Success!', 'success');
        this.updateAuthStatus();

        // Refresh player stats after login/signup
        GameManager.getInstance().refreshPlayerStats();

        // Close modal after short delay if we have a session
        if (result.session) {
          setTimeout(() => {
            this.closeModal();
          }, 1000);
        }
      } else {
        this.showMessage(result.message || 'An error occurred.', 'error');
      }
    } catch (err) {
      this.showMessage('An unexpected error occurred.', 'error');
      console.error('[AuthUI] Submit error:', err);
    } finally {
      this.setLoading(false);
    }
  }

  public updateAuthStatus(): void {
    const isAuthenticated = this.authManager.isAuthenticated();
    const isAnonymous = this.authManager.isAnonymous();
    const email = this.authManager.getUserEmail();

    if (isAuthenticated && !isAnonymous && email) {
      // Logged in with email
      if (this.authStatus) {
        this.authStatus.classList.add('logged-in');
      }
      if (this.authStatusText) {
        // Show truncated email
        const displayEmail = email.length > 20 ? email.substring(0, 17) + '...' : email;
        this.authStatusText.textContent = displayEmail;
      }

      // Change buttons to show logout
      this.showLogoutButton();
    } else {
      // Guest/Anonymous mode
      if (this.authStatus) {
        this.authStatus.classList.remove('logged-in');
      }
      if (this.authStatusText) {
        this.authStatusText.textContent = 'GUEST MODE';
      }

      // Show login/signup buttons
      this.showAuthButtons();
    }
  }

  private showLogoutButton(): void {
    if (!this.authButtons) return;

    this.authButtons.innerHTML = `
      <button class="auth-btn logout" id="logout-btn">LOGOUT</button>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', () => this.handleLogout());
  }

  private showAuthButtons(): void {
    if (!this.authButtons) return;

    this.authButtons.innerHTML = `
      <button class="auth-btn" id="login-btn">LOGIN</button>
      <button class="auth-btn signup" id="signup-btn">SIGN UP</button>
    `;

    // Re-bind events
    this.loginBtn = document.getElementById('login-btn');
    this.signupBtn = document.getElementById('signup-btn');
    this.loginBtn?.addEventListener('click', () => this.openModal('login'));
    this.signupBtn?.addEventListener('click', () => this.openModal('signup'));
  }

  private async handleLogout(): Promise<void> {
    await this.authManager.logout();
    this.updateAuthStatus();

    // Hide player stats after logout
    GameManager.getInstance().refreshPlayerStats();

    // Re-login anonymously
    await this.authManager.login();
  }
}
