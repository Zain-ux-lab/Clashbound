// The server owns combat, legal actions, damage previews and bot decisions.
let state = null;
let catalog = [];
let selection = [];
let loadouts = {};
let busy = false;
let disconnected = false;
let detailTimer;
let pendingSwap = null;
const expandedBuilds = new Set();
const buildTools = window.ClashboundBuilds;
const $ = id => document.getElementById(id);
const TYPES = {Magic:'#6a64a2', Physical:'#9c633b', Spirit:'#3c827c', Elemental:'#967322'};
const TYPE_SYMBOLS = {Magic:'✦',Physical:'◆',Spirit:'◉',Elemental:'ϟ'};
const EFFECT_NAMES = {spores:'Spores',thorns:'Thorns',mark:'Marked',paralyse:'Paralysed',confuse:'Confused',weaken:'Weakened',expose:'Exposed',echo:'Spell echo'};
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Existing in-progress battles may still carry the older server wording.
function moveDescription(move){
  return (move.description??'').replace(' / ranged.','.').replace(' / contact.','.')
    .replace(/Scales with (?:Focus|Power)\.\s*/g,'')
    .replace(/Can trigger thorn retaliation\.\s*/g,'')
    .replace(/(?:Contact: can trigger|Ranged: avoids) Thorn Coat retaliation\.\s*/g,'');
}

