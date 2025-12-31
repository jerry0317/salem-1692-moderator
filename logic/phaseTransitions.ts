/**
 * Phase transition logic for the game.
 * These are pure functions that take the current state and return the new state.
 */

import { GameState, GamePhase, Player, CardType, LogEntry } from '../types';
import { checkWinCondition } from '../utils/gameLogic';
import { getRandomMessage, NIGHT_KILL_MESSAGES } from '../constants';

// Helper to create a log entry
const createLog = (message: string): LogEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
  message,
  timestamp: Date.now()
});

// Get left neighbor of a player (previous in array order, wrapping around)
export const getLeftNeighborId = (players: Player[], playerId: string): string | null => {
  const aliveEntities = players.filter(p => !p.isDead);
  const index = aliveEntities.findIndex(p => p.id === playerId);
  if (index === -1) return null;
  const leftIndex = index === 0 ? aliveEntities.length - 1 : index - 1;
  return aliveEntities[leftIndex]?.id || null;
};

/**
 * Advance the game to the next phase.
 * Returns the updated game state.
 */
export function advancePhase(state: GameState): GameState {
  let nextPhase = state.phase;
  let logs = [...state.logs];
  let nextTurn = state.turnCounter;
  let nightConfirmations = state.nightConfirmations;

  switch (state.phase) {
    case GamePhase.SETUP:
      nextPhase = GamePhase.NIGHT_INITIAL_WITCH;
      nightConfirmations = []; // Clear for new night phase

      // Small game mode: If only ghosts are witches, place Black Cat randomly
      if (state.isSmallGameMode) {
        const aliveWitches = state.players.filter(p => p.hasRevealedWitch && !p.isDead);
        const realWitches = aliveWitches.filter(p => !p.isGhost);

        if (aliveWitches.length > 0 && realWitches.length === 0) {
          // Ghost witch places Black Cat on random player (silently - don't reveal ghost is witch)
          const validTargets = state.players.filter(p => !p.isGhost);
          if (validTargets.length > 0) {
            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
            const newPlayers = state.players.map(p => ({
              ...p,
              hasBlackCat: p.id === randomTarget.id
            }));
            // No special log message - don't reveal that ghost is the witch
            return {
              ...state,
              phase: nextPhase,
              players: newPlayers,
              logs,
              nightConfirmations: []
            };
          }
        }
      }
      break;

    case GamePhase.NIGHT_INITIAL_WITCH:
      nextPhase = GamePhase.DAY;
      nextTurn++;
      // Reset witch votes after Black Cat placement
      return { ...state, phase: nextPhase, logs, turnCounter: nextTurn, witchVotes: [], nightConfirmations: [] };

    case GamePhase.DAY:
      nextPhase = GamePhase.NIGHT_WITCH_VOTE;
      nightConfirmations = []; // Clear for new night phase

      // Small game mode: Check if only ghosts are witches
      if (state.isSmallGameMode) {
        const aliveEntities = state.players.filter(p => !p.isDead);
        const aliveWitches = aliveEntities.filter(p => p.hasRevealedWitch);
        const realWitches = aliveWitches.filter(p => !p.isGhost);

        // If all witches are ghosts, select random target (silently - don't reveal ghost is witch)
        if (aliveWitches.length > 0 && realWitches.length === 0) {
          const validTargets = aliveEntities.filter(p => !p.isGhost); // Ghosts don't target other ghosts
          if (validTargets.length > 0) {
            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
            // No log message - don't reveal that ghost is the witch
            return {
              ...state,
              phase: nextPhase,
              logs,
              nightConfirmations: [],
              nightKillTargetId: randomTarget.id
            };
          }
        }
      }
      break;

    case GamePhase.NIGHT_WITCH_VOTE:
      // Check if any living entity has an UNREVEALED Constable card
      // Once the constable card is revealed, the constable power is disabled
      // Note: Even if a ghost has constable, we still do the fake voting phase
      // so players can't tell who the constable is
      const hasActiveConstable = state.players.some(p =>
        !p.isDead && p.cards.some(c => c.type === CardType.CONSTABLE && !c.isRevealed)
      );
      if (hasActiveConstable) {
        nextPhase = GamePhase.NIGHT_CONSTABLE;
      } else {
        // Skip constable phase - no active (unrevealed) constable
        nextPhase = GamePhase.NIGHT_CONFESSION;
        logs.push(createLog("No Constable to protect tonight."));
      }
      nightConfirmations = []; // Clear for new night phase
      break;

    case GamePhase.NIGHT_CONSTABLE:
      nextPhase = GamePhase.NIGHT_CONFESSION;
      nightConfirmations = []; // Clear for new night phase

      // If ghost has constable and no protection was set, auto-skip
      if (!state.constableGuardId) {
        const ghostConstable = state.players.find(p =>
          !p.isDead && p.isGhost && p.cards.some(c => c.type === CardType.CONSTABLE && !c.isRevealed)
        );
        if (ghostConstable) {
          return { ...state, phase: nextPhase, logs, turnCounter: nextTurn, nightConfirmations, constableGuardId: 'SKIP' };
        }
      }
      break;

    case GamePhase.NIGHT_CONFESSION:
      // Move to resolution phase where everyone sees who was targeted
      nextPhase = GamePhase.NIGHT_RESOLUTION;
      logs.push(createLog("Confession period has ended."));
      break;

    case GamePhase.NIGHT_RESOLUTION:
      // This is handled by resolveNight function
      return state;
  }

  return { ...state, phase: nextPhase, logs, turnCounter: nextTurn, nightConfirmations };
}

