# Character mastery and the Accord

## Progress through play

- Every character remains available, with its original six move choices.
- Choose three allies. Each earns 1 mastery per qualifying match: play three human actions, or finish a shorter match after at least one human action. Victory and defeat reward equally; free replacements do not count.
- At 3 mastery, a seventh move becomes available in the build picker. Both signatures remain fixed; choose two flexible moves.
- At 6 mastery, equip or remove that character’s named crest. It appears beside the active character’s name; it changes no stats or rules.
- Progress saves in the browser under `clashbound-mastery-v1`. Stable server match IDs prevent repeat rewards on refresh. Failed storage writes preserve this page’s in-memory progress and show a warning, but cannot guarantee a save after closing the page.
- Localhost and the Render URL have separate browser storage. No account, cross-device sync, server ownership verification or anti-cheat is included. The API validates builds; unlock eligibility is a local UI rule.

## Sidegrades

| Character | Unlock | Benefit | Cost compared with a starting option |
|---|---|---|---|
| Mage | Rune Aegis | 45% guard | 6 power vs Arcane Ward’s 12 and 30% guard |
| Sporestag | Bark Lance | Ranged: avoids Thorn Coat contact retaliation | 18 power vs Horn Jab’s 22 |
| Glowmire | Beacon Aegis | 45% guard | 6 power vs Lantern Ward’s 12 and 30% guard |
| Bramblebelly | Briar Aegis | 45% guard | 6 power vs Root Snare’s 12 and 30% guard |
| Veyne | Close Quarters | 26 Physical power vs Steady Shot’s 22 | Contact can trigger retaliation |
| Coil | Live Wire | 28 Magic power vs Spark Bolt’s 23 | Contact can trigger retaliation |
| Bastion | Shield Wall | 45% guard | 6 power vs Shield Bash’s 12 and 30% guard; contact risk remains |
| Vesperfang | Night Flight | Ranged: avoids Thorn Coat contact retaliation | 17 power vs Night Fang’s 21 |
| Hushwing | Razor Gust | Ranged: avoids Thorn Coat contact retaliation | 16 power vs Wing Buffet’s 20 |
| Riftclaw | Rift Dart | Ranged: avoids Thorn Coat contact retaliation | 20 power vs Rift Slash’s 24 |

These are situational options, not stat upgrades. A sidegrade may coexist with its comparison move, especially when that move is a signature, at the cost of another flexible slot. Balance is provisional; review real matches before adjusting numbers.

## Opening initiative and bot variety

The server draws either side with equal probability, independent of teams, mastery or previous outcomes. Human-first starts at full health; bot-first returns the opening state and ordered action frames, then hands control to the player. An opening action does not earn human mastery.

Random bot trios remain disjoint from the human roster, exclude the previous trio in that browser session, and shuffle the lead. Search depth, scoring, stats and starting builds are unchanged. Individual matchups still vary in difficulty; there is no adaptive difficulty boost. Restarting the server resets the previous-trio memory.

## Lore

The Fracture scattered unstable magic across the world. Humans and creatures formed the Accord and now practise containment through friendly arena trials. Teams are alliances, not owners and pets or fixed opposing species. Mage reads runes; Sporestag remembers the forest; Glowmire guides travellers; Bramblebelly guards new growth; Veyne maps crossings; Coil contains storms; Bastion protects both peoples; Vesperfang guards twilight crossings; Hushwing calms minds; Riftclaw learns to close the cracks it travels through.

Arena-changing powers and a larger status-interaction system are future design work, not implemented effects. Existing arena art remains unchanged; the new copy is a narrative foundation, not an art redesign.

## Review and testing

Python tests cover all sidegrade trade-offs, stable match identity, play counters, legal builds, bot starting pools, non-repeating trios and both initiative outcomes. Browser-module tests cover win/loss-independent awards, refresh deduplication, corrupted/blocked saves, stale-tab cosmetic writes and fixed-signature replacements. Existing engine and UI regressions must continue to pass. Browser check: compare and replace a move, play three turns, refresh, start a new match and inspect mastery; later equip an unlocked move and crest.
