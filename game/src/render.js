// Ember Court — the renderer. Every pixel of the game is drawn here on one
// canvas: the felt table, the cards, the life bars, the banners and the title
// and end screens. Suits are told apart by colour AND by a vector shape drawn
// for each one (flame, drop, leaf, gem), never by text alone, so a card stays
// legible when the screenshot shrinks to a thumbnail.

import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  TRICK_CARD_WIDTH,
  TRICK_CARD_HEIGHT,
  CARD_RADIUS,
  OPPONENT_CARD_WIDTH,
  OPPONENT_CARD_HEIGHT,
  FELT_DARK,
  FELT_MID,
  FELT_LIGHT,
  FELT_EDGE,
  GOLD,
  GOLD_DARK,
  IVORY,
  INK,
  MUTED,
} from './config.js';
import { suitById } from './suits.js';
import { START_LIFE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function easeOutCubic(t) {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - Math.pow(1 - clamped, 3);
}

// One suit symbol, drawn as a vector shape centred at (cx, cy) with the
// given size (the symbol's height). Flame, drop, leaf and gem are distinct
// silhouettes, so colour is never the only difference between suits. The
// flame leans with a concave flick edge and carries a lighter inner flame,
// so it never reads as the drop or the leaf at thumbnail size. Pass
// inner=false for the big faint background emblems, where a bright core
// would fight the text drawn over them.
export function drawSuitSymbol(ctx, shape, cx, cy, size, colour, inner = true) {
  const half = size / 2;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineJoin = 'round';
  let filled = false;
  ctx.beginPath();
  if (shape === 'flame') {
    // Outer: a leaning teardrop — tip flicked right, left edge concave.
    ctx.moveTo(cx + half * 0.15, cy - half);
    ctx.bezierCurveTo(cx + half * 0.95, cy - half * 0.3, cx + half * 0.8, cy + half * 0.5, cx, cy + half);
    ctx.bezierCurveTo(cx - half * 0.75, cy + half * 0.5, cx - half * 0.9, cy - half * 0.1, cx - half * 0.45, cy - half * 0.45);
    ctx.bezierCurveTo(cx - half * 0.2, cy - half * 0.75, cx, cy - half * 0.9, cx + half * 0.15, cy - half);
    ctx.fill();
    filled = true;
    if (inner) {
      // Inner flame: smaller, lighter, low in the body.
      ctx.fillStyle = '#ffd97a';
      ctx.beginPath();
      ctx.moveTo(cx + half * 0.05, cy - half * 0.15);
      ctx.bezierCurveTo(cx + half * 0.45, cy + half * 0.1, cx + half * 0.35, cy + half * 0.45, cx, cy + half * 0.55);
      ctx.bezierCurveTo(cx - half * 0.35, cy + half * 0.45, cx - half * 0.45, cy + half * 0.1, cx + half * 0.05, cy - half * 0.15);
      ctx.fill();
    }
  } else if (shape === 'drop') {
    ctx.moveTo(cx, cy - half);
    ctx.bezierCurveTo(cx + half * 0.85, cy - half * 0.1, cx + half * 0.75, cy + half * 0.6, cx, cy + half);
    ctx.bezierCurveTo(cx - half * 0.75, cy + half * 0.6, cx - half * 0.85, cy - half * 0.1, cx, cy - half);
  } else if (shape === 'leaf') {
    ctx.moveTo(cx, cy - half);
    ctx.bezierCurveTo(cx + half, cy - half * 0.4, cx + half * 0.8, cy + half * 0.7, cx, cy + half);
    ctx.bezierCurveTo(cx - half * 0.8, cy + half * 0.7, cx - half, cy - half * 0.4, cx, cy - half);
    ctx.moveTo(cx, cy - half * 0.8);
    ctx.lineTo(cx, cy + half * 0.85);
  } else {
    // Gem: a faceted hexagon.
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half * 0.75, cy - half * 0.25);
    ctx.lineTo(cx + half * 0.75, cy + half * 0.4);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half * 0.75, cy + half * 0.4);
    ctx.lineTo(cx - half * 0.75, cy - half * 0.25);
    ctx.closePath();
    ctx.moveTo(cx - half * 0.75, cy - half * 0.25);
    ctx.lineTo(cx + half * 0.75, cy - half * 0.25);
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx, cy + half * 0.4);
  }
  if (!filled) ctx.fill();
  ctx.restore();
}

