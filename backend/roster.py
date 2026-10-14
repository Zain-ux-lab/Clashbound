"""Ten fixed identities. Numbers are initial playtest values, not final balance."""


def attack(name, power, damage_type, *, contact=False, mechanic=''):
    return dict(name=name, power=power, damage_type=damage_type, contact=contact, mechanic=mechanic)


def status(name, mechanic, damage_type='Magic'):
    return dict(name=name, effect='status', mechanic=mechanic, power=10, damage_type=damage_type)


def heal(name, amount):
    return dict(name=name, effect='heal', effect_amount=amount)


def guard(name, damage_type, *, contact=False):
    return dict(name=name, power=12, effect='guard', effect_amount=30, damage_type=damage_type, contact=contact)


ROSTER = [
    dict(id='mage', name='Mage', type='Magic', maxHp=100, art='Mage', moves=[
        attack('Arcane Bolt',22,'Magic'), attack('Staff Strike',20,'Physical',contact=True),
        attack('Spell Echo',15,'Magic',mechanic='echo'), guard('Arcane Ward','Magic')]),
    dict(id='sporestag', name='Sporestag', type='Physical', maxHp=120, art='Sporestag', moves=[
        attack('Horn Jab',22,'Physical',contact=True), status('Spore Cloud','spores','Spirit'),
        attack('Antler Harvest',18,'Spirit',contact=True,mechanic='harvest'), guard('Chitin Shell','Physical',contact=True)]),
    dict(id='glowmire', name='Glowmire', type='Spirit', maxHp=90, art='Glowmire', moves=[
        attack('Ember Beam',23,'Magic'), attack('Soul Siphon',16,'Spirit',mechanic='drain'),
        heal('Lantern Flare',12), status('Revealing Light','expose','Spirit')]),
    dict(id='bramblebelly', name='Bramblebelly', type='Physical', maxHp=120, art='Sporestag', moves=[
        attack('Bramble Bash',24,'Physical',contact=True), guard('Root Snare','Spirit'),
        attack('Thorn Burst',20,'Spirit'), status('Thorn Coat','thorns','Physical')]),
    dict(id='veyne', name='Veyne', type='Physical', maxHp=100, art='Mage', moves=[
        attack('Steady Shot',22,'Physical'), attack('Runic Arrow',20,'Magic'),
        attack('Piercing Volley',18,'Physical',mechanic='exploit'), status('Mark Prey','mark','Physical')]),
    dict(id='coil', name='Coil', type='Magic', maxHp=100, art='Glowmire', moves=[
        attack('Spark Bolt',23,'Magic'), attack('Coil Lash',20,'Physical',contact=True),
        status('Static Lock','paralyse'), status('Voltage Leak','weaken')]),
    dict(id='bastion', name='Bastion', type='Physical', maxHp=120, art='Mage', moves=[
        guard('Shield Bash','Physical',contact=True), attack('Stone Fist',23,'Physical',contact=True),
        attack('Reprisal',14,'Physical',contact=True,mechanic='reprisal'), attack('Rune Pulse',20,'Magic')]),
    dict(id='vesperfang', name='Vesperfang', type='Magic', maxHp=100, art='Sporestag', moves=[
        attack('Dusk Bolt',22,'Magic'), attack('Night Fang',21,'Spirit',contact=True),
        attack('Dread',18,'Magic',mechanic='dread'), status('Terrify','expose')]),
    dict(id='hushwing', name='Hushwing', type='Spirit', maxHp=90, art='Glowmire', moves=[
        attack('Echo Strike',22,'Spirit'), heal('Soft Wing',10),
        attack('Wing Buffet',20,'Physical',contact=True), status('Disorient','confuse','Spirit')]),
    dict(id='riftclaw', name='Riftclaw', type='Spirit', maxHp=100, art='Sporestag', moves=[
        attack('Rift Slash',24,'Spirit',contact=True), attack('Phase Strike',18,'Spirit',contact=True,mechanic='phase'),
        attack('Reality Tear',20,'Magic'), status('Fracture','expose','Spirit')]),
]
# Profiles stay near ten so move power remains readable while roles differ.
# power, focus, armour, ward, recovery
PROFILES = {
    'mage': (8,12,9,11,10), 'sporestag': (11,9,12,9,10),
    'glowmire': (7,11,8,11,10), 'bramblebelly': (11,8,12,9,10),
    'veyne': (12,9,9,9,9), 'coil': (9,12,10,10,8),
    'bastion': (10,8,13,11,8), 'vesperfang': (9,12,9,10,9),
    'hushwing': (8,10,8,12,12), 'riftclaw': (11,11,9,9,8),
}
SIGNATURES = {'mage':[0,2], 'sporestag':[1,2], 'glowmire':[1,2],
              'bramblebelly':[0,3], 'veyne':[2,3], 'coil':[0,2],
              'bastion':[0,2], 'vesperfang':[0,2], 'hushwing':[1,3], 'riftclaw':[0,1]}
