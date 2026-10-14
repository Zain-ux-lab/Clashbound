const {test}=require('node:test');const assert=require('node:assert/strict');
const {replaceMove,describeMove}=require('../frontend/builds.js');
test('swapping a flexible move retains signatures and exactly four distinct moves',()=>{
 assert.deepEqual(replaceMove([0,1,2,3],[0,3],1,6),[0,6,2,3]);
 for(const [old,next] of [[0,6],[1,2],[99,6]])assert.throws(()=>replaceMove([0,1,2,3],[0,3],old,next));
});
test('new move explanations remain complete and Elemental attacks use Focus',()=>{
 const text=describeMove({power:14,damage_type:'Elemental',description:'Choose a living enemy reserve. Does not arc again.'},{focus:12});
 assert.match(text,/Focus 12/);assert.match(text,/Does not arc again/);
});