// A face-up card: ivory face, suit-coloured border, big value, big centre
// symbol, and the suit's power word along the bottom. In mini mode (the
// "Rook's last plays" history cards, 48x68) the rotated bottom-right value,
// the small top symbol and the power word are dropped: at that size the
// rotated digit reads as a wrong number and the power word is a smudge.
// A hovered card also gets a gold glow ring, on top of the lift.
export function drawCardFace(ctx, card, x, y, width, height, hovered, mini = false) {
  const suit = suitById(card.suit);
  const lift = hovered ? -10 : 0;
  const top = y + lift;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = hovered ? 18 : 10;
  ctx.shadowOffsetY = hovered ? 8 : 4;
  roundRectPath(ctx, x, top, width, height, CARD_RADIUS);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = suit.colour;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = suit.colourLight;
  roundRectPath(ctx, x + 5, top + 5, width - 10, height - 10, CARD_RADIUS - 4);
  ctx.stroke();

  // Value, top-left. (The upside-down bottom-right value is skipped in
  // mini mode: at 48px it reads as a wrong digit, 9 as 6.)
  ctx.fillStyle = suit.colourDark;
  ctx.font = `bold ${Math.round(width * 0.32)}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(card.value), x + 10, top + 8);
  if (!mini) {
    ctx.save();
    ctx.translate(x + width - 10, top + height - 8);
    ctx.rotate(Math.PI);
    ctx.fillText(String(card.value), 0, 0);
    ctx.restore();

    // Small symbol beside the top value, big symbol in the centre.
    drawSuitSymbol(ctx, suit.shape, x + width - 22, top + 26, 22, suit.colour);
  }
  drawSuitSymbol(ctx, suit.shape, x + width / 2, top + height * 0.48, Math.round(width * 0.52), suit.colour);

  // Power word along the bottom (full-size cards only).
  if (!mini) {
    ctx.fillStyle = suit.colourDark;
    ctx.font = `bold ${Math.round(width * 0.12)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(suit.power.toUpperCase(), x + width / 2, top + height - 12);
  }

  // Gold glow ring around a hovered card, outside the face.
  if (hovered) {
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.strokeStyle = GOLD;
    roundRectPath(ctx, x - 5, top - 5, width + 10, height + 10, CARD_RADIUS + 5);
    ctx.stroke();
  }
  ctx.restore();
}

// A face-down card: deep red with a gold frame and a flame emblem.
export function drawCardBack(ctx, x, y, width, height) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  roundRectPath(ctx, x, y, width, height, Math.max(6, width * 0.1));
  ctx.fillStyle = '#7a1f1a';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = GOLD_DARK;
  roundRectPath(ctx, x + 5, y + 5, width - 10, height - 10, Math.max(4, width * 0.08));
  ctx.stroke();
  drawSuitSymbol(ctx, 'flame', x + width / 2, y + height / 2, Math.round(width * 0.5), GOLD);
  ctx.restore();
}

