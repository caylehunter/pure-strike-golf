# Pure Strike

Phone-first arcade golf prototype. See [DESIGN.md](DESIGN.md) for how everything works and why.

## Play

Open `index.html` in a browser (phone-sized window works best), or use the published prototype link.

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
- `tests/fire.js` – PURE streak: heating up at 3, on fire at 4 (bigger sweet spot), fire's out on a miss
- `tests/swing.js` – hold/release swing and strike ring: nuke, meltdown, too early/late, cancel, pure, late hook
- `tests/putting.js` – distance-scaled putting on the practice green
