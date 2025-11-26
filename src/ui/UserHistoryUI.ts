/**
 * UserHistoryUI.ts - User History Modal Controller
 *
 * Displays the user's game history with scores and dates.
 * Also handles nickname display and editing.
 */

import { LeaderboardManager } from '../managers/LeaderboardManager';
import { AuthManager } from '../managers/AuthManager';

interface HistoryEntry {
  score: number;
  played_at: string;
}

export class UserHistoryUI {
  private static instance: UserHistoryUI;
  private leaderboardManager: LeaderboardManager;
  private authManager: AuthManager;

  // DOM Elements
  private historyModal: HTMLElement | null = null;
  private historyCloseBtn: HTMLElement | null = null;
  private viewHistoryBtn: HTMLElement | null = null;
  private historyList: HTMLElement | null = null;
  private historyEmpty: HTMLElement | null = null;
  private historyTotalPlays: HTMLElement | null = null;
  private historyBestScore: HTMLElement | null = null;
  private historyAvgScore: HTMLElement | null = null;

  // Nickname elements
  private nicknameDisplay: HTMLElement | null = null;
  private nicknameValue: HTMLElement | null = null;
  private nicknameEditBtn: HTMLElement | null = null;
  private nicknameEdit: HTMLElement | null = null;
  private nicknameInput: HTMLInputElement | null = null;
  private nicknameSaveBtn: HTMLElement | null = null;
  private nicknameCancelBtn: HTMLElement | null = null;

  private constructor() {
    this.leaderboardManager = LeaderboardManager.getInstance();
    this.authManager = AuthManager.getInstance();
  }

  public static getInstance(): UserHistoryUI {
    if (!UserHistoryUI.instance) {
      UserHistoryUI.instance = new UserHistoryUI();
    }
    return UserHistoryUI.instance;
  }

  public initialize(): void {
    this.cacheElements();
    this.bindEvents();
  }

  private cacheElements(): void {
    this.historyModal = document.getElementById('history-modal');
    this.historyCloseBtn = document.getElementById('history-close-btn');
    this.viewHistoryBtn = document.getElementById('view-history-btn');
    this.historyList = document.getElementById('history-list');
    this.historyEmpty = document.getElementById('history-empty');
    this.historyTotalPlays = document.getElementById('history-total-plays');
    this.historyBestScore = document.getElementById('history-best-score');
    this.historyAvgScore = document.getElementById('history-avg-score');

    // Nickname elements
    this.nicknameDisplay = document.getElementById('nickname-display');
    this.nicknameValue = document.getElementById('nickname-value');
    this.nicknameEditBtn = document.getElementById('nickname-edit-btn');
    this.nicknameEdit = document.getElementById('nickname-edit');
    this.nicknameInput = document.getElementById('nickname-input') as HTMLInputElement;
    this.nicknameSaveBtn = document.getElementById('nickname-save-btn');
    this.nicknameCancelBtn = document.getElementById('nickname-cancel-btn');
  }