function confusedMove(c, index) { return c.statuses?.some(s=>s.name==='confuse' && s.moveIndex===index); }
function effectIndicators(c, player) {
  const statuses=c.statuses??[];
  if (!statuses.length) return '';
  const owner=player===0?'your':'the opponent’s';
  return `<details class="effect-indicators"><summary aria-label="${escapeText(c.name)}: ${statuses.map(s=>`${EFFECT_NAMES[s.name]??s.name}, ${s.turnsRemaining} ${s.turnsRemaining===1?'action':'actions'} remaining`).join('; ')}. Open effect explanations.">${statuses.map(s=>`<span class="effect-badge">${EFFECT_NAMES[s.name]??s.name} <b>${s.turnsRemaining}</b></span>`).join('')}</summary><div class="effect-explanations">${statuses.map(s=>`<p><strong>${EFFECT_NAMES[s.name]??s.name} · ${s.turnsRemaining} of ${owner} ${s.turnsRemaining===1?'actions remains':'actions remain'}</strong>${escapeText(s.description)}${s.name==='confuse' && Number.isInteger(s.moveIndex)?`<em>${escapeText(c.moves[s.moveIndex]?.name??'Marked move')} causes 8 recoil.</em>`:''}</p>`).join('')}${c.switchBlockedReason?`<p>${escapeText(c.switchBlockedReason)}</p>`:''}</div></details>`;
}
function typeSymbol(type) { return `<span class="type" title="${type}" aria-label="${type}">${TYPE_SYMBOLS[type]??'◇'}</span>`; }
const FRAME_READ_MS = 1800;
const BOT_PAUSE_MS = 700;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : {'Content-Type':'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const error = new Error(typeof data.detail === 'string' ? data.detail : 'Could not complete the request. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
function setError(message = '') {
  document.querySelectorAll('[data-error]').forEach(node => { node.textContent = message; node.hidden = !message; });
  $('retry').hidden = !disconnected;
  $('team-retry').hidden = !disconnected;
}
function current(player = 0) { return state.teams[player][state.active[player]]; }
function allowed(kind,index,target) { return !busy && !disconnected && state?.actions.some(a=>a.kind===kind && a.index===index && (target===undefined || a.target===target)); }
function artwork(c) { return `<img class="sprite" src="assets/characters/shadow-theatre/${c.id}.png" alt="${c.name}" decoding="sync">`; }
function portrait(c, index, enemy = false) {
  const player = enemy ? 1 : 0;
  const active = state.active[player] === index;
  const description = `${c.name}, ${c.hp} of ${c.maxHp} health${active ? ', active' : ''}`;
  const kind = state.replacement === 0 ? 'replace' : 'switch';
  return `<${enemy?'div':'button'} class="portrait ${enemy?'enemy-portrait':''} ${active?'active':''} ${c.hp===0?'knocked-out':''}" aria-label="${description}" ${enemy?'':`data-slot="${index}" ${allowed(kind,index)?'':'disabled'}`}>
    ${artwork(c)}<small>${c.name}</small><div class="health"><span style="width:${100*c.hp/c.maxHp}%"></span></div></${enemy?'div':'button'}>`;
}
function render() {
  $('restart').disabled = busy;
  if (!state) {
    $('moves').replaceChildren(); $('roster').replaceChildren(); $('enemy-roster').replaceChildren();
    $('turn').textContent = 'CHOOSE YOUR TEAM';
    return;
  }
  hideDetails();
  if($('initiative-message'))$('initiative-message').textContent=state.initiative?`${state.initiative.firstPlayer===0?'You open':'Bot opens'} · ${state.initiative.reason??'Opening Speed'}`:'';
  // The approved Belfry is the curated visual stage; arena selection has no combat effects.
  const arena=document.querySelector('.arena');
  arena.style.backgroundImage='url("assets/arenas/drowned-belfry.svg")';
  arena.setAttribute('aria-label','Drowned Belfry battlefield');
  $('arena-name').textContent='DROWNED BELFRY';
  $('battle-arena-caption').textContent='Drowned Belfry';
  document.title='Clashbound · Drowned Belfry';
  for (let p=0; p<2; p++) {
    const c = current(p);
    $(`hud-${p}`).style.setProperty('--type', TYPES[c.type]);
    $(`hud-${p}`).innerHTML = `<div class="side-label">${p===0?'YOU':'OPPONENT'} <span>${p===0?'PLAYER':'TACTICAL BOT'}</span></div><div class="hud-top"><strong>${c.name}</strong><span class="type" title="${c.type}" aria-label="${c.type}">${TYPE_SYMBOLS[c.type]}</span></div><div class="health" role="meter" aria-label="${p===0?'Your':'Opponent'} health" aria-valuemin="0" aria-valuemax="${c.maxHp}" aria-valuenow="${c.hp}"><span style="width:${100*c.hp/c.maxHp}%"></span></div><div class="hp">${c.hp} / ${c.maxHp} HP</div>${c.guardPercent?`<div class="guard-state">◈ NEXT HIT −${c.guardPercent}%</div>`:''}`;
    $(`hud-${p}`).innerHTML += passiveInfo(c)+effectIndicators(c,p);
    const art=window.ClashboundCharacterProfiles?.[c.id];
    if(art){$(`fighter-${p}`).style.setProperty('--body-ratio',art.aspect);$(`fighter-${p}`).style.setProperty('--body-scale',art.scale);}
    $(`fighter-${p}`).innerHTML = artwork(c);
    $(`fighter-${p}`).classList.toggle('fainted', c.hp===0);
  }
  $('enemy-roster').innerHTML = state.teams[1].map((c,i)=>portrait(c,i,true)).join('');
  $('roster').innerHTML = state.teams[0].map((c,i)=>portrait(c,i)).join('');
  $('roster').querySelectorAll('button').forEach(button => button.onclick=()=>openSwitch(Number(button.dataset.slot)));
  $('team-label').textContent = 'YOUR TEAM';
  $('turn-count').textContent = `TURN ${state.turn}`;
  $('turn').textContent = state.winner!==null ? (state.winner===0?'YOU WIN':'BOT WINS') : disconnected ? 'CONNECTION LOST' : state.replacement===0 ? 'CHOOSE A REPLACEMENT' : state.player===1 ? 'BOT IS CHOOSING…' : busy ? 'RESOLVING TURN…' : 'YOUR TURN';
  $('action-label').textContent = state.winner!==null ? 'MATCH COMPLETE' : state.replacement===0 ? 'DEPLOY A RESERVE' : 'CHOOSE YOUR MOVE';
  const c = current();
  $('moves').innerHTML = c.moves.map((m,i)=>`<button class="move ${confusedMove(c,i)?'confused-move':''}" style="--type:${TYPES[c.type]}" ${allowed('move',i)?'':'disabled'} data-move="${i}" title="${escapeText(m.blockedReason??moveDescription(m))}" ${confusedMove(c,i)?`aria-label="${escapeText(m.name)}, confused: causes 8 recoil"`:''}><span class="move-symbol">${m.symbol}</span>${m.name}${m.targets?.length?'<small>Choose a target</small>':''}${confusedMove(c,i)?'<small class="move-warning">Confused · 8 recoil</small>':''}</button>`).join('');
  $('moves').querySelectorAll('button').forEach(button=>{
    const index=Number(button.dataset.move);
    button.onclick=()=>chooseMove(index);
    button.onmouseenter=()=>showDetails(index,button); button.onfocus=()=>showDetails(index,button);
    button.onmouseleave=scheduleHideDetails; button.onblur=scheduleHideDetails;
  });
  if($('move-reference-copy'))$('move-reference-copy').innerHTML=c.moves.map(m=>`<p><strong>${escapeText(m.name)}</strong>${escapeText(moveDescription(m))}${m.blockedReason?`<em>${escapeText(m.blockedReason)}</em>`:''}</p>`).join('');
  $('log').replaceChildren(...state.log.map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
  $('log').scrollTop=$('log').scrollHeight;
  const result=$('result-dialog');
  if(result && state.winner!==null && !busy && !disconnected){
    $('result-title').textContent=state.winner===0?'Victory':'Defeat';
    $('result-copy').textContent=state.winner===0?'Your team takes the arena.':'The bot takes this battle. Your next move awaits.';
    $('result-team').textContent=state.teams[state.winner].map(c=>c.name).join(' · ');
    if(!result.open)result.showModal();
  }

}
function passiveInfo(c){
  if(!c.passive)return '';
  const s=c.passiveState??{},parts=[];
  if(s.recordedSpell)parts.push(`Recorded: ${s.recordedSpell}`);
  if(s.rememberedMove)parts.push(`Resists repeat: ${s.rememberedMove}`);
  if(c.passive.id==='last_light')parts.push(s.lastLightUsed?'Last Light used':'Last Light ready');
  if(s.predictedMove)parts.push(`Predicting: ${s.predictedMove}`);
  if(s.encoreMove)parts.push(`Encore: ${s.encoreMove} or switch`);
  if(s.pendingDamage)parts.push(`Pending wound: ${s.pendingDamage} after next action`);
  return `<details class="passive-info"><summary>${escapeText(c.passive.name)}</summary><p>${escapeText(c.passive.description)}</p></details>${parts.length?`<small class="passive-state">${parts.map(escapeText).join(' · ')}</small>`:''}`;
}
function chooseMove(index){
  if(!allowed('move',index))return;
  const move=current().moves[index];
  if(!move.targets?.length){sendAction('move',index);return;}
  $('target-title').textContent=move.name;
  $('target-description').textContent=moveDescription(move);
  $('target-options').innerHTML=move.targets.map(t=>`<button type="button" data-target="${t.index}">${escapeText(t.label)}</button>`).join('');
  $('target-options').querySelectorAll('button').forEach(button=>button.onclick=()=>sendAction('move',index,Number(button.dataset.target)));
  $('target-dialog').showModal();
}
function preview(index) {
  const c=current(), move=c.moves[index];
  $('details').style.setProperty('--type',TYPES[c.type]);
  const label=move.effect==='heal'?'RECOVERY':move.effect==='guard'?'GUARD':move.effect==='special'?'ABILITY':'ATTACK';
  const value=move.effect==='guard'?`${move.amount}%`:move.effect==='damage'?(move.baseDamage??move.amount):move.amount;
  const unit=move.effect==='heal'?'HP restored':move.effect==='guard'?'next hit reduction':move.effect==='special'?'ability':'base damage';
  const brief=moveDescription(move).split('. ').find(t=>!t.includes(' / ')&&!t.includes('Scales with'))??'';
  $('details').innerHTML=`<div class="detail-kicker">${escapeText(move.damageType??label)}</div><h3>${escapeText(move.name)}</h3><div class="damage">${value}<small>${unit}</small></div><p>${escapeText(moveDescription(move)||brief)}${move.blockedReason?`<em>${escapeText(move.blockedReason)}</em>`:''}</p>${confusedMove(c,index)?'<small>Confused · 8 recoil</small>':''}`;
}
function hideDetails() {
  clearTimeout(detailTimer); document.querySelector('.detail-panel').classList.remove('is-visible');
  document.querySelectorAll('[aria-describedby="details"]').forEach(b=>b.removeAttribute('aria-describedby'));
}
function scheduleHideDetails() { clearTimeout(detailTimer); detailTimer=setTimeout(hideDetails,120); }
function showDetails(index,button) {
  if (busy || !state || state.winner!==null) return;
  clearTimeout(detailTimer); preview(index);
  const panel=document.querySelector('.detail-panel');panel.classList.add('is-visible');button.setAttribute('aria-describedby','details');
  const r=button.getBoundingClientRect(),size=panel.offsetWidth;
  panel.style.left=Math.max(8,Math.min(innerWidth-size-8,r.left-size-14))+'px';
  panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,r.top+r.height/2-panel.offsetHeight/2))+'px';
}
function openSwitch(preferred) {
  if (!state || busy || disconnected || state.winner!==null) return;
  const forced=state.replacement===0, kind=forced?'replace':'switch';
  const actions=state.actions.filter(a=>a.kind===kind);
  if (!actions.length) return;
  $('switch-title').textContent=forced?(state.forcedSwitch?'Dragged out · choose a replacement':'Deploy a replacement'):'Switch your character?';
  $('switch-description').textContent=forced?'Your replacement is free. You still get your normal action.':'Switching ends your turn. The bot then takes its action.';
  $('switch-dialog').querySelector('.close').hidden=forced;
  $('switch-options').innerHTML=actions.map(a=>{const c=state.teams[0][a.index];return `<button class="reserve" data-slot="${a.index}"><strong>${c.name} · ${c.type}</strong><small>${c.hp} / ${c.maxHp} HP</small></button>`;}).join('');
  $('switch-options').querySelectorAll('button').forEach(button=>button.onclick=()=>sendAction(kind,Number(button.dataset.slot)));
  if (!$('switch-dialog').open) $('switch-dialog').showModal();
  if (preferred!==undefined) $('switch-options').querySelector(`[data-slot="${preferred}"]`)?.focus();
}
async function presentFrames(frames) {
    for (let i=0;i<frames.length;i++) {
      const frame=frames[i];
      state=frame;render();
      const actorVisible=frame.animation?.actorSlot===undefined || frame.animation.actorSlot===state.active[frame.animation.actor];
      if(frame.animation && actorVisible && (frame.animation.targetSlot===undefined || frame.animation.targetSlot===state.active[frame.animation.target??frame.animation.actor]) && typeof document.createElement==='function') playMoveEffect(frame.animation,null);

      if (frame.animation?.moveName) {
        const name=document.createElement('div');name.className='move-announcement';
        name.textContent=`${frame.animation.actor===0?'You':'Opponent'} · ${frame.animation.moveName}`;
        document.querySelector('.arena').append(name);setTimeout(()=>name.remove(),900);
      }
      for (const change of frame.animation?.hpChanges??[]) {
        if(change.slot!==undefined && change.slot!==state.active[change.player])continue;
        const c=current(change.player),bar=$(`hud-${change.player}`).querySelector('.health span');
        if (!document.body?.classList.contains('reduce-motion') && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          bar?.animate([{width:`${100*(c.hp-change.amount)/c.maxHp}%`},{width:`${100*c.hp/c.maxHp}%`}],{duration:420,easing:'ease-out'});
        }
        const number=document.createElement('span');number.className=`hp-change ${change.amount>0?'recovery':''}`;
        number.textContent=`${change.amount>0?'+':''}${change.amount}`;
        $(`fighter-${change.player}`).append(number);number.style.setProperty('--hp-display-time', `${FRAME_READ_MS}ms`);setTimeout(()=>number.remove(),FRAME_READ_MS);
      }
      if (frame.animation?.kind==='attack' && actorVisible && (frame.animation.targetSlot===undefined || frame.animation.targetSlot===state.active[frame.animation.target])) {
        const attacker=$(`fighter-${frame.animation.actor}`), target=$(`fighter-${frame.animation.target}`);
        attacker.classList.remove('attack-animation'); target.classList.remove('hit-animation');
        void attacker.offsetWidth;
        attacker.classList.add('attack-animation'); target.classList.add('hit-animation');
        setTimeout(()=>{attacker.classList.remove('attack-animation');target.classList.remove('hit-animation');},460);
      } else if (actorVisible && (frame.animation?.kind==='heal' || frame.animation?.kind==='guard')) {
        const fighter=$(`fighter-${frame.animation.actor}`), animation=`${frame.animation.kind}-animation`;
        fighter.classList.remove(animation);
        void fighter.offsetWidth;
        fighter.classList.add(animation);
        setTimeout(()=>fighter.classList.remove(animation),460);
      }
      // Keep the outcome readable, then pause before presenting the next action.
      if (frame.animation) await delay(FRAME_READ_MS);
      if (i<frames.length-1) await delay(BOT_PAUSE_MS);
    }
}
async function sendAction(kind,index,target) {
  if (!allowed(kind,index,target) || (kind==='move' && current().moves[index]?.targets?.length && target===undefined)) return;
  busy=true; setError(); $('switch-dialog').close(); $('target-dialog')?.close(); render();
  try {
    const data=await request('/api/battle/actions',{kind,index,...(target===undefined?{}:{target}),revision:state.revision});
    await presentFrames(data.frames);
  } catch (error) {
    // Read the saved result after a lost response; never replay a move blindly.
    try { state=(await request('/api/battle')).state; }
    catch (recovery) { if (recovery.status===404) state=null; else disconnected=true; }
    setError(error.status ? error.message : 'Connection interrupted. Check the server, then retry the connection.');
  } finally {
    busy=false; render();
    if (!state) openTeamPicker();
    else if (state.replacement===0 && !disconnected) openSwitch();
  }
}
function renderChoices() {
  const humanoids=['mage','bramblebelly','veyne','coil','bastion'];
  const groups=[
    {id:'humanoids',name:'Humanoids',characters:catalog.filter(c=>humanoids.includes(c.id))},
    {id:'creatures',name:'Creatures',characters:catalog.filter(c=>!humanoids.includes(c.id))},
  ];
  const choice=c=>{
    const rank=selection.indexOf(c.id);
    const featured=c.moves.find(m=>m.effect)||c.moves[0];
    const strength=featured.effect==='special'?'ability':featured.effect==='guard'?`${featured.power??0} power · ${featured.effect_amount}% guard`:featured.effect==='heal'?`heal ${featured.effect_amount} HP`:`${featured.power??0} power`;
    return `<button class="team-choice ${rank>=0?'selected':''}" data-id="${c.id}" aria-pressed="${rank>=0}" ${busy || (selection.length===3 && rank<0)?'disabled':''}><span class="pick-number">${rank>=0?rank+1:'+'}</span>${artwork(c)}<strong>${c.name}</strong><small>${typeSymbol(c.type)} · ${c.maxHp} HP</small><small>${featured.name} · ${strength}</small></button>`;
  };
  $('team-options').innerHTML=groups.map(group=>`<section class="team-group" aria-labelledby="team-${group.id}"><h3 id="team-${group.id}">${group.name}</h3><div class="team-row">${group.characters.map(choice).join('')}</div></section>`).join('');
  $('team-options').querySelectorAll('button').forEach(button=>button.onclick=()=>{
    if(busy)return;
    pendingSwap=null; const id=button.dataset.id;if(!selection.length)expandedBuilds.add(id); selection=selection.includes(id)?selection.filter(c=>c!==id):[...selection,id];
    renderChoices(); $('team-options').querySelector(`[data-id="${id}"]`).focus();
  });
  $('loadout-options').querySelectorAll('.character-build').forEach(node=>{if(node.open)expandedBuilds.add(node.dataset.build);else expandedBuilds.delete(node.dataset.build);});
  const describe=(c,m)=>buildTools?.describeMove(m,c.stats)??`${m.power??0} power`;
  $('loadout-options').innerHTML=selection.map(id=>{
    const c=catalog.find(c=>c.id===id);if(!c?.movePool)return '';
    const chosen=loadouts[id]??(loadouts[id]=[0,1,2,3]);
    return `<details class="character-build" data-build="${id}" ${expandedBuilds.has(id)?'open':''}><summary>${c.name} · four moves</summary><fieldset class="loadout"><legend>${c.name} · four moves</legend>
      <p class="passive-build"><strong>${escapeText(c.passive?.name??'Passive')}</strong> · ${escapeText(c.passive?.description??'')}</p>
      <p class="playstyle">${escapeText(c.playstyle??'Choose moves that support your preferred playstyle.')}</p>
      <details><summary>Character stats &amp; story</summary><p class="character-lore">${escapeText(c.lore??'')}</p><small>${Object.entries(c.stats).map(([k,v])=>`${k} ${v}`).join(' · ')}</small></details>
      <h4>Equipped</h4><div class="equipped-moves">${chosen.map(i=>{
        const m=c.movePool[i],fixed=c.signatureMoves.includes(i);
        return `<div class="build-move"><strong>${escapeText(m.name)}</strong><small>${escapeText(describe(c,m))}</small><span>${fixed?'Signature · fixed':'Flexible slot'}</span></div>`;
      }).join('')}</div>
      <h4>Try a different move</h4><p class="swap-hint">Choose an alternative, then choose which flexible move it replaces. Both signatures stay.</p>
      <div class="alternative-moves">${c.movePool.map((m,i)=>{
        if(chosen.includes(i))return '';
        return `<div class="build-move"><strong>${escapeText(m.name)}</strong><small>${escapeText(describe(c,m))}</small><button type="button" data-compare="${id}" data-pool="${i}" ${busy?'disabled':''}>Compare &amp; swap</button></div>`;
      }).join('')}</div>
      ${pendingSwap?.id===id?`<div class="swap-comparison" role="region" aria-label="Compare move replacement"><h4>Swap in ${escapeText(c.movePool[pendingSwap.index].name)}</h4><small>${escapeText(describe(c,c.movePool[pendingSwap.index]))}</small><p>Replace one of these:</p>${chosen.filter(i=>!c.signatureMoves.includes(i)).map(i=>`<button type="button" data-replace="${id}" data-old="${i}" ${busy?'disabled':''}><strong>${escapeText(c.movePool[i].name)} → ${escapeText(c.movePool[pendingSwap.index].name)}</strong><small>Before: ${escapeText(describe(c,c.movePool[i]))}</small><small>After: ${escapeText(describe(c,c.movePool[pendingSwap.index]))}</small></button>`).join('')}<button type="button" data-cancel-swap ${busy?'disabled':''}>Keep current build</button></div>`:''}
    </fieldset></details>`;
  }).join('');
  $('loadout-options').querySelectorAll('[data-compare]').forEach(button=>button.onclick=()=>{
    if(busy)return;
    pendingSwap={id:button.dataset.compare,index:Number(button.dataset.pool)};renderChoices();
    $('loadout-options').querySelector(`[data-replace="${pendingSwap.id}"]`)?.focus();
  });
  $('loadout-options').querySelectorAll('[data-replace]').forEach(button=>button.onclick=()=>{
    if(busy||!pendingSwap)return;
    const id=button.dataset.replace,c=catalog.find(c=>c.id===id);
    loadouts[id]=buildTools.replaceMove(loadouts[id],c.signatureMoves,Number(button.dataset.old),pendingSwap.index);
    pendingSwap=null;renderChoices();
    $('loadout-options').querySelector(`[data-compare="${id}"]`)?.focus();
  });
  $('loadout-options').querySelectorAll('[data-cancel-swap]').forEach(button=>button.onclick=()=>{if(busy)return;pendingSwap=null;renderChoices();});
  if($('lead-options')){
    $('lead-options').innerHTML=selection.map((id,i)=>{const c=catalog.find(c=>c.id===id);return `<button type="button" data-lead="${id}" ${busy||i===0?'disabled':''}>${i===0?'Lead: ':'Make lead: '}${escapeText(c?.name??id)} · Speed ${(c?.stats?.speed??0)+(c?.passive?.id==='trailblazer'?3:0)}</button>`;}).join('');
    $('lead-options').querySelectorAll('button').forEach(button=>button.onclick=()=>{if(busy)return;selection=[button.dataset.lead,...selection.filter(id=>id!==button.dataset.lead)];renderChoices();});
  }
  $('start-battle').disabled=busy || disconnected || selection.length!==3 || selection.some(id=>(loadouts[id]?.length??4)!==4);
  $('start-battle').textContent=busy?'Starting…':`Enter arena · ${selection.length} / 3`;
}
function openTeamPicker(fresh=false) {
  if (busy) return;
  $('switch-dialog').close();hideDetails();
  if(fresh){selection=[];loadouts={};pendingSwap=null;expandedBuilds.clear();}else selection=state?state.teams[0].map(c=>c.id):selection;
  $('team-cancel').hidden=!state;
  renderChoices();
  if (!$('team-dialog').open) $('team-dialog').showModal();
}
async function startBattle() {
  if (busy || selection.length!==3 || disconnected) return;
  busy=true;setError();renderChoices();render();
  try {
    const data=await request('/api/battle',{roster:selection,loadouts:Object.fromEntries(selection.map(id=>[id,loadouts[id]??[0,1,2,3]]))});
    state=data.openingState??data.state;
    $('team-dialog').close();render();
    if(data.frames?.length){await delay(FRAME_READ_MS);await presentFrames(data.frames);}
    state=data.state;
  } catch (error) { setError(error.status?error.message:'Could not start a battle. Check the server and try again.'); }
  finally { busy=false;renderChoices();render(); }
}
async function connect() {
  if (busy) return;
  busy=true;disconnected=false;setError();render();
  try {
    catalog=await request('/api/roster');
    try { state=(await request('/api/battle')).state; }
    catch (error) { if(error.status===404) state=null; else throw error; }
  } catch { disconnected=true;setError('Cannot reach the game server. Start it, then retry the connection.'); }
  finally {
    busy=false;render();
    if(!state) openTeamPicker();
    else if(!disconnected) {
      $('team-dialog').close();
      if(state.replacement===0) openSwitch();
    }
    if($('team-dialog').open) renderChoices();
  }
}
if($('move-reference-open'))$('move-reference-open').onclick=()=>{if(state)$('move-reference').showModal();};
$('switch-dialog').addEventListener('cancel',e=>{if(state?.replacement===0)e.preventDefault();});
function closeTeamPicker() {
  $('team-dialog').close();
  if(state && state.winner!==null)render();
  else if(state?.replacement===0)openSwitch();
}
$('team-dialog').addEventListener('cancel',e=>{
  if(!state || busy)e.preventDefault();
  else if(state.winner!==null){e.preventDefault();closeTeamPicker();}
});
$('team-cancel').onclick=()=>{if(!busy)closeTeamPicker();};
$('restart').onclick=()=>{if(!busy)$('settings-dialog').showModal();};
$('start-battle').onclick=startBattle;$('retry').onclick=connect;$('team-retry').onclick=connect;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideDetails();});
window.addEventListener('resize',hideDetails);
connect();

