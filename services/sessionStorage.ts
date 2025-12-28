import { GameState } from '../types';

const STORAGE_KEY = 'salem1692_session';

interface SessionData {
  playerId: string;        // Persistent player/peer ID
  playerName: string;
  roomId: string;          // Room they were in
  isHost: boolean;
  gameState?: GameState;   // Only stored for host
  timestamp: number;       // When session was last updated
}

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a short random ID for peer connections
 */
function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Save session data to localStorage
 */
export function saveSession(data: Partial<SessionData>): void {
  try {
    const existing = loadSession();
    const updated: SessionData = {
      playerId: data.playerId || existing?.playerId || generatePlayerId(),
      playerName: data.playerName ?? existing?.playerName ?? '',
      roomId: data.roomId ?? existing?.roomId ?? '',
      isHost: data.isHost ?? existing?.isHost ?? false,
      gameState: data.gameState ?? existing?.gameState,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

/**
 * Load session data from localStorage
 * Returns null if no session exists or session is expired
 */
export function loadSession(): SessionData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: SessionData = JSON.parse(stored);

    // Check if session is expired
    if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
      clearSession();
      return null;
    }

    return session;
  } catch (e) {
    console.error('Failed to load session:', e);
    return null;
  }
}

/**
 * Clear session from localStorage (for disconnect/quit)
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

/**
 * Update just the game state (for host)
 */
export function saveGameState(gameState: GameState): void {
  saveSession({ gameState });
}
