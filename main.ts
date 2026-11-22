// Ember Court — the hand-in program (Node 22, standard library only). The game
// is this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library, no network request).
// This program copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. It runs twice in the grader and must write the
// same bytes both times, so it only copies and writes — it never deletes,
// renames or reorders anything.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps, as the kit's gate states them: at most 4 screenshots,
// each at most 256 KiB; game/ at most 993 files and 48 MiB in all; no path
// under game/ over 1000 bytes. game/ counts beside /output's own cap of
// 1000 entries and 64 MiB, which game/, screenshots/ and dossier.json share,
// so the game is kept small enough to leave them room.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
