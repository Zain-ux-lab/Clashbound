"""Approved identities: behavior checks through the shared battle engine."""
from copy import deepcopy

import pytest

from backend.engine.creature import Creature
from backend.engine.moves import Move
from backend.engine.turn_engine import BattleState, resolve_turn, switch_active, replace_knocked_out
from backend.bot.adapter import Action, legal_actions, simulate

HIT = Move('Hit',20,damage_type='Physical')
SPELL = Move('Fire',20,damage_type='Elemental')
REST = Move('Rest',effect='heal',effect_amount=10)


def special(name, mechanic):
    return Move(name,effect='special',mechanic=mechanic)


def character(name, passive='', moves=(HIT,REST), **kw):
    return Creature(name,100,10,10,moves,passive=passive,**kw)


def battle(actor, enemy=None):
    return BattleState([actor,character('Ally')],[enemy or character('Enemy'),character('Reserve')])


def act(state, move=0, target=None):
    resolve_turn(state,state.active_creature(state.current_player).moves[move],target)


def test_mage_copies_a_witnessed_spell_with_own_stats_consumes_record_and_never_passive():
    copy=special('Forbidden Script','copy')
    mage=character('Mage','transcription',(HIT,copy),focus=15)
    s=battle(mage,character('Enemy',moves=(SPELL,HIT)))
    s.current_player=1;act(s)
    assert mage.recorded_spell==SPELL
    before=s.active_creature(1).current_hp
    act(s,1)
    assert before-s.active_creature(1).current_hp==30
    assert mage.recorded_spell is None
    assert not any(a.kind=='move' and a.index==1 for a in legal_actions(s) if s.current_player==0)


def test_sporestag_remembers_only_last_move_and_shedding_clears_memory_and_debuffs():
    shed=special('Shed','shed')
    stag=character('Stag','memory',(REST,shed))
    s=battle(stag);s.current_player=1
    act(s);assert stag.current_hp==80
    act(s);act(s);assert stag.current_hp==75 # Rest +10, repeated hit reduced to 15
    from backend.engine.status_effects import Status
    stag.statuses['weaken']=Status(2)
    act(s,1)
    assert stag.memory_move is None and 'weaken' not in stag.statuses
    assert stag.current_hp==83


def test_last_light_only_once_and_follow_lantern_heals_and_switches():
    follow=special('Follow','escort')
    glow=character('Glow','last_light',(HIT,follow),current_hp=5)
    s=battle(glow);s.team_one[1].current_hp=50;s.current_player=1
    act(s);assert glow.current_hp==1 and glow.last_light_used
    act(s,1,1);assert s.active_indices[0]==1 and s.team_one[1].current_hp==58
    s.current_player=0;switch_active(s,0);act(s)
    assert glow.current_hp==0


def test_brambles_hurt_voluntary_departure_not_free_replacement_and_drag_is_defender_choice():
    drag=Move('Drag',8,damage_type='Physical',mechanic='drag',contact=True)
    s=battle(character('Bramble','tangled',(drag,)))
    s.current_player=1;switch_active(s,1)
    assert s.team_two[0].current_hp==94
    act(s)
    assert s.replacement_required==1 and s.active_indices[1]==1
    before=s.current_player;replace_knocked_out(s,0)
    assert s.current_player==before and s.team_two[1].current_hp==92


def test_called_shot_fires_after_named_move_and_expires_on_other_action():
    called=special('Called Shot','called_shot')
    v=character('Scout','trailblazer',(HIT,called))
    s=battle(v)
    act(s,1,0);act(s)
    assert v.current_hp==80 and s.team_two[0].current_hp==68
    act(s,1,0);act(s,1)
    assert v.called_move is None and s.team_two[0].current_hp==78


def test_coil_arcs_to_one_reserve_and_ground_fault_targets_reserve_without_double_arc():
    fault=Move('Ground Fault',14,damage_type='Elemental',mechanic='ground_fault')
    coil=character('Coil','conductive',(SPELL,fault))
    s=battle(coil)
    act(s);assert s.team_two[1].current_hp==96
    act(s);act(s,1,1)
    assert s.team_two[1].current_hp==82 and s.team_two[0].current_hp==80


def test_bastion_transfers_guard_without_stacking_and_expires_after_enemy_action():
    relief=special('Relief','relief')
    bastion=character('Bastion','hold_door',(HIT,relief),guard_percent=45)
    s=battle(bastion);act(s,1,1)
    assert s.team_one[1].guard_percent==45 and bastion.guard_percent==0
    act(s,1);assert s.team_one[1].guard_percent==0


def test_covenant_blocks_healing_and_drain_but_not_bench_healing_and_nightfall_strips_positive_only():
    from backend.engine.status_effects import Status
    night=special('Nightfall','nightfall')
    dragon=character('Dragon','covenant',(REST,night),current_hp=50)
    s=battle(dragon);act(s);assert dragon.current_hp==50
    s.team_two[0].current_hp=40;act(s,1);assert s.team_two[0].current_hp==40
    dragon.guard_percent=30;dragon.statuses={'echo':Status(1),'weaken':Status(2)}
    s.team_two[0].guard_percent=30;s.team_two[0].statuses={'thorns':Status(1)}
    act(s,1)
    assert dragon.guard_percent==s.team_two[0].guard_percent==0
    assert 'echo' not in dragon.statuses and 'weaken' in dragon.statuses
    assert not s.team_two[0].statuses


