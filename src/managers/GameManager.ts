/**
 * GameManager.ts - Central game state management with Score Attack Mode
 *
 * Responsibilities:
 * - Game state (menu, playing, paused, game over)
 * - Score tracking with 60-second time limit
 * - DOM UI updates for score and timer
 * - Event handling for enemy deaths
 */

import * as pc from 'playcanvas';
import { AuthManager } from './AuthManager';
import { LeaderboardManager, LeaderboardEntry } from './LeaderboardManager';
import { AuthUI } from '../ui/AuthUI';
import { UserHistoryUI } from '../ui/UserHistoryUI';

export type GameState = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover';

export interface GameStats {
  score: number;
  wave: number;
  enemiesKilled: number;
  timeElapsed: number;
}

export class GameManager {
  private static instance: GameManager;

  private _app: pc.Application | null = null;
  private state: GameState = 'loading';
  private stats: GameStats = {
    score: 0,
    wave: 1,
    enemiesKilled: 0,
    timeElapsed: 0
  };

  // Score Attack Mode properties
  private readonly TIME_LIMIT: number = 60.0;
  private currentTime: number = 60.0;
  private currentScore: number = 0;
  private isPlaying: boolean = false;

  // DOM elements
  private scoreDisplay: HTMLElement | null = null;
  private timerDisplay: HTMLElement | null = null;
  private resultScreen: HTMLElement | null = null;
  private finalScoreDisplay: HTMLElement | null = null;
  private retryButton: HTMLElement | null = null;
  private scoreAttackUI: HTMLElement | null = null;

  // Leaderboard DOM elements
  private nameInputContainer: HTMLElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private nameSubmitButton: HTMLElement | null = null;
  private leaderboardContainer: HTMLElement | null = null;

  // Player Stats DOM elements
  private playerStatsContainer: HTMLElement | null = null;
  private playerHighScore: HTMLElement | null = null;
  private playerTotalPlays: HTMLElement | null = null;
  private playerLastPlayed: HTMLElement | null = null;

  // In-game HUD High Score elements
  private highScoreContainer: HTMLElement | null = null;
  private highScoreDisplay: HTMLElement | null = null;
  private cachedHighScore: number = 0;

  // Auth & Leaderboard managers
  private authManager: AuthManager;
  private leaderboardManager: LeaderboardManager;
  private authUI: AuthUI;
  private userHistoryUI: UserHistoryUI;
  private isAuthInitialized: boolean = false;

