export enum CardType {
  NOT_A_WITCH = 'NOT_A_WITCH',
  WITCH = 'WITCH',
  CONSTABLE = 'CONSTABLE',
}

export interface Card {
  id: string;
  type: CardType;
  isRevealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  peerId: string;
  isHost: boolean;
  isDead: boolean;
  hasBlackCat: boolean;
  cards: Card[];
  hasRevealedWitch: boolean; // True if they have ever held a witch card
  immune: boolean; // Immune from night kill (confession)
  isDisconnected?: boolean; // True if player has disconnected but may rejoin
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  NIGHT_INITIAL_WITCH = 'NIGHT_INITIAL_WITCH', // First night: Place black cat
  DAY = 'DAY',
  CONSPIRACY = 'CONSPIRACY',  // Each player selects a card from left neighbor
  NIGHT_WITCH_VOTE = 'NIGHT_WITCH_VOTE',
  NIGHT_CONSTABLE = 'NIGHT_CONSTABLE',
  NIGHT_CONFESSION = 'NIGHT_CONFESSION',
  GAME_OVER = 'GAME_OVER',
}

export interface ConspiracySelection {
  playerId: string;
  selectedCardId: string;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
}

export interface WitchVote {
  voterId: string;
  witchName: string;
  targetId: string;
  targetName: string;
}

export interface PendingAccusation {
  accuserId: string;
  accuserName: string;
  targetId: string;
  targetName: string;
  accepted: boolean;  // Target has accepted the accusation
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  logs: LogEntry[];
  nightKillTargetId: string | null;
  constableGuardId: string | null;
  turnCounter: number;
  witchVotes: WitchVote[];  // Track individual witch votes
  pendingAccusation: PendingAccusation | null;  // Track active accusation
  conspiracySelections: ConspiracySelection[];  // Track card selections during conspiracy
  nightConfirmations: string[];  // Track player IDs who have confirmed during night phase
  fakeVotes: Record<string, number>;  // Track fake votes for fun stats (playerId -> vote count)
}

// Network Payloads
export type NetworkMessage =
  | { type: 'JOIN'; payload: { name: string } }
  | { type: 'REJOIN'; payload: { name: string; playerId: string } }
  | { type: 'WELCOME'; payload: { gameState: GameState; playerId: string } }
  | { type: 'UPDATE_STATE'; payload: { gameState: GameState } }
  | { type: 'UPDATE_HAND'; payload: { cards: Card[] } }
  | { type: 'ACTION'; payload: { action: string; data: any } }
  | { type: 'LEAVE'; payload: { playerId: string } }
  | { type: 'ERROR'; payload: { message: string } };

export const MIN_PLAYERS = 4;
