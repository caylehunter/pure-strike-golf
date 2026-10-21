# Pure Strike — design notes

Working name. Arcade golf for phones: big, satisfying drives, a real handicap underneath, and match play with strokes ("pops") for the higher handicap.

## Guiding rule

**Every objective must be obvious. It doesn't have to be easy, but it has to be obvious.** The player should always be able to see what they are aiming for, and after a miss the game says why (early, late, cancelled).

## First-time players

- **Welcome (first launch only):** "Have you played golf before?" Never → starting handicap 36; A little → 24; I'm a golfer → enter a real handicap (−5 to 36). Until 5 rounds are posted, the handicap is averaged with this starting number instead of 36. "Skip, go to the menu" is always there.
- **Guided warm-up** on Short Fuse (par 4, blue tees, no wind): a coach card says the one thing to do now (hold the yellow button → let go at the AIM/PIN mark → tap when the rings meet → the approach → putting). The yellow button pulses when it's time to press it; pop-ups move below the card.
- **Forgiving on purpose:** 20% slower meter and ring, a bigger sweet spot (0.09), misses curve 60% less, and putts inside 3 feet are conceded ("GIMME").
- **"You're ready!"** lists what they did (first PURE, first putt) and offers **Play 3 holes** or the menu. The warm-up never posts to the handicap.
- Replay it any time from the menu: **How to play (60-second warm-up)**.
- **Testing: unlock everything** shows only for the owner, on a link ending in `#testing`, or if it's already switched on.

## Navigation

