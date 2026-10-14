// Local progression only: no accounts, stat bonuses or anti-cheat promises.
(function(root){
 const LEGACY_KEY='clashbound-mastery-v1';
 const AWARD_PREFIX='clashbound-mastery-v2:award:';
 const CREST_PREFIX='clashbound-mastery-v2:crest:';
 function createMastery(storage){
  let legacy={points:{},claimed:[],cosmetics:{}},persisted=!!storage;
  const pendingAwards=new Map(),pendingCrests=new Map();
  let awards=new Map(),crests={};
  try{
   const saved=JSON.parse(storage?.getItem(LEGACY_KEY)||'null');
   if(saved?.version===1){
    for(const [id,n] of Object.entries(saved.points??{}))if(/^[a-z]+$/.test(id)&&Number.isSafeInteger(n)&&n>=0)legacy.points[id]=Math.min(n,9999);
    legacy.claimed=Array.isArray(saved.claimed)?saved.claimed.filter(x=>typeof x==='string'):[];
    for(const [id,on] of Object.entries(saved.cosmetics??{}))if(/^[a-z]+$/.test(id)&&on===true)legacy.cosmetics[id]=true;
   }
  }catch{persisted=false;}
  function refresh(){
   awards=new Map();crests={...legacy.cosmetics};
   try{
    // ponytail: scan tiny local reward records; use IndexedDB if thousands of matches make it slow.
    for(let i=0;i<(storage?.length??0);i++){
     const key=storage.key(i);
     if(key?.startsWith(AWARD_PREFIX)){
      try{const value=JSON.parse(storage.getItem(key));
       if(value?.version===2&&Array.isArray(value.characters)&&value.characters.length===3&&new Set(value.characters).size===3&&value.characters.every(id=>/^[a-z]+$/.test(id)))awards.set(key,value.characters);
      }catch{persisted=false;}
     }else if(key?.startsWith(CREST_PREFIX)){
      const id=key.slice(CREST_PREFIX.length),value=storage.getItem(key);
      if(/^[a-z]+$/.test(id)&&['true','false'].includes(value))crests[id]=value==='true';
     }
    }
   }catch{persisted=false;}
   for(const [key,characters] of pendingAwards)awards.set(key,characters);
   for(const [id,on] of pendingCrests)crests[id]=on;
  }
  function flush(){
   let ok=!!storage;
   for(const [key,characters] of pendingAwards){
    try{if(!storage)throw Error('No storage');storage.setItem(key,JSON.stringify({version:2,characters}));pendingAwards.delete(key);}
    catch{ok=false;}
   }
   for(const [id,on] of pendingCrests){
    try{if(!storage)throw Error('No storage');storage.setItem(CREST_PREFIX+id,String(on));pendingCrests.delete(id);}
    catch{ok=false;}
   }
   persisted=ok;
  }
  const legacyClaims=new Set(legacy.claimed.map(id=>AWARD_PREFIX+encodeURIComponent(id)));
  function points(id){refresh();let n=legacy.points[id]??0;for(const [key,characters] of awards)if(!legacyClaims.has(key)&&characters.includes(id))n++;return Math.min(9999,n);}
  return {
   points,saved:()=>persisted,
   unlocked:id=>points(id)>=3,cosmeticAvailable:id=>points(id)>=6,
   equipped(id){return points(id)>=6&&crests[id]===true;},
   toggleCosmetic(id){if(points(id)<6)return;pendingCrests.set(id,crests[id]!==true);flush();},
   observe(state){
    if(!state?.matchId||!Number.isInteger(state.humanActions)||state.humanActions<1)return false;
    if(state.humanActions<3&&![0,1].includes(state.winner))return false;
    refresh();const key=AWARD_PREFIX+encodeURIComponent(state.matchId);
    if(legacyClaims.has(key)||awards.has(key)){if(pendingAwards.size||pendingCrests.size)flush();return false;}
    pendingAwards.set(key,state.teams[0].map(c=>c.id));flush();return true;
   },
  };
 }
 function replaceMove(chosen,signatures,oldIndex,newIndex){
  if(signatures.includes(oldIndex)||!chosen.includes(oldIndex)||chosen.includes(newIndex))throw Error('Choose a flexible move to replace.');
  return chosen.map(i=>i===oldIndex?newIndex:i);
 }
 function describeMove(m,stats){
  const parts=[];
  if(m.power){parts.push(`${m.power} power · ${m.damage_type} · ${m.contact?'contact':'ranged'}`);parts.push(`Uses ${m.damage_type==='Physical'?'Power '+stats.power:'Focus '+stats.focus}`);}
  if(m.effect==='heal')parts.push(`Heals ${Math.floor(m.effect_amount*stats.recovery/10)} HP before the missing-health cap`);
  if(m.effect==='guard')parts.push(`${m.effect_amount}% protection against the next hit`);
  if(m.description)parts.push(m.description);
  else if(m.mechanic)parts.push(({echo:'Deals 10 delayed damage after your next action; switching cancels it',drain:'Heals from direct damage, capped at 4 HP',exploit:'+18 damage against a marked target',harvest:'+10 damage against a spored target',reprisal:'Adds half the last damage taken, capped at 15',phase:'Bypasses guard',dread:'If the target starts below half HP, weakens its next attack by 25%'})[m.mechanic]??m.mechanic);
  return parts.join(' · ');
 }
 const CRESTS={
  mage:['Runekeeper','M12 2 14 9 21 12 14 15 12 22 10 15 3 12 10 9Z'],
  sporestag:['Grovekeeper','M12 22V12M12 14C2 15 2 4 3 3 12 3 15 10 12 14ZM12 17C22 18 22 7 21 6 14 6 10 13 12 17Z'],
  glowmire:['Beaconkeeper','M8 6V4A4 4 0 0 1 16 4V6M6 6H18L20 20H4ZM12 10 15 15 12 18 9 15Z'],
  bramblebelly:['Thornkeeper','M5 22 19 2M8 18 3 11 12 13M13 11 12 3 17 6M16 6 22 7 18 11'],
  veyne:['Trailkeeper','M4 20 20 4M12 4H20V12M4 13 4 20 11 20'],
  coil:['Stormkeeper','M14 2 5 13H11L9 22 20 10H13Z'],
  bastion:['Stonekeeper','M12 2 21 6V13Q21 19 12 22 3 19 3 13V6ZM12 7V17M8 12H16'],
  vesperfang:['Duskkeeper','M12 9 3 4 2 15 7 13 12 19 17 13 22 15 21 4ZM12 9V19'],
  hushwing:['Moonkeeper','M12 4 10 2 10 6 12 7 14 6 14 2ZM5 9 2 7 2 11 5 12 7 11 7 7ZM19 9 17 7 17 11 19 12 22 11 22 7ZM8 17 5 15 5 19 8 21 10 19 10 15ZM16 17 14 15 14 19 16 21 19 19 19 15Z'],
  riftclaw:['Riftkeeper','M9 3A9 9 0 0 0 9 21M15 3A9 9 0 0 1 15 21M13 3 9 10 15 13 11 21'],
 };
 function crestMarkup(id){const crest=CRESTS[id];return crest?`<span class="mastery-crest" role="img" aria-label="${crest[0]} crest, cosmetic only" title="${crest[0]} crest · cosmetic only"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${crest[1]}"/></svg></span>`:'';}
 const api={createMastery,replaceMove,describeMove,crestMarkup};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClashboundMastery=api;
})(typeof window==='undefined'?globalThis:window);