ALTERNATIVES = {
    'mage':[status('Sapping Rune','weaken'), attack('Spectral Lance',20,'Spirit')],
    'sporestag':[attack('Chitin Kick',20,'Physical',contact=True), status('Fungal Haze','weaken','Spirit')],
    'glowmire':[attack('Ghost Spark',20,'Spirit'), guard('Lantern Ward','Magic')],
    'bramblebelly':[heal('Second Wind',10), attack('Stone Toss',20,'Physical')],
    'veyne':[status('Disarming Shot','weaken','Physical'), attack('Spirit Arrow',20,'Spirit')],
    'coil':[guard('Magnetic Screen','Magic'), attack('Soul Current',20,'Spirit')],
    'bastion':[heal('Rally',10), status('Crushing Shout','weaken','Physical')],
    'vesperfang':[attack('Shadow Siphon',12,'Spirit',mechanic='drain'), guard('Dusk Mantle','Magic')],
    'hushwing':[status('Unsettling Cry','expose','Spirit'), attack('Moon Spark',20,'Magic')],
    'riftclaw':[guard('Phase Shell','Spirit'), status('Nerve Tear','weaken','Physical')],
}
# Character identity, flavour and move alternatives are separate from progression.
PLAYSTYLES = {
 'mage':'Spell setup: prepare echoes, then pressure with magic. Physical coverage handles resistant targets.',
 'sporestag':'Attrition: seed spores and harvest their damage bonus. Tough armour supports staying in play.',
 'glowmire':'Sustain: drain small amounts of health or spend a turn healing. Fragile against physical pressure.',
 'bramblebelly':'Contact punishment: thorn retaliation and a sturdy body punish close attacks.',
 'veyne':'Precision: mark a target before Piercing Volley. Ranged attacks avoid thorn retaliation.',
 'coil':'Disruption: paralysis and weakening limit enemy plans. Strong magic, modest healing.',
 'bastion':'Counterpressure: guard while attacking, then turn incoming damage into Reprisal.',
 'vesperfang':'Pressure: strong magic backed by Dread and exposure. Spirit coverage changes matchups.',
 'hushwing':'Recovery and confusion: heal efficiently and mark a dangerous enemy move with recoil.',
 'riftclaw':'Guard breaker: Phase Strike bypasses guard. Spirit contact attacks trade safety for power.',
}
LORE = {
 'mage':'An Accord rune-reader who charts the Fracture and teaches allies to control its echoes.',
 'sporestag':'A guardian of the Verdant Ruins whose spores carry the forest’s memory.',
 'glowmire':'A wandering lantern spirit that guides lost travellers through unstable rifts.',
 'bramblebelly':'A grove sentinel who joined the Accord to protect new growth from the Fracture.',
 'veyne':'A frontier scout who maps safe paths between the scattered arenas.',
 'coil':'A storm-channeler who learned to contain volatile energy instead of letting it spread.',
 'bastion':'An Accord shieldbearer sworn to hold the line for humans and creatures alike.',
 'vesperfang':'A twilight dragon who guards the crossings between the old world and the fractured sky.',
 'hushwing':'A moonlit spirit attended by five spirit bats, whose songs settle frightened minds and mislead hostile ones.',
 'riftclaw':'A creature born at a rift’s edge, now learning to close the cracks it once travelled through.',
}
# Every move is available immediately; no mastery or earned cosmetic rewards.
PASSIVES = {
 'mage': ('transcription','Runic Transcription','Remember the last enemy non-Physical damaging spell you witness. Forbidden Script casts it once using your stats. Switching clears it.'),
 'sporestag': ('memory','Forest Memory','After surviving a direct hit, take 25% less damage from that exact move until another move hits you. Switching clears the memory.'),
 'glowmire': ('last_light','Last Light','Survive one otherwise lethal hit at 1 HP per battle. Follow the Lantern heals a reserve and switches to it.'),
 'bramblebelly': ('tangled','Tangled Ground','While active, enemy voluntary switches deal 6 damage to the departing character. Free replacements are safe.'),
 'veyne': ('trailblazer','Trailblazer','Gain +3 opening Speed when leading. Called Shot rewards predicting the exact enemy move; it does not protect you.'),
 'coil': ('conductive','Conductive Arc','Elemental attacks on the active enemy arc 20% of actual HP damage to the first living enemy reserve. Ground Fault does not arc.'),
 'bastion': ('hold_door','Hold the Door','When you voluntarily switch out, protect the incoming ally by at least 20% against its next hit, until after the enemy turn.'),
 'vesperfang': ('covenant','Twilight Covenant','Neither active character can heal while you are active. This also blocks your own healing and drain; reserves can still be healed.'),
 'hushwing': ('rhythm','Lulling Rhythm','The enemy cannot repeat its previous move while you are active. Encore reverses this for one enemy turn. Always leaves a playable action.'),
 'riftclaw': ('out_of_step','Out of Step','Direct hits while active become pending wounds. Pay them after your next action, including switching. Switching cannot erase the wound.'),
}
SPEEDS = dict(mage=8,sporestag=4,glowmire=9,bramblebelly=3,veyne=11,coil=7,bastion=2,vesperfang=6,hushwing=10,riftclaw=12)