// A life bar: a labelled track with a number big enough to read at a glance.
export function drawLifeBar(ctx, x, y, width, life, label, accent) {
  ctx.save();
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = IVORY;
  ctx.fillText(label, x, y + 15);
  const barX = x + 92;
  const barWidth = width - 92;
  const barY = y + 2;
  const barHeight = 16;
  roundRectPath(ctx, barX, barY, barWidth, barHeight, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  const fraction = Math.max(0, life) / START_LIFE;
  if (fraction > 0) {
    roundRectPath(ctx, barX, barY, Math.max(10, barWidth * fraction), barHeight, 8);
    ctx.fillStyle = accent;
    ctx.fill();
  }
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = IVORY;
  ctx.textAlign = 'right';
  ctx.fillText(String(Math.max(0, life)), barX + barWidth + 34, y + 20);
  ctx.restore();
}

function drawFelt(ctx) {
  const gradient = ctx.createRadialGradient(
    VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 120,
    VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 780,
  );
  gradient.addColorStop(0, FELT_LIGHT);
  gradient.addColorStop(0.55, FELT_MID);
  gradient.addColorStop(1, FELT_DARK);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // Gold trim around the table and a faint centre emblem.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, VIEW_WIDTH - 20, VIEW_HEIGHT - 20);
  ctx.strokeStyle = 'rgba(232,182,76,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 118, 0, Math.PI * 2);
  ctx.stroke();
  drawSuitSymbol(ctx, 'flame', VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 72, 'rgba(232,182,76,0.18)', false);
}

/**
 * Centre a hand of cards. When the hand grows past maxWidth the gap shrinks
 * (cards overlap) instead of spilling off the table. Shared with main.js so
 * the click hit-test uses the same positions the renderer draws.
 */
export function handLayout(count, cardWidth, gap, maxWidth) {
  let usedGap = gap;
  const natural = count * cardWidth + (count - 1) * usedGap;
  if (natural > maxWidth && count > 1) {
    usedGap = Math.max((maxWidth - count * cardWidth) / (count - 1), -cardWidth * 0.6);
  }
  const width = count * cardWidth + (count - 1) * usedGap;
  return { x: (VIEW_WIDTH - width) / 2, gap: usedGap };
}

function drawBanner(ctx, banner, now) {
  if (!banner) return;
  const age = now - banner.start;
  if (age > banner.duration) return;
  const pop = easeOutCubic(Math.min(1, age / 180));
  const fade = age > banner.duration - 300 ? 1 - (age - (banner.duration - 300)) / 300 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  // Pill centred between the intent line (y 214) and the trick cards
  // (y 296); the banner's explanation rides under it as a second line, so
  // the SURGE/MIRROR/TIE reason is visible, not only its name.
  ctx.translate(VIEW_WIDTH / 2, 244);
  ctx.scale(pop, pop);
  ctx.font = 'bold 34px Georgia, serif';
  const width = ctx.measureText(banner.text).width + 56;
  roundRectPath(ctx, -width / 2, -26, width, 52, 26);
  ctx.fillStyle = banner.colour || GOLD;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.text, 0, 2);
  if (banner.sub) {
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillStyle = '#d8e6dc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(banner.sub, 0, 42);
  }
  ctx.restore();
}

function drawFloats(ctx, floats, now) {
  for (let index = 0; index < floats.length; index += 1) {
    const item = floats[index];
    const age = now - item.start;
    if (age < 0 || age > item.duration) continue;
    const progress = age / item.duration;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.colour;
    ctx.fillText(item.text, item.x, item.y - progress * 46);
    ctx.restore();
  }
}

