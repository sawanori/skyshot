/**
 * AuthManager.ts - Authentication Manager for Supabase Auth
 *
 * Responsibilities:
 * - Anonymous login (auto-authentication without email/password)
 * - Email/Password signup and login
 * - Profile management (update username)
 * - Current user session retrieval
 */

import { supabase } from '../utils/supabaseClient';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  user: User | null;
  session: Session | null;
  error: AuthError | null;
  message?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  error: Error | null;
}

export class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Perform anonymous login.
   * Creates a new anonymous user if not already authenticated.
   * Returns the user session.
   */
  public async login(): Promise<AuthResult> {
    try {
      // Check if there's already a session
      const { data: existingSession } = await supabase.auth.getSession();

      if (existingSession.session) {
        this.currentSession = existingSession.session;
        this.currentUser = existingSession.session.user;
        console.log('[AuthManager] Existing session found:', this.currentUser?.id);
        return {
          success: true,
          user: this.currentUser,
          session: this.currentSession,
          error: null,
        };
      }

      // No existing session, sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('[AuthManager] Anonymous login failed:', error.message);
        return {
          success: false,
          user: null,
          session: null,
          error,
        };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      console.log('[AuthManager] Anonymous login successful:', this.currentUser?.id);

      return {
        success: true,
        user: this.currentUser,
        session: this.currentSession,
        error: null,
      };
    } catch (err) {
      console.error('[AuthManager] Unexpected error during login:', err);
      return {
        success: false,
        user: null,
        session: null,
        error: err as AuthError,
      };
    }
  }

  /**
   * Update the current user's username in the profiles table.
   * @param newUsername - The new display name to set
   */
  public async updateUsername(newUsername: string): Promise<ProfileUpdateResult> {
    try {
      const user = await this.getCurrentUser();

      if (!user) {
        return {
          success: false,
          error: new Error('No authenticated user found'),
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('[AuthManager] Failed to update username:', error.message);
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      console.log('[AuthManager] Username updated to:', newUsername);
      return {
        success: true,
        error: null,
      };
    } catch (err) {
      console.error('[AuthManager] Unexpected error updating username:', err);
      return {
        success: false,
        error: err as Error,
      };
    }
  }

  /**
   * Get the currently authenticated user.
   * Returns null if no user is authenticated.
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error('[AuthManager] Failed to get current user:', error.message);
        return null;
      }

      this.currentUser = data.user;
      return this.currentUser;
    } catch (err) {
      console.error('[AuthManager] Unexpected error getting current user:', err);
      return null;
    }
  }

  /**
   * Get the cached current user (sync, may be stale).
   */
  public getCachedUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get the current session.
   */
  public getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated.
   */
  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  /**
   * Sign out the current user.
   */
  public async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.currentUser = null;
      this.currentSession = null;
      console.log('[AuthManager] User signed out');
    } catch (err) {
      console.error('[AuthManager] Error during sign out:', err);
    }
  }

  /**
   * Sign up with email and password.
   * @param email - User's email address
   * @param password - User's password (min 6 characters)
   * @param username - Optional display name
   */
  public async signUp(
    email: string,
    password: string,
    username?: string
  ): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || 'Unknown Pilot',
          },
        },
      });

      if (error) {
        console.error('[AuthManager] Sign up failed:', error.message);
        return {
          success: false,
          user: null,
          session: null,
          error,
          message: this.getErrorMessage(error.message),
        };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log('[AuthManager] Sign up successful, email confirmation required');
        return {
          success: true,
          user: data.user,
          session: null,
          error: null,
          message: 'Confirmation email sent. Please check your inbox.',
        };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;

      // Update username in profiles table if provided
      if (username && data.user) {
        await this.updateUsername(username);
      }

      console.log('[AuthManager] Sign up successful:', this.currentUser?.id);
      return {
        success: true,
        user: this.currentUser,
        session: this.currentSession,
        error: null,
        message: 'Account created successfully!',
      };
    } catch (err) {
      console.error('[AuthManager] Unexpected error during sign up:', err);
      return {
        success: false,
        user: null,
        session: null,
        error: err as AuthError,
        message: 'An unexpected error occurred.',
      };
    }
  }

  /**
   * Sign in with email and password.
   * @param email - User's email address
   * @param password - User's password
   */
  public async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthManager] Sign in failed:', error.message);
        return {
          success: false,
          user: null,
          session: null,
          error,
          message: this.getErrorMessage(error.message),
        };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      console.log('[AuthManager] Sign in successful:', this.currentUser?.id);

      return {
        success: true,
        user: this.currentUser,
        session: this.currentSession,
        error: null,
        message: 'Welcome back!',
      };
    } catch (err) {
      console.error('[AuthManager] Unexpected error during sign in:', err);
      return {
        success: false,
        user: null,
        session: null,
        error: err as AuthError,
        message: 'An unexpected error occurred.',
      };
    }
  }

  /**
   * Check if the current user is anonymous.
   */
  public isAnonymous(): boolean {
    return this.currentUser?.is_anonymous === true;
  }

  /**
   * Get user's email if authenticated with email.
   */
  public getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  /**
   * Convert an anonymous account to a permanent account.
   * @param email - User's email address
   * @param password - User's password
   */
  public async linkEmailToAnonymous(
    email: string,
    password: string
  ): Promise<AuthResult> {
    try {
      if (!this.isAnonymous()) {
        return {
          success: false,
          user: null,
          session: null,
          error: null,
          message: 'Current user is not anonymous.',
        };
      }

      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        console.error('[AuthManager] Link email failed:', error.message);
        return {
          success: false,
          user: null,
          session: null,
          error,
          message: this.getErrorMessage(error.message),
        };
      }

      this.currentUser = data.user;
      console.log('[AuthManager] Email linked to anonymous account');

      return {
        success: true,
        user: this.currentUser,
        session: this.currentSession,
        error: null,
        message: 'Account upgraded successfully!',
      };
    } catch (err) {
      console.error('[AuthManager] Unexpected error linking email:', err);
      return {
        success: false,
        user: null,
        session: null,
        error: err as AuthError,
        message: 'An unexpected error occurred.',
      };
    }
  }

  /**
   * Get user-friendly error message.
   */
  private getErrorMessage(errorMessage: string): string {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'This email is already registered.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'Password must be at least 6 characters.';
    }
    if (errorMessage.includes('Invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please confirm your email before signing in.';
    }
    return errorMessage;
  }
}
