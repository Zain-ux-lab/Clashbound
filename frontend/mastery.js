// Local progression only: no accounts, stat bonuses or anti-cheat promises.
(function(root){
 const KEY='clashbound-mastery-v1';
 function createMastery(storage){
  let data={version:1,points:{},claimed:[],cosmetics:{}},persisted=!!storage;
  let pendingAwards=[],pendingCosmetics={};
  const points=id=>data.points[id]??0;
  function load(){
   try{
    const saved=JSON.parse(storage?.getItem(KEY)||'null');
    if(!saved||saved.version!==1)return;
    const next={version:1,points:{},cosmetics:{},claimed:Array.isArray(saved.claimed)?saved.claimed.filter(x=>typeof x==='string').slice(-256):[]};
    for(const [id,n] of Object.entries(saved.points??{}))if(/^[a-z]+$/.test(id)&&Number.isSafeInteger(n)&&n>=0)next.points[id]=Math.min(n,9999);
    for(const [id,on] of Object.entries(saved.cosmetics??{}))if(/^[a-z]+$/.test(id)&&on===true)next.cosmetics[id]=true;
    // Reapply only unsaved match awards, not a maximum of two totals.
    for(const award of pendingAwards)if(!next.claimed.includes(award.id)){
     for(const id of award.characters)next.points[id]=Math.min(9999,(next.points[id]??0)+1);
     next.claimed.push(award.id);
    }
    next.claimed=next.claimed.slice(-256);Object.assign(next.cosmetics,pendingCosmetics);data=next;
   }catch{persisted=false;}
  }
  function save(){
   try{if(!storage)throw Error('No storage');storage.setItem(KEY,JSON.stringify(data));persisted=true;pendingAwards=[];pendingCosmetics={};}
   catch{persisted=false;}
  }
  load();
  return {
   points,saved:()=>persisted,
   unlocked:id=>points(id)>=3,cosmeticAvailable:id=>points(id)>=6,
   equipped:id=>points(id)>=6&&data.cosmetics[id]===true,
   toggleCosmetic(id){load();if(points(id)<6)return;data.cosmetics[id]=!data.cosmetics[id];pendingCosmetics[id]=data.cosmetics[id];save();},
   observe(state){
    if(!state?.matchId||!Number.isInteger(state.humanActions)||state.humanActions<1)return false;
    if(state.humanActions<3&&![0,1].includes(state.winner))return false;
    load();
    if(data.claimed.includes(state.matchId)){if(pendingAwards.length||Object.keys(pendingCosmetics).length)save();return false;}
    const characters=state.teams[0].map(c=>c.id);
    for(const id of characters)data.points[id]=Math.min(9999,points(id)+1);
    pendingAwards.push({id:state.matchId,characters});
    data.claimed.push(state.matchId);data.claimed=data.claimed.slice(-256);save();return true;
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
 const api={createMastery,replaceMove,describeMove};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClashboundMastery=api;
})(typeof window==='undefined'?globalThis:window);
