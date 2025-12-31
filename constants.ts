import { CardType } from './types';

export const CARD_DESCRIPTIONS: Record<CardType, string> = {
  [CardType.NOT_A_WITCH]: "You are a pious citizen of Salem.",
  [CardType.WITCH]: "You are a Witch! Conspire to kill the town.",
  [CardType.CONSTABLE]: "You are the Constable. You may save one person each night.",
};

export const PHASE_TITLES: Record<string, string> = {
  LOBBY: "Lobby",
  SETUP: "Setup",
  NIGHT_INITIAL_WITCH: "The First Night",
  DAY: "Day Phase",
  CONSPIRACY: "Conspiracy",
  NIGHT_WITCH_VOTE: "Night: Witch's Hour",
  NIGHT_CONSTABLE: "Night: Constable's Watch",
  NIGHT_CONFESSION: "Night: Confessions",
  NIGHT_RESOLUTION: "Night: Resolution",
  GAME_OVER: "Game Over",
};
