"""Single-player browser sessions using the shared engine and tactical bot."""
from copy import deepcopy
from dataclasses import dataclass, field
from random import sample, choice, randrange
from itertools import combinations
from secrets import token_urlsafe
from threading import RLock
from time import monotonic
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from backend.bot.adapter import Action, legal_actions, simulate
from backend.bot.search import choose_action
from backend.engine.creature import Creature
from backend.engine.damage import direct_damage, recoil_damage, base_damage, drain_healing, recovery_healing
from backend.engine.status_effects import DESCRIPTIONS
from backend.engine.type_chart import effectiveness_percent
from backend.roster import ROSTER, BY_ID
from backend.arenas import ARENAS
from backend.engine.moves import Move
from backend.engine.turn_engine import BattleState, resolve_turn
from backend.engine.initiative import opening_initiative, lead_speed
from backend.engine import passives

router = APIRouter(prefix='/api')
COOKIE = 'clashbound_session'
SESSION_SECONDS = 1800
MAX_SESSIONS = 256


def draw_initiative():
    # Used only when both lead Speed and team Speed are exactly tied.
    return randrange(2)


@dataclass
class Match:
    battle: BattleState
    rosters: list[list[str]]
    revision: int = 0
    turn: int = 1
    log: list[str] = field(default_factory=lambda: ['Teams revealed. You move first.'])
    touched: float = field(default_factory=monotonic)
    arena_index: int = 0
    match_id: str = field(default_factory=lambda: token_urlsafe(16))
    first_player: int = 0
    initiative_reason: str = "Opening Speed"


# Local demo storage: one process. Use a shared store before running workers.
# ponytail: serialize local requests; use per-match locks if concurrent load matters.
_matches: dict[str, Match] = {}
_lock = RLock()


class TeamRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    roster: list[str] = Field(min_length=3, max_length=3)
    loadouts: dict[str, list[StrictInt]] = Field(default_factory=dict)


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    kind: Literal['move', 'switch', 'replace']
    index: StrictInt = Field(ge=0)
    revision: StrictInt = Field(ge=0)
    target: StrictInt | None = Field(default=None,ge=0)


def _get_match(request: Request) -> tuple[str, Match]:
    session = request.cookies.get(COOKIE)
    match = _matches.get(session)
    if match is None or monotonic() - match.touched > SESSION_SECONDS:
        if session in _matches:
            del _matches[session]
        raise HTTPException(404, 'Choose a team to start a new battle.')
    match.touched = monotonic()
    return session, match


def _move_view(creature: Creature, target: Creature, move: Move) -> dict:
    metadata = dict(damageType=move.damage_type, contact=move.contact, mechanic=move.mechanic,
                    pendingEcho=10 if 'echo' in creature.statuses else 0,
                    delayedDamage=min(10, target.current_hp) if 'echo' in creature.statuses else 0)
    echo_note = f' Pending echo deals {metadata["delayedDamage"]} additional damage this action.' if metadata['delayedDamage'] else ''
    if move.effect == 'special':
        return dict(name=move.name,effect='special',amount=0,description=DESCRIPTIONS[move.mechanic]+echo_note,symbol='◎',**metadata)
    if move.effect == 'heal':
        return dict(name=move.name, effect='heal', amount=recovery_healing(creature,move.effect_amount),
                    description=f'Restores up to {move.effect_amount * creature.recovery // 10} HP. Scales with Recovery.' + echo_note, symbol='＋', **metadata)
    if move.effect == 'guard' and move.power == 0:
        return dict(name=move.name, effect='guard', amount=move.effect_amount,
                    description=f'Reduces the next incoming hit by {move.effect_amount}%. Uses your turn.' + echo_note, symbol='◈', **metadata)
    if move.effect == 'status' and move.power == 0:
        return dict(name=move.name, effect='status', amount=0, description=DESCRIPTIONS[move.mechanic] + echo_note,
                    symbol='◎', **metadata)
    damage = direct_damage(creature, target, move)
    healed = drain_healing(creature, damage) if move.mechanic == 'drain' else 0
    recoil = min(creature.current_hp + healed, recoil_damage(creature, target, move))
    delayed = min(10, target.current_hp - damage) if 'echo' in creature.statuses and creature.current_hp + healed > recoil else 0
    metadata['delayedDamage'] = delayed
    description = f'{move.damage_type} / {"contact" if move.contact else "ranged"}. Scales with {"Power" if move.damage_type in {"Physical","Neutral"} else "Focus"}. '
    description += DESCRIPTIONS.get(move.mechanic, 'A direct attack.')
    if move.effect == 'guard':
        description += f' Grants {move.effect_amount}% protection against the next hit.'
    if recoil:
        description += f' Causes {recoil} self-damage.'
    if delayed:
        description += f' Pending echo deals {delayed} additional damage this action.'
    return dict(name=move.name, effect='damage', amount=damage, baseDamage=base_damage(creature,target,move),
                scalesWith='Power' if move.damage_type in {'Physical','Neutral'} else 'Focus',
                guardPercent=move.effect_amount if move.effect == 'guard' else 0, healing=healed, selfDamage=recoil,
                effectiveness=effectiveness_percent(move.damage_type, target.battle_type),
                description=description, symbol='✦', **metadata)


