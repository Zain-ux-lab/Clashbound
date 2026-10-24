from copy import deepcopy
import pytest

from backend.api.routes import _battle_move_view, _snapshot, Match
from backend.engine.creature import Creature
from backend.engine.moves import Move
from backend.engine.status_effects import Status
from backend.engine.turn_engine import BattleState, resolve_turn
from backend.bot.adapter import legal_actions
from backend.roster import ROSTER


def make(c):
    return Creature(c['name'],c['maxHp'],10,10,tuple(Move(**m) for m in c['moves']),
                    battle_type=c['type'],passive=c['passive']['id'],speed=c['stats']['speed'])


@pytest.mark.parametrize('definition',ROSTER,ids=lambda c:c['id'])
def test_every_legal_move_preview_matches_actual_hp_and_delayed_damage(definition):
    for kind in ('Magic','Physical','Spirit','Elemental'):
        actor=make(definition);actor.current_hp=60
        actor.statuses={'spores':Status(2),'weaken':Status(2),'echo':Status(1)}
        actor.recorded_spell=Move('Borrowed',20,damage_type='Magic')
        actor.pending_damage=8 if actor.passive=='out_of_step' else 0
        enemy=Creature('Target',100,10,10,(Move('Hit',20),),current_hp=80,guard_percent=50,battle_type=kind)
        enemy.last_move='Hit'
        enemy.statuses={'mark':Status(2),'spores':Status(2),'expose':Status(2),'thorns':Status(1)}
        ally=Creature('Ally',100,10,10,(Move('Hit',20),),current_hp=50)
        reserve=Creature('Reserve',100,10,10,(Move('Hit',20),),current_hp=50)
        s=BattleState([actor,ally],[enemy,reserve])
        before=deepcopy(s)
        for action in legal_actions(s):
            if action.kind!='move':continue
            preview=_battle_move_view(s,0,action.index)
            # Target choices share a move description; compare the first advertised choice.
            if action.target is not None and action.target!=preview['targets'][0]['index']:continue
            after=deepcopy(s)
            move=after.team_one[0].moves[action.index]
            owner,slot=(1,0)
            if move.mechanic=='ground_fault':slot=action.target
            if move.mechanic in {'escort','relief'}:owner,slot=0,action.target
            old=s.team(owner)[slot]
            result=resolve_turn(after,move,action.target)
            new=after.team(owner)[slot]
            expected=max(0,old.current_hp-new.current_hp)
            if move.effect=='heal':expected=result.healed
            assert preview['amount']==expected,(definition['id'],move.name,kind)
            assert preview['delayedDamage']==max(0,new.pending_damage-old.pending_damage)
            assert preview['description']
        assert s==before,'Previewing and enumerating actions cannot mutate the battle.'


def test_effects_are_visible_and_paralysis_removes_voluntary_switch_and_copy_is_unavailable():
    teams=[[make(c) for c in ROSTER[:3]],[make(c) for c in ROSTER[3:6]]]
    state=BattleState(*teams);state.active_creature(0).statuses['paralyse']=Status(1)
    match=Match(state,[[c['id'] for c in ROSTER[:3]],[c['id'] for c in ROSTER[3:6]]])
    snapshot=_snapshot(match)
    assert len(snapshot['actions'])==3
    assert all(a['kind']=='move' for a in snapshot['actions'])
    assert snapshot['teams'][0][0]['statuses'][0]['turnsRemaining']==1
    assert snapshot['teams'][0][0]['switchBlockedReason']
    assert snapshot['teams'][0][0]['moves'][3]['available'] is False
