// Ember Court — the deck: 4 suits x values 1-9, 36 cards. A card is a plain
// object { suit, value, id } so the table, the AI and the renderer all read the
// same shape. The deck reshuffles its discard pile when it runs dry.

import { DECK_VALUES } from './config.js';
import { SUITS } from './suits.js';
import { shuffleInPlace } from './random.js';

let nextCardId = 1;

export function makeCard(suit, value) {
  return { suit, value, id: nextCardId };
}

export function buildDeck() {
  const cards = [];
  for (let suitIndex = 0; suitIndex < SUITS.length; suitIndex += 1) {
    for (let valueIndex = 0; valueIndex < DECK_VALUES.length; valueIndex += 1) {
      cards.push(makeCard(SUITS[suitIndex].id, DECK_VALUES[valueIndex]));
      nextCardId += 1;
    }
  }
  return cards;
}

export function makeDeckState(rng) {
  return {
    draw: shuffleInPlace(rng, buildDeck()),
    discard: [],
  };
}

// Draw one card, reshuffling the discard pile into the draw pile when needed.
// Returns null only when no card exists anywhere (never in a real game).
export function drawFromDeck(deckState, rng) {
  if (deckState.draw.length === 0) {
    if (deckState.discard.length === 0) return null;
    deckState.draw = shuffleInPlace(rng, deckState.discard.splice(0));
  }
  return deckState.draw.pop();
}

export function discardCard(deckState, card) {
  deckState.discard.push(card);
}

// A hand of `count` cards drawn from a fresh deck state.
export function dealHand(deckState, rng, count) {
  const hand = [];
  for (let index = 0; index < count; index += 1) {
    const card = drawFromDeck(deckState, rng);
    if (card !== null) hand.push(card);
  }
  return hand;
}