  private bindEvents(): void {
    // Open modal button
    this.viewHistoryBtn?.addEventListener('click', () => this.openModal());

    // Close modal
    this.historyCloseBtn?.addEventListener('click', () => this.closeModal());
    this.historyModal?.addEventListener('click', (e) => {
      if (e.target === this.historyModal) {
        this.closeModal();
      }
    });

    // Nickname edit events
    this.nicknameEditBtn?.addEventListener('click', () => this.showNicknameEdit());
    this.nicknameSaveBtn?.addEventListener('click', () => this.saveNickname());
    this.nicknameCancelBtn?.addEventListener('click', () => this.hideNicknameEdit());
    this.nicknameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveNickname();
      }
      if (e.key === 'Escape') {
        this.hideNicknameEdit();
      }
    });
  }

  private async openModal(): Promise<void> {
    this.historyModal?.classList.add('visible');
    await this.loadNickname();
    await this.loadHistory();
  }

  private closeModal(): void {
    this.historyModal?.classList.remove('visible');
  }

  private async loadHistory(): Promise<void> {
    try {
      const history = await this.leaderboardManager.getGameHistory(50);

      if (history.length === 0) {
        this.showEmptyState();
        return;
      }

      this.hideEmptyState();
      this.updateSummary(history);
      this.renderHistoryList(history);
    } catch (err) {
      console.error('[UserHistoryUI] Failed to load history:', err);
      this.showEmptyState();
    }
  }

  private updateSummary(history: HistoryEntry[]): void {
    const totalPlays = history.length;
    const bestScore = Math.max(...history.map(h => h.score));
    const avgScore = Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalPlays);

    if (this.historyTotalPlays) {
      this.historyTotalPlays.textContent = totalPlays.toString();
    }

    if (this.historyBestScore) {
      this.historyBestScore.textContent = bestScore.toString().padStart(5, '0');
    }

    if (this.historyAvgScore) {
      this.historyAvgScore.textContent = avgScore.toString().padStart(5, '0');
    }
  }

  private renderHistoryList(history: HistoryEntry[]): void {
    if (!this.historyList) return;

    // Clear existing entries
    this.historyList.innerHTML = '';

    // Find best score
    const bestScore = Math.max(...history.map(h => h.score));

    // Render entries
    history.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'history-entry';

      // Highlight best score
      if (entry.score === bestScore) {
        entryDiv.classList.add('best');
      }

      const formattedDate = this.formatDate(new Date(entry.played_at));

      entryDiv.innerHTML = `
        <span class="history-rank">${index + 1}</span>
        <span class="history-score">${entry.score.toString().padStart(5, '0')}</span>
        <span class="history-date">${formattedDate}</span>
      `;

      this.historyList!.appendChild(entryDiv);
    });
  }

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
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      return `${month}/${day} ${hours}:${mins}`;
    }
  }

  private showEmptyState(): void {
    if (this.historyList) {
      this.historyList.style.display = 'none';
    }
    if (this.historyEmpty) {
      this.historyEmpty.style.display = 'block';
    }
    // Reset summary
    if (this.historyTotalPlays) {
      this.historyTotalPlays.textContent = '0';
    }
    if (this.historyBestScore) {
      this.historyBestScore.textContent = '-----';
    }
    if (this.historyAvgScore) {
      this.historyAvgScore.textContent = '-----';
    }
  }

  private hideEmptyState(): void {
    if (this.historyList) {
      this.historyList.style.display = 'block';
    }
    if (this.historyEmpty) {
      this.historyEmpty.style.display = 'none';
    }
  }

  // Nickname methods
  private async loadNickname(): Promise<void> {
    try {
      const nickname = await this.authManager.getNickname();
      if (this.nicknameValue) {
        this.nicknameValue.textContent = nickname || 'Unknown Pilot';
      }
    } catch (err) {
      console.error('[UserHistoryUI] Failed to load nickname:', err);
      if (this.nicknameValue) {
        this.nicknameValue.textContent = 'Unknown Pilot';
      }
    }
  }

  private showNicknameEdit(): void {
    if (this.nicknameDisplay) {
      this.nicknameDisplay.style.display = 'none';
    }
    if (this.nicknameEdit) {
      this.nicknameEdit.style.display = 'block';
    }
    if (this.nicknameInput && this.nicknameValue) {
      this.nicknameInput.value = this.nicknameValue.textContent || '';
      this.nicknameInput.focus();
      this.nicknameInput.select();
    }
  }

  private hideNicknameEdit(): void {
    if (this.nicknameDisplay) {
      this.nicknameDisplay.style.display = 'flex';
    }
    if (this.nicknameEdit) {
      this.nicknameEdit.style.display = 'none';
    }
  }

  private async saveNickname(): Promise<void> {
    const newNickname = this.nicknameInput?.value.trim();

    if (!newNickname) {
      return;
    }

    try {
      const result = await this.authManager.updateUsername(newNickname);

      if (result.success) {
        if (this.nicknameValue) {
          this.nicknameValue.textContent = newNickname;
        }
        this.hideNicknameEdit();

        // Also update the auth status display
        const { AuthUI } = await import('./AuthUI');
        AuthUI.getInstance().updateAuthStatus();
      } else {
        console.error('[UserHistoryUI] Failed to save nickname:', result.error);
      }
    } catch (err) {
      console.error('[UserHistoryUI] Unexpected error saving nickname:', err);
    }
  }
}
