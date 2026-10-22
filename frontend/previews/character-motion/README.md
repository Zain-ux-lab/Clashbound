# Character animation review mockup

Open `/previews/character-motion/` when running the existing Clashbound server.

For the preview alone, from the repository root:

```sh
python3 -m http.server 8023 --directory frontend/previews/character-motion
```

Then visit http://127.0.0.1:8023/. Choose a character and move; use Repeat, quarter-speed playback, or Hold action pose to review it.

This is an isolated direction mockup for Abi to review. Merging this page does not connect its animation player, artwork, or timing to the battle screen.

## Included

- 10 characters and 80 move studies from the mechanics branch's move-pool snapshot.
- The approved Mage bolt/ward, slower Bramblebelly punch, Bastion counterstrike and Hushwing echoes.
- Character-specific effect shapes and palettes; most actions take 0.7–0.82 seconds.
- Articulated cutout limbs/equipment for contact actions, replacing long whole-sprite slides. Chitin Kick lifts and extends a front leg; Bramble Bash moves an arm; Reprisal moves the shield.
- Existing approved character images and the Drowned Belfry concept environment bundled for a self-contained preview.

## Review limits

Damage, HP and status outcomes are illustrative. This page is not connected to the battle engine. Forbidden Script uses a sample spell; reserve/transfer actions have simplified cues. Cutouts are rough single-joint studies, not finished character rigs; review seams, poses, impact alignment and timing before production integration. The move-pool snapshot is reference data, not a change to the main branch's roster.

## Source files

- `index.html`: controls, playback and earlier approved studies.
- `complete-effects.js`: per-character/move effect choreography.
- `action-poses.js`: limb/equipment masks, pivots and pose timing.
- `motion-data.js` and `motions.json`: matching preview metadata.
- `assets/`: concept sprites and arena; see `assets/SOURCE.md`.
- `kick-pose-review.jpg`: paused kick screenshot.
