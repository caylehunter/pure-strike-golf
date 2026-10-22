# Pure Strike

Phone-first arcade golf prototype. See [DESIGN.md](DESIGN.md) for how everything works and why.

## Play

Open `index.html` in a browser (phone-sized window works best), or use the published prototype link.

## Sounds

Recordings live in `sounds/` as mp3 files. After adding or replacing one, run `python3 tools/embed_sounds.py` to embed them in `index.html`.

## Tests

Automated play tests drive the game in headless Chromium:

```sh
npm install
npm test
```

- `tests/warmup.js` – first launch: welcome question, guided warm-up with coach card, gimme, You're ready, starting handicap, testing switch hidden
- `tests/round.js` – a full 3-hole round: scorecard, handicap update, unlocks
- `tests/match.js` – match play: pops, the per-hole target, early finish (2 & 1), ladder unlocks
- `tests/nav.js` – menu flow, Back buttons, pause/resume/quit, conceding a match hole
- `tests/feedback.js` – feedback button placement, empty-note prompt, copy fallback
- `tests/nine.js` – the 9-hole course: holes and par, a full round, scaled handicap and pops, 5 & 4 finish, water drops, opponent shots on every hole
- `tests/fire.js` – PURE streak: "he's starting to feel it" at 3, locked in at 4 (bigger sweet spot), "lost the feel" on a miss
- `tests/viaduct.js` – hole 8: only a pure Stinger fits the arch, CLANG off the wall, the tee cam's verdict, hide/show
- `tests/swing.js` – hold/release swing and strike ring: nuke, meltdown, too early/late, cancel, pure, late hook
- `tests/putting.js` – distance-scaled putting on the practice green
- `tests/puttview.js` – putting view on two phone sizes: the coach card, match bar, putt pill and pop-ups never cover the hole; a full-length putt pull fits on phones and laptops
- `tests/signature.js` – the signature holes: The Cape's safe vs hero line, The Gamble's layup vs pure drive, The Ridge's roll-back putt, warm-up on Short Fuse
- `tests/powerups.js` – Arcade mode and power-ups: earning, the four kinds, two slots, the computer's, and no handicap posting
- `tests/polish.js` – look and sound: swing hum, fire glow, big callout and confetti, Sound/Announcer switches remembered
