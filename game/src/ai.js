// Ember Court — Rook, the Ember Warden, the opponent. Rook plays by a readable
// heuristic, and its mood and intent are shown on the table so the player can
// read its plan and counter it (criterion 2: an opponent whose choices you can
// read and counter). Rook never sees the player's card before choosing its own.

export const MOOD_CAUTIOUS = 'cautious';
export const MOOD_BOLD = 'bold';
export const MOOD_DESPERATE = 'desperate';

// Rook's mood follows its life: hurt Rook plays desperate, healthy Rook bold.
export function rookMood(ownLife, foeLife) {
  if (ownLife <= 7) return MOOD_DESPERATE;
  if (ownLife < foeLife) return MOOD_CAUTIOUS;
  return MOOD_BOLD;
}

// The intent line the table shows before Rook plays. It names what Rook is
// leaning toward, from its hand and its life, so the player can answer it.
export function rookIntent(hand, ownLife, foeLife) {
  const suits = {};
  for (let index = 0; index < hand.length; index += 1) {
    suits[hand[index].suit] = (suits[hand[index].suit] || 0) + 1;
  }
  if (ownLife <= 7 && suits.tide) return 'Rook is hurt… watch for a Tide mend.';
  if (suits.ember >= 3) return 'Rook is gathering embers… a Scorch is coming.';
  if (suits.stone >= 2 && foeLife <= 10) return 'Rook raises its guard… Stone is near.';
  if (ownLife <= 7) return 'Rook is cornered… it will spend anything to survive.';
  if (foeLife <= 8) return 'Rook smells blood… it will press the attack.';
  return 'Rook studies your hand…';
}

// Count how many cards of each suit a hand holds.
export function countSuits(hand) {
  const counts = { ember: 0, tide: 0, gale: 0, stone: 0 };
  for (let index = 0; index < hand.length; index += 1) {
    counts[hand[index].suit] += 1;
  }
  return counts;
}

// Choose Rook's card. The heuristic, in order:
//  1. Hurt (life <= 7) and holding Tide: play the lowest Tide to mend.
//  2. The player is close to dead and Rook holds a big card: finish with it.
//  3. Otherwise play the lowest card that still threatens (value 4-6), saving
//     the biggest cards for a decisive trick; when desperate, spend the best.
export function chooseOpponentCard(hand, ownLife, foeLife, rng) {
  if (hand.length === 0) return null;
  const sorted = hand.slice().sort((a, b) => a.value - b.value);
  const mood = rookMood(ownLife, foeLife);

  if (ownLife <= 7) {
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index].suit === 'tide') return sorted[index];
    }
  }
  if (foeLife <= 6) {
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (sorted[index].value >= 7) return sorted[index];
    }
  }
  if (mood === MOOD_DESPERATE) {
    return sorted[sorted.length - 1];
  }
  // Cautious or bold: spend a mid card, keep the aces for later. A little
  // seeded wobble keeps Rook from playing the same line every game.
  const mid = sorted.filter((card) => card.value >= 4 && card.value <= 6);
  if (mid.length > 0) {
    return mid[Math.floor(rng() * mid.length)];
  }
  return sorted[0];
}
