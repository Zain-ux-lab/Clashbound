// All builds are available immediately; this module never reads or writes progress.
(function(root){
 function replaceMove(chosen,signatures,oldIndex,newIndex){
  if(signatures.includes(oldIndex)||!chosen.includes(oldIndex)||chosen.includes(newIndex))throw Error('Choose a flexible move to replace.');
  return chosen.map(i=>i===oldIndex?newIndex:i);
 }
 function describeMove(m,stats){
  const parts=[];
  if(m.power){parts.push(`${m.power} power · ${m.damage_type}`);parts.push(m.contact?'Contact: can trigger Thorn Coat retaliation':'Ranged: avoids Thorn Coat retaliation');}
  if(m.effect==='heal')parts.push(`Heals ${Math.floor(m.effect_amount*stats.recovery/10)} HP before the missing-health cap`);
  if(m.effect==='guard')parts.push(`${m.effect_amount}% protection against the next hit`);
  if(m.description)parts.push(m.description);
  else if(m.mechanic)parts.push(({echo:'Deals 10 delayed damage after your next action; switching cancels it',drain:'Heals from direct damage, capped at 4 HP',exploit:'+18 damage against a marked target',harvest:'+10 damage against a spored target',reprisal:'Adds half the last damage taken, capped at 15',phase:'Bypasses guard',dread:'If the target starts below half HP, weakens its next attack by 25%'})[m.mechanic]??m.mechanic);
  return parts.join(' · ');
 }
 const api={replaceMove,describeMove};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClashboundBuilds=api;
})(typeof window==='undefined'?globalThis:window);
