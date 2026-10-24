"""Character-specific rules shared by live play, previews and bot simulations."""
from .damage import direct_damage, recovery_healing
from .moves import Move

TARGETED = {'escort', 'relief', 'called_shot', 'ground_fault'}
POSITIVE = {'echo', 'thorns'}


def reserves(state, player):
    return [i for i,c in enumerate(state.team(player))
            if i != state.active_indices[player] and not c.is_knocked_out]


def target_options(state, player, move):
    if move.mechanic in {'escort','relief'}:
        return reserves(state,player)
    if move.mechanic == 'ground_fault':
        return reserves(state,1-player)
    if move.mechanic == 'called_shot':
        return list(range(len(state.active_creature(1-player).moves)))
    return [None]


def _base_available(state, player, move):
    actor=state.active_creature(player)
    if move.mechanic=='copy' and actor.recorded_spell is None:
        return False
    if move.mechanic=='seal' and actor.pending_damage==0:
        return False
    if move.mechanic in {'escort','relief'} and 'paralyse' in actor.statuses:
        return False
    if move.mechanic in TARGETED and not target_options(state,player,move):
        return False
    if move.mechanic=='encore':
        enemy=state.active_creature(1-player)
        return any(m.name==enemy.last_move and _base_available(state,1-player,m)
                   for m in enemy.moves if m.mechanic!='encore')
    return True


def available_moves(state,player):
    actor=state.active_creature(player)
    enemy=state.active_creature(1-player)
    base=[m for m in actor.moves if _base_available(state,player,m)]
    if actor.encore_move:
        repeated=[m for m in base if m.name==actor.encore_move]
        return repeated or base
    if enemy.passive=='rhythm' and not enemy.is_knocked_out and actor.last_move:
        varied=[m for m in base if m.name!=actor.last_move]
        # Never remove the last playable action from a one-move survivor.
        return varied or base
    return base


def validate_move(state,move,target):
    actor=state.active_creature(state.current_player)
    if move not in actor.moves:
        raise ValueError('Move is not available to this character.')
    if move not in available_moves(state,state.current_player):
        raise ValueError('This move is unavailable: check its requirement, Encore or Lulling Rhythm.')
    if target is not None and (isinstance(target,bool) or not isinstance(target,int)):
        raise ValueError('Choose a valid target.')
    if target not in target_options(state,state.current_player,move):
        raise ValueError('Choose a living reserve or an available enemy move.')


def lose_hp(state,creature,amount,source):
    amount=min(max(0,amount),creature.current_hp)
    if amount and amount==creature.current_hp and creature.passive=='last_light' and not creature.last_light_used:
        amount=max(0,amount-1)
        creature.last_light_used=True
        state.events.append(f'{creature.name}: Last Light saved it at 1 HP (once per battle).')
    creature.current_hp-=amount
    if amount:
        state.events.append(f'{creature.name} lost {amount} HP · {source}.')
    return amount


def healing_blocked(state,creature):
    return any(c is creature for p in (0,1) for c in [state.active_creature(p)]) and any(
        state.active_creature(p).passive=='covenant' and not state.active_creature(p).is_knocked_out for p in (0,1))


def heal(state,creature,amount):
    if healing_blocked(state,creature):
        state.events.append(f'{creature.name}: Twilight Covenant prevents healing.')
        return 0
    amount=min(amount,creature.max_hp-creature.current_hp)
    creature.current_hp+=amount
    return amount


def hit(state,attacker,defender,move):
    """Apply direct damage or queue Riftclaw's wound; return effective damage."""
    is_active=any(state.active_creature(p) is defender for p in (0,1))
    deferred=defender.passive=='out_of_step' and is_active
    damage=direct_damage(attacker,defender,move,cap_hp=not deferred)
    defender.guard_percent=0
    defender.temporary_guard=False
    defender.last_damage=damage
    if deferred:
        defender.pending_damage+=damage
        state.events.append(f'{defender.name}: {damage} damage delayed; {defender.pending_damage} due after its next action, even if it switches.')
    else:
        damage=lose_hp(state,defender,damage,move.name)
    if defender.passive=='memory' and not defender.is_knocked_out:
        defender.memory_move=move.name
        state.events.append(f'{defender.name} remembers {move.name}: repeat hits deal 25% less damage.')
    if defender.passive=='transcription' and not defender.is_knocked_out and move.damage_type not in {'Physical','Neutral'}:
        if move.power>0 and move.mechanic not in {'copy','ground_fault','drag'}:
            defender.recorded_spell=move
            state.events.append(f'{defender.name} transcribed {move.name}. Forbidden Script is ready.')
    return damage


def pending_wounds(state,player):
    return [(c,c.pending_damage) for c in state.team(player) if c.pending_damage]


def finish_action(state,player,pending,chosen_name=None):
    """Expire enemy-turn protection/predictions and pay pre-existing wounds."""
    enemy=state.active_creature(1-player)
    actor=state.active_creature(player)
    if enemy.called_move:
        predicted=enemy.called_move
        enemy.called_move=None
        if predicted==chosen_name and not enemy.is_knocked_out and not actor.is_knocked_out:
            shot=Move('Called Shot',32,damage_type='Physical')
            hit(state,enemy,actor,shot)
            state.events.append(f'{enemy.name}: Called Shot predicted {chosen_name} correctly.')
        else:
            state.events.append('Called Shot expired without firing.')
    for creature in state.team(1-player):
        if creature.temporary_guard:
            creature.guard_percent=0
            creature.temporary_guard=False
    for creature,amount in pending:
        due=min(amount,creature.pending_damage)
        creature.pending_damage-=due
        lose_hp(state,creature,due,'pending wound')


def clear_departing(creature):
    creature.recorded_spell=None
    creature.memory_move=None
    creature.last_move=None
    creature.called_move=None
    creature.encore_move=None
    creature.temporary_guard=False
    # Pending wounds and the once-per-battle Last Light flag deliberately persist.


def switch_effects(state,player,outgoing,incoming,guard=0):
    enemy=state.active_creature(1-player)
    if enemy.passive=='tangled' and not enemy.is_knocked_out:
        lose_hp(state,outgoing,6,'Tangled Ground on voluntary departure')
    if outgoing.passive=='hold_door':
        incoming.guard_percent=max(incoming.guard_percent,20,guard)
        incoming.temporary_guard=True
        state.events.append(f'{incoming.name}: Hold the Door protects the next hit by {incoming.guard_percent}% until after the enemy turn.')