def special(name,mechanic):
    return dict(name=name,effect='special',mechanic=mechanic)


FOURTH_MOVES = {
 'mage':special('Forbidden Script','copy'),
 'sporestag':special('Shed the Husk','shed'),
 'glowmire':special('Follow the Lantern','escort'),
 'bramblebelly':attack('Drag Through the Thorns',8,'Physical',contact=True,mechanic='drag'),
 'veyne':special('Called Shot','called_shot'),
 'coil':attack('Ground Fault',14,'Elemental',mechanic='ground_fault'),
 'bastion':special('Relief Guard','relief'),
 'vesperfang':special('Nightfall','nightfall'),
 'hushwing':special('Encore','encore'),
 'riftclaw':special('Seal the Wound','seal'),
}
EXTRA_OPTIONS = {'mage': {'name': 'Rune Aegis',
          'power': 6,
          'effect': 'guard',
          'effect_amount': 45,
          'damage_type': 'Magic'},
 'sporestag': {'name': 'Bark Lance',
               'power': 18,
               'damage_type': 'Physical',
               'contact': False,
               'mechanic': ''},
 'glowmire': {'name': 'Beacon Aegis',
              'power': 6,
              'effect': 'guard',
              'effect_amount': 45,
              'damage_type': 'Magic'},
 'bramblebelly': {'name': 'Briar Aegis',
                  'power': 6,
                  'effect': 'guard',
                  'effect_amount': 45,
                  'damage_type': 'Spirit'},
 'veyne': {'name': 'Close Quarters',
           'power': 26,
           'damage_type': 'Physical',
           'contact': True,
           'mechanic': ''},
 'coil': {'name': 'Live Wire',
          'power': 28,
          'damage_type': 'Magic',
          'contact': True,
          'mechanic': ''},
 'bastion': {'name': 'Shield Wall',
             'power': 6,
             'effect': 'guard',
             'effect_amount': 45,
             'damage_type': 'Physical',
             'contact': True},
 'vesperfang': {'name': 'Night Flight',
                'power': 17,
                'damage_type': 'Spirit',
                'contact': False,
                'mechanic': ''},
 'hushwing': {'name': 'Razor Gust',
              'power': 16,
              'damage_type': 'Physical',
              'contact': False,
              'mechanic': ''},
 'riftclaw': {'name': 'Rift Dart',
              'power': 20,
              'damage_type': 'Spirit',
              'contact': False,
              'mechanic': ''}}

PLAYSTYLES.update({
 'mage':'Read the opponent: borrow a witnessed spell, then cast it with your own Focus.',
 'sporestag':'Adapt to repeated hits; shed conditions when survival matters more than resistance.',
 'glowmire':'Rescue teammates: survive once at 1 HP, then heal a reserve and guide it into battle.',
 'bramblebelly':'Disrupt positions: punish voluntary retreat and force an enemy replacement.',
 'veyne':'Lead quickly, then predict the exact enemy move to land a Called Shot.',
 'coil':'Pressure the whole formation with Elemental arcs or target a reserve directly.',
 'bastion':'Create safe entrances: guard first, then transfer protection to a teammate.',
 'vesperfang':'Deny recovery to both sides and strip away positive effects.',
 'hushwing':'Control the rhythm: prevent repeated moves or demand an Encore.',
 'riftclaw':'See the wound before it lands: attack, retreat, or use a turn to halve the damage.',
})
for character in ROSTER:
    identifier=character['id']
    power,focus,armour,ward,recovery=PROFILES[identifier]
    character['stats']=dict(hp=character['maxHp'],power=power,focus=focus,armour=armour,ward=ward,recovery=recovery,speed=SPEEDS[identifier])
    passive,name,description=PASSIVES[identifier]
    character['passive']=dict(id=passive,name=name,description=description)
    displaced=character['moves'][3]
    character['moves'][3]=FOURTH_MOVES[identifier]
    character['signatureMoves']=[SIGNATURES[identifier][0],3]
    character['playstyle']=PLAYSTYLES[identifier]
    character['lore']=LORE[identifier]
    # Preserve all six old choices; the displaced fourth remains an alternative.
    character['movePool']=character['moves']+ALTERNATIVES[identifier]+[displaced,EXTRA_OPTIONS[identifier]]
    for move in character['movePool']:
        if identifier=='coil' and move.get('damage_type')=='Magic' or move['name']=='Ember Beam':
            move['damage_type']='Elemental'
    if identifier=='coil':
        character['type']='Elemental'
BY_ID = {character['id']: character for character in ROSTER}