def _battle_move_view(state,player,index):
    actor=state.active_creature(player)
    enemy=state.active_creature(1-player)
    move=actor.moves[index]
    result=_move_view(actor,enemy,move)
    probe=deepcopy(state)
    probe.current_player=player
    probe.replacement_required=None
    probe.winner=None
    options=[]
    legal=legal_actions(probe)
    candidates=[a for a in legal if a.kind=='move' and a.index==index]
    result['available']=bool(candidates)
    result['blockedReason']=None if candidates else 'Unavailable now. '+DESCRIPTIONS.get(move.mechanic,'Lulling Rhythm or Encore restricts this move.')
    for action in candidates:
        if action.target is None:
            continue
        if move.mechanic=='called_shot':
            label=enemy.moves[action.target].name
        else:
            owner=player if move.mechanic in {'escort','relief'} else 1-player
            c=state.team(owner)[action.target]
            label=f'{c.name} · {c.current_hp}/{c.max_hp} HP'
        options.append(dict(index=action.target,label=label))
    result['targets']=options
    if not candidates:
        result['amount']=0
        return result
    chosen=candidates[0]
    preview=deepcopy(probe)
    old_actor_hp=preview.active_creature(player).current_hp
    owner=1-player
    slot=preview.active_indices[owner]
    if move.mechanic=='ground_fault':slot=chosen.target
    if move.mechanic in {'escort','relief'}:owner,slot=player,chosen.target
    recipient=preview.team(owner)[slot]
    hp_before=recipient.current_hp
    pending_before=recipient.pending_damage
    outcome=resolve_turn(preview,preview.active_creature(player).moves[index],chosen.target)
    result['amount']=max(0,hp_before-recipient.current_hp)
    result['delayedDamage']=max(0,recipient.pending_damage-pending_before)
    result['healing']=outcome.healed
    if move.effect=='heal':result['amount']=outcome.healed
    result['selfDamage']=max(0,old_actor_hp-preview.team(player)[state.active_indices[player]].current_hp)
    if move.effect=='special' and move.mechanic=='copy' and actor.recorded_spell:
        result['description']+=' Recorded spell: '+actor.recorded_spell.name+'.'
        result['damageType']=actor.recorded_spell.damage_type
    if passives.healing_blocked(state,actor) and (move.effect=='heal' or move.mechanic in {'drain','shed'}):
        result['description']+=' Healing blocked by Twilight Covenant.'
    if result['delayedDamage'] and recipient.passive=='out_of_step':
        result['description']+=f" {result['delayedDamage']} damage becomes a pending wound; no immediate HP loss."
    return result


