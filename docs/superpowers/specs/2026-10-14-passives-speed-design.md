# Character passives, signature moves and Speed

User approved implementation and pushing of the ten character proposals on 14 October 2026. Preserve alternating turns, three locked characters, free knockout replacements, Abi's presentation. No campaign.

User subsequently explicitly removed mastery and earned cosmetics. All moves, including former sidegrades, are available immediately. Browser progress is not read, written or erased. This instruction overrides the earlier progression design.

## Opening and types
First selected character is the locked lead. Lead Speed plus Veyne's 3-point lead bonus decides initiative; tied leads compare the sum of base team Speeds; only exact ties draw equally. Speed never grants extra turns. Speeds: Mage 8, Sporestag 4, Glowmire 9, Bramblebelly 3, Veyne 11, Coil 7, Bastion 2, Vesperfang 6, Hushwing 10, Riftclaw 12. Starting values, not final balance.
Four-type cycle: Magic > Elemental > Physical > Spirit > Magic, 125% strong, 80% reverse, 100% same/opposite. Elemental uses Focus/Ward. Coil becomes Elemental; lightning and Ember Beam become Elemental.

## Passives and fourth moves
- Mage / Runic Transcription: remember the last witnessed non-Physical damaging spell. Forbidden Script casts it with Mage's stats and basic effect, consumes the record; cannot copy a special/copy action or a passive. Records clear on departure.
- Sporestag / Forest Memory: surviving a direct hit grants 25% resistance to that exact move until a different direct hit or departure. Shed the Husk removes negative conditions and memory, heals 8 base HP scaled by Recovery.
- Glowmire / Last Light: survive one otherwise lethal HP loss at 1 HP per battle. Follow the Lantern heals a chosen living reserve for 8 base HP scaled by Glowmire's Recovery, then switches; paralysis blocks it.
- Bramblebelly / Tangled Ground: opposing voluntary departures take 6 damage on the departing character. Drag Through the Thorns: 8-power Physical contact hit, forces a surviving opponent to choose a living reserve. No forced switch if no reserve. Forced replacements do not trigger Tangled Ground.
- Veyne / Trailblazer: +3 opening Speed when leading. Called Shot selects an enemy move and prepares a 32-power ranged Physical shot after that move is used next enemy turn; no protection. Enemy switch or different move wastes it; knockout/departure cancels it.
- Coil / Conductive Arc: Elemental attacks on the active opponent arc 20% of actual direct damage, rounded down, to the lowest-slot living enemy reserve. Ground Fault: 14-power Elemental hit to a chosen enemy reserve, does not arc again.
- Bastion / Hold the Door: voluntary departure protects incoming ally by at least 20% against the next direct hit, expires after the enemy's next normal action. Relief Guard switches to a chosen living ally, transferring existing guard (maximum, never additive). Paralysis blocks it.
- Vesperfang / Twilight Covenant: neither active side can heal while a living Vesperfang is active; bench healing is unaffected. Nightfall strips positive guard/status effects from both active characters, no damage.
- Hushwing / Lulling Rhythm: enemy cannot repeat its previous move consecutively while Hushwing is active. Encore reverses this for the next enemy action: repeat the previous legal move or switch. No restriction may leave zero legal actions; if the previous move is otherwise unusable Encore is unavailable. Switching clears the departing character's previous move and restrictions.
- Riftclaw / Out of Step: direct hits while active accumulate pending wounds instead of immediate HP loss, paid at end of its next normal action including switching. Damage remains on Riftclaw; no clearing by switching or free replacement. Seal the Wound halves (round down) and immediately pays pending damage, no attack. New damage received during its own action is not prematurely settled.

## Integration
Fourth moves replace base slot 3 and are fixed signatures alongside the first previous signature. Retain displaced moves at pool index 6, former earned moves at index 7, and both old alternatives at indices 4 and 5. Eight choices, no mastery gates or cosmetic rewards. Bot uses the same available pool. New target choices are validated by the shared engine and exposed by legal actions. Drag uses an explicit free defender-choice replacement, preserving normal turn order. No full-turn denial or repeated extra turns.
API publishes passive name, explanation, current state, Speed, target options, blocked-action reasons, wounds, copied spells, and explicit initiative reason. UI shows these in selection and battle, offers a target picker, keeps entire explanations readable on touch and keyboard, and publishes an updated guide. No artwork or layout redesign.

## Validation
Exercise all passives, legal/illegal targets, copy restrictions, delayed and simultaneous knockouts, reserve deaths, forced and voluntary switches, healing prevention, guard expiry, Hushwing fallback, tie-breakers, API transaction/revision handling, client target flow, and complete existing Python/Node suites. Existing numerical tests change only where approved mechanics deliberately change their contract. Remove obsolete progression tests and retain build selection, revision and identity checks. Final balance remains provisional.
