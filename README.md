[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/giber76/best-card-game-entry/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/giber76/best-card-game-entry/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

# Ember Court

A duel of four suits — an original card game for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).

You face Rook, Warden of the Ember Court, across a green felt table. Both sides hold five cards from a 36-card deck — four suits (Ember, Tide, Gale, Stone), values 1–9 — and twenty life. Each trick, both sides play one card: the higher card wins and deals damage equal to the margin. A tie doubles the next trick's pot.

Every suit carries a power: **Ember** scorches (+2 damage when its card wins), **Tide** mends (heal 2), **Gale** drafts (draw an extra card), **Stone** shields (block the next 3 damage). Play the same suit twice in a row for a **Surge** (power doubles); play the same suit as Rook for a **Mirror** (both powers cancel). Rook shows its intent before each trick, and its last plays stay on the table — read them, and counter.

## How to play

- **Click a card** (or press 1–9) to play it. **Enter** starts a new duel. **M** toggles sound.
- Reduce Rook to 0 life to win; fall to 0 yourself and the court stays Rook's.
- No network, no build step: `node serve.ts`, then open http://localhost:8080.

## Layout

- `game/` — the playable game as static files (`index.html` + `src/` modules, no libraries)
- `screenshots/` — four real renders of the game's own code (title, table, win, loss)
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