def _snapshot(match: Match) -> dict:
    state = match.battle
    teams = []
    for player in (0, 1):
        target = state.active_creature(1 - player)
        team = []
        for identifier, creature in zip(match.rosters[player], state.team(player)):
            info = BY_ID[identifier]
            team.append({
                'id': identifier, 'name': creature.name, 'type': info['type'], 'art': info['art'],
                'maxHp': creature.max_hp, 'hp': creature.current_hp, 'guardPercent': creature.guard_percent,
                'passive':info['passive'],
                'passiveState':dict(recordedSpell=creature.recorded_spell.name if creature.recorded_spell else None,
                                   rememberedMove=creature.memory_move,lastLightUsed=creature.last_light_used,
                                   predictedMove=creature.called_move,encoreMove=creature.encore_move,pendingDamage=creature.pending_damage),
                'stats':dict(hp=creature.max_hp,power=creature.attack,focus=creature.focus,
                             armour=creature.defense,ward=creature.ward,recovery=creature.recovery,speed=creature.speed),
                'statuses': [dict(name=name, turnsRemaining=status.turns, moveIndex=status.slot,
                                  description=DESCRIPTIONS[name]) for name, status in creature.statuses.items()],
                'switchBlockedReason': 'Paralysed until after the next action.' if 'paralyse' in creature.statuses else None,
                'moves': [_battle_move_view(state,player,i) if creature is state.active_creature(player) and state.winner is None
                          else _move_view(creature,target,move) for i,move in enumerate(creature.moves)],
            })
        teams.append(team)
    human_actions = legal_actions(state) if (state.replacement_required if state.replacement_required is not None else state.current_player) == 0 else ()
    return dict(initiative=dict(firstPlayer=match.first_player,method='Opening Speed',reason=match.initiative_reason,
                leadSpeeds=[lead_speed(state.team(p)[0]) for p in (0,1)],teamSpeeds=[sum(c.speed for c in state.team(p)) for p in (0,1)]), matchId=match.match_id, teams=teams, arena=ARENAS[match.arena_index].copy(), active=state.active_indices[:], player=state.current_player,
                replacement=state.replacement_required, forcedSwitch=state.forced_switch, winner=state.winner,
                turn=match.turn, revision=match.revision, log=match.log[:],
                actions=[dict(kind=a.kind,index=a.index,**({'target':a.target} if a.target is not None else {})) for a in human_actions])


def _advance(match: Match, action: Action) -> dict:
    state = match.battle
    player = state.replacement_required if state.replacement_required is not None else state.current_player
    label = 'You' if player == 0 else 'Bot'
    actor = state.active_creature(player)
    before_hp=[[c.current_hp for c in state.team(p)] for p in (0,1)]
    old_indices=state.active_indices[:]
    if action.kind=='move':
        move=actor.moves[action.index]
        match.battle=simulate(state,action)
        message=f'{label} · {actor.name} used {move.name}.'
        if move.effect=='heal':
            restored=match.battle.team(player)[old_indices[player]].current_hp-actor.current_hp
            message=f'{label} · {actor.name} recovered {max(0,restored)} HP.'
    else:
        match.battle=simulate(state,action)
        name=match.battle.active_creature(player).name
        message=f'{label} deployed {name}'+(' — free replacement.' if action.kind=='replace' else ' — turn used.')

    if action.kind != 'replace':
        match.turn += 1
    match.log.append(message)
    match.log.extend(match.battle.events)
    if match.battle.winner is not None:
        match.log.append('You win!' if match.battle.winner == 0 else 'The bot wins. Try another team!')
    match.log = match.log[-100:]
    frame = _snapshot(match)
    if action.kind=='move':
        damaging=move.power>0 or move.mechanic=='copy'
        frame['animation']=dict(kind='attack' if damaging else move.effect,actor=player,
                               moveName=move.name if move.effect!='heal' else None,
                               actorSlot=old_indices[player],targetSlot=action.target if move.mechanic=='ground_fault' else old_indices[1-player])
        frame['animation']['hpChanges']=[dict(player=p,slot=i,amount=c.current_hp-before_hp[p][i])
            for p in (0,1) for i,c in enumerate(match.battle.team(p)) if c.current_hp!=before_hp[p][i]]
        if damaging:frame['animation']['target']=1-player
    return frame


@router.get('/roster')
def roster():
    # Preserve selection cards while exposing offensive status metadata.
    result = deepcopy(ROSTER)
    for character in result:
        for move in character['moves'] + character['movePool']:
            if move.get('mechanic') in DESCRIPTIONS:
                move['description'] = DESCRIPTIONS[move['mechanic']]
            if move.get('effect') == 'status' and move.get('power', 0) > 0:
                del move['effect']
                move['appliesStatus'] = move['mechanic']
                move['description'] = DESCRIPTIONS[move['mechanic']]
    return result


