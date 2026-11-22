// Ember Court — configuration: every tunable number and colour in one place.
// Nothing here is read from the network; the whole game is static files.

// Canvas the game draws into (the page scales it to the window).
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

// The duel.
export const START_LIFE = 20;
export const HAND_SIZE = 5;
export const DECK_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const WIN_SCORE_TRICK = 10;
export const WIN_SCORE_LIFE = 5;

// Card layout on the table.
export const CARD_WIDTH = 110;
export const CARD_HEIGHT = 154;
export const CARD_RADIUS = 12;
export const HAND_GAP = 16;
export const OPPONENT_CARD_WIDTH = 76;
export const OPPONENT_CARD_HEIGHT = 106;

// Table colours.
export const FELT_DARK = '#0d3b26';
export const FELT_MID = '#14663f';
export const FELT_LIGHT = '#1d7a4c';
export const FELT_EDGE = '#0a2e1e';
export const GOLD = '#e8b64c';
export const GOLD_DARK = '#9a7418';
export const IVORY = '#f7f1de';
export const INK = '#1c2430';
export const MUTED = '#8fa89b';

// Animation timings (milliseconds). Screenshots skip animation entirely.
export const ANIM_DEAL_MS = 420;
export const ANIM_PLAY_MS = 320;
export const ANIM_FLIP_MS = 260;
export const ANIM_BANNER_MS = 1100;
export const ANIM_FLOAT_MS = 900;
