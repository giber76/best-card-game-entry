// Ember Court — the game itself: the state and the one-trick step both the live
// game and the screenshot scenes play through. Everything here is pure rules
// (rules.js, deck.js, ai.js); the renderer only draws the state this returns.

import { START_LIFE, HAND_SIZE, WIN_SCORE_TRICK, WIN_SCORE_LIFE } from './config.js';
import { makeDeckState, dealHand, drawFromDeck, discardCard } from './deck.js';
import { resolveTrick, applyShield, isGameOver, gameWinner, powerStrength, TRICK_PLAYER_WINS, TRICK_OPPONENT_WINS, TRICK_TIE } from './rules.js';
import { chooseOpponentCard, rookIntent, rookMood } from './ai.js';

// A fresh duel: shuffled deck, five cards each, 20 life, no shields, pot x1.
export function createGame(rng) {
  const deckState = makeDeckState(rng);
  return {
    rng,
    deckState,
    playerHand: dealHand(deckState, rng, HAND_SIZE),
    opponentHand: dealHand(deckState, rng, HAND_SIZE),
    playerLife: START_LIFE,
    opponentLife: START_LIFE,
    playerShield: 0,
    opponentShield: 0,
    score: 0,
    tricksWon: 0,
    tricksLost: 0,
    damageDealt: 0,
    pot: 1,
    trickNumber: 1,
    previousSuits: { player: null, opponent: null },
    opponentHistory: [],
    trick: null,
    banner: null,
    floats: [],
    intent: '',
    screen: 'title',
    muted: false,
    hoverIndex: -1,
    playAnim: null,
    flipAnim: null,
    deckCount: deckState.draw.length,
  };
}

// Refresh the intent line and the deck count the table shows.
export function refreshTableInfo(state) {
  state.intent = rookIntent(state.opponentHand, state.opponentLife, state.playerLife);
  state.deckCount = state.deckState.draw.length;
}

// Apply one side's play power (Tide mend, Gale draft, Stone aegis). Ember's
// Scorch lives inside the trick damage in rules.js. A Mirror cancels both
// powers; a Surge doubles the side's own power.
function applyPlayPower(state, side, card, surge, mirror) {
  if (mirror) return;
  if (card.suit === 'tide') {
    const heal = powerStrength('tide', surge);
    if (side === 'player') state.playerLife = Math.min(START_LIFE, state.playerLife + heal);
    else state.opponentLife = Math.min(START_LIFE, state.opponentLife + heal);
  } else if (card.suit === 'gale') {
    const draws = powerStrength('gale', surge);
    for (let index = 0; index < draws; index += 1) {
      const drawn = drawFromDeck(state.deckState, state.rng);
      if (drawn === null) break;
      if (side === 'player') state.playerHand.push(drawn);
      else state.opponentHand.push(drawn);
    }
  } else if (card.suit === 'stone') {
    const shield = powerStrength('stone', surge);
    if (side === 'player') state.playerShield += shield;
    else state.opponentShield += shield;
  }
}

