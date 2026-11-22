// Ember Court — a duel of four suits against Rook, the Ember Warden.
// Each side has 20 life and a hand of 5 from a 36-card deck (4 suits x 1-9).
// Higher card wins the trick; damage is the margin (min 1); a tie doubles
// the pot. Each suit has a power: Ember scorches +2 damage, Tide mends 2,
// Gale draws a card, Stone shields 3. Same suit twice in a row SURGES (the
// power doubles); matching Rook's suit MIRRORS (both powers cancel). Rook
// reads your hand, tells you its intent, and keeps a visible history of its
// last plays, so you can counter it. The stakes rise from trick 10, so no
// duel stalemates. Score: 10 per trick, 5 per life left on a win.
// This file is the entry point: the state machine (title, play, win, loss),
// the input (mouse and keyboard), the game loop, and the ?shot= scenes the
// screenshots are taken from. The rules live in rules.js and game.js; this
// file only drives them and asks render.js to draw the state.

import { VIEW_WIDTH, VIEW_HEIGHT, CARD_WIDTH, CARD_HEIGHT, ANIM_PLAY_MS, ANIM_FLIP_MS } from './config.js';
import { makeRng } from './random.js';
import { createGame, playTrick, refreshTableInfo } from './game.js';
import { renderGame, handLayout, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS } from './render.js';
import { stageShot } from './shots.js';
import { unlockAudio, setMuted, isMuted, playFlip, playDeal, playDamage, playHeal, playWin, playLose } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

let state = null;
let shotMode = false;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Fit the 1280x720 view into the window, centred, keeping its aspect.
function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);
  const width = Math.round(VIEW_WIDTH * scale);
  const height = Math.round(VIEW_HEIGHT * scale);
  canvas.width = Math.round(VIEW_WIDTH * dpr);
  canvas.height = Math.round(VIEW_HEIGHT * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  offsetX = (window.innerWidth - width) / 2;
  offsetY = (window.innerHeight - height) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_WIDTH,
    y: ((clientY - rect.top) / rect.height) * VIEW_HEIGHT,
  };
}

// Where a hand card sits on the table (the play animation starts from here).
// Same layout the renderer uses, so clicks land on the cards drawn.
function handCardPosition(index, count) {
  const layout = handLayout(count, CARD_WIDTH, 16, 1200);
  return { x: layout.x + index * (CARD_WIDTH + layout.gap), y: 556 };
}

function announce(text) {
  statusLine.textContent = text;
}

function startGame() {
  const seed = (Date.now() % 2147483647) || 1;
  state = createGame(makeRng(seed));
  state.screen = SCREEN_PLAY;
  refreshTableInfo(state);
  announce('A new duel begins. Play a card.');
  playDeal();
}

// Play the hand card at `index`: slide it to the trick, flip Rook's card in,
// resolve the trick, and play the sounds for what happened.
function playCard(index) {
  if (state === null || state.screen !== SCREEN_PLAY) return;
  if (state.lockedUntil && performance.now() < state.lockedUntil) return;
  if (index < 0 || index >= state.playerHand.length) return;
  const card = state.playerHand[index];
  const position = handCardPosition(index, state.playerHand.length);
  const now = performance.now();
  state.playerHand = state.playerHand.filter((held) => held.id !== card.id);
  state.playAnim = { card, fromX: position.x, fromY: position.y, start: now, end: now + ANIM_PLAY_MS };
  state.flipAnim = { start: now + ANIM_PLAY_MS, end: now + ANIM_PLAY_MS + ANIM_FLIP_MS };
  state.lockedUntil = now + ANIM_PLAY_MS + ANIM_FLIP_MS + 150;
  const trick = playTrick(state, card);
  if (state.banner) state.banner.start = now;
  if (trick !== null) {
    if (trick.winner === 'player' && trick.damage > 0) {
      state.floats.push({ x: 1244 - 120, y: 84, text: `-${trick.damage}`, colour: '#ff8a70', start: now, duration: 900 });
      playDamage();
    } else if (trick.winner === 'opponent' && trick.damage > 0) {
      state.floats.push({ x: 200, y: 556, text: `-${trick.damage}`, colour: '#ff8a70', start: now, duration: 900 });
      playDamage();
    }
    if (trick.healed) {
      playHeal();
    }
    announce(trick.resultText);
  }
  playFlip();
  if (state.screen === SCREEN_WIN) playWin();
  if (state.screen === SCREEN_LOSS) playLose();
}

function onPointerMove(event) {
  if (state === null || state.screen !== SCREEN_PLAY) return;
  const point = toLogical(event.clientX, event.clientY);
  state.hoverIndex = -1;
  for (let index = 0; index < state.playerHand.length; index += 1) {
    const position = handCardPosition(index, state.playerHand.length);
    if (point.x >= position.x && point.x <= position.x + CARD_WIDTH && point.y >= position.y - 10 && point.y <= position.y + CARD_HEIGHT) {
      state.hoverIndex = index;
      break;
    }
  }
}

function onPointerDown(event) {
  unlockAudio();
  if (state === null) return;
  if (state.screen === SCREEN_TITLE || state.screen === SCREEN_WIN || state.screen === SCREEN_LOSS) {
    startGame();
    return;
  }
  const point = toLogical(event.clientX, event.clientY);
  for (let index = 0; index < state.playerHand.length; index += 1) {
    const position = handCardPosition(index, state.playerHand.length);
    if (point.x >= position.x && point.x <= position.x + CARD_WIDTH && point.y >= position.y - 10 && point.y <= position.y + CARD_HEIGHT) {
      playCard(index);
      return;
    }
  }
}

function onKeyDown(event) {
  unlockAudio();
  if (state === null) return;
  if (event.key === 'Enter') {
    if (state.screen !== SCREEN_PLAY) startGame();
    return;
  }
  if (event.key === 'm' || event.key === 'M') {
    setMuted(!isMuted());
    return;
  }
  if (state.screen !== SCREEN_PLAY) return;
  const digit = Number.parseInt(event.key, 10);
  if (digit >= 1 && digit <= state.playerHand.length) playCard(digit - 1);
}

function frame(now) {
  if (state !== null && !shotMode) {
    renderGame(ctx, state, now);
    requestAnimationFrame(frame);
  }
}

function main() {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
  if (shot) {
    // A screenshot scene: stage the real game, render one frozen frame.
    shotMode = true;
    const staged = stageShot(shot, seed);
    state = staged.state;
    state.screen = staged.screen;
    state.muted = true;
    renderGame(ctx, state, 500);
    announce(`Ember Court — ${shot} scene.`);
    return;
  }
  state = createGame(makeRng((Date.now() % 2147483647) || 1));
  state.screen = SCREEN_TITLE;
  refreshTableInfo(state);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  requestAnimationFrame(frame);
}

main();
