// Ember Court — the rules of a trick. One trick, both sides play one card:
// the higher value wins; a tie doubles the next trick's pot instead of dealing
// damage. Suit powers fire on the play (see suits.js); a Surge doubles a power
// when a side repeats its previous suit, and a Mirror cancels both powers when
// the two cards share a suit this trick.

export const TRICK_PLAYER_WINS = 'player';
export const TRICK_OPPONENT_WINS = 'opponent';
export const TRICK_TIE = 'tie';

// The damage a trick deals before the pot multiplier and any shield.
export function baseDamage(winnerCard, loserCard) {
  return Math.max(1, winnerCard.value - loserCard.value);
}

// A power's strength, doubled on a Surge. Ember/Tide give 2, Gale draws 1,
// Stone shields 3; a Surge doubles each.
export function powerStrength(suitId, isSurge) {
  const base = suitId === 'ember' ? 2 : suitId === 'tide' ? 2 : suitId === 'gale' ? 1 : 3;
  return isSurge ? base * 2 : base;
}

// Resolve one trick. `previousSuits` holds each side's suit from the last trick
// (or null); `pot` is the current multiplier (1, or 2 after a tie).
// Returns { winner, damage, playerSurge, opponentSurge, mirror, potNext }.
// Damage already includes Ember's Scorch and the pot; shields apply after.
export function resolveTrick(playerCard, opponentCard, previousSuits, pot) {
  const mirror = playerCard.suit === opponentCard.suit;
  const playerSurge = previousSuits.player !== null && playerCard.suit === previousSuits.player;
  const opponentSurge = previousSuits.opponent !== null && opponentCard.suit === previousSuits.opponent;

  if (playerCard.value === opponentCard.value) {
    return {
      winner: TRICK_TIE,
      damage: 0,
      playerSurge,
      opponentSurge,
      mirror,
      potNext: pot * 2,
    };
  }

  const playerWins = playerCard.value > opponentCard.value;
  const winnerCard = playerWins ? playerCard : opponentCard;
  const loserCard = playerWins ? opponentCard : playerCard;
  let damage = baseDamage(winnerCard, loserCard);
  // Scorch: the winning Ember card adds its power — unless a Mirror cancels it.
  if (winnerCard.suit === 'ember' && !mirror) {
    damage += powerStrength('ember', playerWins ? playerSurge : opponentSurge);
  }
  damage *= pot;
  return {
    winner: playerWins ? TRICK_PLAYER_WINS : TRICK_OPPONENT_WINS,
    damage,
    playerSurge,
    opponentSurge,
    mirror,
    potNext: 1,
  };
}

// Apply a shield: damage is reduced by the shield, which is spent first.
export function applyShield(damage, shield) {
  const blocked = Math.min(shield, damage);
  return { damage: damage - blocked, shieldLeft: shield - blocked, blocked };
}

export function isGameOver(playerLife, opponentLife) {
  return playerLife <= 0 || opponentLife <= 0;
}

export function gameWinner(playerLife, opponentLife) {
  if (opponentLife <= 0 && playerLife > 0) return TRICK_PLAYER_WINS;
  if (playerLife <= 0 && opponentLife > 0) return TRICK_OPPONENT_WINS;
  return null;
}
