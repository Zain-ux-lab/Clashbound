# Character mechanics handoff

The accepted scope is repeatable tactical battles, not a story campaign. Mastery, move unlocks and earned crests have been removed. Every move is available immediately; old localStorage progress is left untouched and is not read or written.

Player explanations live in the battle picker, passive dropdowns, full move reference, target picker, character page and `frontend/guide.html`. The catalog reads `/api/roster`; update the static guide whenever balance changes.

## Opening
The first selected character is the locked lead. Compare lead Speed (+3 for lead Veyne), then total base team Speed, then an equal draw only on an exact tie. Speed affects opening only. The API publishes the reason and scores.

## Types
Magic > Elemental > Physical > Spirit > Magic. Strong: 125%; reverse: 80%; equal/opposite: 100%. All non-Physical attacks use Focus/Ward. Coil and lightning moves are Elemental; Ember Beam is Elemental.

## Actions and presentation
`Action(kind,index,target=None)` is shared by engine and bot. `target` selects a living reserve for escort/relief/Ground Fault, or an enemy move slot for Called Shot. `/api/battle/actions` accepts the same strict integer target. Read target options from `moves[].targets`; do not infer them in the browser. The actions array includes target when required.

Snapshots expose `passive`, `passiveState` (recordedSpell, rememberedMove, lastLightUsed, predictedMove, encoreMove, pendingDamage), Speed, availability and blocked reasons. Full descriptions are authoritative player copy. Fourth moves are fixed slot 3; one prior signature stays fixed. Displaced moves remain at pool index 6 and formerly earned moves are ordinary choices at index 7.

Forced switch uses `replacement` plus `forcedSwitch=true`; the displaced player's choice is free and preserves normal turn order. A reserve KO never demands an active replacement. Pending wounds pay after the owner's next normal action, including voluntary switching; new wounds during that action wait until the next. Last Light triggers once per battle, not per entry. Twilight Covenant blocks both active characters' healing, not bench healing.

Animation HP changes include `player`, `slot`, `amount`. Reserve changes must not appear as active-fighter damage. `actorSlot` and `targetSlot` identify original participants when an action changes formation. No new artwork or custom animation assets are required by this change.

## Balance
Numbers are starting playtest values. Bot depth, team randomisation and selection scoring remain unchanged; simulation and evaluation fixtures now include passives. This does not claim competitive balance. Test fixtures under docs/evaluation describe historical mechanics and must not be presented as fresh balance results.

## Verification (14 October 2026)
- 111 pytest checks, 21 Node checks, JavaScript syntax and diff whitespace checks passed.
- Independent review fixes have regression tests for delayed wounds after Seal, switching-move prediction cancellation, stale Reprisal after reserve damage, Drag plus recoil knockout, and invalid action targets.
- Headless Chrome exercised build copy, passive state, target choice, Escape cancellation without spending a turn, rescue switching, the character catalog, the guide and landscape mobile rendering.
- Six seeded team fixtures, both starting positions, versus random and damage-greedy baselines:24 complete matches, none unfinished. These are mechanics smoke checks, not a competitive-balance claim.