function playMoveEffect(animation,move){
  const arena=document.querySelector('.arena'),source=$(`fighter-${animation.actor}`),target=$(`fighter-${animation.target??animation.actor}`);
  if(!arena || !source?.getBoundingClientRect || !target?.getBoundingClientRect)return;
  const name=animation.moveName??move?.name??`${current(animation.actor).name} ${animation.kind}`;
  const seed=[...name].reduce((n,c)=>n+c.charCodeAt(0),0);
  const family=animation.kind==='heal'?'heal':/Spore|Fungal/.test(name)?'spore':/Spark|Static|Voltage|Coil|Current/.test(name)?'spark':/Strike|Slash|Fang|Jab|Kick|Fist|Bash|Volley|Shot|Arrow/.test(name)?'slash':/Ward|Shell|Coat|Screen|Snare/.test(name)?'shield':'spell';
  const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),r=arena.getBoundingClientRect();
  const effect=document.createElement('div');effect.className=`move-fx fx-${family}`;effect.setAttribute('aria-hidden','true');
  effect.style.cssText=`--hue:${seed%360};--spin:${seed%120-60}deg;left:${a.left+a.width/2-r.left}px;top:${a.top+a.height/2-r.top}px;--dx:${b.left+b.width/2-a.left-a.width/2}px;--dy:${b.top+b.height/2-a.top-a.height/2}px;--duration:${350+seed%100}ms`;
  for(let i=0;i<5+seed%5;i++){const particle=document.createElement('i');particle.style.setProperty('--i',i);effect.append(particle);}
  arena.append(effect);arena.classList.add('impact-light');setTimeout(()=>{effect.remove();arena.classList.remove('impact-light');},460);
}
if($('result-replay'))$('result-replay').onclick=()=>{$('result-dialog').close();openTeamPicker(true);};