@router.post('/battle')
def new_battle(data: TeamRequest, request: Request, response: Response):
    if len(set(data.roster)) != 3 or any(c not in BY_ID for c in data.roster):
        raise HTTPException(422, 'Choose three different characters from the roster.')
    if any(c not in data.roster for c in data.loadouts):
        raise HTTPException(422, 'Move selections must belong to your chosen team.')
    for identifier, indices in data.loadouts.items():
        if (len(indices)!=4 or len(set(indices))!=4 or
            any(i<0 or i>=len(BY_ID[identifier]['movePool']) for i in indices) or
            not set(BY_ID[identifier]['signatureMoves']).issubset(indices)):
            raise HTTPException(422, 'Keep both signature moves and choose two different alternatives.')
    with _lock:
        expired = [key for key, match in _matches.items() if monotonic() - match.touched > SESSION_SECONDS]
        for key in expired:
            del _matches[key]
        session = request.cookies.get(COOKIE)
        if session not in _matches:
            if len(_matches) >= MAX_SESSIONS:
                raise HTTPException(503, 'The demo is busy. Please try again shortly.')
            session = token_urlsafe(32)
            response.set_cookie(COOKIE, session, httponly=True, samesite='strict', secure=request.url.scheme == 'https')
        # Uniformly draw a trio, excluding only the previous trio when possible.
        # No matchup optimisation, stat boosts or deeper search. All move choices are available.
        previous_team = set(_matches[session].rosters[1]) if session in _matches else set()
        trios = [trio for trio in combinations([c for c in BY_ID if c not in data.roster], 3)
                 if set(trio) != previous_team]
        rosters = [data.roster, sample(choice(trios), 3)]
        teams=[]
        for player,ids in enumerate(rosters):
            team=[]
            for c in ids:
                info=BY_ID[c]; stats=info['stats']
                if player==0:
                    indices=data.loadouts.get(c,[0,1,2,3])
                else:
                    fixed=info['signatureMoves']
                    indices=sorted(fixed+sample([i for i in range(len(info['movePool'])) if i not in fixed],2))
                moves=tuple(Move(**info['movePool'][i]) for i in indices)
                team.append(Creature(info['name'],info['maxHp'],stats['power'],stats['armour'],moves,
                                     battle_type=info['type'],focus=stats['focus'],ward=stats['ward'],recovery=stats['recovery'],speed=stats['speed'],passive=info['passive']['id']))
            teams.append(team)
        first_player,reason = opening_initiative(teams,draw_initiative)
        match = Match(BattleState(*teams, current_player=first_player), rosters,first_player=first_player,initiative_reason=reason)
        match.log=[reason+(' You open.' if first_player==0 else ' The bot opens.')]
        previous = _matches[session].arena_index if session in _matches else None
        match.arena_index = choice([i for i in range(len(ARENAS)) if i != previous])
        # A reset invalidates any outstanding request from the previous match.
        if session in _matches:
            match.revision = _matches[session].revision + 1
        opening = _snapshot(match)
        frames = []
        while match.battle.winner is None:
            bot_action = choose_action(match.battle, 1)
            if bot_action is None:
                break
            frames.append(_advance(match, bot_action))
        _matches[session] = match
        return {'state': _snapshot(match), 'openingState': opening, 'frames': frames}


@router.get('/battle')
def battle(request: Request):
    with _lock:
        _, match = _get_match(request)
        return {'state': _snapshot(match)}


@router.post('/battle/actions')
def act(data: ActionRequest, request: Request):
    if data.kind!='move' and data.target is not None:
        raise HTTPException(422,'Only a move can select a target.')
    with _lock:
        session, saved = _get_match(request)
        state = saved.battle
        if saved.revision != data.revision:
            raise HTTPException(409, 'Battle changed. Reloading the latest turn.')
        if state.winner is not None:
            raise HTTPException(409, 'This battle is over. Start a new battle.')
        player = state.replacement_required if state.replacement_required is not None else state.current_player
        if player != 0:
            raise HTTPException(409, 'Wait for the bot to finish its turn.')
        action = Action(data.kind,data.index,data.target)
        if action not in legal_actions(state):
            raise HTTPException(422, 'That action is not available.')
        # Commit the human action and bot response together, so an unexpected bot
        # failure cannot leave a partially advanced battle behind.
        match = deepcopy(saved)
        match.revision += 1
        frames = [_advance(match, action)]
        while match.battle.winner is None:
            bot_action = choose_action(match.battle, 1)
            if bot_action is None:
                break
            frames.append(_advance(match, bot_action))
        _matches[session] = match
        return {'state': frames[-1], 'frames': frames}
