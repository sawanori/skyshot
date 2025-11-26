/**
 * LeaderboardManager.ts - Leaderboard Management for Score Tracking
 *
 * Responsibilities:
 * - Submit game scores to database
 * - Fetch leaderboard rankings
 * - Manage score history
 */

import { supabase } from '../utils/supabaseClient';
import { AuthManager } from './AuthManager';

export interface LeaderboardEntry {
  username: string;
  high_score: number;
}

export interface SubmitScoreResult {
  success: boolean;
  error: Error | null;
}

export interface FetchRankingResult {
  success: boolean;
  data: LeaderboardEntry[];
  error: Error | null;
}

export class LeaderboardManager {
  private static instance: LeaderboardManager;

  private constructor() {}

  public static getInstance(): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager();
    }
    return LeaderboardManager.instance;
  }

  /**
   * Submit a score to the game_results table.
   * Requires authenticated user.
   * @param score - The score to submit
   */
  public async submitScore(score: number): Promise<SubmitScoreResult> {
    try {
      const authManager = AuthManager.getInstance();
      const user = await authManager.getCurrentUser();

      if (!user) {
        console.error('[LeaderboardManager] Cannot submit score: No authenticated user');
        return {
          success: false,
          error: new Error('No authenticated user found'),
        };
      }

      const { error } = await supabase.from('game_results').insert({
        user_id: user.id,
        score: score,
      });

      if (error) {
        console.error('[LeaderboardManager] Failed to submit score:', error.message);
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      console.log('[LeaderboardManager] Score submitted successfully:', score);
      return {
        success: true,
        error: null,
      };
    } catch (err) {
      console.error('[LeaderboardManager] Unexpected error submitting score:', err);
      return {
        success: false,
        error: err as Error,
      };
    }
  }

  /**
   * Fetch the leaderboard rankings from the leaderboard_view.
   * @param limit - Maximum number of entries to fetch (default: 10)
   */
  public async fetchRanking(limit: number = 10): Promise<FetchRankingResult> {
    try {
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('username, high_score')
        .order('high_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[LeaderboardManager] Failed to fetch ranking:', error.message);
        return {
          success: false,
          data: [],
          error: new Error(error.message),
        };
      }

      console.log('[LeaderboardManager] Fetched ranking:', data?.length, 'entries');
      return {
        success: true,
        data: (data as LeaderboardEntry[]) || [],
        error: null,
      };
    } catch (err) {
      console.error('[LeaderboardManager] Unexpected error fetching ranking:', err);
      return {
        success: false,
        data: [],
        error: err as Error,
      };
    }
  }

  /**
   * Get the current user's personal best score.
   */
  public async getPersonalBest(): Promise<number | null> {
    try {
      const authManager = AuthManager.getInstance();
      const user = await authManager.getCurrentUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('game_results')
        .select('score')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No records found is not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[LeaderboardManager] Failed to get personal best:', error.message);
        return null;
      }

      return data?.score ?? null;
    } catch (err) {
      console.error('[LeaderboardManager] Unexpected error getting personal best:', err);
      return null;
    }
  }

  /**
   * Get the current user's game history.
   * @param limit - Maximum number of entries to fetch (default: 10)
   */
  public async getGameHistory(
    limit: number = 10
  ): Promise<{ score: number; played_at: string }[]> {
    try {
      const authManager = AuthManager.getInstance();
      const user = await authManager.getCurrentUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('game_results')
        .select('score, played_at')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[LeaderboardManager] Failed to get game history:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[LeaderboardManager] Unexpected error getting game history:', err);
      return [];
    }
  }
}