// The play table: opponent hand and life at the top, the trick in the middle,
// the player's hand and life at the bottom, score and pot at the sides.
export function drawPlayTable(ctx, state, now) {
  drawFelt(ctx);

  // Opponent: name, life, intent, hand of backs, last plays.
  ctx.save();
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = IVORY;
  ctx.textAlign = 'left';
  ctx.fillText('ROOK — THE EMBER WARDEN', 36, 44);
  drawLifeBar(ctx, 36, 58, 300, state.opponentLife, 'LIFE', '#e2483a');
  if (state.opponentShield > 0) {
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillStyle = '#f2cd7a';
    ctx.fillText(`SHIELD ${state.opponentShield}`, 380, 76);
  }
  ctx.restore();

  const oppLayout = handLayout(state.opponentHand.length, OPPONENT_CARD_WIDTH, 10, 900);
  const oppHandX = oppLayout.x;
  for (let index = 0; index < state.opponentHand.length; index += 1) {
    drawCardBack(ctx, oppHandX + index * (OPPONENT_CARD_WIDTH + oppLayout.gap), 92, OPPONENT_CARD_WIDTH, OPPONENT_CARD_HEIGHT);
  }

  // Rook's intent, under its hand — the readable tell.
  ctx.save();
  ctx.font = 'italic 17px Georgia, serif';
  ctx.fillStyle = '#d8e6dc';
  ctx.textAlign = 'center';
  ctx.fillText(state.intent, VIEW_WIDTH / 2, 214);
  ctx.restore();

  // Rook's last plays, top right, face-up and small.
  ctx.save();
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.fillText("ROOK'S LAST PLAYS", 1244, 44);
  for (let index = 0; index < state.opponentHistory.length; index += 1) {
    const card = state.opponentHistory[index];
    drawCardFace(ctx, card, 1244 - (index + 1) * 56 + 8, 56, 48, 68, false, true);
  }
  // Pot indicator, under the last plays — never under the banner or the hand.
  if (state.pot > 1) {
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillStyle = GOLD;
    const reason = state.trickNumber >= 10 ? ' — STAKES RISE' : '';
    ctx.fillText(`POT ×${state.pot}${reason}`, 1244, 140);
  }
  ctx.restore();

  // The trick: the two played cards, the opponent's flipping in. Trick
  // cards are bigger than hand cards (140x196) so the duel's centre reads
  // at contact-sheet size; the dead middle is closed by pulling the trick
  // up and the player's hand down to meet it.
  if (state.trick) {
    const slotY = 296;
    const playerSlotX = VIEW_WIDTH / 2 - TRICK_CARD_WIDTH - 18;
    const opponentSlotX = VIEW_WIDTH / 2 + 18;
    if (state.trick.playerCard) {
      const anim = state.playAnim;
      if (anim && anim.card === state.trick.playerCard && now < anim.end) {
        const t = easeOutCubic((now - anim.start) / (anim.end - anim.start));
        const x = anim.fromX + (playerSlotX - anim.fromX) * t;
        const y = anim.fromY + (slotY - anim.fromY) * t;
        drawCardFace(ctx, state.trick.playerCard, x, y, TRICK_CARD_WIDTH, TRICK_CARD_HEIGHT, false);
      } else {
        drawCardFace(ctx, state.trick.playerCard, playerSlotX, slotY, TRICK_CARD_WIDTH, TRICK_CARD_HEIGHT, false);
      }
    }
    if (state.trick.opponentCard) {
      const flip = state.flipAnim;
      if (flip && now < flip.end) {
        const progress = (now - flip.start) / (flip.end - flip.start);
        const scale = Math.abs(Math.cos(progress * Math.PI));
        ctx.save();
        ctx.translate(opponentSlotX + TRICK_CARD_WIDTH / 2, slotY + TRICK_CARD_HEIGHT / 2);
        ctx.scale(Math.max(0.08, scale), 1);
        if (progress < 0.5) {
          drawCardBack(ctx, -TRICK_CARD_WIDTH / 2, -TRICK_CARD_HEIGHT / 2, TRICK_CARD_WIDTH, TRICK_CARD_HEIGHT);
        } else {
          drawCardFace(ctx, state.trick.opponentCard, -TRICK_CARD_WIDTH / 2, -TRICK_CARD_HEIGHT / 2, TRICK_CARD_WIDTH, TRICK_CARD_HEIGHT, false);
        }
        ctx.restore();
      } else {
        drawCardFace(ctx, state.trick.opponentCard, opponentSlotX, slotY, TRICK_CARD_WIDTH, TRICK_CARD_HEIGHT, false);
      }
    }
    if (state.trick.resultText) {
      ctx.save();
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillStyle = IVORY;
      ctx.textAlign = 'center';
      ctx.fillText(state.trick.resultText, VIEW_WIDTH / 2, slotY + TRICK_CARD_HEIGHT + 26);
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('Play a card — click one, or press 1–9', VIEW_WIDTH / 2, 380);
    ctx.restore();
  }

  drawBanner(ctx, state.banner, now);
  drawFloats(ctx, state.floats, now);

  // Player: life, shield, hand, score.
  ctx.save();
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = IVORY;
  ctx.textAlign = 'left';
  ctx.fillText('YOU', 36, 514);
  drawLifeBar(ctx, 36, 526, 300, state.playerLife, 'LIFE', '#3da35d');
  if (state.playerShield > 0) {
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillStyle = '#f2cd7a';
    ctx.fillText(`SHIELD ${state.playerShield}`, 380, 544);
  }
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = GOLD;
  ctx.fillText(`SCORE ${state.score}`, 1244, 514);
  ctx.fillStyle = IVORY;
  ctx.font = '16px Georgia, serif';
  ctx.fillText(`TRICK ${state.trickNumber}  ·  DECK ${state.deckCount}`, 1244, 540);
  ctx.restore();

  // Player hand, fanned slightly, hovered card lifted.
  const layout = handLayout(state.playerHand.length, CARD_WIDTH, 16, 1200);
  const handX = layout.x;
  const handY = 548;
  for (let index = 0; index < state.playerHand.length; index += 1) {
    const card = state.playerHand[index];
    const hovered = state.hoverIndex === index;
    const x = handX + index * (CARD_WIDTH + layout.gap);
    drawCardFace(ctx, card, x, handY, CARD_WIDTH, CARD_HEIGHT, hovered);
  }
}

// The title screen: the game's name, a fan of the four suits, the rules in
// short, and the call to play.
export function drawTitleScreen(ctx, state, now) {
  drawFelt(ctx);
  const pulse = 0.75 + 0.25 * Math.sin(now / 450);
  ctx.save();
  // A large flame emblem behind the title — Rook's mark, faint so the name
  // stays readable (no bright inner core on a background emblem).
  drawSuitSymbol(ctx, 'flame', VIEW_WIDTH / 2, 108, 170, 'rgba(232,182,76,0.20)', false);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillText('EMBER COURT', VIEW_WIDTH / 2, 150);
  ctx.fillStyle = IVORY;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('A duel of four suits — outplay Rook, Warden of the Ember Court.', VIEW_WIDTH / 2, 196);

  // A fan of one card per suit, bigger than v1 so the suits read at a glance.
  const fanSuits = ['ember', 'tide', 'gale', 'stone'];
  const fanValues = [9, 7, 8, 6];
  const fanWidth = 136;
  const fanHeight = 190;
  for (let index = 0; index < fanSuits.length; index += 1) {
    const angle = (index - 1.5) * 0.14;
    const x = VIEW_WIDTH / 2 + (index - 1.5) * 128 - fanWidth / 2;
    const y = 250 + Math.abs(index - 1.5) * 14;
    ctx.save();
    ctx.translate(x + fanWidth / 2, y + fanHeight / 2);
    ctx.rotate(angle);
    drawCardFace(ctx, { suit: fanSuits[index], value: fanValues[index], id: 0 }, -fanWidth / 2, -fanHeight / 2, fanWidth, fanHeight, false);
    ctx.restore();
  }

  ctx.fillStyle = IVORY;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY', VIEW_WIDTH / 2, 486);
  ctx.globalAlpha = 1;
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = '#d8e6dc';
  ctx.fillText('Higher card wins the trick · A tie doubles the pot · Same suit twice: SURGE · Same suit as Rook: MIRROR', VIEW_WIDTH / 2, 528);
  ctx.fillText('Ember scorches · Tide mends · Gale draws · Stone shields — each hand is a decision.', VIEW_WIDTH / 2, 556);

  // The facts strip: what the duel is, in one line.
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('36 CARDS · 4 SUITS · 20 LIFE', VIEW_WIDTH / 2, 584);

  // Suit legend.
  let legendX = VIEW_WIDTH / 2 - 330;
  ctx.font = 'bold 15px Georgia, serif';
  for (let index = 0; index < fanSuits.length; index += 1) {
    const suit = suitById(fanSuits[index]);
    drawSuitSymbol(ctx, suit.shape, legendX + 10, 618, 20, suit.colour);
    ctx.fillStyle = IVORY;
    ctx.textAlign = 'left';
    ctx.fillText(`${suit.name} — ${suit.power}`, legendX + 26, 623);
    legendX += 168;
  }
  ctx.restore();
}

// The end screens: the play table stays visible underneath (both hands and
// the final trick are still in the state), dimmed by an overlay, so the shot
// shows a game that was played — not blank felt. A win lands with a gold
// flourish and deterministic ember confetti; a loss with a dark one and the
// player's hand dimmed further.
export function drawEndScreen(ctx, state, now, won) {
  // The table first, banner and intent hidden so they cannot collide with
  // VICTORY/DEFEAT: the intent line would show through the big title.
  const savedBanner = state.banner;
  const savedIntent = state.intent;
  state.banner = null;
  state.intent = '';
  drawPlayTable(ctx, state, now);
  state.banner = savedBanner;
  state.intent = savedIntent;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (!won) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 540, VIEW_WIDTH, VIEW_HEIGHT - 540);
  }
  ctx.restore();
  if (won) {
    const burst = ctx.createRadialGradient(VIEW_WIDTH / 2, 300, 20, VIEW_WIDTH / 2, 300, 420);
    burst.addColorStop(0, 'rgba(232,182,76,0.5)');
    burst.addColorStop(1, 'rgba(232,182,76,0)');
    ctx.fillStyle = burst;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    // Deterministic ember confetti: a fixed-seed LCG, so the same scene
    // renders the same dots every time.
    let seed = 20261123;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const confetti = ['#e8b64c', '#ff8a70', '#f2cd7a', '#e2483a', '#ffd97a'];
    ctx.save();
    for (let index = 0; index < 56; index += 1) {
      ctx.fillStyle = confetti[index % confetti.length];
      ctx.beginPath();
      ctx.arc(next() * VIEW_WIDTH, next() * VIEW_HEIGHT, 2.5 + next() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    const shade = ctx.createRadialGradient(VIEW_WIDTH / 2, 300, 20, VIEW_WIDTH / 2, 300, 420);
    shade.addColorStop(0, 'rgba(120,20,16,0.45)');
    shade.addColorStop(1, 'rgba(120,20,16,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? GOLD : '#e2483a';
  ctx.font = 'bold 88px Georgia, serif';
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', VIEW_WIDTH / 2, 220);
  ctx.fillStyle = IVORY;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText(
    won ? 'The court is yours — Rook bows to a better hand.' : 'Rook keeps the court — the embers were not yours today.',
    VIEW_WIDTH / 2, 268,
  );
  // A dark panel behind the stats block: the trick cards sit right behind
  // these lines, and gold/white text on ivory cards is unreadable without it.
  ctx.fillStyle = 'rgba(8,18,12,0.62)';
  roundRectPath(ctx, 300, 315, 680, 185, 16);
  ctx.fill();
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(`FINAL SCORE ${state.score}`, VIEW_WIDTH / 2, 350);
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#d8e6dc';
  ctx.fillText(
    `Tricks won ${state.tricksWon} · Damage dealt ${state.damageDealt} · Life left ${Math.max(0, state.playerLife)}`,
    VIEW_WIDTH / 2, 392,
  );
  ctx.font = 'bold 22px Georgia, serif';
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now / 450);
  ctx.fillStyle = IVORY;
  ctx.fillText('PRESS ENTER TO PLAY AGAIN', VIEW_WIDTH / 2, 470);
  ctx.restore();
}

// Draw the whole game for the current screen.
export function renderGame(ctx, state, now) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (state.screen === SCREEN_TITLE) {
    drawTitleScreen(ctx, state, now);
  } else if (state.screen === SCREEN_WIN) {
    drawEndScreen(ctx, state, now, true);
  } else if (state.screen === SCREEN_LOSS) {
    drawEndScreen(ctx, state, now, false);
  } else {
    drawPlayTable(ctx, state, now);
  }
}