  private constructor() {
    this.authManager = AuthManager.getInstance();
    this.leaderboardManager = LeaderboardManager.getInstance();
    this.authUI = AuthUI.getInstance();
    this.userHistoryUI = UserHistoryUI.getInstance();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public initialize(app: pc.Application): void {
    this._app = app;

    // Get DOM elements for Score Attack UI
    this.scoreDisplay = document.getElementById('score-display');
    this.timerDisplay = document.getElementById('timer-display');
    this.resultScreen = document.getElementById('result-screen');
    this.finalScoreDisplay = document.getElementById('final-score');
    this.retryButton = document.getElementById('retry-btn');
    this.scoreAttackUI = document.getElementById('score-attack-ui');

    // Get DOM elements for Leaderboard UI
    this.nameInputContainer = document.getElementById('name-input-container');
    this.nameInput = document.getElementById('name-input') as HTMLInputElement;
    this.nameSubmitButton = document.getElementById('name-submit-btn');
    this.leaderboardContainer = document.getElementById('leaderboard-container');

    // Get DOM elements for Player Stats
    this.playerStatsContainer = document.getElementById('player-stats');
    this.playerHighScore = document.getElementById('player-high-score');
    this.playerTotalPlays = document.getElementById('player-total-plays');
    this.playerLastPlayed = document.getElementById('player-last-played');

    // Get DOM elements for In-game HUD High Score
    this.highScoreContainer = document.getElementById('high-score-container');
    this.highScoreDisplay = document.getElementById('high-score-display');

    // Hide Score Attack UI initially (until game starts)
    if (this.scoreAttackUI) {
      this.scoreAttackUI.style.display = 'none';
    }

    // Add retry button click listener
    if (this.retryButton) {
      this.retryButton.addEventListener('click', () => {
        this.gameStart();
      });
    }

    // Add name submit button click listener
    if (this.nameSubmitButton) {
      this.nameSubmitButton.addEventListener('click', () => {
        this.handleNameSubmit();
      });
    }

    // Add Enter key listener for name input
    if (this.nameInput) {
      this.nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleNameSubmit();
        }
      });
    }

    // Subscribe to enemy:hit event (score on hit)
    app.on('enemy:hit', this.onEnemyHit, this);

    // Subscribe to enemy:dead event (bonus score on kill)
    app.on('enemy:dead', this.onEnemyDead, this);

    // Subscribe to game:start event
    app.on('game:start', () => {
      this.gameStart();
    }, this);

    // Initialize Auth UI
    this.authUI.initialize();

    // Initialize User History UI
    this.userHistoryUI.initialize();

    // Initialize anonymous authentication
    this.initializeAuth();

    this.setState('menu');
  }

  /**
   * Initialize anonymous authentication with Supabase.
   */
  private async initializeAuth(): Promise<void> {
    try {
      const result = await this.authManager.login();
      if (result.success) {
        this.isAuthInitialized = true;
        console.log('[GameManager] Auth initialized successfully');

        // Update Auth UI status
        this.authUI.updateAuthStatus();

        // Fetch and display player stats
        this.refreshPlayerStats();

        // Optionally fetch and display initial leaderboard
        this.refreshLeaderboard();
      } else {
        console.error('[GameManager] Auth initialization failed:', result.error?.message);
      }
    } catch (err) {
      console.error('[GameManager] Unexpected error during auth init:', err);
    }
  }

  public update(dt: number): void {
    if (this.state === 'playing' && this.isPlaying) {
      // Update time elapsed
      this.stats.timeElapsed += dt;

      // Decrement current time
      this.currentTime -= dt;

      // Update timer display
      this.updateTimerDisplay();

      // Check for game over
      if (this.currentTime <= 0) {
        this.currentTime = 0;
        this.gameFinish();
      }
    }
  }

  private updateTimerDisplay(): void {
    if (this.timerDisplay) {
      // Format time with 2 decimal places
      const timeStr = Math.max(0, this.currentTime).toFixed(2);
      this.timerDisplay.textContent = timeStr;

      // Change color to red when time <= 10 seconds
      if (this.currentTime <= 10) {
        this.timerDisplay.style.color = '#ff0000';
        this.timerDisplay.style.textShadow = '0 0 15px #ff0000';
      } else {
        this.timerDisplay.style.color = '#ffff00';
        this.timerDisplay.style.textShadow = '0 0 15px #ffff00';
      }
    }
  }

  private updateScoreDisplay(): void {
    if (this.scoreDisplay) {
      // Format score as 5-digit zero-padded
      const scoreStr = this.currentScore.toString().padStart(5, '0');
      this.scoreDisplay.textContent = scoreStr;
    }

    // Check if current score exceeds high score
    if (this.cachedHighScore > 0 && this.currentScore > this.cachedHighScore) {
      this.highlightNewHighScore();
    }
  }

  /**
   * Highlight the high score display when a new high score is achieved.
   */
  private highlightNewHighScore(): void {
    if (this.highScoreDisplay && this.highScoreContainer) {
      // Update the high score display to show "NEW!"
      this.highScoreDisplay.textContent = 'NEW!';
      this.highScoreDisplay.style.color = '#00ff00';
      this.highScoreDisplay.style.textShadow = '0 0 10px rgba(0,255,0,0.8)';
      this.highScoreDisplay.style.animation = 'blink 0.5s infinite';
    }
  }

  private onEnemyHit(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.updateScoreDisplay();
    }
  }

  private onEnemyDead(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.stats.enemiesKilled++;
      this.updateScoreDisplay();
    }
  }

  public async gameStart(): Promise<void> {
    this.isPlaying = true;
    this.currentTime = this.TIME_LIMIT;
    this.currentScore = 0;
    this.resetStats();

    // Show Score Attack UI
    if (this.scoreAttackUI) {
      this.scoreAttackUI.style.display = 'block';
    }

    // Hide result screen
    if (this.resultScreen) {
      this.resultScreen.style.display = 'none';
    }

    // Reset displays
    this.updateScoreDisplay();
    this.updateTimerDisplay();

    // Fetch and display high score for in-game HUD
    await this.fetchAndDisplayHighScore();

    this.setState('playing');

    // Fire game:reset event
    if (this._app) {
      this._app.fire('game:reset');
    }
  }

  /**
   * Fetch high score and display in the in-game HUD.
   */
  private async fetchAndDisplayHighScore(): Promise<void> {
    try {
      const history = await this.leaderboardManager.getGameHistory(100);

      if (history.length > 0) {
        this.cachedHighScore = Math.max(...history.map(h => h.score));
        this.showInGameHighScore(this.cachedHighScore);
      } else {
        this.hideInGameHighScore();
      }
    } catch (err) {
      console.error('[GameManager] Failed to fetch high score:', err);
      this.hideInGameHighScore();
    }
  }

  /**
   * Show high score in the in-game HUD.
   */
  private showInGameHighScore(highScore: number): void {
    if (this.highScoreContainer) {
      this.highScoreContainer.style.display = 'block';
    }
    if (this.highScoreDisplay) {
      this.highScoreDisplay.textContent = highScore.toString().padStart(5, '0');
    }
  }

  /**
   * Hide high score from the in-game HUD.
   */
  private hideInGameHighScore(): void {
    if (this.highScoreContainer) {
      this.highScoreContainer.style.display = 'none';
    }
  }

  private async gameFinish(): Promise<void> {
    this.isPlaying = false;
    this.setState('gameover');

    // Show result screen
    if (this.resultScreen) {
      this.resultScreen.style.display = 'flex';
    }

    // Update final score
    if (this.finalScoreDisplay) {
      const scoreStr = this.currentScore.toString().padStart(5, '0');
      this.finalScoreDisplay.textContent = scoreStr;
    }

    // Submit score to leaderboard
    if (this.isAuthInitialized) {
      const result = await this.leaderboardManager.submitScore(this.currentScore);
      if (result.success) {
        console.log('[GameManager] Score submitted successfully');
        // Show name input UI
        this.showNameInputUI();
        // Refresh player stats to update HIGH SCORE on title screen
        await this.refreshPlayerStats();
      } else {
        console.error('[GameManager] Failed to submit score:', result.error?.message);
      }
    }

    // Fire game:over event
    if (this._app) {
      this._app.fire('game:over');
    }
  }

  /**
   * Show the name input UI for the user to set their display name.
   */
  private showNameInputUI(): void {
    if (this.nameInputContainer) {
      this.nameInputContainer.style.display = 'block';
    }
    if (this.nameInput) {
      this.nameInput.value = '';
      this.nameInput.focus();
    }
  }

  /**
   * Hide the name input UI.
   */
  private hideNameInputUI(): void {
    if (this.nameInputContainer) {
      this.nameInputContainer.style.display = 'none';
    }
  }

  /**
   * Handle the name submit button click.
   */
  private async handleNameSubmit(): Promise<void> {
    const newName = this.nameInput?.value.trim();

    if (!newName || newName.length === 0) {
      console.warn('[GameManager] Name is empty, skipping update');
      this.hideNameInputUI();
      this.refreshLeaderboard();
      return;
    }

    const result = await this.authManager.updateUsername(newName);
    if (result.success) {
      console.log('[GameManager] Username updated successfully');
    } else {
      console.error('[GameManager] Failed to update username:', result.error?.message);
    }

    this.hideNameInputUI();
    this.refreshLeaderboard();
  }

  /**
   * Refresh and display the leaderboard.
   */
  private async refreshLeaderboard(): Promise<void> {
    const result = await this.leaderboardManager.fetchRanking(10);

    if (!result.success) {
      console.error('[GameManager] Failed to fetch leaderboard:', result.error?.message);
      return;
    }

    this.displayLeaderboard(result.data);
  }

  /**
   * Display the leaderboard entries in the UI.
   */
  private displayLeaderboard(entries: LeaderboardEntry[]): void {
    if (!this.leaderboardContainer) {
      return;
    }

    // Clear existing entries
    this.leaderboardContainer.innerHTML = '';

    // Create leaderboard entries with refined styling
    entries.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      const rank = index + 1;

      // Determine rank color
      let rankColor = 'rgba(0,255,255,0.7)';
      let rankGlow = 'none';
      if (rank === 1) {
        rankColor = '#ffd700';
        rankGlow = '0 0 8px rgba(255,215,0,0.6)';
      } else if (rank === 2) {
        rankColor = '#c0c0c0';
        rankGlow = '0 0 6px rgba(192,192,192,0.5)';
      } else if (rank === 3) {
        rankColor = '#cd7f32';
        rankGlow = '0 0 6px rgba(205,127,50,0.5)';
      }

      entryDiv.style.cssText = `
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(0,255,255,0.1);
        transition: background 0.2s;
        font-size: 13px;
      `;

      entryDiv.innerHTML = `
        <span style="width: 32px; color: ${rankColor}; font-weight: bold; text-shadow: ${rankGlow};">${rank}</span>
        <span style="flex: 1; color: #0ff; letter-spacing: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(entry.username)}</span>
        <span style="width: 70px; text-align: right; color: #fff; font-weight: bold; letter-spacing: 2px;">${entry.high_score.toString().padStart(5, '0')}</span>
      `;

      // Hover effect
      entryDiv.addEventListener('mouseenter', () => {
        entryDiv.style.background = 'rgba(0,255,255,0.05)';
      });
      entryDiv.addEventListener('mouseleave', () => {
        entryDiv.style.background = 'transparent';
      });

      this.leaderboardContainer!.appendChild(entryDiv);
    });

    // Show empty state if no entries
    if (entries.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = `
        padding: 30px;
        text-align: center;
        color: rgba(0,255,255,0.4);
        font-size: 12px;
        letter-spacing: 2px;
      `;
      emptyDiv.textContent = 'NO RECORDS YET';
      this.leaderboardContainer.appendChild(emptyDiv);
    }
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public setState(state: GameState): void {
    const prevState = this.state;
    this.state = state;

    if (this._app) {
      this._app.fire('game:statechange', state, prevState);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public addScore(points: number): void {
    if (this.isPlaying) {
      this.currentScore += points;
      this.stats.score = this.currentScore;
      this.updateScoreDisplay();
    }
  }

  public incrementKills(): void {
    this.stats.enemiesKilled++;
  }

  public startGame(): void {
    this.gameStart();
  }

  public pauseGame(): void {
    if (this.state === 'playing') {
      this.isPlaying = false;
      this.setState('paused');
    }
  }

  public resumeGame(): void {
    if (this.state === 'paused') {
      this.isPlaying = true;
      this.setState('playing');
    }
  }

  public endGame(): void {
    this.gameFinish();
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getCurrentScore(): number {
    return this.currentScore;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private resetStats(): void {
    this.stats = {
      score: 0,
      wave: 1,
      enemiesKilled: 0,
      timeElapsed: 0
    };
  }

  /**
   * Fetch and display player stats on the title screen.
   */
  public async refreshPlayerStats(): Promise<void> {
    // Only show stats if user is authenticated and not anonymous
    if (!this.authManager.isAuthenticated()) {
      this.hidePlayerStats();
      return;
    }

    try {
      // Fetch game history
      const history = await this.leaderboardManager.getGameHistory(100);

      if (history.length === 0) {
        // User has no play history
        this.hidePlayerStats();
        return;
      }

      // Calculate stats
      const highScore = Math.max(...history.map(h => h.score));
      const totalPlays = history.length;
      const lastPlayed = new Date(history[0].played_at);

      // Format last played date
      const lastPlayedStr = this.formatDate(lastPlayed);

      // Update UI
      this.showPlayerStats(highScore, totalPlays, lastPlayedStr);
    } catch (err) {
      console.error('[GameManager] Failed to fetch player stats:', err);
      this.hidePlayerStats();
    }
  }

  /**
   * Show player stats on title screen.
   */
  private showPlayerStats(highScore: number, totalPlays: number, lastPlayed: string): void {
    if (this.playerStatsContainer) {
      this.playerStatsContainer.style.display = 'block';
    }

    if (this.playerHighScore) {
      this.playerHighScore.textContent = highScore.toString().padStart(5, '0');
      this.playerHighScore.classList.add('highlight');
    }

    if (this.playerTotalPlays) {
      this.playerTotalPlays.textContent = totalPlays.toString();
    }

    if (this.playerLastPlayed) {
      this.playerLastPlayed.textContent = lastPlayed;
    }
  }

  /**
   * Hide player stats on title screen.
   */
  private hidePlayerStats(): void {
    if (this.playerStatsContainer) {
      this.playerStatsContainer.style.display = 'none';
    }
  }

  /**
   * Format date for display.
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}/${day}`;
    }
  }
}
