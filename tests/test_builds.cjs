const {test}=require('node:test');const assert=require('node:assert/strict');
const {replaceMove,describeMove}=require('../frontend/builds.js');
test('swapping a flexible move retains signatures and exactly four distinct moves',()=>{
 assert.deepEqual(replaceMove([0,1,2,3],[0,3],1,6),[0,6,2,3]);
 for(const [old,next] of [[0,6],[1,2],[99,6]])assert.throws(()=>replaceMove([0,1,2,3],[0,3],old,next));
});
test('move descriptions show delivery consequences without repeating attack stats',()=>{
 const text=describeMove({power:14,damage_type:'Elemental',description:'Choose a living enemy reserve. Does not arc again.'},{focus:12});
 assert.doesNotMatch(text,/Uses |Focus 12|Power 12/);assert.match(text,/Ranged.*avoids Thorn Coat/);assert.match(text,/Does not arc again/);
 const contact=describeMove({power:20,damage_type:'Physical',contact:true},{power:12});
 assert.match(contact,/Contact.*can trigger Thorn Coat/);assert.doesNotMatch(contact,/Uses Power/);
});