/**
 * Resolve the night phase - decides if targeted player dies or survives.
 * Returns the updated game state, or a state with nightDamageSelection set
 * if in small game mode (partial damage requires card selection).
 */
export function resolveNight(state: GameState, targetDies: boolean): GameState {
  const killed = state.nightKillTargetId;
  const targetPlayer = state.players.find(p => p.id === killed);
  let logs = [...state.logs];
  let deathMessage = "The night was peaceful.";

  // Small game mode: partial damage instead of death
  if (state.isSmallGameMode && targetDies && killed && targetPlayer) {
    const leftNeighborId = getLeftNeighborId(state.players, killed);

    // If target is a ghost, the host (or any real player) chooses which cards to reveal
    const chooserId = targetPlayer.isGhost
      ? state.players.find(p => !p.isGhost && !p.isDead)?.id || ''
      : leftNeighborId || '';

    if (chooserId) {
      const chooser = state.players.find(p => p.id === chooserId);
      logs.push(createLog(`${targetPlayer.name} was attacked! ${chooser?.name || 'Someone'} must choose 2 cards to reveal.`));

      // Reset immunity and set up card selection
      const newPlayers = state.players.map(p => ({ ...p, immune: false }));

      return {
        ...state,
        players: newPlayers,
        logs,
        nightDamageSelection: {
          targetId: killed,
          chooserId,
          pendingReveal: true
        }
      };
    }
  }

  const newPlayers = state.players.map(p => {
    // Reset immunity for next night
    let player = { ...p, immune: false };

    if (p.id === killed && targetDies) {
      player.isDead = true;
      // Reveal all cards
      player.cards = player.cards.map(c => ({ ...c, isRevealed: true }));
      deathMessage = getRandomMessage(NIGHT_KILL_MESSAGES, p.name);
    }
    return player;
  });

  if (!killed) {
    deathMessage = "The witches did not select a target.";
  } else if (!targetDies) {
    deathMessage = `${targetPlayer?.name} was targeted but survived the night!`;
  }

  logs.push(createLog(deathMessage));

  // Check Win
  const win = checkWinCondition(newPlayers, state.isSmallGameMode);
  if (win) {
    logs.push(createLog(`${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`));
    return {
      ...state,
      players: newPlayers,
      logs,
      phase: GamePhase.GAME_OVER,
      nightKillTargetId: null,
      constableGuardId: null,
      witchVotes: [],
      nightDamageSelection: null
    };
  }

  return {
    ...state,
    players: newPlayers,
    phase: GamePhase.DAY,
    logs,
    turnCounter: state.turnCounter + 1,
    nightKillTargetId: null,
    constableGuardId: null,
    witchVotes: [],
    nightDamageSelection: null
  };
}

/**
 * Apply night damage in small game mode - reveal selected cards.
 * Returns the updated game state.
 */
export function applyNightDamage(state: GameState, selectedCardIds: string[]): GameState {
  if (!state.nightDamageSelection) return state;

  const targetId = state.nightDamageSelection.targetId;
  const targetPlayer = state.players.find(p => p.id === targetId);
  let logs = [...state.logs];

  const newPlayers = state.players.map(p => {
    if (p.id !== targetId) return p;

    // Reveal the selected cards
    const newCards = p.cards.map(c => ({
      ...c,
      isRevealed: selectedCardIds.includes(c.id) ? true : c.isRevealed
    }));

    // Check if all cards are now revealed (elimination)
    const allRevealed = newCards.every(c => c.isRevealed);

    return {
      ...p,
      cards: newCards,
      isDead: allRevealed
    };
  });

  const updatedTarget = newPlayers.find(p => p.id === targetId);
  const revealedCount = selectedCardIds.length;

  if (updatedTarget?.isDead) {
    logs.push(createLog(`${targetPlayer?.name} had all their cards revealed and has been eliminated!`));
  } else {
    logs.push(createLog(`${targetPlayer?.name} lost ${revealedCount} card(s) to the night attack.`));
  }

  // Check Win
  const win = checkWinCondition(newPlayers, state.isSmallGameMode);
  if (win) {
    logs.push(createLog(`${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`));
    return {
      ...state,
      players: newPlayers,
      logs,
      phase: GamePhase.GAME_OVER,
      nightKillTargetId: null,
      constableGuardId: null,
      witchVotes: [],
      nightDamageSelection: null
    };
  }

  return {
    ...state,
    players: newPlayers,
    phase: GamePhase.DAY,
    logs,
    turnCounter: state.turnCounter + 1,
    nightKillTargetId: null,
    constableGuardId: null,
    witchVotes: [],
    nightDamageSelection: null
  };
}
