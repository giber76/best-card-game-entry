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
    const state = createGame(makeRng(seed));
    state.screen = SCREEN_PLAY;
    for (let index = 0; index < PLAY_TRICKS; index += 1) {
      if (state.screen !== SCREEN_PLAY) break;
      const card = autopilotCard(state, 'mid');
      if (card === null) break;
      state.playerHand = state.playerHand.filter((held) => held.id !== card.id);
      state.trick = null;
      playTrick(state, card);
    }
    refreshTableInfo(state);
    return { state, screen: SCREEN_PLAY };
  }

  // Win or loss: try seeds in order until one ends that way.
  const wanted = name === 'win' ? SCREEN_WIN : SCREEN_LOSS;
  const skill = name === 'win' ? 'best' : 'worst';
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = createGame(makeRng(seed + attempt * 101));
    state.screen = SCREEN_PLAY;
    const result = runAutopilot(state, skill);
    if (result === wanted) {
      state.trick = null;
      refreshTableInfo(state);
      return { state, screen: wanted };
    }
  }
  // Fallback: the closest run we found (a real game state either way).
  const state = createGame(makeRng(seed));
  state.screen = SCREEN_PLAY;
  runAutopilot(state, skill);
  state.trick = null;
  refreshTableInfo(state);
  return { state, screen: state.screen === SCREEN_PLAY ? SCREEN_PLAY : state.screen };
}