- **Menu → mode first:** Stroke play or Match play (plus Putting practice). Each opens a setup screen with a Back button; nothing starts until a tee (stroke play) or an opponent (match play) is chosen.
- **Pause button (II)** at the left of the scoreboard during any round: Resume, Quit to menu (the round doesn't post and the match records no result), and in match play **Concede this hole**. A conceded hole is lost and posts net double bogey (or strokes taken + 1, if higher) to the handicap.

## Playtest feedback

- A big blue **Send feedback** button is pinned to the bottom of the menu. It opens a screen with quick tags (Loved it, Confusing, Too hard, Too easy, Bug, Idea), a note, and an optional name.
- Notes are saved in the artifact's store at `feedback/<viewer id>` (each person writes only their own; only the owner can read them all), with handicap, rounds and match records attached.
- Only viewers allowed to edit (the owner, or friends invited by email as Editors) can save. Anyone else gets **Copy my feedback**, which puts the note on the clipboard to text to the owner.

## Swing (full shots)

1. **Aim:** drag on the course. The preview shows the flight path and carry, with the ring landing on the aim line even when the shot curves.
2. **Power: hold and release.** Hold Swing; the bar fills. Let go to set power. The red PIN mark shows the power that reaches the pin.
3. **Strike: tap when the rings meet.** A white ring closes on a gold circle in about 1.3 s (blue tees ~1.45 s, nuke ~1.2 s). The gold band's thickness is the perfect window. Early means slice (curves right), late means hook (curves left).

Feedback pops: PURE, A TOUCH EARLY/LATE, SLICE/HOOK (tapped early/late), HOLD TO POWER UP, SWING CANCELLED.

## The Viaduct and the tee cam

- A viaduct crosses hole 8 at 100 yards (55 from the blue tees, 100 from the black). It is too tall to fly over; one arch is **6 yards wide and 12 high**.
- A normal drive reaches the wall about 20 yards high (30 from the black tees): **CLANG**, the ball bounces back. A pure Stinger crosses at about 7 (blue) or 10 (black) yards. A mishit Stinger **balloons** (apex × 1 + 1.2 × error), so the black tees need a pure strike; the blue tees forgive a touch.
- On a hole with a bridge, Stinger is available to everyone (even before it's unlocked), selected on the tee, and the aim lines up through the arch.
- **Tee cam:** while the ball is short of the viaduct, a panel at the top shows a behind-the-ball view (sky, tree line, the viaduct and arch in perspective) with the planned flight drawn into it, and says "Fits the arch" or "Too high for the arch" before the swing. During the shot the ball flies through it live. **Hide tee cam** turns it off. In a match the panel sits below the match bar so neither covers the other.
- Bridges are hole data (`bridge: { y, x, halfW, h }`), so more holes like this are easy to add.

## Heating up and on fire (NBA Jam heat)

- Consecutive PURE full swings build a streak across holes; putts neither add to it nor break it. A badge above the controls shows it: `Pure ×2`.
- **3 in a row → HEATING UP!** A glow around the ball.
- **4 in a row → ON FIRE!** Flame trail and embers, a perfect window 60% wider, and 5% more carry, until a swing isn't pure ("FIRE'S OUT"). Every round starts cold.

## Nuclear drive (black tees, driver, tee shot only)

- Arm **Nuke**. The power bar extends past the 100% line straight into the **NUKE band**, which is the top of the meter.
- The bar hangs at the top for 80 ms, so the band is one continuous window (~0.2 s at Lv 1).
- Let go in the band, then strike: **NUCLEAR** (~440–450 yd carry). A bad strike gives **MELTDOWN** (early: nuclear slice, late: nuclear hook).
- Let go before the band → TOO EARLY; after it → TOO LATE. Both still hit a normal drive.
- **Know the number before you swing.** The Nuke button shows the nuke carry (e.g. "Nuke 437"), and once armed the band says NUKE 437. Unarmed, the meter shows the club's full-power carry just past the 100% line, and the aim mark reads AIM/PIN plus its yardage. A pure strike goes the full number, so on short holes dial power back (or don't arm) instead of expecting the game to hold it.

### Upgrade levels (earned; see Rewards)

| Upgrade | Lv 1 | Lv 2 | Lv 3 |
|---|---|---|---|
| Nuke target (band width past 100%) | 0.06 | 0.09 | 0.13 |
| Swing tempo (meter + ring speed) | 1.0× | 0.84× | 0.70× |

## Look and sound

Big moments should feel like NBA Jam: loud, quick, and never in the way of the next swing.

- **Callouts** (PURE, NUCLEAR, BIRDIE, …) slam in big and tilted, then settle and float off. NUCLEAR, birdie-or-better and HEATING UP get a spinning starburst behind them.
- **Swing hum:** holding the swing plays a tone that rises with power and buzzes inside the nuke band, so you can hear where the bar is. It stops when you let go.
- **Crowd:** roars for a nuke, a holed shot, a birdie or a putt over 20 ft ("drained it"); claps politely for a par; says "ooh" for an approach stuffed inside 12 ft (STUFFED IT); groans at a lip-out, a splash, a CLANG off the viaduct, or when the fire goes out.
- **Announcer:** the phone's own voice calls the biggest moments: "Nuclear!", "You're heating up!", "You're on fire!", "Birdie!", "Drained it!", "Slam dunk!", "That's the match!". At most one call every 0.7 s.
- **Fire glow:** the screen edge glows orange while heating up and flickers while on fire.
- **Trails and rings:** a pure shot leaves a gold trail and a small white ring at the ball; a nuke gets a shock ring at launch and another on landing.
- **CLANG** off the viaduct is a metal ring with a white flash.
- **Match:** a chime when you win a hole, a low two-note sound when you lose one; winning the match gets a fanfare, the crowd, applause and confetti; losing gets a sad trombone.
- **Confetti** for birdie or better, any holed shot from off the green, and winning a match.
- **Switches:** Sound and Announcer on the pause screen, remembered. Turning Sound off silences everything, including the announcer.
- Reduced-motion settings soften the shake, flashes, slams and confetti.

## Shot shaping

Straight, Draw, Fade, Stinger. Stinger: low flight, less carry, more roll, 35% wind effect. Planned as ball-control rewards from hard courses.

## Putting

- The camera turns so the hole is always straight up; the ball sits in the lower-middle of the screen.
- **Pull down anywhere** and let go. A full pull rolls about **2.2× the distance to the hole + 1.5 yd** (4–25 yd), so short putts get the finest control.
- While pulling, a **gold circle with a feet label** shows where the ball stops **on flat ground**, and a top pill reads `PUTT X FT · HOLE Y FT` (green when within 1 ft). The player reads slope and adjusts.
- Green read options: **Slope** (default: contours plus downhill flow dots) or **Off**. The old "Line" mode was removed because it did the read for the player.
- Physics: stimp-like friction, slope gravity, cup capture with real lip-outs when too firm or off-center.

## The course: Pure Strike Links

Nine holes, par 36. A round plays **all 9 (default, about 20 minutes) or the first 3 (about 7 minutes)**, chosen on the stroke play and match play setup screens and remembered on the device. Each hole is data (`ALL_HOLES` in `index.html`): name, par, stroke-index rank, centerline, fairway width, green, pin, tees, water, bunkers, green slope, and tree clumps.

| Hole | Name | Par | Blue | Black | Rank | Character |
|---|---|---|---|---|---|---|
| 1 | Pond Carry | 3 | 172 | 204 | 6 | Forced carry over water to a green that tilts right-to-left |
| 2 | Corner Trees | 4 | 389 | 433 | 1 | Dogleg right; trees guard the corner; a nuke can fly them and reach the green |
| 3 | Big Bend | 5 | 556 | 616 | 7 | Dogleg left; water right of the nuke landing zone |
| 4 | Short Fuse | 4 | 335 | 405 | 9 | A pure blue-tee drive finishes near the green; a black-tee nuke flies it |
| 5 | The Moat | 3 | 140 | 162 | 8 | Island green |
| 6 | Long Haul | 5 | 580 | 655 | 3 | A creek crosses at 480; only a nuke gets home in two |
| 7 | The Ravine | 3 | 196 | 231 | 4 | Long carry over a ravine of water |
| 8 | The Viaduct | 4 | 385 | 430 | 2 | A stone viaduct crosses in front of the tee; only a pure Stinger fits through its arch. Then a dogleg left with trees at the corner |
| 9 | Home Stretch | 5 | 524 | 589 | 5 | Lake down the right of the second shot and green |

- Stroke index (who gets pops first) is the rank order of the holes in the round, so a 3-hole round still ranks 1–3.
- A scorecard follows every hole (birdies circled, bogeys boxed) with **Next hole** / **Quit round**.
- Rough −15%, bunker −30% (sand wedge −8%). OB: +1, replay. Pick up at 12.
- **Water:** +1. The drop is beside the water when dry land is within about 15 yards; across the hole or around the island green it is behind the water, on the line back toward the tee.
- Wind per hole: blue 0–7 mph, black 4–15 mph.

## Handicap

- Every finished round posts a differential: `(score − rating) × 18 / holes` (× 6 for 3 holes, × 2 for 9). Rating = par, plus 0.8 per 3 holes from the black tees.
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
- **Pops:** the handicap gap scaled to the match length: `round(|myH − oppH| × holes / 18)` strokes to the higher handicap (a sixth over 3 holes, half over 9), spread by stroke index, one per hole before any hole gets a second. The scorecard shows them in their own row.
- **Opponent scoring:** its score per hole is par + (handicap + 3)/18 (+0.15 from the black tees), since golfers average about 3 over their handicap; the spread is 0.6 + handicap/60 strokes (higher handicaps are less consistent), clamped to par −2 … par +4.
- **Alternating shots, by the rules of golf:** the hole is played shot for shot. On the tee the **honor** goes first: a coin toss on hole 1, then the winner of the previous hole (a halve keeps the honor). After that, **whoever is farther from the hole plays next**, so a duffed shot that leaves you behind means you hit again. Once one player is in the hole, the other plays out.
- **The opponent's shots** come from its hole score, turned into shots (full shots along the hole, the last onto the green, then putts) and played one at a time with an orange ball while the camera follows. Their ball stays on the course between shots, tagged with their initial. Shots never finish in water or out of bounds (they lay up short of a pond); Dusty's drift right (his slice). Tap the course to skip a shot.
- **Match bar while they're still playing:** `Dusty: 2 shots, 14 ft away · you get a stroke · you're away`. Once they hole out it switches to the target: `Dusty made par (4) · 4 wins, 5 halves`.
- Lower net score wins the hole. Status: ALL SQUARE / n UP / n DOWN.
- **A match ends the moment one side leads by more holes than are left,** and the trailing side concedes: 2 up with 1 to play is "2 & 1"; over nine holes, 5 up with 4 to play is "5 & 4". This works both ways. The round still posts: unplayed holes count as **net par** (par plus the player's pops there), shown faded on the card.
- Hole cards show the hole result and match status; the final card shows "You won 2 & 1" / "Marge won 1 up" / "Match halved", both totals, and a rematch button.

## Online match play vs. friends (planned)

Asynchronous: each player plays **a whole hole per turn**, unlike the shot-for-shot match against the computer.

1. Hole 1: a coin toss picks who goes first. That player plays the entire hole; the friend gets a notification ("Cayle made par on hole 1 · your turn").
2. The second player sees a quick replay of the first player's hole, then plays it with the target in the match bar ("4 wins, 5 halves").
3. Each later hole: the honor (last hole's winner; a halve keeps it) plays first, so a hole winner often plays two holes back to back.

Needs: a server and accounts (matches, whose turn), push notifications (installed app or web app), turn timers (e.g. 24 h, then the hole is conceded), and server-side score checks (record each shot's inputs and replay them rather than trusting the phone).

## Ideas from playtesters (planned)

- **Real-time weather:** the host shares approximate location; the match uses the local wind (and maybe rain for softer greens, cold for shorter carry). Needs the app and a weather service, so it comes with online play.
- **Power-ups** beyond on fire: earned through play (streaks, challenges, rewards), never sold. Only cosmetics are for sale (flame colors, ball trails, trophy styles). In friend matches both players have the same access.
- **Chat in online matches** (trash talk is part of golf): quick taunts plus free text between friends, a profanity filter players can switch off for their own matches, and block, mute and report (app stores require these).

## Business model and tournaments (planned, after online play)

**Free:** the whole game, stroke play, the computer ladder, and one-on-one matches against a friend.

**Paid, charged to the organizer only:**
- **$0.99 per tournament** (4 or more players, match play, one winner).
- **$9.99 per year for unlimited tournaments.**

**Tournaments**
- The organizer names the tournament and invites players.
- Format: **match-play bracket** (4, 8 or 16 players; byes when the field isn't full).
- **Match length is chosen by whoever creates the match or tournament: 3 or 9 holes, the same for everyone.** Online turns are one hole each, so a 9-hole match is nine short sessions, not one long one.
- Handicaps and pops apply in every match, so mixed skill levels stay competitive.

**Trophies and the trophy case**
- Trophies use the default designs to start. Later option: the organizer uploads their own image onto a trophy (uploads need a basic check for inappropriate images). No generated trophy art for now.
- Every player has a profile with a **trophy case** showing the trophies they have won.

**New players invited to a match or tournament**

The first game has to be simple and fun, or the game won't catch on.
1. **One question:** "Have you played golf before?" Never → Rookie (a high starting handicap, plenty of strokes); A bit → a middle starting handicap; I'm a golfer → enter a real handicap, converted to the game's scale.
2. **A 60-second guided warm-up hole** that can't go badly: on-screen prompts for hold, let go, and tap when the rings meet; it celebrates the first good strike and first putt, then hands over to the match. The result also fine-tunes the starting handicap.
3. **Provisional handicap ("P")** shown next to their number until it settles. It updates after every match (stops sandbagging), and strokes for provisional players are capped (at most one per hole).

**Things to keep in mind when building**
- App stores take 15–30% of digital purchases, and on iPhone they generally must go through Apple's in-app purchase: $0.99 nets about $0.70–0.84.
- Depends on online play: accounts, a server, notifications and turn timers (see the online section above).

## Roadmap

1. ~~Repo + design doc + tests.~~
2. ~~The come-back-tomorrow loop: 3-hole round, handicap, earned rewards, black tees unlocked by handicap.~~
3. ~~Match play vs. AI with handicap pops.~~
4. ~~Balance pass and visible opponent shots.~~
5. ~~9-hole course.~~
   ~~Heating up / on fire; guided warm-up for new players.~~
   **Next candidates:** art/audio pass, plan for the real app (online one-on-one matches).
6. Online match play, app-store packaging.
7. Paid tournaments, custom trophies, and the trophy case.
