import React, { useState, useEffect, useCallback } from 'react';
import {
  GameState, Player, GamePhase, NetworkMessage,
  MIN_PLAYERS, Card, CardType, ConspiracySelection, NightDamageSelection
} from './types';
import { PeerService } from './services/peerService';
import { distributeCards, checkWinCondition, shuffle } from './utils/gameLogic';
import { PHASE_TITLES, CARD_DESCRIPTIONS } from './constants';
import Button from './components/Button';
import CardDisplay from './components/CardDisplay';
import {
  saveSession, loadSession, clearSession, saveGameState
} from './services/sessionStorage';

const INITIAL_STATE: GameState = {
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
const SALEM_FACTS = [
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
const NIGHT_KILL_MESSAGES = [
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

const WITCH_FOUND_MESSAGES = [
  "A WITCH! {name} has been exposed as a servant of darkness!",
  "The truth is revealed! {name} consorted with the Devil!",
  "Justice prevails! {name}'s witchcraft is laid bare!",
  "{name}'s dark secret is exposed - WITCH!",
  "The town rejoices! {name} is unmasked as a witch!",
  "By God's light, {name}'s wickedness is revealed!",
];

const ALL_CARDS_REVEALED_MESSAGES = [
  "{name} has been thoroughly tried and found... innocent! But the stress was too much.",
  "{name}'s honor is proven but their heart gives out from the ordeal!",
  "Though proven innocent, {name} cannot survive the shame of accusation!",
  "{name} collapses after their final card is revealed!",
];

// Dynamic facts that include player names - {player} will be replaced with random player name
const DYNAMIC_FACTS = [
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
const getRandomMessage = (messages: string[], name: string) => {
  const template = messages[Math.floor(Math.random() * messages.length)];
  return template.replace('{name}', name);
};

// Get left neighbor of a player (previous in array order, wrapping around)
const getLeftNeighborId = (players: Player[], playerId: string): string | null => {
  const aliveEntities = players.filter(p => !p.isDead);
  const index = aliveEntities.findIndex(p => p.id === playerId);
  if (index === -1) return null;
  const leftIndex = index === 0 ? aliveEntities.length - 1 : index - 1;
  return aliveEntities[leftIndex]?.id || null;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [peerService, setPeerService] = useState<PeerService | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [myHand, setMyHand] = useState<Card[]>([]);

  // Local UI State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [conspiracyModal, setConspiracyModal] = useState(false);
  const [showMyHand, setShowMyHand] = useState(false);
  const [currentDisplayFact, setCurrentDisplayFact] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [nightDamageSelectedCards, setNightDamageSelectedCards] = useState<string[]>([]);
  const [ghostPeekModal, setGhostPeekModal] = useState<{ ghostId: string; card: Card } | null>(null);

  // Refresh the "Did you know?" fact when phase changes - compute once and store
  useEffect(() => {
    const alivePlayers = gameState.players.filter(p => !p.isDead && !p.isDisconnected);

    // 30% chance to use a dynamic fact if we have players
    if (alivePlayers.length > 0 && Math.random() < 0.3) {
      const dynamicFact = DYNAMIC_FACTS[Math.floor(Math.random() * DYNAMIC_FACTS.length)];
      const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      setCurrentDisplayFact(dynamicFact.replace('{player}', randomPlayer.name));
    } else {
      const factIndex = Math.floor(Math.random() * SALEM_FACTS.length);
      setCurrentDisplayFact(SALEM_FACTS[factIndex]);
    }
  }, [gameState.phase]);

  // Trigger confetti when game ends
  useEffect(() => {
    if (gameState.phase === GamePhase.GAME_OVER) {
      setShowConfetti(true);
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase]);

  // Initialize Peer Service with session recovery
  useEffect(() => {
    const existingSession = loadSession();

    // For host, use stored roomId as peer ID (room code = host's peer ID)
    // For client, use stored playerId
    // For new users, generate a new ID
    let peerId: string | undefined;
    if (existingSession?.isHost && existingSession.roomId) {
      peerId = existingSession.roomId; // Host must keep same room code
    } else if (existingSession?.playerId) {
      peerId = existingSession.playerId;
    }

    const ps = new PeerService(peerId);
    setPeerService(ps);

    // Handle peer open
    ps.onOpen((id) => {
      // Attempt to rejoin if we have a valid session
      if (existingSession && existingSession.roomId && existingSession.playerName) {
        if (existingSession.isHost) {
          // Host: restore game state
          setIsHost(true);
          setMyPlayerId(id);
          setPlayerName(existingSession.playerName);

          if (existingSession.gameState) {
            // Update the game state with current peer ID in case it changed
            const restoredState = {
              ...existingSession.gameState,
              roomId: id,
              players: existingSession.gameState.players.map(p =>
                p.isHost ? { ...p, id: id, peerId: id } : p
              )
            };
            setGameState(restoredState);

            // Restore hand for host
            const hostPlayer = existingSession.gameState.players.find(p => p.isHost);
            if (hostPlayer) {
              setMyHand(hostPlayer.cards);
            }

            // Update saved session with new ID if it changed
            if (id !== existingSession.roomId) {
              saveSession({ roomId: id, playerId: id });
            }
          } else {
            setGameState(prev => ({ ...prev, roomId: id }));
          }
        } else {
          // Client: attempt to rejoin the room
          setIsRejoining(true);
          setPlayerName(existingSession.playerName);
          ps.connect(existingSession.roomId, {});
          setTimeout(() => {
            ps.send(existingSession.roomId, {
              type: 'REJOIN',
              payload: { name: existingSession.playerName, playerId: existingSession.playerId }
            });
          }, 1500);
        }
      } else {
        // New user - just set the room ID
        setGameState(prev => ({ ...prev, roomId: id }));
      }
    });

    // Handle host disconnect (for clients)
    ps.onHostDisconnect(() => {
      setHostDisconnected(true);
    });

    return () => {
      ps.destroy();
    };
  }, []);

  // Sync Room ID when generated
  useEffect(() => {
      if (peerService?.myId && isHost) {
          setGameState(prev => ({ ...prev, roomId: peerService.myId }));
      }
  }, [peerService?.myId, isHost]);

  // Host Logic: Handle Incoming Messages
  const handleHostMessage = useCallback((connId: string, msg: NetworkMessage) => {
    if (!isHost) return;

    switch (msg.type) {
      case 'JOIN': {
        setGameState(prev => {
          if (prev.players.find(p => p.id === connId)) return prev;

          // If game has started, try to reconnect by name
          if (prev.phase !== GamePhase.LOBBY) {
            // Look for existing player with matching name (may or may not be marked disconnected)
            // This allows reconnection even if disconnect event didn't fire properly
            const existingPlayer = prev.players.find(
              p => p.name === msg.payload.name
            );

            if (existingPlayer) {
              // Reconnect them to their existing player slot
              const updatedPlayers = prev.players.map(p =>
                p.id === existingPlayer.id
                  ? { ...p, peerId: connId, isDisconnected: false }
                  : p
              );

              const newState = {
                ...prev,
                players: updatedPlayers,
                logs: [...prev.logs, { id: Date.now().toString(), message: `${existingPlayer.name} reconnected.`, timestamp: Date.now() }]
              };

              setTimeout(() => {
                peerService?.send(connId, {
                  type: 'WELCOME',
                  payload: { gameState: newState, playerId: existingPlayer.id }
                });
                peerService?.send(connId, {
                  type: 'UPDATE_HAND',
                  payload: { cards: existingPlayer.cards }
                });
              }, 500);

              return newState;
            } else {
              // No matching player - reject the join
              setTimeout(() => {
                peerService?.send(connId, {
                  type: 'ERROR',
                  payload: { message: 'Game has already started. Cannot join as a new player.' }
                });
              }, 500);
              return prev;
            }
          }

          // Game is in LOBBY - check for duplicate name
          const duplicateName = prev.players.find(p => p.name === msg.payload.name);
          if (duplicateName) {
            setTimeout(() => {
              peerService?.send(connId, {
                type: 'ERROR',
                payload: { message: `Name "${msg.payload.name}" is already taken. Please choose a different name.` }
              });
            }, 500);
            return prev;
          }

          // Allow new player
          const newPlayer: Player = {
            id: connId,
            name: msg.payload.name,
            peerId: connId,
            isHost: false,
            isDead: false,
            hasBlackCat: false,
            cards: [],
            hasRevealedWitch: false,
            immune: false,
            isDisconnected: false
          };

          const newState = {
            ...prev,
            players: [...prev.players, newPlayer],
            logs: [...prev.logs, { id: Date.now().toString(), message: `${msg.payload.name} joined.`, timestamp: Date.now() }]
          };

          // Send welcome back to player
          setTimeout(() => {
            peerService?.send(connId, {
              type: 'WELCOME',
              payload: { gameState: newState, playerId: connId }
            });
          }, 500);

          return newState;
        });
        break;
      }
      case 'REJOIN': {
        // Player is attempting to rejoin with their stored ID
        setGameState(prev => {
          const existingPlayer = prev.players.find(p => p.id === msg.payload.playerId);

          if (existingPlayer) {
            // Player found - update their peerId and mark as connected
            const updatedPlayers = prev.players.map(p =>
              p.id === msg.payload.playerId
                ? { ...p, peerId: connId, isDisconnected: false }
                : p
            );

            const newState = {
              ...prev,
              players: updatedPlayers,
              logs: [...prev.logs, { id: Date.now().toString(), message: `${existingPlayer.name} reconnected.`, timestamp: Date.now() }]
            };

            // Send welcome with their original player ID
            setTimeout(() => {
              peerService?.send(connId, {
                type: 'WELCOME',
                payload: { gameState: newState, playerId: msg.payload.playerId }
              });
              // Also send their hand
              peerService?.send(connId, {
                type: 'UPDATE_HAND',
                payload: { cards: existingPlayer.cards }
              });
            }, 500);

            return newState;
          } else {
            // Player not found - treat as new join
            const newPlayer: Player = {
              id: msg.payload.playerId,
              name: msg.payload.name,
              peerId: connId,
              isHost: false,
              isDead: false,
              hasBlackCat: false,
              cards: [],
              hasRevealedWitch: false,
              immune: false,
              isDisconnected: false
            };

            const newState = {
              ...prev,
              players: [...prev.players, newPlayer],
              logs: [...prev.logs, { id: Date.now().toString(), message: `${msg.payload.name} joined.`, timestamp: Date.now() }]
            };

            setTimeout(() => {
              peerService?.send(connId, {
                type: 'WELCOME',
                payload: { gameState: newState, playerId: msg.payload.playerId }
              });
            }, 500);

            return newState;
          }
        });
        break;
      }
      case 'LEAVE': {
        // Player intentionally left - remove from game in lobby, mark as disconnected otherwise
        setGameState(prev => {
          if (prev.phase === GamePhase.LOBBY) {
            return {
              ...prev,
              players: prev.players.filter(p => p.id !== msg.payload.playerId),
              logs: [...prev.logs, { id: Date.now().toString(), message: `A player left the game.`, timestamp: Date.now() }]
            };
          } else {
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id === msg.payload.playerId ? { ...p, isDisconnected: true } : p
              ),
              logs: [...prev.logs, { id: Date.now().toString(), message: `A player left the game.`, timestamp: Date.now() }]
            };
          }
        });
        break;
      }
      case 'ACTION': {
        processPlayerAction(connId, msg.payload.action, msg.payload.data);
        break;
      }
    }
  }, [isHost, peerService]);

  // Client Logic: Handle Incoming Messages
  const handleClientMessage = useCallback((connId: string, msg: NetworkMessage) => {
    if (isHost) return;

    switch (msg.type) {
      case 'WELCOME':
        setMyPlayerId(msg.payload.playerId);
        setGameState(msg.payload.gameState);
        setIsRejoining(false);
        setHostDisconnected(false);
        // Save session for future reconnection
        saveSession({
          playerId: msg.payload.playerId,
          playerName: playerName,
          roomId: msg.payload.gameState.roomId,
          isHost: false
        });
        break;
      case 'UPDATE_STATE':
        setGameState(msg.payload.gameState);
        break;
      case 'UPDATE_HAND':
        setMyHand(msg.payload.cards);
        break;
      case 'ERROR':
        alert(msg.payload.message);
        break;
    }
  }, [isHost, playerName]);

  // Attach Listeners
  useEffect(() => {
    if (!peerService) return;
    peerService.onMessage((id, msg) => {
      if (isHost) handleHostMessage(id, msg);
      else handleClientMessage(id, msg);
    });

    // Handle player disconnections (host only)
    if (isHost) {
      peerService.onDisconnect((connId) => {
        setGameState(prev => {
          const player = prev.players.find(p => p.peerId === connId);
          if (!player) return prev;

          return {
            ...prev,
            players: prev.players.map(p =>
              p.peerId === connId ? { ...p, isDisconnected: true } : p
            ),
            logs: [...prev.logs, {
              id: Date.now().toString(),
              message: `${player.name} disconnected.`,
              timestamp: Date.now()
            }]
          };
        });
      });
    }
  }, [peerService, isHost, handleHostMessage, handleClientMessage]);

  // Save game state for host (for session recovery)
  useEffect(() => {
    if (isHost && gameState.phase !== GamePhase.LOBBY) {
      saveGameState(gameState);
    }
  }, [isHost, gameState]);

  // Broadcast State Updates (Host Only)
  useEffect(() => {
    if (isHost && peerService && gameState.players.length > 0) {
      // Broadcast public state
      const publicState = {
        ...gameState,
        // Mask cards for public state, actual cards sent via UPDATE_HAND
        players: gameState.players.map(p => ({
          ...p,
          cards: p.cards.map(c => ({ ...c, type: c.isRevealed ? c.type : (null as any) }))
        }))
      };
      
      peerService.broadcast({ type: 'UPDATE_STATE', payload: { gameState: publicState } });

      // Send private hands
      gameState.players.forEach(p => {
        if (p.id !== myPlayerId) { // Don't send to self via network
            peerService.send(p.id, { type: 'UPDATE_HAND', payload: { cards: p.cards } });
        } else {
            setMyHand(p.cards);
        }
      });
    }
  }, [gameState, isHost, peerService, myPlayerId]);

  // --- HOST ACTIONS ---

  // Move player up or down in the player list (affects seating order)
  const movePlayer = (index: number, direction: 'up' | 'down') => {
    if (!isHost) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= gameState.players.length) return;

    setGameState(prev => {
      const newPlayers = [...prev.players];
      [newPlayers[index], newPlayers[newIndex]] = [newPlayers[newIndex], newPlayers[index]];
      return { ...prev, players: newPlayers };
    });
  };

  // Helper to create a ghost entity for 2-3 player mode
  const createGhost = (name: string): Player => ({
    id: `ghost-${Math.random().toString(36).substring(2, 9)}`,
    name,
    peerId: '',
    isHost: false,
    isDead: false,
    hasBlackCat: false,
    cards: [],
    hasRevealedWitch: false,
    immune: false,
    isGhost: true,
  });

  const startGame = () => {
    if (gameState.players.length < MIN_PLAYERS) return;

    const isSmallGame = gameState.players.length <= 3;
    let allEntities = [...gameState.players];

    // For 2-3 player games, add ghosts to make 4 total entities
    if (gameState.players.length === 2) {
      // Fixed order: Player1 → Ghost1 → Player2 → Ghost2
      allEntities = [
        gameState.players[0],
        createGhost('Ghost 1'),
        gameState.players[1],
        createGhost('Ghost 2'),
      ];
    } else if (gameState.players.length === 3) {
      // Add 1 ghost after the last player
      allEntities = [
        ...gameState.players,
        createGhost('Ghost'),
      ];
    }

    // Distribute Cards
    const playersWithCards = distributeCards(allEntities);

    const startMessage = isSmallGame
      ? `Small Game Started (${gameState.players.length} players + ${allEntities.length - gameState.players.length} ghost${allEntities.length - gameState.players.length > 1 ? 's' : ''}). Cards distributed.`
      : "Game Started. Cards distributed.";

    setGameState(prev => ({
      ...prev,
      phase: GamePhase.SETUP,
      players: playersWithCards,
      isSmallGameMode: isSmallGame,
      fakeVotes: {}, // Reset fake votes for new game
      logs: [...prev.logs, { id: Date.now().toString(), message: startMessage, timestamp: Date.now() }]
    }));
  };

  const advancePhase = () => {
    setGameState(prev => {
        let nextPhase = prev.phase;
        let logs = [...prev.logs];
        let nextTurn = prev.turnCounter;
        let nightConfirmations = prev.nightConfirmations;

        switch(prev.phase) {
            case GamePhase.SETUP:
                nextPhase = GamePhase.NIGHT_INITIAL_WITCH;
                nightConfirmations = []; // Clear for new night phase

                // Small game mode: If only ghosts are witches, place Black Cat randomly
                if (prev.isSmallGameMode) {
                    const aliveWitches = prev.players.filter(p => p.hasRevealedWitch && !p.isDead);
                    const realWitches = aliveWitches.filter(p => !p.isGhost);

                    if (aliveWitches.length > 0 && realWitches.length === 0) {
                        // Ghost witch places Black Cat on random player (silently - don't reveal ghost is witch)
                        const validTargets = prev.players.filter(p => !p.isGhost);
                        if (validTargets.length > 0) {
                            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                            const newPlayers = prev.players.map(p => ({
                                ...p,
                                hasBlackCat: p.id === randomTarget.id
                            }));
                            // No special log message - don't reveal that ghost is the witch
                            return {
                                ...prev,
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
                return { ...prev, phase: nextPhase, logs, turnCounter: nextTurn, witchVotes: [], nightConfirmations: [] };
            case GamePhase.DAY:
                nextPhase = GamePhase.NIGHT_WITCH_VOTE;
                nightConfirmations = []; // Clear for new night phase

                // Small game mode: Check if only ghosts are witches
                if (prev.isSmallGameMode) {
                    const aliveEntities = prev.players.filter(p => !p.isDead);
                    const aliveWitches = aliveEntities.filter(p => p.hasRevealedWitch);
                    const realWitches = aliveWitches.filter(p => !p.isGhost);

                    // If all witches are ghosts, select random target (silently - don't reveal ghost is witch)
                    if (aliveWitches.length > 0 && realWitches.length === 0) {
                        const validTargets = aliveEntities.filter(p => !p.isGhost); // Ghosts don't target other ghosts
                        if (validTargets.length > 0) {
                            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                            // No log message - don't reveal that ghost is the witch
                            return {
                                ...prev,
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
                const hasActiveConstable = prev.players.some(p =>
                    !p.isDead && p.cards.some(c => c.type === CardType.CONSTABLE && !c.isRevealed)
                );
                if (hasActiveConstable) {
                    nextPhase = GamePhase.NIGHT_CONSTABLE;
                } else {
                    // Skip constable phase - no active (unrevealed) constable
                    nextPhase = GamePhase.NIGHT_CONFESSION;
                    logs.push({ id: Date.now().toString(), message: "No Constable to protect tonight.", timestamp: Date.now() });
                }
                nightConfirmations = []; // Clear for new night phase
                break;
            case GamePhase.NIGHT_CONSTABLE:
                nextPhase = GamePhase.NIGHT_CONFESSION;
                nightConfirmations = []; // Clear for new night phase

                // If ghost has constable and no protection was set, auto-skip
                if (!prev.constableGuardId) {
                    const ghostConstable = prev.players.find(p =>
                        !p.isDead && p.isGhost && p.cards.some(c => c.type === CardType.CONSTABLE && !c.isRevealed)
                    );
                    if (ghostConstable) {
                        return { ...prev, phase: nextPhase, logs, turnCounter: nextTurn, nightConfirmations, constableGuardId: 'SKIP' };
                    }
                }
                break;
            case GamePhase.NIGHT_CONFESSION:
                // Move to resolution phase where everyone sees who was targeted
                nextPhase = GamePhase.NIGHT_RESOLUTION;
                logs.push({ id: Date.now().toString(), message: "Confession period has ended.", timestamp: Date.now() });
                break;
            case GamePhase.NIGHT_RESOLUTION:
                // This is handled by resolveNight function
                return prev;
        }

        return { ...prev, phase: nextPhase, logs, turnCounter: nextTurn, nightConfirmations };
    });
    // Note: fact refresh is handled by useEffect on gameState.phase change
  };

  // Host manually resolves the night - decides if targeted player dies or survives
  const resolveNight = (targetDies: boolean) => {
    setGameState(prev => {
      const killed = prev.nightKillTargetId;
      const targetPlayer = prev.players.find(p => p.id === killed);
      let logs = [...prev.logs];
      let deathMessage = "The night was peaceful.";

      // Small game mode: partial damage instead of death
      if (prev.isSmallGameMode && targetDies && killed && targetPlayer) {
        const leftNeighborId = getLeftNeighborId(prev.players, killed);

        // If target is a ghost, the host (or any real player) chooses which cards to reveal
        const chooserId = targetPlayer.isGhost
          ? prev.players.find(p => !p.isGhost && !p.isDead)?.id || ''
          : leftNeighborId || '';

        if (chooserId) {
          const chooser = prev.players.find(p => p.id === chooserId);
          logs.push({
            id: Date.now().toString(),
            message: `${targetPlayer.name} was attacked! ${chooser?.name || 'Someone'} must choose 2 cards to reveal.`,
            timestamp: Date.now()
          });

          // Reset immunity and set up card selection
          const newPlayers = prev.players.map(p => ({ ...p, immune: false }));

          return {
            ...prev,
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

      const newPlayers = prev.players.map(p => {
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

      logs.push({ id: Date.now().toString(), message: deathMessage, timestamp: Date.now() });

      // Check Win
      const win = checkWinCondition(newPlayers, prev.isSmallGameMode);
      if (win) {
        logs.push({ id: Date.now().toString(), message: `${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`, timestamp: Date.now() });
        return {
          ...prev,
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
        ...prev,
        players: newPlayers,
        phase: GamePhase.DAY,
        logs,
        turnCounter: prev.turnCounter + 1,
        nightKillTargetId: null,
        constableGuardId: null,
        witchVotes: [],
        nightDamageSelection: null
      };
    });
  };

  // Small game mode: Apply night damage (reveal 2 cards) after selection
  const applyNightDamage = (selectedCardIds: string[]) => {
    setGameState(prev => {
      if (!prev.nightDamageSelection) return prev;

      const targetId = prev.nightDamageSelection.targetId;
      const targetPlayer = prev.players.find(p => p.id === targetId);
      let logs = [...prev.logs];

      const newPlayers = prev.players.map(p => {
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
        logs.push({
          id: Date.now().toString(),
          message: `${targetPlayer?.name} had all their cards revealed and has been eliminated!`,
          timestamp: Date.now()
        });
      } else {
        logs.push({
          id: Date.now().toString(),
          message: `${targetPlayer?.name} lost ${revealedCount} card(s) to the night attack.`,
          timestamp: Date.now()
        });
      }

      // Check Win
      const win = checkWinCondition(newPlayers, prev.isSmallGameMode);
      if (win) {
        logs.push({ id: Date.now().toString(), message: `${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`, timestamp: Date.now() });
        return {
          ...prev,
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
        ...prev,
        players: newPlayers,
        phase: GamePhase.DAY,
        logs,
        turnCounter: prev.turnCounter + 1,
        nightKillTargetId: null,
        constableGuardId: null,
        witchVotes: [],
        nightDamageSelection: null
      };
    });
  };

  const processPlayerAction = (playerId: string, action: string, data: any) => {
    setGameState(prev => {
        let updates = { ...prev };
        let logs = [...prev.logs];

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
                logs.push({ id: Date.now().toString(), message: `${accuser.name} accuses ${target.name}!`, timestamp: Date.now() });
                if (isGhostTarget) {
                    logs.push({ id: Date.now().toString(), message: `The ghost cannot object...`, timestamp: Date.now() });
                }
            }
        } else if (action === 'ACCUSE_ACCEPT') {
            // Target accepts the accusation
            if (updates.pendingAccusation && updates.pendingAccusation.targetId === playerId) {
                updates.pendingAccusation = { ...updates.pendingAccusation, accepted: true };
                logs.push({ id: Date.now().toString(), message: `${updates.pendingAccusation.targetName} accepts the accusation.`, timestamp: Date.now() });
            }
        } else if (action === 'ACCUSE_CANCEL') {
            // Cancel the pending accusation
            if (updates.pendingAccusation) {
                logs.push({ id: Date.now().toString(), message: `Accusation against ${updates.pendingAccusation.targetName} was withdrawn.`, timestamp: Date.now() });
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
                        logs.push({ id: Date.now().toString(), message: `${targetPlayer.name} revealed ${card.type}!`, timestamp: Date.now() });

                        if (card.type === CardType.WITCH) {
                            logs.push({ id: Date.now().toString(), message: getRandomMessage(WITCH_FOUND_MESSAGES, targetPlayer.name), timestamp: Date.now() });
                            targetPlayer.isDead = true;
                            targetPlayer.cards.forEach(c => c.isRevealed = true);
                        } else {
                            // Check if all cards revealed
                            if (targetPlayer.cards.every(c => c.isRevealed)) {
                                targetPlayer.isDead = true;
                                logs.push({ id: Date.now().toString(), message: getRandomMessage(ALL_CARDS_REVEALED_MESSAGES, targetPlayer.name), timestamp: Date.now() });
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
                     logs.push({ id: Date.now().toString(), message: `${player.name} confessed to seek safety.`, timestamp: Date.now() });
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
                    logs.push({
                        id: Date.now().toString(),
                        message: `${targetPlayer?.name} had all their cards revealed and has been eliminated!`,
                        timestamp: Date.now()
                    });
                } else {
                    logs.push({
                        id: Date.now().toString(),
                        message: `${targetPlayer?.name} lost ${selectedCardIds.length} card(s) to the night attack.`,
                        timestamp: Date.now()
                    });
                }

                // Check win condition
                const win = checkWinCondition(updates.players, updates.isSmallGameMode);
                if (win) {
                    logs.push({ id: Date.now().toString(), message: `${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`, timestamp: Date.now() });
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
            logs.push({ id: Date.now().toString(), message: "Conspiracy begins! Each player selects a hidden card from their left neighbor.", timestamp: Date.now() });
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
                    const aliveEntitiesList = updates.players.filter(p => !p.isDead);
                    const receiverIndex = aliveEntitiesList.findIndex(p => p.id === selection.playerId);
                    let leftNeighborIndex = receiverIndex - 1;
                    if (leftNeighborIndex < 0) leftNeighborIndex = aliveEntitiesList.length - 1;
                    const leftNeighbor = aliveEntitiesList[leftNeighborIndex];

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
                    playerCardsMap.set(p.id, [...p.cards]);
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

                logs.push({ id: Date.now().toString(), message: "Conspiracy complete! Cards have been passed.", timestamp: Date.now() });
                updates.phase = GamePhase.DAY;
                updates.conspiracySelections = [];
            }
        }

        // Check Win Condition on any state change that might kill someone
        const win = checkWinCondition(updates.players, updates.isSmallGameMode);
        if (win && prev.phase !== GamePhase.GAME_OVER) {
             logs.push({ id: Date.now().toString(), message: `${win === 'TOWN_WIN' ? 'Town' : 'Witches'} Win!`, timestamp: Date.now() });
             updates.phase = GamePhase.GAME_OVER;
        }

        return { ...updates, logs };
    });
  };

  // --- CLIENT ACTIONS ---

  const joinGame = () => {
    if (!inputRoomId || !playerName || !peerService) return;
    const roomId = inputRoomId.toUpperCase();
    peerService.connect(roomId, {});

    // Check if we have a session for this room - try REJOIN first for better reconnection
    const session = loadSession();
    const hasMatchingSession = session && session.roomId === roomId && session.playerName === playerName;

    setTimeout(() => {
      if (hasMatchingSession && session.playerId) {
        // Use REJOIN with stored playerId for reliable reconnection
        peerService.send(roomId, {
          type: 'REJOIN',
          payload: { name: playerName, playerId: session.playerId }
        });
      } else {
        // New join
        peerService.send(roomId, { type: 'JOIN', payload: { name: playerName } });
      }
    }, 1500); // Wait for connection
  };

  const leaveGame = () => {
    if (peerService && gameState.roomId && myPlayerId) {
      // Notify host of intentional leave
      if (!isHost) {
        peerService.send(gameState.roomId, {
          type: 'LEAVE',
          payload: { playerId: myPlayerId }
        });
      }
    }
    // Clear session and reset state
    clearSession();
    peerService?.destroy();
    setPeerService(null);
    setGameState(INITIAL_STATE);
    setMyPlayerId('');
    setIsHost(false);
    setMyHand([]);
    setPlayerName('');
    setHostDisconnected(false);
    // Reload to get fresh peer connection
    window.location.reload();
  };

  const sendAction = (action: string, data: any) => {
    if (!peerService || !gameState.roomId) return;
    peerService.send(gameState.roomId, { type: 'ACTION', payload: { action, data } });

    // If I am host, process directly
    if (isHost) {
        processPlayerAction(myPlayerId, action, data);
    }

    setSelectedPlayerId(null);
    setSelectedCardId(null);
  };

  // --- RENDER HELPERS ---

  const myPlayer = gameState.players.find(p => p.id === myPlayerId);

  // Theme mode: Dark for private actions (nights, conspiracy, viewing hidden cards)
  // Light for public state (lobby, day, game over)
  const isDarkMode =
    gameState.phase === GamePhase.NIGHT_INITIAL_WITCH ||
    gameState.phase === GamePhase.NIGHT_WITCH_VOTE ||
    gameState.phase === GamePhase.NIGHT_CONSTABLE ||
    gameState.phase === GamePhase.NIGHT_CONFESSION ||
    gameState.phase === GamePhase.NIGHT_RESOLUTION ||
    gameState.phase === GamePhase.CONSPIRACY ||
    showMyHand;

  const getMyRole = () => {
      if (!myHand.length) return 'Spectator';
      // Witch Team if ANY witch card seen EVER (hasRevealedWitch is tracked on server, but let's check local hand for now)
      // Actually strictly: Witch Team = ever held witch card. Constable = currently holding.
      if (myPlayer?.hasRevealedWitch) return 'Witch Team';
      if (myHand.some(c => c.type === CardType.CONSTABLE)) return 'Constable';
      return 'Town';
  };

  // --- VIEWS ---

  // Show rejoining overlay
  if (isRejoining) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
          <h1 className="text-3xl font-bold mb-4 text-indigo-400">Salem 1692</h1>
          <div className="animate-pulse text-slate-300 mb-4">Reconnecting to game...</div>
          <div className="text-sm text-slate-500 mb-6">Please wait while we restore your session</div>
          <Button variant="secondary" onClick={() => {
            clearSession();
            setIsRejoining(false);
            window.location.reload();
          }}>Cancel & Start Fresh</Button>
        </div>
      </div>
    );
  }

  // Show host disconnected overlay
  if (hostDisconnected && !isHost) {
    const retryConnection = () => {
      const session = loadSession();
      if (session && peerService) {
        setHostDisconnected(false);
        peerService.connect(session.roomId, {});
        setTimeout(() => {
          peerService.send(session.roomId, {
            type: 'REJOIN',
            payload: { name: session.playerName, playerId: session.playerId }
          });
        }, 1500);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-yellow-700 text-center">
          <h1 className="text-3xl font-bold mb-4 text-yellow-400">Host Disconnected</h1>
          <div className="text-slate-300 mb-4">Waiting for host to reconnect...</div>
          <div className="text-sm text-slate-500 mb-6">Click retry once the host is back online</div>
          <div className="flex gap-3 justify-center">
            <Button onClick={retryConnection}>Retry Connection</Button>
            <Button variant="secondary" onClick={leaveGame}>Leave Game</Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === GamePhase.LOBBY && !isHost && !myPlayerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-center mb-8 text-indigo-400">Salem 1692</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Code</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 uppercase tracking-widest font-mono text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                placeholder="XXXX"
                maxLength={4}
              />
            </div>
            <Button fullWidth onClick={joinGame} disabled={!playerName || !inputRoomId}>Join Game</Button>
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-600"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-600"></div>
            </div>
            <Button fullWidth variant="secondary" onClick={() => {
                setIsHost(true);
                setMyPlayerId(peerService?.myId || '');
                const hostName = playerName || 'Host';
                // Add host as player automatically
                const hostPlayer: Player = {
                    id: peerService?.myId || '',
                    name: hostName,
                    peerId: peerService?.myId || '',
                    isHost: true,
                    isDead: false,
                    hasBlackCat: false,
                    cards: [],
                    hasRevealedWitch: false,
                    immune: false,
                    isDisconnected: false
                };
                setGameState(prev => ({
                    ...prev,
                    players: [hostPlayer],
                    roomId: peerService?.myId || ''
                }));
                // Save host session
                saveSession({
                    playerId: peerService?.myId || '',
                    playerName: hostName,
                    roomId: peerService?.myId || '',
                    isHost: true
                });
            }}>Create Room (Host)</Button>
          </div>
        </div>
      </div>
    );
  }

  // Common Header
  const Header = () => (
      <header className={`p-4 shadow-md flex justify-between items-center sticky top-0 z-50 transition-colors duration-500 ${
        isDarkMode ? 'bg-slate-800' : 'bg-white border-b border-stone-200'
      }`}>
          <div>
              <div className="flex items-center gap-2">
                  <h2 className={`font-bold text-lg ${isDarkMode ? 'text-indigo-400' : 'text-amber-700'}`}>{PHASE_TITLES[gameState.phase]}</h2>
                  {gameState.isSmallGameMode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          Small Game
                      </span>
                  )}
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Room: <span className={`font-mono tracking-widest ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>{gameState.roomId}</span></p>
          </div>
          <div className="flex items-center gap-3">
            {myPlayer?.isDead && <span className="text-red-500 font-bold px-2 py-1 bg-red-900/30 rounded">DEAD</span>}
            {myPlayer?.hasBlackCat && <span className="text-yellow-500 text-2xl" title="Black Cat">🐈‍⬛</span>}
            <div className="text-right">
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>{myPlayer?.name}</div>
            </div>
            <button
              onClick={leaveGame}
              className={`ml-2 px-3 py-1 text-sm rounded border ${
                isDarkMode
                  ? 'bg-red-900/50 hover:bg-red-900 text-red-200 border-red-800'
                  : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
              }`}
              title="Leave Game"
            >
              Leave
            </button>
          </div>
      </header>
  );

  // Common Player Grid for Selecting Targets
  const PlayerGrid = ({
    onSelect,
    filter = (p: Player) => true,
    actionLabel = "Select",
    hideBlackCat = false
  }: {
    onSelect: (pid: string) => void,
    filter?: (p: Player) => boolean,
    actionLabel?: string,
    hideBlackCat?: boolean
  }) => (
      <div className="grid grid-cols-2 gap-4 my-4">
          {gameState.players.filter(filter).map(p => (
              <div
                key={p.id}
                onClick={() => !p.isDisconnected && onSelect(p.id)}
                className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedPlayerId === p.id ? 'border-indigo-500 bg-indigo-900/30' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}
                    ${p.isDead ? 'opacity-50 grayscale' : ''}
                    ${p.isDisconnected ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                  <div className="font-bold flex items-center gap-2">
                    {p.isGhost && <span title="Ghost">👻</span>}
                    <span className={p.isGhost ? 'text-slate-400' : ''}>{p.name}</span>
                    {p.isDisconnected && <span className="text-xs text-yellow-500">(Offline)</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                      {p.isDead ? 'Dead' : `Cards Hidden: ${p.cards.filter(c => !c.isRevealed).length}`}
                  </div>
                  {!hideBlackCat && p.hasBlackCat && <div className="mt-1">🐈‍⬛</div>}
              </div>
          ))}
      </div>
  );

  // Confetti Component
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#3b82f6', '#22c55e'][Math.floor(Math.random() * 6)],
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );

  // --- GAME OVER PHASE ---
  if (gameState.phase === GamePhase.GAME_OVER) {
    const townWins = gameState.logs.some(l => l.message.includes('Town Win'));
    const witchTeam = gameState.players.filter(p => p.hasRevealedWitch);
    const townTeam = gameState.players.filter(p => !p.hasRevealedWitch);
    const survivors = gameState.players.filter(p => !p.isDead);
    const deaths = gameState.players.filter(p => p.isDead);

    // Calculate meaningful titles
    const getPlayerTitle = (player: Player): string => {
      // Check for specific achievements based on game events
      if (player.hasRevealedWitch && !player.isDead) return "Master of Deception";
      if (player.hasRevealedWitch && player.isDead) return "Exposed Witch";
      if (!player.hasRevealedWitch && !player.isDead && player.cards.some(c => c.type === CardType.CONSTABLE)) return "Guardian of Salem";
      if (!player.hasRevealedWitch && !player.isDead) return "Faithful Townsperson";
      if (!player.hasRevealedWitch && player.isDead) return "Innocent Martyr";
      return "Mysterious Stranger";
    };

    // Find most falsely accused (most fake votes) - available to all players
    const fakeVoteEntries = Object.entries(gameState.fakeVotes) as [string, number][];
    const mostFakeVotes = fakeVoteEntries.sort((a, b) => b[1] - a[1])[0];
    const mostSuspicious = mostFakeVotes ? gameState.players.find(p => p.id === mostFakeVotes[0]) : null;
    const totalFakeVotes = fakeVoteEntries.reduce((sum, [, v]) => sum + v, 0);

    return (
      <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900">
        <Header />
        {showConfetti && <Confetti />}
        <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
          {/* Victory Banner */}
          <div className={`rounded-xl p-8 text-center mb-6 border-2 shadow-lg ${
            townWins
              ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-400 text-white'
              : 'bg-gradient-to-br from-purple-600 to-red-700 border-purple-400 text-white'
          }`}>
            <div className="text-6xl mb-4">{townWins ? '⚖️' : '🧙‍♀️'}</div>
            <h1 className="text-4xl font-bold mb-2">
              {townWins ? 'Town Victory!' : 'Witches Win!'}
            </h1>
            <p className="text-xl opacity-90">
              {townWins
                ? 'The witches have been exposed and justice prevails!'
                : 'Darkness falls over Salem. The coven is victorious!'}
            </p>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center border border-stone-200 shadow-sm">
              <div className="text-3xl font-bold text-green-600">{survivors.length}</div>
              <div className="text-sm text-stone-500">Survivors</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-stone-200 shadow-sm">
              <div className="text-3xl font-bold text-red-500">{deaths.length}</div>
              <div className="text-sm text-stone-500">Fallen</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-stone-200 shadow-sm">
              <div className="text-3xl font-bold text-purple-600">{witchTeam.length}</div>
              <div className="text-sm text-stone-500">Witch Team</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-stone-200 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">{gameState.turnCounter}</div>
              <div className="text-sm text-stone-500">Days Survived</div>
            </div>
          </div>

          {/* Fun Awards Section */}
          {totalFakeVotes > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-300 mb-6">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                🏆 Awards Ceremony
              </h3>
              <div className="space-y-3">
                {mostSuspicious && (
                  <div className="flex items-center gap-3 p-2 bg-amber-100 rounded">
                    <span className="text-2xl">🤔</span>
                    <div>
                      <div className="font-bold text-amber-800">Most Suspicious Looking</div>
                      <div className="text-sm text-amber-700">
                        {mostSuspicious.name} received {mostFakeVotes[1]} fake vote{mostFakeVotes[1] > 1 ? 's' : ''} from paranoid townspeople
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-xs text-amber-600 italic text-center">
                  Total paranoid glances cast: {totalFakeVotes}
                </div>
              </div>
            </div>
          )}

          {/* Teams Reveal */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Witch Team */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                🧙‍♀️ The Coven
              </h3>
              {witchTeam.length > 0 ? (
                <div className="space-y-2">
                  {witchTeam.map(p => (
                    <div key={p.id} className={`flex flex-col ${p.isDead ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        {p.isGhost && <span title="Ghost">👻</span>}
                        <span className={`font-medium ${p.isGhost ? 'text-slate-400' : 'text-stone-800'}`}>{p.name}</span>
                        {p.isDead && <span className="text-xs text-red-500">☠️</span>}
                        {!p.isDead && <span className="text-xs text-green-500">✓</span>}
                      </div>
                      <span className="text-xs text-purple-600 italic">{getPlayerTitle(p)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500 italic">No one was revealed as a witch</p>
              )}
            </div>

            {/* Town Team */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                🏘️ The Townsfolk
              </h3>
              <div className="space-y-2">
                {townTeam.map(p => (
                  <div key={p.id} className={`flex flex-col ${p.isDead ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      {p.isGhost && <span title="Ghost">👻</span>}
                      <span className={`font-medium ${p.isGhost ? 'text-slate-400' : 'text-stone-800'}`}>{p.name}</span>
                      {p.isDead && <span className="text-xs text-red-500">☠️</span>}
                      {!p.isDead && <span className="text-xs text-green-500">✓</span>}
                    </div>
                    <span className="text-xs text-blue-600 italic">{getPlayerTitle(p)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Log */}
          <div className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm mb-6">
            <h3 className="font-bold text-stone-700 mb-3">📜 The Chronicle of Salem</h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {gameState.logs.map(log => (
                <p key={log.id} className="text-sm text-stone-600">
                  {log.message}
                </p>
              ))}
            </div>
          </div>

          {/* Play Again Button */}
          <Button fullWidth onClick={() => window.location.reload()}>
            Play Again
          </Button>
        </main>
      </div>
    );
  }

  // --- LOBBY PHASE ---
  if (gameState.phase === GamePhase.LOBBY) {
      return (
          <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900">
              <Header />
              <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
                  <div className="bg-white rounded-xl p-6 border border-stone-200 text-center mb-6 shadow-sm">
                      <h3 className="text-xl mb-4 text-stone-700">Waiting for players...</h3>
                      <div className="text-6xl font-mono tracking-widest text-amber-600 mb-2">{gameState.roomId}</div>
                      <p className="text-stone-500">Share this code with others on your network.</p>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-stone-700">Players ({gameState.players.length})</h4>
                      {isHost && gameState.players.length > 2 && (
                          <span className="text-xs text-stone-500">Use arrows to reorder seating</span>
                      )}
                      {isHost && gameState.players.length === 2 && (
                          <span className="text-xs text-stone-400">Seating fixed for 2-player mode</span>
                      )}
                  </div>
                  <div className="flex flex-col gap-2 mb-8">
                      {gameState.players.map((p, index) => (
                          <div key={p.id} className={`bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between text-stone-800 shadow-sm ${p.isDisconnected ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-2">
                                  <span className="text-stone-400 text-sm w-6">{index + 1}.</span>
                                  <span>
                                    {p.name} {p.isHost && '👑'}
                                    {p.isDisconnected && <span className="text-yellow-600 text-xs ml-1">(Offline)</span>}
                                  </span>
                              </div>
                              {/* Disable reordering for 2-player mode (fixed seating: Player→Ghost→Player→Ghost) */}
                              {isHost && gameState.players.length > 2 && (
                                  <div className="flex gap-1">
                                      <button
                                          onClick={() => movePlayer(index, 'up')}
                                          disabled={index === 0}
                                          className={`px-2 py-1 text-sm rounded ${index === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:bg-stone-100'}`}
                                      >
                                          ↑
                                      </button>
                                      <button
                                          onClick={() => movePlayer(index, 'down')}
                                          disabled={index === gameState.players.length - 1}
                                          className={`px-2 py-1 text-sm rounded ${index === gameState.players.length - 1 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:bg-stone-100'}`}
                                      >
                                          ↓
                                      </button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

                  {isHost && (
                      <div className="sticky bottom-4">
                        <Button
                            fullWidth
                            onClick={startGame}
                            disabled={gameState.players.length < MIN_PLAYERS}
                        >
                            Start Game {gameState.players.length < MIN_PLAYERS && `(Need ${MIN_PLAYERS}+)`}
                        </Button>
                      </div>
                  )}
              </main>
          </div>
      );
  }

  // --- MAIN GAME VIEW ---
  const isWitch = myPlayer?.hasRevealedWitch;
  const isConstable = myHand.some(c => c.type === CardType.CONSTABLE && !c.isRevealed); // Power disabled once revealed

  return (
    <div className={`min-h-screen flex flex-col pb-20 transition-colors duration-500 ${
      isDarkMode ? 'bg-slate-900 text-white' : 'bg-stone-100 text-stone-900'
    }`}>
      <Header />

      {/* Game Logs Area */}
      <div className={`p-2 max-h-32 overflow-y-auto text-sm border-b transition-colors duration-500 ${
        isDarkMode ? 'bg-black/30 border-slate-700' : 'bg-stone-50 border-stone-200'
      }`}>
          {gameState.logs.slice().reverse().map(log => (
              <div key={log.id} className={`py-0.5 ${isDarkMode ? 'text-slate-300' : 'text-stone-700'}`}>
                  <span className={`text-xs mr-2 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                  {log.message}
              </div>
          ))}
      </div>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        
        {/* PHASE SPECIFIC UI */}
        
        {gameState.phase === GamePhase.SETUP && (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold mb-4">Game Starting...</h2>
                <p>Check your cards below!</p>
            </div>
        )}

        {(gameState.phase === GamePhase.NIGHT_INITIAL_WITCH || gameState.phase === GamePhase.NIGHT_WITCH_VOTE) && (
            <div className="border border-purple-500/30 bg-purple-900/10 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-purple-400 mb-2">Night Phase: Witches</h3>

                {/* Dead players just spectate */}
                {myPlayer?.isDead ? (
                    <div className="text-center p-6 text-slate-500">
                        <p className="text-lg mb-2">You are dead.</p>
                        <p className="text-sm italic">{isHost ? "Continue moderating below..." : "The living make their choices in the darkness..."}</p>
                    </div>
                ) : (
                <>
                {/* BLIND MECHANIC: Everyone sees the same "Act" screen */}
                <p className="text-sm text-slate-400 mb-4">
                    If you are a Witch, select a target. If not, select any player and confirm.
                </p>

                {/* Did You Know - Same for everyone */}
                <div className="mb-4 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Did you know?</p>
                    <p className="text-sm text-slate-300 italic">{currentDisplayFact}</p>
                </div>

                {isWitch ? (
                    <div>
                        {/* Show witch teammates and vote status (witches see each other during Dawn, rulebook p.4) */}
                        <div className="mb-4 p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
                            {(() => {
                                const aliveWitches = gameState.players.filter(p => p.hasRevealedWitch && !p.isDead);
                                const otherWitches = aliveWitches.filter(p => p.id !== myPlayerId);
                                const myVote = gameState.witchVotes.find(v => v.voterId === myPlayerId);
                                const allVotes = gameState.witchVotes;
                                const allVotesSame = allVotes.length > 0 && allVotes.every(v => v.targetId === allVotes[0].targetId);
                                const allWitchesVoted = allVotes.length === aliveWitches.length;
                                const consensusReached = allVotesSame && allWitchesVoted;

                                return (
                                    <>
                                        {/* Consensus Status Banner */}
                                        {allVotes.length > 0 && (
                                            <div className={`mb-3 p-2 rounded text-center text-sm font-medium ${
                                                consensusReached
                                                    ? 'bg-green-900/50 border border-green-600 text-green-300'
                                                    : !allVotesSame && allVotes.length > 1
                                                        ? 'bg-red-900/50 border border-red-600 text-red-300'
                                                        : 'bg-yellow-900/50 border border-yellow-600 text-yellow-300'
                                            }`}>
                                                {consensusReached && '✓ Consensus reached! Ready to proceed.'}
                                                {!allVotesSame && allVotes.length > 1 && '⚠ Votes do not match! Coordinate with your team.'}
                                                {allVotesSame && !allWitchesVoted && `⏳ Waiting for ${aliveWitches.length - allVotes.length} more vote(s)...`}
                                            </div>
                                        )}

                                        {/* Vote Status Table */}
                                        <p className="text-sm text-purple-300 font-medium mb-2">Witch Team Votes:</p>
                                        <div className="space-y-2">
                                            {/* My vote */}
                                            <div className={`flex items-center justify-between p-2 rounded ${
                                                myVote ? 'bg-purple-800/50' : 'bg-slate-700/50'
                                            }`}>
                                                <span className="text-purple-200 text-sm font-medium">You</span>
                                                <span className={`text-sm ${myVote ? 'text-red-400' : 'text-slate-500 italic'}`}>
                                                    {myVote ? `→ ${myVote.targetName}` : 'Not voted'}
                                                </span>
                                            </div>
                                            {/* Other witches' votes */}
                                            {otherWitches.map(witch => {
                                                const vote = allVotes.find(v => v.voterId === witch.id);
                                                return (
                                                    <div key={witch.id} className={`flex items-center justify-between p-2 rounded ${
                                                        vote ? 'bg-purple-800/50' : 'bg-slate-700/50'
                                                    }`}>
                                                        <span className="text-purple-200 text-sm">{witch.name}</span>
                                                        <span className={`text-sm ${vote ? 'text-red-400' : 'text-slate-500 italic'}`}>
                                                            {vote ? `→ ${vote.targetName}` : 'Not voted'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <p className="font-bold text-red-400 mb-2">Select your target:</p>
                        <PlayerGrid
                            onSelect={setSelectedPlayerId}
                            filter={(p) => !p.isDead}  // Witches CAN target themselves (rulebook p.10)
                        />
                        {selectedPlayerId && (
                            <Button fullWidth onClick={() => {
                                const action = gameState.phase === GamePhase.NIGHT_INITIAL_WITCH ? 'BLACK_CAT' : 'KILL_VOTE';
                                sendAction(action, { targetId: selectedPlayerId });
                            }}>
                                Confirm Target
                            </Button>
                        )}
                    </div>
                ) : (
                    /* Non-witch: Fake voting UI */
                    <div>
                        {(gameState.nightConfirmations || []).includes(myPlayerId) ? (
                            <div className="text-center p-4 bg-green-900/30 border border-green-600 rounded-lg">
                                <p className="text-green-300 font-medium">✓ Selection confirmed</p>
                                <p className="text-sm text-slate-400 mt-2">Waiting for others...</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500 mb-3 italic">
                                    Your selection has no effect, but please confirm to help the game proceed.
                                </p>
                                <p className="font-bold text-slate-300 mb-2">Select a player:</p>
                                <PlayerGrid
                                    onSelect={setSelectedPlayerId}
                                    filter={(p) => !p.isDead}
                                    hideBlackCat={true}
                                />
                                {selectedPlayerId && (
                                    <Button fullWidth onClick={() => {
                                        sendAction('NIGHT_CONFIRM', { fakeTargetId: selectedPlayerId });
                                        setSelectedPlayerId(null);
                                    }}>
                                        Confirm Selection
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}

                </>
                )}

                {/* Host: Show binary ready status only - visible even when dead */}
                {isHost && (
                    <div className="mt-4 p-3 bg-slate-800 border border-slate-600 rounded-lg">
                        {(() => {
                            const alivePlayers = gameState.players.filter(p => !p.isDead && !p.isDisconnected && !p.isGhost);
                            const allConfirmed = (gameState.nightConfirmations || []).length === alivePlayers.length;
                            return (
                                <div className="text-sm">
                                    {allConfirmed ? (
                                        <span className="text-green-400">✓ Ready</span>
                                    ) : (
                                        <span className="text-yellow-400">⏳ In progress...</span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        )}

        {gameState.phase === GamePhase.NIGHT_CONSTABLE && (
            <div className="border border-blue-500/30 bg-blue-900/10 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-blue-400 mb-2">Night Phase: Constable</h3>

                {/* Dead players just spectate */}
                {myPlayer?.isDead ? (
                    <div className="text-center p-6 text-slate-500">
                        <p className="text-lg mb-2">You are dead.</p>
                        <p className="text-sm italic">{isHost ? "Continue moderating below..." : "The Constable considers who to protect..."}</p>
                    </div>
                ) : (
                <>
                <p className="text-sm text-slate-400 mb-4">
                    If you are the Constable, protect someone. If not, select any player and confirm.
                </p>

                {/* Did You Know - Same for everyone */}
                <div className="mb-4 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Did you know?</p>
                    <p className="text-sm text-slate-300 italic">{currentDisplayFact}</p>
                </div>

                {isConstable ? (
                    <div>
                        {gameState.constableGuardId ? (
                            <div className="text-center p-4 bg-green-900/30 border border-green-600 rounded-lg">
                                <p className="text-green-300 font-medium">
                                    You have selected to protect {gameState.players.find(p => p.id === gameState.constableGuardId)?.name}.
                                </p>
                                <p className="text-sm text-slate-400 mt-2">Waiting for others...</p>
                            </div>
                        ) : gameState.constableGuardId === 'SKIP' ? (
                            <div className="text-center p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                <p className="text-yellow-300 font-medium">
                                    You have chosen not to protect anyone tonight.
                                </p>
                                <p className="text-sm text-slate-400 mt-2">Waiting for others...</p>
                            </div>
                        ) : (
                            <>
                                {gameState.isSmallGameMode && (
                                    <p className="text-xs text-blue-400 mb-2 italic">
                                        In small game mode, you may protect yourself or skip protection entirely.
                                    </p>
                                )}
                                <PlayerGrid
                                    onSelect={setSelectedPlayerId}
                                    // In small game mode, constable CAN protect self (rulebook 2-3 players p.17)
                                    filter={(p) => !p.isDead && (gameState.isSmallGameMode || p.id !== myPlayerId)}
                                />
                                <div className="flex gap-2 mt-2">
                                    {selectedPlayerId && (
                                        <Button fullWidth onClick={() => {
                                            sendAction('GUARD_VOTE', { targetId: selectedPlayerId });
                                        }}>
                                            Protect Player
                                        </Button>
                                    )}
                                    {gameState.isSmallGameMode && (
                                        <Button
                                            fullWidth
                                            variant="secondary"
                                            onClick={() => {
                                                sendAction('GUARD_SKIP', {});
                                            }}
                                        >
                                            Skip Protection
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    /* Non-constable: Fake voting UI */
                    <div>
                        {(gameState.nightConfirmations || []).includes(myPlayerId) ? (
                            <div className="text-center p-4 bg-green-900/30 border border-green-600 rounded-lg">
                                <p className="text-green-300 font-medium">✓ Selection confirmed</p>
                                <p className="text-sm text-slate-400 mt-2">Waiting for others...</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500 mb-3 italic">
                                    Your selection has no effect, but please confirm to help the game proceed.
                                </p>
                                <p className="font-bold text-slate-300 mb-2">Select a player:</p>
                                <PlayerGrid
                                    onSelect={setSelectedPlayerId}
                                    filter={(p) => !p.isDead && p.id !== myPlayerId}
                                    hideBlackCat={true}
                                />
                                {selectedPlayerId && (
                                    <Button fullWidth onClick={() => {
                                        sendAction('NIGHT_CONFIRM', { fakeTargetId: selectedPlayerId });
                                        setSelectedPlayerId(null);
                                    }}>
                                        Confirm Selection
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}

                </>
                )}

                {/* Host: Show binary ready status only - visible even when dead */}
                {isHost && (
                    <div className="mt-4 p-3 bg-slate-800 border border-slate-600 rounded-lg">
                        {(() => {
                            const alivePlayers = gameState.players.filter(p => !p.isDead && !p.isDisconnected && !p.isGhost);
                            const allConfirmed = (gameState.nightConfirmations || []).length === alivePlayers.length;
                            return (
                                <div className="text-sm">
                                    {allConfirmed ? (
                                        <span className="text-green-400">✓ Ready</span>
                                    ) : (
                                        <span className="text-yellow-400">⏳ In progress...</span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        )}

        {gameState.phase === GamePhase.NIGHT_CONFESSION && (
             <div className="border border-yellow-500/30 bg-yellow-900/10 p-6 rounded-xl">
                 <h3 className="text-xl font-bold text-yellow-400 mb-2">Confessions</h3>

                 {/* Dead players just spectate */}
                 {myPlayer?.isDead ? (
                     <div className="text-center p-6 text-slate-500">
                         <p className="text-lg mb-2">You are dead.</p>
                         <p className="text-sm italic">{isHost ? "Continue moderating below..." : "The living decide whether to confess..."}</p>
                     </div>
                 ) : (
                 <>
                 <p className="text-sm text-slate-400 mb-4">You may reveal a non-Witch card to gain immunity for tonight. Or pass to stay silent.</p>

                 {/* Show who has the Gavel token (protection) - visible to all per rulebook p.11 */}
                 {gameState.constableGuardId && gameState.constableGuardId !== 'SKIP' && (
                     <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg flex items-center gap-3">
                         <span className="text-2xl">🔨</span>
                         <div>
                             <p className="text-blue-300 font-medium">
                                 {gameState.players.find(p => p.id === gameState.constableGuardId)?.name} has the Gavel token
                             </p>
                             <p className="text-xs text-slate-400">This player is protected from death tonight.</p>
                         </div>
                     </div>
                 )}
                 {gameState.constableGuardId === 'SKIP' && (
                     <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg flex items-center gap-3">
                         <span className="text-2xl">🔨</span>
                         <div>
                             <p className="text-yellow-300 font-medium">
                                 The Constable chose not to protect anyone
                             </p>
                             <p className="text-xs text-slate-400">No one has the Gavel token tonight.</p>
                         </div>
                     </div>
                 )}

                 {(gameState.nightConfirmations || []).includes(myPlayerId) ? (
                     <div className="text-center p-4 bg-green-900/30 border border-green-600 rounded-lg">
                         <p className="text-green-300 font-medium">✓ Choice confirmed</p>
                         <p className="text-sm text-slate-400 mt-2">Waiting for hourglass...</p>
                     </div>
                 ) : (
                     <>
                         <div className="flex gap-2 overflow-x-auto pb-4">
                             {myHand.map(card => (
                                 <div key={card.id} className="flex-shrink-0">
                                    <CardDisplay
                                        card={card}
                                        selectable={!card.isRevealed && card.type !== CardType.WITCH}
                                        selected={selectedCardId === card.id}
                                        onClick={() => setSelectedCardId(card.id)}
                                    />
                                 </div>
                             ))}
                         </div>

                         {selectedCardId && (
                             <Button fullWidth onClick={() => {
                                 sendAction('SELF_REVEAL', { cardId: selectedCardId });
                                 setSelectedCardId(null);
                             }}>
                                 Confess (Reveal Card)
                             </Button>
                         )}
                         <Button fullWidth variant="ghost" className="mt-2" onClick={() => {
                             sendAction('CONFESSION_PASS', {});
                         }}>
                             Pass (Stay Silent)
                         </Button>
                     </>
                 )}
                 </>
                 )}

                 {/* Host: Show ready status and end confession button */}
                 {isHost && (
                     <div className="mt-6 p-4 bg-slate-800 border border-slate-600 rounded-lg">
                         {(() => {
                             const alivePlayers = gameState.players.filter(p => !p.isDead && !p.isDisconnected && !p.isGhost);
                             const allConfirmed = (gameState.nightConfirmations || []).length === alivePlayers.length;
                             return (
                                 <>
                                     <div className="text-sm mb-3">
                                         {allConfirmed ? (
                                             <span className="text-green-400">✓ All players ready</span>
                                         ) : (
                                             <span className="text-yellow-400">⏳ Waiting for confessions...</span>
                                         )}
                                     </div>
                                     <p className="text-sm text-slate-400 mb-3">
                                         Wait for the hourglass to run out, then end the confession period.
                                     </p>
                                     <Button fullWidth onClick={advancePhase}>
                                         End Confession Period
                                     </Button>
                                 </>
                             );
                         })()}
                     </div>
                 )}

                 {/* Non-host waiting message */}
                 {!isHost && (
                     <div className="mt-6 p-3 bg-slate-800 border border-slate-600 rounded-lg">
                         <p className="text-sm text-slate-400 text-center">⏳ Waiting for host to end confession period...</p>
                     </div>
                 )}

             </div>
        )}

        {gameState.phase === GamePhase.NIGHT_RESOLUTION && (
            <div className="border border-red-500/30 bg-red-900/10 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-red-400 mb-4">Night Resolution</h3>

                {gameState.nightKillTargetId ? (() => {
                    const target = gameState.players.find(p => p.id === gameState.nightKillTargetId);
                    const isProtectedByConstable = gameState.nightKillTargetId === gameState.constableGuardId;
                    const hasConfessed = target?.immune;

                    return (
                        <div>
                            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                                <p className="text-red-300 font-medium text-center">
                                    Witches targeted: <span className="font-bold">{target?.name}</span>
                                </p>
                            </div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className={`p-2 rounded ${isProtectedByConstable ? 'bg-blue-900/30 border border-blue-600' : 'bg-slate-700/50'}`}>
                                    <span className={isProtectedByConstable ? 'text-blue-300' : 'text-slate-400'}>
                                        {isProtectedByConstable ? '✓ Protected by Constable (Gavel token)' : '✗ Not protected by Constable'}
                                    </span>
                                </div>
                                <div className={`p-2 rounded ${hasConfessed ? 'bg-yellow-900/30 border border-yellow-600' : 'bg-slate-700/50'}`}>
                                    <span className={hasConfessed ? 'text-yellow-300' : 'text-slate-400'}>
                                        {hasConfessed ? '✓ Confessed (revealed a card)' : '✗ Did not confess'}
                                    </span>
                                </div>
                                <div className="p-2 rounded bg-slate-700/50">
                                    <span className="text-slate-400">? Asylum card (check physically)</span>
                                </div>
                                <div className="p-2 rounded bg-slate-700/50">
                                    <span className="text-slate-400">? Town Hall abilities (check physically)</span>
                                </div>
                            </div>

                            {/* Host-only resolution buttons */}
                            {isHost && (
                                <>
                                    {(isProtectedByConstable || hasConfessed) ? (
                                        <div>
                                            <div className="mb-3 p-3 bg-green-900/30 border border-green-600 rounded-lg text-center">
                                                <p className="text-green-300 font-medium">
                                                    {target?.name} is protected and survives!
                                                </p>
                                            </div>
                                            <Button fullWidth onClick={() => resolveNight(false)}>
                                                Continue to Day
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-slate-400 mb-3 text-center">
                                                Check for Asylum card and Town Hall abilities.<br/>
                                                Does <span className="font-bold text-white">{target?.name}</span> survive or die?
                                            </p>
                                            <div className="flex gap-3">
                                                <Button fullWidth variant="secondary" onClick={() => resolveNight(false)}>
                                                    {target?.name} Survives
                                                </Button>
                                                <Button fullWidth onClick={() => resolveNight(true)} className="bg-red-700 hover:bg-red-600">
                                                    {target?.name} Dies
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Non-host sees waiting message */}
                            {!isHost && (
                                <p className="text-sm text-slate-400 text-center italic">
                                    Waiting for host to resolve the night...
                                </p>
                            )}
                        </div>
                    );
                })() : (
                    <div>
                        <p className="text-slate-400 text-center mb-4">No target was selected by the witches.</p>
                        {isHost && (
                            <Button fullWidth onClick={() => resolveNight(false)}>
                                Continue to Day
                            </Button>
                        )}
                        {!isHost && (
                            <p className="text-sm text-slate-400 text-center italic">
                                Waiting for host to continue...
                            </p>
                        )}
                    </div>
                )}
            </div>
        )}

        {gameState.phase === GamePhase.CONSPIRACY && (
            <div className="border border-orange-500/30 bg-orange-900/10 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-orange-400 mb-2">Conspiracy</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Select ONE hidden card from your left neighbor to take into your hand.
                </p>

                {!myPlayer?.isDead && !myPlayer?.isGhost ? (() => {
                    // Find left neighbor (previous alive entity)
                    const aliveEntities = gameState.players.filter(p => !p.isDead);
                    const myIndex = aliveEntities.findIndex(p => p.id === myPlayerId);
                    let leftIndex = myIndex - 1;
                    if (leftIndex < 0) leftIndex = aliveEntities.length - 1;
                    const leftNeighbor = aliveEntities[leftIndex];

                    // Check if I already selected
                    const mySelection = gameState.conspiracySelections.find(s => s.playerId === myPlayerId);

                    // Get left neighbor's hidden cards (for my own selection)
                    // Works for both regular players and ghosts - you pick from their cards
                    const hiddenCards = leftNeighbor?.cards.filter(c => !c.isRevealed) || [];

                    return (
                        <div>
                            {/* Show left neighbor info */}
                            <div className="mb-4 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
                                <p className="text-sm text-orange-300">
                                    Your left neighbor is: {leftNeighbor?.isGhost && '👻 '}<span className={`font-bold ${leftNeighbor?.isGhost ? 'text-slate-400' : ''}`}>{leftNeighbor?.name}</span>
                                </p>
                            </div>

                            {mySelection ? (
                                <div className="text-center p-4 bg-green-900/30 border border-green-600 rounded-lg mb-4">
                                    <p className="text-green-300 font-medium">You have selected a card.</p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        Waiting for other players... ({gameState.conspiracySelections.length}/{aliveEntities.filter(p => !p.isGhost).length})
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-300 mb-3">
                                        {leftNeighbor?.name} has {hiddenCards.length} hidden card(s). Select one:
                                    </p>
                                    <div className="flex gap-3 flex-wrap justify-center mb-4">
                                        {hiddenCards.map((card, idx) => (
                                            <div
                                                key={card.id}
                                                onClick={() => setSelectedCardId(card.id)}
                                                className={`w-16 h-24 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all text-lg font-bold ${
                                                    selectedCardId === card.id
                                                        ? 'border-orange-500 bg-orange-900/50 text-orange-300'
                                                        : 'border-slate-600 bg-slate-700 hover:border-slate-400 text-slate-400'
                                                }`}
                                            >
                                                #{idx + 1}
                                            </div>
                                        ))}
                                    </div>
                                    {selectedCardId && (
                                        <Button
                                            fullWidth
                                            onClick={() => {
                                                sendAction('CONSPIRACY_SELECT', { cardId: selectedCardId });
                                                setSelectedCardId(null);
                                            }}
                                        >
                                            Take This Card
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* Progress indicator - only show real players, not ghosts */}
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <p className="text-xs text-slate-500 mb-2">Selection Progress:</p>
                                <div className="flex gap-2 flex-wrap">
                                    {aliveEntities.filter(p => !p.isGhost).map(p => {
                                        const hasSelected = gameState.conspiracySelections.some(s => s.playerId === p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                className={`px-2 py-1 rounded text-xs ${
                                                    hasSelected
                                                        ? 'bg-green-900/50 text-green-300 border border-green-700'
                                                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                                                }`}
                                            >
                                                {p.name} {hasSelected && '✓'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="text-center p-4 text-slate-500 italic">
                        You are dead and cannot participate in conspiracy.
                    </div>
                )}
            </div>
        )}

        {gameState.phase === GamePhase.DAY && (
            <div className="space-y-6">

                {/* Pending Accusation Banner */}
                {gameState.pendingAccusation && (
                    <div className={`p-4 rounded-lg border-2 ${
                        gameState.pendingAccusation.accepted
                            ? isDarkMode ? 'bg-red-900/30 border-red-600' : 'bg-red-50 border-red-300'
                            : isDarkMode ? 'bg-amber-900/30 border-amber-600' : 'bg-amber-50 border-amber-300'
                    }`}>
                        <div className="text-center mb-3">
                            <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                                {gameState.pendingAccusation.accuserName}
                            </span>
                            <span className={`mx-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>accuses</span>
                            <span className={`text-lg font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                {gameState.pendingAccusation.targetName}
                            </span>
                        </div>

                        {/* Target sees Accept button */}
                        {gameState.pendingAccusation.targetId === myPlayerId && !gameState.pendingAccusation.accepted && (
                            <div className="text-center space-y-2">
                                <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>You have been accused! Do you accept the accusation?</p>
                                <div className="flex gap-2 justify-center">
                                    <Button onClick={() => sendAction('ACCUSE_ACCEPT', {})}>
                                        Accept Accusation
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => sendAction('ACCUSE_CANCEL', {})}
                                        className={isDarkMode ? '' : '!text-amber-700 hover:!bg-amber-100'}
                                    >
                                        Refuse (Cancel)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Accuser sees card selection after target accepts */}
                        {gameState.pendingAccusation.accuserId === myPlayerId && gameState.pendingAccusation.accepted && (
                            <div className="text-center space-y-3">
                                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>Accusation accepted! Select a card to reveal:</p>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {gameState.players.find(p => p.id === gameState.pendingAccusation?.targetId)?.cards.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                if (!c.isRevealed) {
                                                    sendAction('ACCUSE_REVEAL', { cardId: c.id });
                                                }
                                            }}
                                            className={`w-12 h-16 border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                                                c.isRevealed
                                                    ? 'opacity-30 cursor-not-allowed border-slate-400'
                                                    : isDarkMode
                                                        ? 'border-red-500 bg-slate-700 hover:bg-red-900 text-white'
                                                        : 'border-red-400 bg-white hover:bg-red-100 text-stone-700'
                                            }`}
                                        >
                                            {c.isRevealed ? '✓' : '?'}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => sendAction('ACCUSE_CANCEL', {})}
                                    className={isDarkMode ? '' : '!text-red-600 hover:!bg-red-100'}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}

                        {/* Others waiting */}
                        {gameState.pendingAccusation.targetId !== myPlayerId &&
                         gameState.pendingAccusation.accuserId !== myPlayerId && (
                            <p className={`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-stone-600'}`}>
                                {gameState.pendingAccusation.accepted
                                    ? `Waiting for ${gameState.pendingAccusation.accuserName} to select a card...`
                                    : `Waiting for ${gameState.pendingAccusation.targetName} to respond...`
                                }
                            </p>
                        )}

                        {/* Accuser waiting for acceptance */}
                        {gameState.pendingAccusation.accuserId === myPlayerId && !gameState.pendingAccusation.accepted && (
                            <div className="text-center space-y-2">
                                <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>Waiting for {gameState.pendingAccusation.targetName} to accept...</p>
                                <Button
                                    variant="ghost"
                                    onClick={() => sendAction('ACCUSE_CANCEL', {})}
                                    className={isDarkMode ? '' : '!text-amber-700 hover:!bg-amber-100'}
                                >
                                    Withdraw Accusation
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Player Status / Accusations */}
                <div>
                    <h3 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Town Square</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {gameState.players.map(p => {
                            const revealedCards = p.cards.filter(c => c.isRevealed);
                            const hiddenCards = p.cards.filter(c => !c.isRevealed);
                            return (
                                <div key={p.id} className={`p-3 rounded-lg border transition-colors duration-500 ${
                                  isDarkMode
                                    ? `bg-slate-800 ${p.isDead ? 'border-red-900 opacity-60' : 'border-slate-600'}`
                                    : `bg-white ${p.isDead ? 'border-red-300 opacity-60' : 'border-stone-300'}`
                                } ${p.isDisconnected ? 'opacity-50' : ''}`}>
                                    <div className={`font-bold flex justify-between ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                                        <span className="flex items-center gap-1">
                                          {p.isGhost && <span title="Ghost">👻</span>}
                                          <span className={p.isGhost ? 'text-slate-400' : ''}>{p.name}</span>
                                          {p.isDisconnected && <span className="text-yellow-600 text-xs">(Offline)</span>}
                                        </span>
                                        {p.hasBlackCat && <span>🐈‍⬛</span>}
                                    </div>
                                    <div className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                        {p.isDead ? 'DECEASED' : `${revealedCards.length}/${p.cards.length} Revealed`}
                                    </div>
                                    {/* Separate revealed and hidden card piles */}
                                    <div className="flex gap-3">
                                        {/* Revealed cards */}
                                        {revealedCards.length > 0 && (
                                            <div className="flex gap-1">
                                                {revealedCards.map((c, idx) => {
                                                    let colorClass = 'bg-green-500';
                                                    if (c.type === CardType.WITCH) colorClass = 'bg-purple-500';
                                                    else if (c.type === CardType.CONSTABLE) colorClass = 'bg-blue-500';
                                                    return <div key={idx} className={`w-3 h-4 rounded-sm ${colorClass}`}></div>;
                                                })}
                                            </div>
                                        )}
                                        {/* Separator */}
                                        {revealedCards.length > 0 && hiddenCards.length > 0 && (
                                            <div className="w-px bg-stone-400"></div>
                                        )}
                                        {/* Hidden cards - consistent color in both modes */}
                                        {hiddenCards.length > 0 && (
                                            <div className="flex gap-1">
                                                {hiddenCards.map((_, idx) => (
                                                    <div key={idx} className="w-3 h-4 rounded-sm bg-stone-400"></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Accuse button - disabled during pending accusation or if I'm dead */}
                                    {!myPlayer?.isDead && !p.isDead && !p.isDisconnected && p.id !== myPlayerId && !gameState.pendingAccusation && (
                                        <button
                                            className={`mt-2 text-xs px-2 py-1 rounded w-full border ${
                                              isDarkMode
                                                ? 'bg-red-900/50 hover:bg-red-900 text-red-200 border-red-800'
                                                : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                                            }`}
                                            onClick={() => sendAction('ACCUSE_START', { targetId: p.id })}
                                        >
                                            Accuse
                                        </button>
                                    )}
                                    {/* Peek & Shuffle button for ghosts (small game mode) */}
                                    {p.isGhost && !p.isDead && hiddenCards.length > 0 && !myPlayer?.isDead && (
                                        <button
                                            className={`mt-2 text-xs px-2 py-1 rounded w-full border ${
                                              isDarkMode
                                                ? 'bg-purple-900/50 hover:bg-purple-900 text-purple-200 border-purple-800'
                                                : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300'
                                            }`}
                                            onClick={() => {
                                                // Pick a random hidden card to show
                                                const randomCard = hiddenCards[Math.floor(Math.random() * hiddenCards.length)];
                                                setGhostPeekModal({ ghostId: p.id, card: randomCard });
                                            }}
                                        >
                                            👁️ Peek & Shuffle
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Host-only Actions */}
                {isHost && (
                    <div className="grid grid-cols-2 gap-4">
                         <Button
                            variant="secondary"
                            onClick={() => setConspiracyModal(true)}
                         >
                             Trigger Conspiracy (Pass Cards)
                         </Button>
                    </div>
                )}

                {/* Conspiracy Confirmation Modal */}
                {conspiracyModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 p-6 rounded-xl max-w-sm w-full">
                            <h3 className="text-xl font-bold mb-2 text-orange-400">Trigger Conspiracy</h3>
                            <p className="text-sm text-slate-300 mb-4">
                                Each player will select a hidden card from their left neighbor.
                            </p>
                            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                <p className="text-sm text-yellow-300 font-medium mb-1">⚠️ Black Cat Reminder</p>
                                <p className="text-xs text-slate-400">
                                    Check if someone has the Black Cat card. If so, they should be accused and have one card revealed BEFORE passing cards.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    fullWidth
                                    onClick={() => {
                                        sendAction('TRIGGER_CONSPIRACY', {});
                                        setConspiracyModal(false);
                                    }}
                                >
                                    Start Conspiracy
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setConspiracyModal(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ghost Peek Modal (Small Game Mode) */}
                {ghostPeekModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 p-6 rounded-xl max-w-sm w-full text-center">
                            <h3 className="text-xl font-bold mb-2 text-purple-400">👻 Ghost Card Peek</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                You peeked at one of {gameState.players.find(p => p.id === ghostPeekModal.ghostId)?.name}'s cards:
                            </p>
                            <div className="flex justify-center mb-4">
                                <div className={`w-20 h-28 rounded-lg border-2 flex items-center justify-center text-3xl ${
                                    ghostPeekModal.card.type === CardType.WITCH
                                        ? 'border-purple-500 bg-purple-900/50'
                                        : ghostPeekModal.card.type === CardType.CONSTABLE
                                        ? 'border-blue-500 bg-blue-900/50'
                                        : 'border-green-500 bg-green-900/50'
                                }`}>
                                    {ghostPeekModal.card.type === CardType.WITCH ? '🧙‍♀️' :
                                     ghostPeekModal.card.type === CardType.CONSTABLE ? '⚖️' : '🏠'}
                                </div>
                            </div>
                            <p className={`text-lg font-bold mb-4 ${
                                ghostPeekModal.card.type === CardType.WITCH
                                    ? 'text-purple-400'
                                    : ghostPeekModal.card.type === CardType.CONSTABLE
                                    ? 'text-blue-400'
                                    : 'text-green-400'
                            }`}>
                                {ghostPeekModal.card.type === CardType.WITCH ? 'WITCH!' :
                                 ghostPeekModal.card.type === CardType.CONSTABLE ? 'Constable' : 'Not a Witch'}
                            </p>
                            <p className="text-xs text-slate-500 mb-4">
                                The ghost's hidden cards will be shuffled when you close this.
                            </p>
                            <Button
                                fullWidth
                                onClick={() => {
                                    sendAction('SHUFFLE_GHOST', { ghostId: ghostPeekModal.ghostId });
                                    setGhostPeekModal(null);
                                }}
                            >
                                Done (Shuffle Cards)
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        )}

        {/* Night Damage Card Selection Modal (Small Game Mode) - Global overlay */}
        {gameState.nightDamageSelection?.pendingReveal && (() => {
            const targetPlayer = gameState.players.find(p => p.id === gameState.nightDamageSelection?.targetId);
            const chooser = gameState.players.find(p => p.id === gameState.nightDamageSelection?.chooserId);
            const isChooser = myPlayerId === gameState.nightDamageSelection?.chooserId;
            const targetHiddenCards = targetPlayer?.cards.filter(c => !c.isRevealed) || [];

            return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 text-red-400">Night Attack!</h3>

                        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                            <p className="text-red-300 font-medium text-center">
                                {targetPlayer?.name} was attacked by the witches!
                            </p>
                        </div>

                        {isChooser ? (
                            <>
                                <p className="text-sm text-slate-400 mb-4">
                                    As {targetPlayer?.name}'s left neighbor, you must choose <span className="text-white font-bold">2 cards</span> to reveal.
                                </p>

                                {targetHiddenCards.length === 0 ? (
                                    <p className="text-yellow-300 text-center">No hidden cards remain.</p>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                                            {targetHiddenCards.map((card, idx) => (
                                                <button
                                                    key={card.id}
                                                    onClick={() => {
                                                        const current = nightDamageSelectedCards || [];
                                                        if (current.includes(card.id)) {
                                                            setNightDamageSelectedCards(current.filter(id => id !== card.id));
                                                        } else if (current.length < 2) {
                                                            setNightDamageSelectedCards([...current, card.id]);
                                                        }
                                                    }}
                                                    className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center text-3xl transition-all ${
                                                        (nightDamageSelectedCards || []).includes(card.id)
                                                            ? 'border-red-500 bg-red-900/50 ring-2 ring-red-400'
                                                            : 'border-slate-600 bg-slate-700 hover:border-slate-400'
                                                    }`}
                                                >
                                                    <span className="text-2xl">🂠</span>
                                                </button>
                                            ))}
                                        </div>

                                        <p className="text-sm text-center text-slate-400 mb-4">
                                            Selected: {(nightDamageSelectedCards || []).length}/2 cards
                                            {targetHiddenCards.length < 2 && (
                                                <span className="block text-yellow-300">
                                                    (Only {targetHiddenCards.length} hidden card(s) available)
                                                </span>
                                            )}
                                        </p>

                                        <Button
                                            fullWidth
                                            disabled={(nightDamageSelectedCards || []).length < Math.min(2, targetHiddenCards.length)}
                                            onClick={() => {
                                                if (nightDamageSelectedCards && nightDamageSelectedCards.length > 0) {
                                                    sendAction('NIGHT_DAMAGE_SELECT', { cardIds: nightDamageSelectedCards });
                                                    setNightDamageSelectedCards([]);
                                                }
                                            }}
                                            className="bg-red-700 hover:bg-red-600"
                                        >
                                            Reveal Selected Cards
                                        </Button>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <p className="text-slate-300">
                                    {chooser?.name} is choosing which cards to reveal...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        })()}

        {/* HOST CONTROLS */}
        {isHost && (
            <div className={`fixed bottom-0 left-0 right-0 p-4 border-t flex justify-between items-center z-40 transition-colors duration-500 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700'
                : 'bg-white border-stone-200'
            }`}>
                <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>HOST CONTROLS</div>
                <div className="flex gap-2">
                     {gameState.phase === GamePhase.DAY && (
                         <Button onClick={advancePhase}>Start Night</Button>
                     )}
                     {gameState.phase !== GamePhase.DAY &&
                      gameState.phase !== GamePhase.LOBBY &&
                      gameState.phase !== GamePhase.GAME_OVER &&
                      gameState.phase !== GamePhase.NIGHT_CONFESSION &&
                      gameState.phase !== GamePhase.NIGHT_RESOLUTION && (
                         <Button onClick={advancePhase}>Next Phase</Button>
                     )}
                     {gameState.phase === GamePhase.GAME_OVER && (
                         <Button onClick={() => window.location.reload()}>New Game</Button>
                     )}
                </div>
            </div>
        )}
        
        {/* MY HAND DISPLAY - Hidden by default for privacy */}
        <div className={`mt-8 border-t pt-6 transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-stone-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-stone-600'}`}>My Tryal Cards</h3>
                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-stone-500'}`}>
                    {myHand.filter(c => !c.isRevealed).length} hidden / {myHand.filter(c => c.isRevealed).length} revealed
                </span>
            </div>
            {showMyHand ? (
                <div>
                    <div className="mb-3 text-center">
                        <span className={`text-sm font-medium px-3 py-1 rounded ${
                            getMyRole() === 'Witch Team' ? 'bg-purple-900/50 text-purple-300' :
                            getMyRole() === 'Constable' ? 'bg-blue-900/50 text-blue-300' :
                            'bg-green-900/50 text-green-300'
                        }`}>
                            {getMyRole()}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mb-3 items-center">
                        {/* Hidden cards first */}
                        {myHand.filter(c => !c.isRevealed).map(card => (
                            <CardDisplay
                                key={card.id}
                                card={card}
                                selectable={false}
                            />
                        ))}
                        {/* Separator if both exist */}
                        {myHand.some(c => !c.isRevealed) && myHand.some(c => c.isRevealed) && (
                            <div className="w-px h-24 bg-slate-600 mx-2"></div>
                        )}
                        {/* Revealed cards */}
                        {myHand.filter(c => c.isRevealed).map(card => (
                            <CardDisplay
                                key={card.id}
                                card={card}
                                selectable={false}
                            />
                        ))}
                    </div>
                    {/* Shuffle button - disabled during conspiracy or when being accused */}
                    {(() => {
                        const isBeingAccused = gameState.pendingAccusation?.targetId === myPlayerId;
                        const canShuffle = gameState.phase !== GamePhase.CONSPIRACY && !isBeingAccused;
                        return (
                            <button
                                onClick={() => canShuffle && sendAction('SHUFFLE_HAND', {})}
                                disabled={!canShuffle}
                                className={`w-full py-2 text-sm mb-2 rounded border ${
                                    canShuffle
                                        ? 'text-slate-300 border-slate-600 hover:bg-slate-700'
                                        : 'text-slate-600 border-slate-700 cursor-not-allowed'
                                }`}
                                title={!canShuffle ? "Cannot shuffle while others are selecting from your cards" : "Shuffle your cards"}
                            >
                                🔀 Shuffle My Cards
                            </button>
                        );
                    })()}
                    <button
                        onClick={() => setShowMyHand(false)}
                        className="w-full py-2 text-sm text-slate-400 hover:text-slate-300"
                    >
                        Hide Cards
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowMyHand(true)}
                    className={`w-full py-4 border-2 border-dashed rounded-lg transition-colors ${
                      isDarkMode
                        ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        : 'border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-600'
                    }`}
                >
                    Tap to View My Cards
                </button>
            )}
        </div>

      </main>
    </div>
  );
};

export default App;
