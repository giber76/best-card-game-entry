// Ember Court — the screenshot scenes behind ?shot=title|play|win|loss. Each
// one plays the real rules forward from a fresh state, steered by the same
// autopilot the game offers, so the frame is what a short game really looks
// like and the same seed always gives the same frame. The win and loss scenes
// try seeds in order until one ends the way the scene needs.

import { createGame, playTrick, autopilotCard, refreshTableInfo } from './game.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS } from './render.js';
import { makeRng } from './random.js';

const MAX_TRICKS = 60;
const PLAY_TRICKS = 6;

// Play tricks with the autopilot until the game ends or the cap is hit.
// Returns the final screen ('win', 'loss' or 'play').
function runAutopilot(state, skill) {
  for (let index = 0; index < MAX_TRICKS; index += 1) {
    if (state.screen === SCREEN_WIN || state.screen === SCREEN_LOSS) break;
    const card = autopilotCard(state, skill);
    if (card === null) break;
    state.playerHand = state.playerHand.filter((held) => held.id !== card.id);
    state.trick = null;
    playTrick(state, card);
  }
  if (state.screen === SCREEN_WIN) return SCREEN_WIN;
  if (state.screen === SCREEN_LOSS) return SCREEN_LOSS;
  return SCREEN_PLAY;
}

// Set `state` to the named scene (title, play, win or loss; any other name is
// title) and return the screen to draw. The state is the game itself, so the
// frame is a real game state, not a mock-up.
export function stageShot(name, seed) {
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    const state = createGame(makeRng(seed));
    state.screen = SCREEN_TITLE;
    refreshTableInfo(state);
    return { state, screen: SCREEN_TITLE };
  }

  if (name === 'play') {
    // Try seeds in order and keep the first whose final trick carries a
    // banner (SURGE / MIRROR / TIE): the cover must show the game's
    // signature moment, not a plain trick. Fall back to the first seed.
    let chosen = null;
    let fallback = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = createGame(makeRng(seed + attempt));
      state.screen = SCREEN_PLAY;
      for (let index = 0; index < PLAY_TRICKS; index += 1) {
        if (state.screen !== SCREEN_PLAY) break;
        const card = autopilotCard(state, 'mid');
        if (card === null) break;
        state.playerHand = state.playerHand.filter((held) => held.id !== card.id);
        state.trick = null;
        playTrick(state, card);
      }
      if (attempt === 0) fallback = state;
      if (state.screen === SCREEN_PLAY && state.banner) {
        chosen = state;
        break;
      }
      if (fallback === null && state.screen === SCREEN_PLAY) fallback = state;
    }
    const state = chosen || fallback;
    // Hover a mid/high card so the shot shows a decision being made.
    let hover = -1;
    let best = -1;
    for (let index = 0; index < state.playerHand.length; index += 1) {
      if (state.playerHand[index].value > best) {
        best = state.playerHand[index].value;
        hover = index;
      }
    }
    state.hoverIndex = hover;
    refreshTableInfo(state);
    return { state, screen: SCREEN_PLAY };
  }

  // Win or loss: try seeds in order until one ends that way. The final
  // trick is KEPT (not nulled): the end screen draws the table underneath,
  // and the last trick cards belong on it.
  const wanted = name === 'win' ? SCREEN_WIN : SCREEN_LOSS;
  const skill = name === 'win' ? 'best' : 'worst';
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = createGame(makeRng(seed + attempt * 101));
    state.screen = SCREEN_PLAY;
    const result = runAutopilot(state, skill);
    if (result === wanted) {
      refreshTableInfo(state);
      return { state, screen: wanted };
    }
  }
  // Fallback: the closest run we found (a real game state either way).
  const state = createGame(makeRng(seed));
  state.screen = SCREEN_PLAY;
  runAutopilot(state, skill);
  refreshTableInfo(state);
  return { state, screen: state.screen === SCREEN_PLAY ? SCREEN_PLAY : state.screen };
}
