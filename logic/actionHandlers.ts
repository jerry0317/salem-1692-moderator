/**
 * Action handlers for game state updates.
 * This module contains pure functions that process player actions
 * and return updated game state.
 */

import { GameState, GamePhase, Card, CardType, LogEntry } from '../types';
import { checkWinCondition, shuffle } from '../utils/gameLogic';
import {
  getRandomMessage, WITCH_FOUND_MESSAGES, ALL_CARDS_REVEALED_MESSAGES
} from '../constants';

// Helper to create a log entry
const createLog = (message: string): LogEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
  message,
  timestamp: Date.now()
});

/**
 * Process a player action and return the updated game state.
 * This is a pure function - it does not mutate the input state.
 */
export function processPlayerAction(
  state: GameState,
  playerId: string,
  action: string,
  data: any
): GameState {
  let updates = { ...state };
  let logs = [...state.logs];

  if (action === 'ACCUSE_START') {
    // Player starts an accusation against another player
    const accuser = updates.players.find(p => p.id === playerId);
    const target = updates.players.find(p => p.id === data.targetId);
    if (accuser && target && !target.isDead) {
      // If target is a ghost, auto-accept (ghosts can't respond)
      const isGhostTarget = target.isGhost;
      updates.pendingAccusation = {
        accuserId: playerId,
        accuserName: accuser.name,
        targetId: data.targetId,
        targetName: target.name,
        accepted: isGhostTarget // Auto-accept for ghosts
      };
      logs.push(createLog(`${accuser.name} accuses ${target.name}!`));
      if (isGhostTarget) {
        logs.push(createLog(`The ghost cannot object...`));
      }
    }
  } else if (action === 'ACCUSE_ACCEPT') {
    // Target accepts the accusation
    if (updates.pendingAccusation && updates.pendingAccusation.targetId === playerId) {
      updates.pendingAccusation = { ...updates.pendingAccusation, accepted: true };
      logs.push(createLog(`${updates.pendingAccusation.targetName} accepts the accusation.`));
    }
  } else if (action === 'ACCUSE_CANCEL') {
    // Cancel the pending accusation
    if (updates.pendingAccusation) {
      logs.push(createLog(`Accusation against ${updates.pendingAccusation.targetName} was withdrawn.`));
      updates.pendingAccusation = null;
    }
  } else if (action === 'ACCUSE_REVEAL') {
    // Accuser selects which card to reveal (only after target accepted)
    if (updates.pendingAccusation?.accepted && updates.pendingAccusation.accuserId === playerId) {
      const targetPlayer = updates.players.find(p => p.id === updates.pendingAccusation!.targetId);
      if (targetPlayer) {
        const card = targetPlayer.cards.find(c => c.id === data.cardId);
        if (card && !card.isRevealed) {
          card.isRevealed = true;
          logs.push(createLog(`${targetPlayer.name} revealed ${card.type}!`));

          if (card.type === CardType.WITCH) {
            logs.push(createLog(getRandomMessage(WITCH_FOUND_MESSAGES, targetPlayer.name)));
            targetPlayer.isDead = true;
            targetPlayer.cards.forEach(c => c.isRevealed = true);
          } else {
            // Check if all cards revealed
            if (targetPlayer.cards.every(c => c.isRevealed)) {
              targetPlayer.isDead = true;
              logs.push(createLog(getRandomMessage(ALL_CARDS_REVEALED_MESSAGES, targetPlayer.name)));
            }
          }

          // Clear the pending accusation
          updates.pendingAccusation = null;
        }
      }
    }
  } else if (action === 'NIGHT_CONFIRM') {
    // Non-voter confirms they've "made their selection" (fake vote for privacy)
    if (!updates.nightConfirmations.includes(playerId)) {
      updates.nightConfirmations = [...updates.nightConfirmations, playerId];
      // Track fake votes for fun (synced to all players)
      if (data.fakeTargetId) {
        updates.fakeVotes = {
          ...updates.fakeVotes,
          [data.fakeTargetId]: (updates.fakeVotes[data.fakeTargetId] || 0) + 1
        };
      }
    }
  } else if (action === 'BLACK_CAT') {
    // Track individual witch votes for Black Cat placement (same as kill vote)
    const voter = updates.players.find(p => p.id === playerId);
    const target = updates.players.find(p => p.id === data.targetId);

    if (voter && target) {
      // Remove any existing vote from this witch
      const existingVotes = updates.witchVotes.filter(v => v.voterId !== playerId);
      updates.witchVotes = [
        ...existingVotes,
        {
          voterId: playerId,
          witchName: voter.name,
          targetId: data.targetId,
          targetName: target.name
        }
      ];

      // Auto-add votes for ghost witches (they match the real witch's vote)
      const ghostWitches = updates.players.filter(p => p.isGhost && p.hasRevealedWitch && !p.isDead);
      for (const ghost of ghostWitches) {
        if (!updates.witchVotes.some(v => v.voterId === ghost.id)) {
          updates.witchVotes.push({
            voterId: ghost.id,
            witchName: ghost.name,
            targetId: data.targetId,
            targetName: target.name
          });
        }
      }

      // Apply the Black Cat placement (last vote wins, host can wait for consensus)
      updates.players = updates.players.map(p => ({
        ...p,
        hasBlackCat: p.id === data.targetId
      }));
      // Note: No log message to avoid revealing witch voting patterns

      // Also count as confirmation
      if (!updates.nightConfirmations.includes(playerId)) {
        updates.nightConfirmations = [...updates.nightConfirmations, playerId];
      }
    }
  } else if (action === 'KILL_VOTE') {
    // Track individual witch votes for coordination
    const voter = updates.players.find(p => p.id === playerId);
    const target = updates.players.find(p => p.id === data.targetId);

    if (voter && target) {
      // Remove any existing vote from this witch
      const existingVotes = updates.witchVotes.filter(v => v.voterId !== playerId);
      updates.witchVotes = [
        ...existingVotes,
        {
          voterId: playerId,
          witchName: voter.name,
          targetId: data.targetId,
          targetName: target.name
        }
      ];

      // Auto-add votes for ghost witches (they match the real witch's vote)
      const ghostWitches = updates.players.filter(p => p.isGhost && p.hasRevealedWitch && !p.isDead);
      for (const ghost of ghostWitches) {
        if (!updates.witchVotes.some(v => v.voterId === ghost.id)) {
          updates.witchVotes.push({
            voterId: ghost.id,
            witchName: ghost.name,
            targetId: data.targetId,
            targetName: target.name
          });
        }
      }

      // Also set nightKillTargetId to the most recent vote (host can override)
      updates.nightKillTargetId = data.targetId;

      // Also count as confirmation
      if (!updates.nightConfirmations.includes(playerId)) {
        updates.nightConfirmations = [...updates.nightConfirmations, playerId];
      }
    }
  } else if (action === 'GUARD_VOTE') {
    updates.constableGuardId = data.targetId;
    // Also count as confirmation
    if (!updates.nightConfirmations.includes(playerId)) {
      updates.nightConfirmations = [...updates.nightConfirmations, playerId];
    }
  } else if (action === 'GUARD_SKIP') {
    // Small game mode: Constable can choose not to protect anyone
    updates.constableGuardId = 'SKIP';
    // Also count as confirmation
    if (!updates.nightConfirmations.includes(playerId)) {
      updates.nightConfirmations = [...updates.nightConfirmations, playerId];
    }
  } else if (action === 'SELF_REVEAL') {
    const player = updates.players.find(p => p.id === playerId);
    if (player) {
      const card = player.cards.find(c => c.id === data.cardId);
      if (card) {
        card.isRevealed = true;
        player.immune = true; // Immune for this night
        logs.push(createLog(`${player.name} confessed to seek safety.`));
      }
    }
    // Also count as confirmation (whether they confessed or not, they've made their choice)
    if (!updates.nightConfirmations.includes(playerId)) {
      updates.nightConfirmations = [...updates.nightConfirmations, playerId];
    }
  } else if (action === 'CONFESSION_PASS') {
    // Player chooses not to confess - still counts as confirmation
    if (!updates.nightConfirmations.includes(playerId)) {
      updates.nightConfirmations = [...updates.nightConfirmations, playerId];
    }
  } else if (action === 'SHUFFLE_HAND') {
    // Player shuffles only their hidden cards (revealed stay separate)
    const player = updates.players.find(p => p.id === playerId);
    if (player) {
      const hiddenCards = player.cards.filter(c => !c.isRevealed);
      const revealedCards = player.cards.filter(c => c.isRevealed);
      player.cards = [...shuffle(hiddenCards), ...revealedCards];
    }
  } else if (action === 'SHUFFLE_GHOST') {
    // Small game mode: Shuffle a ghost's hidden cards after peeking
    const ghost = updates.players.find(p => p.id === data.ghostId && p.isGhost);
    if (ghost) {
      const hiddenCards = ghost.cards.filter(c => !c.isRevealed);
      const revealedCards = ghost.cards.filter(c => c.isRevealed);
      ghost.cards = [...shuffle(hiddenCards), ...revealedCards];
    }
  } else if (action === 'NIGHT_DAMAGE_SELECT') {
    // Small game mode: Left neighbor selects cards to reveal for night damage
    if (updates.nightDamageSelection && updates.nightDamageSelection.chooserId === playerId) {
      const targetId = updates.nightDamageSelection.targetId;
      const selectedCardIds = data.cardIds as string[];
      const targetPlayer = updates.players.find(p => p.id === targetId);

      // Reveal the selected cards
      updates.players = updates.players.map(p => {
        if (p.id !== targetId) return p;

        const newCards = p.cards.map(c => ({
          ...c,
          isRevealed: selectedCardIds.includes(c.id) ? true : c.isRevealed
        }));

        const allRevealed = newCards.every(c => c.isRevealed);

        return {
          ...p,
          cards: newCards,
          isDead: allRevealed
        };
      });

      const updatedTarget = updates.players.find(p => p.id === targetId);

      if (updatedTarget?.isDead) {
        logs.push(createLog(`${targetPlayer?.name} had all their cards revealed and has been eliminated!`));
      } else {
        logs.push(createLog(`${targetPlayer?.name} lost ${selectedCardIds.length} card(s) to the night attack.`));
      }

      // Check win condition
      const win = checkWinCondition(updates.players, updates.isSmallGameMode);
      if (win) {
        logs.push(createLog(`${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`));
        updates.phase = GamePhase.GAME_OVER;
      } else {
        updates.phase = GamePhase.DAY;
        updates.turnCounter = updates.turnCounter + 1;
      }

      updates.nightKillTargetId = null;
      updates.constableGuardId = null;
      updates.witchVotes = [];
      updates.nightDamageSelection = null;
    }
  } else if (action === 'TRIGGER_CONSPIRACY') {
    // Enter conspiracy phase - players will select cards from left neighbor
    updates.phase = GamePhase.CONSPIRACY;
    updates.conspiracySelections = [];
    logs.push(createLog("Conspiracy begins! Each player selects a hidden card from their left neighbor."));
  } else if (action === 'CONSPIRACY_SELECT' || action === 'CONSPIRACY_SELECT_FOR_OTHER') {
    // Player selects a card from their left neighbor (or for another player in ghost mode)
    const targetPlayerId = action === 'CONSPIRACY_SELECT_FOR_OTHER' ? data.forPlayerId : playerId;
    const existingSelections = updates.conspiracySelections.filter(s => s.playerId !== targetPlayerId);
    updates.conspiracySelections = [
      ...existingSelections,
      { playerId: targetPlayerId, selectedCardId: data.cardId }
    ];

    // Check if all living real players have selected (ghosts don't select)
    const aliveRealPlayers = updates.players.filter(p => !p.isDead && !p.isGhost);
    const allSelected = aliveRealPlayers.every(p =>
      updates.conspiracySelections.some(s => s.playerId === p.id)
    );

    if (allSelected) {
      // Auto-add selections for ghosts (random card from their left neighbor)
      const aliveEntitiesList = updates.players.filter(p => !p.isDead);
      const ghosts = aliveEntitiesList.filter(p => p.isGhost);
      for (const ghost of ghosts) {
        const ghostIndex = aliveEntitiesList.findIndex(p => p.id === ghost.id);
        let leftIndex = ghostIndex - 1;
        if (leftIndex < 0) leftIndex = aliveEntitiesList.length - 1;
        const leftNeighbor = aliveEntitiesList[leftIndex];
        const hiddenCards = leftNeighbor?.cards.filter(c => !c.isRevealed) || [];
        if (hiddenCards.length > 0) {
          const randomCard = hiddenCards[Math.floor(Math.random() * hiddenCards.length)];
          updates.conspiracySelections.push({
            playerId: ghost.id,
            selectedCardId: randomCard.id
          });
        }
      }

      // Process card transfers based on selections
      const cardTransfers: { fromPlayerId: string; toPlayerId: string; cardId: string }[] = [];

      for (const selection of updates.conspiracySelections) {
        const receivingPlayer = updates.players.find(p => p.id === selection.playerId);
        if (!receivingPlayer || receivingPlayer.isDead) continue;

        // Find left neighbor (previous alive entity in array order)
        const aliveEntities = updates.players.filter(p => !p.isDead);
        const receiverIndex = aliveEntities.findIndex(p => p.id === selection.playerId);
        let leftNeighborIndex = receiverIndex - 1;
        if (leftNeighborIndex < 0) leftNeighborIndex = aliveEntities.length - 1;
        const leftNeighbor = aliveEntities[leftNeighborIndex];

        if (leftNeighbor) {
          cardTransfers.push({
            fromPlayerId: leftNeighbor.id,
            toPlayerId: selection.playerId,
            cardId: selection.selectedCardId
          });
        }
      }

      // Execute transfers using immutable updates
      // First, create a map of playerId -> new cards array (deep copy)
      const playerCardsMap = new Map<string, Card[]>();
      updates.players.forEach(p => {
        playerCardsMap.set(p.id, p.cards.map(c => ({ ...c })));
      });

      // Track which players become witches
      const newWitchPlayerIds: string[] = [];

      for (const transfer of cardTransfers) {
        const fromCards = playerCardsMap.get(transfer.fromPlayerId);
        const toCards = playerCardsMap.get(transfer.toPlayerId);

        if (fromCards && toCards) {
          const cardIndex = fromCards.findIndex(c => c.id === transfer.cardId);
          if (cardIndex !== -1) {
            const [card] = fromCards.splice(cardIndex, 1);
            toCards.push(card);

            // Check infection
            if (card.type === CardType.WITCH) {
              newWitchPlayerIds.push(transfer.toPlayerId);
            }
          }
        }
      }

      // Apply the card changes back to players (immutably)
      updates.players = updates.players.map(p => ({
        ...p,
        cards: shuffle(playerCardsMap.get(p.id) || p.cards),
        hasRevealedWitch: p.hasRevealedWitch || newWitchPlayerIds.includes(p.id)
      }));

      logs.push(createLog("Conspiracy complete! Cards have been passed."));
      updates.phase = GamePhase.DAY;
      updates.conspiracySelections = [];
    }
  }

  // Check Win Condition on any state change that might kill someone
  const win = checkWinCondition(updates.players, updates.isSmallGameMode);
  if (win && state.phase !== GamePhase.GAME_OVER) {
    logs.push(createLog(`${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`));
    updates.phase = GamePhase.GAME_OVER;
  }

  return { ...updates, logs };
}
