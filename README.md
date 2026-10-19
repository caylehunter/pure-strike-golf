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

- `tests/round.js` – a full 3-hole round: scorecard, handicap update, unlocks
- `tests/swing.js` – hold/release swing and strike ring: nuke, meltdown, too early/late, cancel, pure, late hook
- `tests/putting.js` – distance-scaled putting on the practice green
