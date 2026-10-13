const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createMastery,replaceMove,describeMove}=require('../frontend/mastery.js');
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
function match(id,actions=3,winner=null){return {matchId:id,humanActions:actions,winner,teams:[['mage','sporestag','glowmire'].map(id=>({id}))]};}
test('play earns progress regardless of victory, once per match across reloads',()=>{
 const s=storage(),m=createMastery(s);
 assert.equal(m.observe(match('a',2)),false);
 assert.equal(m.observe(match('a')),true);
 assert.equal(m.points('mage'),1);
 assert.equal(createMastery(s).observe(match('a',9,0)),false);
 assert.equal(m.observe(match('b',1,1)),true);
 assert.equal(m.points('glowmire'),2);
 assert.equal(m.observe(match('c',0,0)),false);
});
test('sidegrades and optional cosmetics have separate milestones and no stat bonus',()=>{
 const m=createMastery(storage());for(let i=0;i<6;i++)m.observe(match('m'+i));
 assert.equal(m.unlocked('mage'),true);assert.equal(m.cosmeticAvailable('mage'),true);
 assert.equal(m.equipped('mage'),false);m.toggleCosmetic('mage');assert.equal(m.equipped('mage'),true);
});
test('malformed or blocked storage never prevents play or unlocks from invalid data',()=>{
 const bad={getItem:()=>'{',setItem:()=>{throw Error('blocked')}};
 const m=createMastery(bad);assert.equal(m.points('mage'),0);assert.equal(m.observe(match('a')),true);assert.equal(m.saved(),false);
 const forged={getItem:()=>JSON.stringify({version:1,points:{mage:-4,coil:'99',bastion:1.5}}),setItem(){}};
 const n=createMastery(forged);assert.equal(n.points('mage'),0);assert.equal(n.points('coil'),0);assert.equal(n.points('bastion'),0);
});
test('replacement changes exactly one flexible slot, preserves signatures and four choices',()=>{
 assert.deepEqual(replaceMove([0,1,2,3],[0,2],1,4),[0,4,2,3]);
 assert.throws(()=>replaceMove([0,1,2,3],[0,2],0,4));
 assert.throws(()=>replaceMove([0,1,2,3],[0,2],1,3));
 const text=describeMove({power:6,effect:'guard',effect_amount:45,damage_type:'Magic'}, {power:8,focus:12});
 assert.match(text,/6 power/);assert.match(text,/45%/);assert.match(text,/Focus/);
});
test('Dread description reflects weakening below half HP, not switching or delayed damage',()=>{
 assert.match(describeMove({power:18,damage_type:'Magic',mechanic:'dread'}, {focus:12}),/half HP/);
});
test('a readable old save plus failed writes preserves earned points and claimed matches in memory',()=>{
 const s=storage();s.setItem('clashbound-mastery-v1',JSON.stringify({version:1,points:{mage:1},claimed:[],cosmetics:{}}));
 s.setItem=()=>{throw Error('full')};const m=createMastery(s);
 m.observe(match('a'));assert.equal(m.points('mage'),2);
 assert.equal(m.observe(match('a')),false);m.observe(match('b'));assert.equal(m.points('mage'),3);
});
test('equipping a cosmetic in a stale tab preserves newer rewards and deduplication',()=>{
 const s=storage(),a=createMastery(s);for(let i=0;i<6;i++)a.observe(match('a'+i));
 const b=createMastery(s);a.observe(match('latest'));b.toggleCosmetic('mage');
 const restored=createMastery(s);assert.equal(restored.points('mage'),7);assert.equal(restored.equipped('mage'),true);assert.equal(restored.observe(match('latest')),false);
});
test('distinct offline-write rewards and another tab’s saved rewards add up without double counting',()=>{
 const s=storage(),initial=createMastery(s);for(let i=0;i<6;i++)initial.observe(match('initial'+i));
 const write=s.setItem;let full=false;s.setItem=(k,v)=>{if(full)throw Error('full');write(k,v);};
 const a=createMastery(s),b=createMastery(s);full=true;a.observe(match('offline'));full=false;b.observe(match('other-tab'));
 a.toggleCosmetic('mage');const restored=createMastery(s);
 assert.equal(restored.points('mage'),8);assert.equal(restored.observe(match('offline')),false);assert.equal(restored.observe(match('other-tab')),false);
});
