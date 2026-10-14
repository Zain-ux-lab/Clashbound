"""Visible conditions, measured in their holder's normal actions."""
from dataclasses import dataclass


@dataclass
class Status:
    turns: int
    slot: int | None = None


DURATIONS = {'spores': 2, 'thorns': 1, 'mark': 2, 'paralyse': 1,
             'confuse': 2, 'weaken': 2, 'expose': 2, 'echo': 1}

DESCRIPTIONS = {
    'echo': 'Deal 10 delayed damage after your next action; either character switching cancels it.',
    'spores': 'For two actions, damaging moves cause 6 recoil. Switching clears it.',
    'drain': 'Recover direct HP damage × Recovery / 40, rounded down, up to 4 HP and missing HP (25% at Recovery 10).',
    'thorns': 'Reflect 14 damage from contact hits until after your next action.',
    'mark': 'Mark for two actions. Piercing Volley consumes the mark for +18 damage.',
    'exploit': 'Consume a mark for +18 damage.',
    'paralyse': 'Prevent voluntary switching for one action. Moves remain usable.',
    'reprisal': 'Add half the direct damage received last enemy action, capped at 15.',
    'dread': 'If the target starts below half HP, weaken its next attack by 25%.',
    'confuse': 'For two actions, the marked strongest attack causes 8 recoil.',
    'phase': 'Ignore and consume guard. Type resistance still applies.',
    'harvest': 'Consume spores for +10 damage, ending their ongoing pressure.',
    'weaken': 'Next damaging move deals 25% less damage; expires after two actions.',
    'expose': 'Next direct hit deals 25% more damage; expires after two actions.',
}

DESCRIPTIONS.update({
 'copy':'Cast your recorded enemy spell once, using your own stats. Unavailable until you witness a damaging non-Physical spell. Copies no passive.',
 'shed':'Remove negative conditions and Forest Memory, then restore up to 8 HP scaled by Recovery. Uses your turn.',
 'escort':'Choose a living reserve: heal it for up to 8 HP scaled by your Recovery, then switch to it. Uses your whole turn; paralysis blocks it.',
 'drag':'Deal a light hit, then force the opponent to choose a living reserve for free. Their normal turn is preserved. No replacement if no reserves remain.',
 'called_shot':'Predict one enemy move. After that exact move is used next enemy turn, fire a 32-power Physical shot. No protection; another move or a switch wastes the shot.',
 'ground_fault':'Choose a living enemy reserve and strike it with 14 Elemental power. Does not hit the active enemy or trigger Conductive Arc.',
 'relief':'Choose a living reserve and switch to it, transferring your guard (at least 20%). Never stacks; expires after the enemy turn. Paralysis blocks it.',
 'nightfall':'Remove guard, Thorn Coat, prepared Spell Echo and Called Shot from both active characters. No damage; does not remove negative conditions.',
 'encore':'For the next enemy turn, require their previous available move or a switch. Unavailable until they have a usable previous move. Never removes every legal action.',
 'seal':'Halve your pending wound (round down), then immediately take the remaining damage. Uses your turn; unavailable with no pending damage.',
})
