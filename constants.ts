import { CardType, GameState, GamePhase } from './types';

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

export const INITIAL_GAME_STATE: GameState = {
  roomId: '',
  phase: GamePhase.LOBBY,
  players: [],
  logs: [],
  nightKillTargetId: null,
  constableGuardId: null,
  turnCounter: 0,
  witchVotes: [],
  pendingAccusation: null,
  conspiracySelections: [],
  nightConfirmations: [],
  fakeVotes: {},
  nightDamageSelection: null,
};

// Historical Salem facts for "Did you know?" display during night phases
export const SALEM_FACTS = [
  // The trials themselves
  "The Salem witch trials resulted in the executions of 20 people between 1692 and 1693.",
  "The first person accused of witchcraft in Salem was Tituba, an enslaved woman.",
  "Giles Corey was pressed to death with heavy stones for refusing to enter a plea. His last words were reportedly 'More weight.'",
  "The youngest accused witch in Salem was Dorothy Good, who was only 4 years old.",
  "Spectral evidence - testimony that the accused's spirit appeared to the witness - was used in the trials.",
  "The trials ended when Governor William Phips dissolved the special court after his own wife was accused.",
  "Over 200 people were accused of witchcraft during the Salem panic.",
  "Many accused witches 'confessed' to avoid execution - only those who maintained innocence were hanged.",
  "The accusers were primarily young girls who claimed to be possessed by the witches' spirits.",
  "In 1711, the colony passed a bill restoring the good names of the accused and providing compensation.",
  "Bridget Bishop was the first person executed during the Salem witch trials on June 10, 1692.",
  "A dog was also executed during the trials, accused of being a witch's familiar.",
  "The term 'witch hunt' now refers to any persecution based on false accusations.",
  "Cotton Mather, a prominent minister, both supported and later criticized the trials.",
  "Salem Village (now Danvers) and Salem Town were rival communities with long-standing disputes.",

  // Key figures
  "Samuel Parris, the village minister, had two of the first afflicted girls living in his household.",
  "Ann Putnam Jr., one of the main accusers, later publicly apologized for her role in the trials.",
  "Rebecca Nurse was a 71-year-old grandmother known for her piety - her execution shocked many.",
  "John Proctor was the first man accused. His story inspired Arthur Miller's 'The Crucible.'",
  "Sarah Good was executed while pregnant - she cursed the minister from the gallows.",
  "Tituba's confession included vivid descriptions of the Devil and flying on broomsticks.",
  "Judge Samuel Sewall later publicly confessed his guilt and fasted annually in repentance.",
  "Martha Corey's skepticism about the trials led to her own accusation and execution.",
  "George Burroughs, a former minister, recited the Lord's Prayer perfectly before his execution - something witches supposedly couldn't do.",

  // Trial details
  "The 'touch test' was used: if an afflicted person calmed when touched by the accused, it proved guilt.",
  "Witch's marks - unusual birthmarks or moles - were considered evidence of a pact with the Devil.",
  "The Court of Oyer and Terminer was specifically created to handle the witch trial cases.",
  "Nineteen people were hanged on Gallows Hill, not burned at the stake as commonly depicted.",
  "No accused witches in Salem were burned - burning was common in Europe but not in English colonies.",
  "The trials cost the colony significantly - families had to pay for their relatives' imprisonment and executions.",
  "Prisoners had to pay for their own food, chains, and even the wood used to burn the warrants.",

  // Social context
  "Salem Village had no ordained minister for years, creating religious anxiety in the community.",
  "Many accused witches were women who had inherited property - unusual for the time.",
  "Boundary disputes between Salem Village and Salem Town contributed to underlying tensions.",
  "The recent smallpox epidemic and ongoing frontier wars with Native Americans created fear and uncertainty.",
  "Puritan belief held that the Devil actively recruited witches to destroy God's kingdom in New England.",
  "Confession was the only way to avoid execution - creating a perverse incentive to lie.",
  "Some historians believe ergot poisoning from contaminated rye may have caused the girls' fits.",
  "The winter of 1691-1692 was particularly harsh, adding to the community's stress.",

  // Aftermath
  "In 1957, Massachusetts formally apologized for the trials.",
  "The last victim wasn't officially exonerated until 2001 - over 300 years later.",
  "Descendants of the accused still gather in Salem for memorial events.",
  "The Salem Witch Trials Memorial was dedicated in 1992, exactly 300 years after the trials.",
  "Arthur Miller wrote 'The Crucible' in 1953 as an allegory for McCarthyism.",
  "Salem now embraces its witch trial history as a major tourist attraction.",
  "The Nurse Homestead, where Rebecca Nurse lived, still stands and is open to visitors.",

  // Interesting facts
  "Black cats became associated with witches partly because of their nocturnal nature.",
  "The word 'warlock' was rarely used in Salem - male witches were simply called witches.",
  "Witch bottles filled with pins and urine were buried as counter-magic against curses.",
  "The infamous 'swimming test' - where accused witches were thrown in water - was not used in Salem.",
  "Familiars were believed to be demons in animal form that served witches.",
  "The Devil's book was said to contain the signatures of all who had pledged their souls.",
  "Some accused claimed to have attended witches' sabbaths in spectral form while their bodies slept.",
  "The color black became associated with witchcraft during this period.",
  "Broomsticks were thought to be anointed with flying ointment made from herbs.",
  "Witch trials were actually declining in Europe by the time Salem's began.",

  // Colonial life
  "Puritans believed in predestination - that God had already chosen who would be saved.",
  "The average colonial house had only one or two rooms shared by the entire family.",
  "Candles were expensive - most colonists went to bed at sunset.",
  "A constable's primary duty was keeping the peace and making arrests.",
  "Town meetings were the center of colonial democracy and dispute resolution.",
  "The pillory and stocks were common punishments for minor offenses in colonial times.",
  "Colonial courts relied heavily on confessions and witness testimony.",
  "Most colonists could read but few could write - signing with an X was common.",
  "The meetinghouse served as both church and town hall in Puritan communities.",
  "Sundays in Puritan New England required attendance at services that could last all day.",
];

