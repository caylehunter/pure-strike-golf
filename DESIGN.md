# Pure Strike — design notes

Working name. Arcade golf for phones: big, satisfying drives, a real handicap underneath, and match play with strokes ("pops") for the higher handicap.

## Guiding rule

**Every objective must be obvious. It doesn't have to be easy, but it has to be obvious.** The player should always be able to see what they are aiming for, and after a miss the game says why (early, late, cancelled).

## Navigation

- **Menu → mode first:** Stroke play or Match play (plus Putting practice). Each opens a setup screen with a Back button; nothing starts until a tee (stroke play) or an opponent (match play) is chosen.
- **Pause button (II)** at the left of the scoreboard during any round: Resume, Quit to menu (the round doesn't post and the match records no result), and in match play **Concede this hole**. A conceded hole is lost and posts net double bogey (or strokes taken + 1, if higher) to the handicap.

## Swing (full shots)

1. **Aim:** drag on the course. The preview shows the flight path and carry, with the ring landing on the aim line even when the shot curves.
2. **Power: hold and release.** Hold Swing; the bar fills. Let go to set power. The red PIN mark shows the power that reaches the pin.
3. **Strike: tap when the rings meet.** A white ring closes on a gold circle in about 1.3 s (blue tees ~1.45 s, nuke ~1.2 s). The gold band's thickness is the perfect window. Early means slice (curves right), late means hook (curves left).

Feedback pops: PURE, A TOUCH EARLY/LATE, SLICE/HOOK (tapped early/late), HOLD TO POWER UP, SWING CANCELLED.

## Nuclear drive (black tees, driver, tee shot only)

- Arm **Nuke**. The power bar extends past the 100% line straight into the **NUKE band**, which is the top of the meter.
- The bar hangs at the top for 80 ms, so the band is one continuous window (~0.2 s at Lv 1).
- Let go in the band, then strike: **NUCLEAR** (~440–450 yd carry). A bad strike gives **MELTDOWN** (early: nuclear slice, late: nuclear hook).
- Let go before the band → TOO EARLY; after it → TOO LATE. Both still hit a normal drive.

### Upgrade levels (earned; see Rewards)

| Upgrade | Lv 1 | Lv 2 | Lv 3 |
|---|---|---|---|
| Nuke target (band width past 100%) | 0.06 | 0.09 | 0.13 |
| Swing tempo (meter + ring speed) | 1.0× | 0.84× | 0.70× |

## Shot shaping

Straight, Draw, Fade, Stinger. Stinger: low flight, less carry, more roll, 35% wind effect. Planned as ball-control rewards from hard courses.

## Putting

- The camera turns so the hole is always straight up; the ball sits in the lower-middle of the screen.
- **Pull down anywhere** and let go. A full pull rolls about **2.2× the distance to the hole + 1.5 yd** (4–25 yd), so short putts get the finest control.
- While pulling, a **gold circle with a feet label** shows where the ball stops **on flat ground**, and a top pill reads `PUTT X FT · HOLE Y FT` (green when within 1 ft). The player reads slope and adjusts.
- Green read options: **Off** (default) or **Slope** (contours plus downhill flow dots). The old "Line" mode was removed because it did the read for the player.
- Physics: stimp-like friction, slope gravity, cup capture with real lip-outs when too firm or off-center.

## The round

Three holes, par 12. Each hole is data (`HOLES` in `index.html`): centerline, fairway width, green, pin, tees, water, bunkers, green slope, and tree clumps.

| Hole | Par | Blue | Black | Character |
|---|---|---|---|---|
| 1 | 3 | 172 | 204 | Forced carry over water to a green that tilts right-to-left |
| 2 | 4 | 389 | 433 | Dogleg right; trees guard the corner; a black-tee nuke can fly them and reach the green |
| 3 | 5 | 556 | 616 | Dogleg left; water right of the nuke landing zone |

- A scorecard follows every hole (birdies circled, bogeys boxed) with **Next hole** / **Quit round**.
- Rough −15%, bunker −30% (sand wedge −8%). Water: +1, drop at the edge. OB: +1, replay. Pick up at 12.
- Wind per hole: blue 0–7 mph, black 4–15 mph.

## Handicap

- Every finished round posts a differential: `(score − rating) × 6`, since 3 holes are a sixth of 18. Ratings: blue 12.0, black 12.8.
- Handicap = average of the best 40% of the last 10 differentials. Until a player has 5 rounds, the list is padded with 36s, so a new player falls gradually (one −1 round: 36.0 → 15.0).
- Shown golf-style: a negative number displays as a plus handicap (better than scratch), and the round summary says so.
- **Provisional, then steady:** the first 5 rounds set the handicap freely (menu shows "provisional, 2 of 5 rounds"). After that, a round counts at most 6 strokes away from the current handicap, so one hot round moves it ~3, not 15. The round summary says when a round was capped.

## Rewards (earned, shown on the menu with how to get each)

| Reward | How |
|---|---|
| Swing tempo Lv 2 | Make a birdie |
| Black tees + nuclear drive | Reach an 18.0 handicap |
| Nuke target Lv 2 | Hit a NUCLEAR drive |
| Draw & Fade | Finish a round from the black tees |
| Swing tempo Lv 3 | Make 10 one-putts |
| Nuke target Lv 3 | Hit 5 NUCLEAR drives |
| Stinger | Reach a 9.0 handicap |

Locked shot shapes are struck through; tapping one says how to unlock it. The menu has a **Testing: unlock everything** switch for playtesting.

## Match play vs. the computer

- **Ladder:** Dusty (28), Marge (14), Ace (4). Dusty is always open; beating an opponent unlocks the next. Records (W–L–H) show on each card.
- **Pops:** a 3-hole match uses a sixth of the 18-hole handicap gap: `round(|myH − oppH| / 6)` strokes to the higher handicap, given by stroke index (hole 2 = 1, hole 1 = 2, hole 3 = 3). Pops show as small dots on the scorecard.
- **The opponent plays each hole first, on the course.** Its score per hole is par + (handicap + 3)/18 (+0.15 from the black tees), since golfers average about 3 over their handicap; the spread is 0.6 + handicap/60 strokes (higher handicaps are less consistent), clamped to par −2 … par +4.
- **Watching the opponent:** the score is turned into shots (full shots along the hole, the last onto the green, then putts) and played out with an orange ball, the camera following. Shots never finish in water or out of bounds; when water crosses the fairway they lay up short. Dusty's shots drift right (his slice). Tap the course to skip. Their drive stays marked with their initial for the rest of the hole.
- **The match bar** under the scoreboard always states the objective: `VS MARGE · 1 UP` / `Marge made par (4) · you get a stroke · 4 wins, 5 halves`. It updates to "5 halves" or "hole lost" as strokes add up.
- Lower net score wins the hole. Status: ALL SQUARE / n UP / n DOWN. The match ends when one side leads by more than the holes left (e.g. 2 & 1); the round continues so the gross score still posts to the handicap.
- Hole cards show the hole result and match status; the final card shows "You won 2 & 1" / "Marge won 1 up" / "Match halved", both totals, and a rematch button.

## Roadmap

1. ~~Repo + design doc + tests.~~
2. ~~The come-back-tomorrow loop: 3-hole round, handicap, earned rewards, black tees unlocked by handicap.~~
3. ~~Match play vs. AI with handicap pops.~~
4. ~~Balance pass and visible opponent shots.~~
5. **Next candidates:** 9-hole course, art/audio pass, playtesting with friends (feedback button).
6. Online match play, app-store packaging.