// Play one trick: the player has chosen `playerCard` (already removed from
// the hand by the caller); Rook chooses its own. Resolves powers, damage,
// draws, the pot and the end of the game. Returns the trick record the table
// shows, with a banner when something worth naming happened.
export function playTrick(state, playerCard) {
  const opponentCard = chooseOpponentCard(state.opponentHand, state.opponentLife, state.playerLife, state.rng);
  if (opponentCard === null) return null;
  state.opponentHand = state.opponentHand.filter((card) => card.id !== opponentCard.id);

  const resolution = resolveTrick(playerCard, opponentCard, state.previousSuits, state.pot);
  applyPlayPower(state, 'player', playerCard, resolution.playerSurge, resolution.mirror);
  applyPlayPower(state, 'opponent', opponentCard, resolution.opponentSurge, resolution.mirror);

  let resultText = '';
  let banner = null;
  let damageDealt = 0;
  let playerHealed = false;
  if (resolution.winner === TRICK_TIE) {
    resultText = `TIE — the pot doubles to ×${resolution.potNext}`;
    banner = { text: 'TIE!', sub: `Next trick pays ×${resolution.potNext}`, colour: '#e8b64c', start: 0, duration: 1100 };
  } else if (resolution.winner === TRICK_PLAYER_WINS) {
    const shielded = applyShield(resolution.damage, state.opponentShield);
    state.opponentShield = shielded.shieldLeft;
    state.opponentLife -= shielded.damage;
    state.damageDealt += shielded.damage;
    damageDealt = shielded.damage;
    state.tricksWon += 1;
    state.score += WIN_SCORE_TRICK;
    resultText = shielded.blocked > 0
      ? `You win the trick — ${shielded.damage} damage (shield blocked ${shielded.blocked})`
      : `You win the trick — ${shielded.damage} damage`;
    if (resolution.mirror) banner = { text: 'MIRROR!', sub: 'Same suit — both powers cancel', colour: '#7fb8f0', start: 0, duration: 1100 };
    else if (resolution.playerSurge) banner = { text: 'SURGE!', sub: 'Same suit twice — your power doubles', colour: '#ff8a70', start: 0, duration: 1100 };
  } else {
    const shielded = applyShield(resolution.damage, state.playerShield);
    state.playerShield = shielded.shieldLeft;
    state.playerLife -= shielded.damage;
    state.tricksLost += 1;
    damageDealt = shielded.damage;
    resultText = shielded.blocked > 0
      ? `Rook wins the trick — ${shielded.damage} damage (shield blocked ${shielded.blocked})`
      : `Rook wins the trick — ${shielded.damage} damage`;
    if (resolution.mirror) banner = { text: 'MIRROR!', sub: 'Same suit — both powers cancel', colour: '#7fb8f0', start: 0, duration: 1100 };
    else if (resolution.opponentSurge) banner = { text: 'ROOK SURGES!', sub: 'Same suit twice — Rook’s power doubles', colour: '#ff8a70', start: 0, duration: 1100 };
  }
  if (!resolution.mirror && playerCard.suit === 'tide') playerHealed = true;

  discardCard(state.deckState, playerCard);
  discardCard(state.deckState, opponentCard);
  state.opponentHistory = [opponentCard, ...state.opponentHistory].slice(0, 3);
  state.previousSuits = { player: playerCard.suit, opponent: opponentCard.suit };
  state.pot = resolution.potNext;
  state.trickNumber += 1;
  // The stakes rise as the duel drags on: from trick 10 the base pot is x2,
  // from trick 20 it is x3, so no duel can stalemate on heals and shields.
  const basePot = 1 + Math.floor((state.trickNumber - 1) / 10);
  if (basePot > state.pot) state.pot = Math.min(basePot, 4);

  // Both sides draw back up to a full hand.
  for (let index = 0; index < 1; index += 1) {
    const playerDraw = drawFromDeck(state.deckState, state.rng);
    if (playerDraw !== null) state.playerHand.push(playerDraw);
    const opponentDraw = drawFromDeck(state.deckState, state.rng);
    if (opponentDraw !== null) state.opponentHand.push(opponentDraw);
  }

  const trick = { playerCard, opponentCard, resultText, winner: resolution.winner, damage: damageDealt, healed: playerHealed };
  state.trick = trick;
  state.banner = banner;
  refreshTableInfo(state);

  if (isGameOver(state.playerLife, state.opponentLife)) {
    const winner = gameWinner(state.playerLife, state.opponentLife);
    if (winner === TRICK_PLAYER_WINS) {
      state.score += state.playerLife * WIN_SCORE_LIFE;
      state.screen = 'win';
    } else if (winner === TRICK_OPPONENT_WINS) {
      state.screen = 'loss';
    }
  }
  return trick;
}

// The autopilot's card choice, by skill: 'best' plays the highest card that
// wins (or the highest when nothing wins), 'worst' the lowest, 'mid' a middle
// card. Used by the screenshot scenes and by nothing else.
export function autopilotCard(state, skill) {
  const hand = state.playerHand.slice().sort((a, b) => a.value - b.value);
  if (hand.length === 0) return null;
  if (skill === 'worst') return hand[0];
  if (skill === 'best') return hand[hand.length - 1];
  const middle = hand[Math.floor(hand.length / 2)];
  return middle;
}

// Rook's mood, for the table's intent line.
export function currentMood(state) {
  return rookMood(state.opponentLife, state.playerLife);
}
