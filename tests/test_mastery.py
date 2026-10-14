from fastapi.testclient import TestClient
from backend.main import app
from backend.roster import ROSTER
from backend.engine.moves import Move


def test_every_character_keeps_six_starting_choices_and_gains_a_documented_sidegrade():
    for c in ROSTER:
        assert len(c['moves']) == 4 and len(c['movePool']) == 7
        assert c['movePool'][:4] == c['moves']
        assert c['playstyle'] and c['mastery']['tradeoff'] and c['mastery']['cosmetic']
        assert c['mastery']['moveAt'] == 3 and c['mastery']['cosmeticAt'] == 6
        for move in c['movePool']:
            Move(**move)
        extra = c['movePool'][6]
        baseline = c['movePool'][c['mastery']['compareTo']]
        if extra.get('effect') == 'guard':
            assert extra['power'] < baseline['power']
            assert extra['effect_amount'] > baseline['effect_amount']
        else:
            assert extra['damage_type'] == baseline['damage_type']
            assert (extra['power'] > baseline['power'] and extra['contact'] and not baseline['contact']) or (extra['power'] < baseline['power'] and not extra['contact'] and baseline['contact'])


def test_match_identity_and_play_counter_survive_refresh_and_reset():
    with TestClient(app) as client:
        s=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()['state']
        assert s['humanActions']==0 and s['matchId']
        result=client.post('/api/battle/actions',json={'kind':'move','index':0,'revision':s['revision']}).json()['state']
        assert result['humanActions']==1 and result['matchId']==s['matchId']
        assert client.get('/api/battle').json()['state']['humanActions']==1
        new=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()['state']
        assert new['matchId']!=s['matchId'] and new['humanActions']==0
        assert {c['id'] for c in new['teams'][1]}!={c['id'] for c in s['teams'][1]}


def test_sidegrade_loadout_is_valid_but_bot_stays_on_starting_pool():
    with TestClient(app) as client:
        result=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire'],'loadouts':{'mage':[0,2,1,6]}})
        assert result.status_code==200
        s=result.json()['state']
        assert s['teams'][0][0]['moves'][-1]['name']==ROSTER[0]['movePool'][6]['name']
        for enemy in s['teams'][1]:
            info=next(c for c in ROSTER if c['id']==enemy['id'])
            assert all(m['name']!=info['movePool'][6]['name'] for m in enemy['moves'])


def test_free_replacements_do_not_earn_extra_mastery_actions():
    from backend.api.routes import Match,_advance
    from backend.bot.adapter import Action
    from backend.engine.creature import Creature
    from backend.engine.turn_engine import BattleState
    hit=Move('Test hit',20,damage_type='Physical')
    fallen=Creature('Mage',100,10,10,(hit,),current_hp=0)
    reserve=Creature('Sporestag',120,10,10,(hit,))
    enemy=Creature('Coil',100,10,10,(hit,))
    # Construct with living reserves, then reproduce a knockout awaiting replacement.
    battle=BattleState([reserve,fallen],[enemy]);battle.active_indices[0]=1;battle.replacement_required=0
    match=Match(battle,[['sporestag','mage'],['coil']],human_actions=2)
    frame=_advance(match,Action('replace',0))
    assert frame['humanActions']==2 and frame['turn']==1
