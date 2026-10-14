# Character mechanics implementation plan

> Execute inline with tests first; user explicitly requested implementation and pushing.

**Goal:** Implement the approved ten identities, fourth moves, Elemental and opening Speed, explained in the game.
**Architecture:** Extend shared engine data/actions; API and bot use the same validated resolution. Preserve existing presentation; progression removal leaves old browser records untouched.
**Tech Stack:** Python dataclasses/FastAPI, plain JavaScript, pytest and Node tests; no new runtime dependencies.
**Spec:** docs/superpowers/specs/2026-10-14-passives-speed-design.md

## Global constraints
Alternating turns; speed affects opening only; no campaign; reserve selections are explicit and validated; no mastery or earned cosmetics; changes based on character-mastery branch pending in PR 29.

## Review focus
- A pending wound or lethal switch hazard must not disappear on departure or cause an extra enemy turn.
- Forced replacement must preserve the defender's choice and normal turn order, including double knockouts.
- Copy/target/Encore restrictions must reject invalid input without mutating state or removing every legal action.
- API previews, healing prevention and animations must not announce damage on the wrong character.
- Old mastery rewards and displaced move choices remain available; new mechanics must be included in bot simulations.

## Tasks
- [x] 1. Write failing engine/initiative scenarios in tests/test_passives.py. Extend Creature, Move and Action data; implement all ten mechanics in the shared turn engine, targeting and four-type chart. Verify scenarios and legacy engine suite.
- [x] 2. Update backend/roster.py, API target validation, initiative and snapshots. Keep displaced moves and formerly earned choices available without gates. Add API scenarios; verify API/loadout/bot suites.
- [x] 3. Add concise passive explanations, full move details, target picker and lead selection guidance to existing frontend. Update guide and character copy from shared roster data. Test targeted move interactions, keyboard cancellation, initiative and blocked states with Node.
- [ ] 4. Run complete Python/Node checks, play seeded matches through engine and HTTP to exercise every roster and a live browser if tooling allows. Review diff, fix regressions, commit and push feature branch. Create and attach a PR for Abi's review without merging or deploying.

## Execution record
- User explicitly removed mastery, move unlocks and earned cosmetics during implementation. Former reward moves remain ordinary available choices; unused saved progress is left untouched.
- Source checkout has unrelated untracked artwork. Work used an isolated clone in the current writable workspace on feature/character-passives-speed; source checkout untouched.
- Baseline: 85 Python passes and one pre-existing random bot-reply assertion failure; 29 Node passes. The test fixed only part of the roster RNG and assumed every reply attacked. Seeded both roster draws and made the reply assertion accept legal switching/special actions.
- Engine/API targeted tests were run RED before implementing missing passives, targets and Speed. New damage-type expectations intentionally replace the old three-type cycle.
- Independent read-only review found five issues: new wounds paid during Seal; Called Shot firing on an escort's incoming ally; stale Reprisal after reserve attacks; forced Drag lost on recoil KO; non-move targets raising500. Each reproduced in a failing regression and was fixed. Nightfall/Called Shot cancellation also has a regression.
- Complete verification after review fixes: 111 Python tests and21 Node tests pass; seeded full-match evaluation and live browser target/cancellation/catalog/guide/landscape checks pass. Details and final totals in docs/CHARACTER_MECHANICS.md.
