import { Card, CardType, Player } from '../types';

// Card distribution per rulebook (p.3)
const TRYAL_CARD_DISTRIBUTION: Record<number, { notAWitch: number; witch: number; constable: number }> = {
  4:  { notAWitch: 18, witch: 1, constable: 1 },  // 20 total, 5 per player
  5:  { notAWitch: 23, witch: 1, constable: 1 },  // 25 total, 5 per player
  6:  { notAWitch: 27, witch: 2, constable: 1 },  // 30 total, 5 per player
  7:  { notAWitch: 32, witch: 2, constable: 1 },  // 35 total, 5 per player
  8:  { notAWitch: 29, witch: 2, constable: 1 },  // 32 total, 4 per player
  9:  { notAWitch: 33, witch: 2, constable: 1 },  // 36 total, 4 per player
  10: { notAWitch: 27, witch: 2, constable: 1 },  // 30 total, 3 per player
  11: { notAWitch: 30, witch: 2, constable: 1 },  // 33 total, 3 per player
  12: { notAWitch: 33, witch: 2, constable: 1 },  // 36 total, 3 per player
};

const getCardsPerPlayer = (playerCount: number): number => {
  if (playerCount <= 7) return 5;
  if (playerCount <= 9) return 4;
  return 3;
};

const generateDeck = (playerCount: number): CardType[] => {
  const deck: CardType[] = [];

  // Use rulebook distribution if available, otherwise calculate
  const distribution = TRYAL_CARD_DISTRIBUTION[playerCount];

  if (distribution) {
    for (let i = 0; i < distribution.witch; i++) deck.push(CardType.WITCH);
    for (let i = 0; i < distribution.constable; i++) deck.push(CardType.CONSTABLE);
    for (let i = 0; i < distribution.notAWitch; i++) deck.push(CardType.NOT_A_WITCH);
  } else {
    // Fallback for player counts outside 4-12 range
    const witchCount = playerCount > 5 ? 2 : 1;
    const constableCount = 1;
    const cardsPerPlayer = getCardsPerPlayer(playerCount);
    const totalCards = playerCount * cardsPerPlayer;
    const townCount = totalCards - witchCount - constableCount;

    for (let i = 0; i < witchCount; i++) deck.push(CardType.WITCH);
    for (let i = 0; i < constableCount; i++) deck.push(CardType.CONSTABLE);
    for (let i = 0; i < townCount; i++) deck.push(CardType.NOT_A_WITCH);
  }

  return shuffle(deck);
};

export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createCard = (type: CardType): Card => ({
  id: Math.random().toString(36).substring(2, 9),
  type,
  isRevealed: false,
});

export const distributeCards = (players: Player[]): Player[] => {
  const deckTypes = generateDeck(players.length);
  const cardsPerPlayer = getCardsPerPlayer(players.length);
  const playersWithCards = players.map(p => ({ ...p, cards: [] as Card[], hasRevealedWitch: false }));

  let cardIndex = 0;
  playersWithCards.forEach(player => {
    for (let i = 0; i < cardsPerPlayer; i++) {
      const type = deckTypes[cardIndex++];
      player.cards.push(createCard(type));
      if (type === CardType.WITCH) {
        player.hasRevealedWitch = true;
      }
    }
  });

  return playersWithCards;
};

export const checkWinCondition = (players: Player[], isSmallGameMode: boolean = false): 'WITCH_WIN' | 'TOWN_WIN' | null => {
  if (isSmallGameMode) {
    // Small game mode (2-3 players with ghosts)
    // Town wins: The single witch card is revealed
    const witchCard = players.flatMap(p => p.cards).find(c => c.type === CardType.WITCH);
    if (witchCard?.isRevealed) {
      return 'TOWN_WIN';
    }

    // Witches win: Any entity is eliminated (all their cards are revealed)
    const anyEliminated = players.some(p =>
      p.cards.length > 0 && p.cards.every(c => c.isRevealed)
    );
    if (anyEliminated) {
      return 'WITCH_WIN';
    }

    // Witches win: All real players (non-ghosts) are witches
    const realPlayers = players.filter(p => !p.isGhost);
    const allRealPlayersAreWitches = realPlayers.length > 0 && realPlayers.every(p => p.hasRevealedWitch);
    if (allRealPlayersAreWitches) {
      return 'WITCH_WIN';
    }

    return null;
  }

  // Standard mode (4+ players)
  const alivePlayers = players.filter(p => !p.isDead);
  const activeWitchCards = alivePlayers.flatMap(p => p.cards).filter(c => c.type === CardType.WITCH && !c.isRevealed);

  // All witch cards revealed -> Town Wins
  if (activeWitchCards.length === 0) {
    return 'TOWN_WIN';
  }

  // Witches kill enough townies
  // If remaining players are equal to remaining witch team, witches usually can't be voted out easily,
  // but strictly rules say: Town wins if all Witches dead. Witch wins if all Town dead.
  // We will stick to: Game ends when all Witch cards revealed (Town Win)
  // Or if only Witch team is alive (Witch Win).

  const townTeamAlive = alivePlayers.filter(p => !p.hasRevealedWitch);
  if (townTeamAlive.length === 0) {
    return 'WITCH_WIN';
  }

  return null;
};

