// Ember Court — the four suits. Each suit is told apart by colour AND by shape
// (criterion 4: never by text alone), and each suit carries one power that fires
// when its card is played. The cycle decides nothing by itself; it only feeds
// the Mirror rule in rules.js.

export const SUIT_EMBER = 'ember';
export const SUIT_TIDE = 'tide';
export const SUIT_GALE = 'gale';
export const SUIT_STONE = 'stone';

export const SUITS = [
  {
    id: SUIT_EMBER,
    name: 'Ember',
    colour: '#e2483a',
    colourDark: '#8f1d12',
    colourLight: '#ff8a70',
    shape: 'flame',
    power: 'Scorch',
    powerText: '+2 damage if this card wins the trick',
  },
  {
    id: SUIT_TIDE,
    name: 'Tide',
    colour: '#2f7fd0',
    colourDark: '#174a80',
    colourLight: '#7fb8f0',
    shape: 'drop',
    power: 'Mend',
    powerText: 'Heal 2 life when this card is played',
  },
  {
    id: SUIT_GALE,
    name: 'Gale',
    colour: '#3da35d',
    colourDark: '#1d5c31',
    colourLight: '#8fd6a4',
    shape: 'leaf',
    power: 'Draft',
    powerText: 'Draw an extra card when this card is played',
  },
  {
    id: SUIT_STONE,
    name: 'Stone',
    colour: '#c9932b',
    colourDark: '#7a5a12',
    colourLight: '#f2cd7a',
    shape: 'gem',
    power: 'Aegis',
    powerText: 'Block the next 3 damage you would take',
  },
];

export function suitById(id) {
  for (let index = 0; index < SUITS.length; index += 1) {
    if (SUITS[index].id === id) return SUITS[index];
  }
  return SUITS[0];
}

// The Ember cycle, used only to flavour the opponent's intent line.
export function suitBeats(firstId, secondId) {
  return (
    (firstId === SUIT_EMBER && secondId === SUIT_GALE) ||
    (firstId === SUIT_GALE && secondId === SUIT_TIDE) ||
    (firstId === SUIT_TIDE && secondId === SUIT_EMBER)
  );
}