// Fun dramatic death messages - {name} will be replaced with player name
export const NIGHT_KILL_MESSAGES = [
  "{name} was found lifeless at dawn, victim of dark sorcery!",
  "The witches claimed {name} in the dead of night!",
  "{name} met their end under the cover of darkness!",
  "Alas! {name} has been struck down by malevolent forces!",
  "{name} was discovered at sunrise, their fate sealed by witchcraft!",
  "The coven has claimed another soul - {name} breathes no more!",
  "Dark magic has taken {name} from this mortal realm!",
  "{name} was found cold and still - the witches' work is done!",
  "By unholy means, {name} has perished in the night!",
  "The witches' curse fell upon {name} - they are no more!",
];

export const WITCH_FOUND_MESSAGES = [
  "A WITCH! {name} has been exposed as a servant of darkness!",
  "The truth is revealed! {name} consorted with the Devil!",
  "Justice prevails! {name}'s witchcraft is laid bare!",
  "{name}'s dark secret is exposed - WITCH!",
  "The town rejoices! {name} is unmasked as a witch!",
  "By God's light, {name}'s wickedness is revealed!",
];

export const ALL_CARDS_REVEALED_MESSAGES = [
  "{name} has been thoroughly tried and found... innocent! But the stress was too much.",
  "{name}'s honor is proven but their heart gives out from the ordeal!",
  "Though proven innocent, {name} cannot survive the shame of accusation!",
  "{name} collapses after their final card is revealed!",
];

// Dynamic facts that include player names - {player} will be replaced with random player name
export const DYNAMIC_FACTS = [
  "{player} seems unusually quiet about the witch accusations...",
  "Rumor has it {player} was seen near the woods last night.",
  "{player} looks nervous. Just saying.",
  "I'm not saying it's {player}, but have you noticed their black cat?",
  "{player} would like everyone to know they are NOT a witch.",
  "If {player} is a witch, I'll eat my hat. (Don't quote me on that.)",
  "{player} has been practicing their 'I'm innocent' face.",
  "Fun fact: {player} knows surprisingly little about broom maintenance.",
  "{player}'s alibi is 'I was sleeping.' Very original.",
  "Historical records show someone named {player} was once very trustworthy. Probably unrelated.",
  "{player} would never consort with the Devil. Right? ...Right?",
  "The constable has their eye on everyone, especially {player}.",
  "{player} has submitted a formal complaint about all this witch business.",
];

// Pick a random dramatic message
export const getRandomMessage = (messages: string[], name: string): string => {
  const template = messages[Math.floor(Math.random() * messages.length)];
  return template.replace('{name}', name);
};