def test_hushwing_bans_repeat_and_encore_reverses_it_without_softlock():
    encore=special('Encore','encore')
    s=battle(character('Hush','rhythm',(HIT,encore)))
    s.current_player=1;act(s)
    act(s)
    assert Action('move',0) not in legal_actions(s) and Action('move',1) in legal_actions(s)
    s.current_player=0;act(s,1)
    assert Action('move',0) in legal_actions(s) and Action('move',1) not in legal_actions(s)
    act(s);assert s.team_two[0].encore_move is None
    # One move, no reserve must remain playable even under Lulling Rhythm.
    s=battle(character('Hush','rhythm'))
    s.team_two=s.team_two[:1];s.team_two[0].moves=(HIT,);s.team_two[0].last_move='Hit';s.current_player=1
    assert legal_actions(s)==(Action('move',0),)


def test_rift_damage_waits_for_action_and_seal_halves_it_and_switch_cannot_erase_it():
    seal=special('Seal','seal')
    r=character('Rift','out_of_step',(HIT,seal),current_hp=15)
    s=battle(r);s.current_player=1;act(s)
    assert r.current_hp==15 and r.pending_damage==20
    act(s,1);assert r.current_hp==5 and r.pending_damage==0
    act(s);switch_active(s,1)
    assert r.current_hp==0 and r.pending_damage==0
    assert s.active_indices[0]==1 and s.replacement_required is None


def test_invalid_target_and_unavailable_copy_do_not_mutate_state():
    follow=special('Follow','escort')
    s=battle(character('Glow','last_light',(follow,)))
    for target in (None,0,99,-1,True):
        before=deepcopy(s)
        with pytest.raises(ValueError):resolve_turn(s,follow,target)
        assert s==before
    copy=special('Copy','copy');s=battle(character('Mage','transcription',(copy,)))
    with pytest.raises(ValueError):act(s)


def test_target_actions_are_enumerated_and_bot_simulation_keeps_original_unchanged():
    fault=Move('Ground Fault',14,damage_type='Elemental',mechanic='ground_fault')
    s=battle(character('Coil','conductive',(fault,)))
    before=deepcopy(s)
    assert Action('move',0,1) in legal_actions(s)
    result=simulate(s,Action('move',0,1))
    assert result.team_two[1].current_hp==86 and s==before


@pytest.mark.parametrize('mechanic',['escort','relief'])
def test_called_shot_is_wasted_when_predicted_move_switches_the_actor(mechanic):
    called=special('Called Shot','called_shot')
    switch_move=special('Switching move',mechanic)
    s=battle(character('Veyne','trailblazer',(called,)),character('Enemy',moves=(switch_move,)))
    act(s,0,0);act(s,0,1)
    assert s.team_two[1].current_hp==100
    assert s.team_one[0].called_move is None


def test_seal_cannot_pay_a_new_called_shot_wound_with_its_old_pending_snapshot():
    seal=special('Seal','seal')
    rift=character('Rift','out_of_step',(seal,),pending_damage=20)
    s=battle(rift,character('Veyne','trailblazer'))
    s.team_two[0].called_move='Seal'
    act(s)
    assert rift.current_hp==90
    assert rift.pending_damage==32


def test_nightfall_clears_prepared_called_shot_without_firing_it():
    night=special('Nightfall','nightfall')
    s=battle(character('Dragon','covenant',(night,)))
    s.team_two[0].called_move='Nightfall'
    act(s)
    assert s.team_one[0].current_hp==100
    assert s.team_two[0].called_move is None


def test_reserve_attack_clears_active_opponents_previous_reprisal_damage():
    fault=Move('Fault',14,damage_type='Elemental',mechanic='ground_fault')
    reprisal=Move('Reprisal',14,mechanic='reprisal')
    s=battle(character('Coil','conductive',(HIT,fault)),character('Bastion',moves=(HIT,reprisal)))
    act(s);act(s);act(s,1,1)
    assert s.team_two[0].last_damage==0
    before=s.team_one[0].current_hp
    act(s,1)
    assert before-s.team_one[0].current_hp==14


def test_drag_and_recoil_knockout_preserve_both_replacement_obligations():
    from backend.engine.status_effects import Status
    drag=Move('Drag',8,damage_type='Physical',mechanic='drag',contact=True)
    s=battle(character('Bramble','tangled',(drag,),current_hp=10))
    s.team_two[0].statuses['thorns']=Status(1)
    act(s)
    assert s.replacement_required==0 and s.current_player==1
    replace_knocked_out(s,1)
    assert s.replacement_required==1 and s.forced_switch
    replace_knocked_out(s,1)
    assert s.replacement_required is None and not s.forced_switch
    assert s.current_player==1 and s.active_indices==[1,1]
