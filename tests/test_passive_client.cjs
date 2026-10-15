const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
function element(){return {open:false,hidden:false,innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(t,f){this.listeners[t]=f;},replaceChildren(){},querySelectorAll(){return [];},querySelector(){return element();},showModal(){this.open=true;},close(){this.open=false;},focus(){}};}
async function setup(){
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const c={id:'glowmire',name:'Glowmire',type:'Spirit',hp:40,maxHp:90,passive:{id:'last_light',name:'Last Light',description:'Survive once.'},passiveState:{lastLightUsed:true},moves:[{name:'Follow the Lantern',effect:'special',amount:0,description:'Heal a reserve and switch. Full explanation stays readable.',targets:[{index:1,label:'Mage · 80/100 HP'}]}]};
 const state={teams:[[c,{...c,id:'mage',name:'Mage'}],[{...c,id:'coil',name:'Coil'}]],active:[0,0],player:0,replacement:null,winner:null,turn:3,revision:2,actions:[{kind:'move',index:0,target:1}],log:[],initiative:{firstPlayer:0,reason:'Lead Speed 12 vs 10.'}};
 const requests=[];const context=vm.createContext({document:{getElementById:get,querySelector:get,querySelectorAll:()=>[],createElement:element,addEventListener(){}},window:{addEventListener(){}},setTimeout,clearTimeout,AbortSignal,fetch:async(path,opt)=>{requests.push([path,opt]);return {ok:true,json:async()=>path==='/api/roster'?[]:{state}};}});
 vm.runInContext(readFileSync(new URL('../frontend/script.js',`file://${__filename}`),'utf8'),context);await new Promise(setImmediate);return {context,get,requests};
}
test('targeted move opens an accessible choice without sending an action',async()=>{
 const {context,get,requests}=await setup();const count=requests.length;
 vm.runInContext('chooseMove(0)',context);
 assert.equal(get('target-dialog').open,true);
 assert.match(get('target-description').textContent,/Heal a reserve/);
 assert.match(get('target-options').innerHTML,/Mage/);
 assert.equal(requests.length,count);
 get('target-dialog').close();assert.equal(vm.runInContext('busy',context),false);
});
test('target identity is required by allowed and sent explicitly',async()=>{
 const {context,requests}=await setup();
 assert.equal(vm.runInContext('allowed("move",0)',context),true,'move remains enabled before choosing target');
 assert.equal(vm.runInContext('allowed("move",0,0)',context),false);
 await vm.runInContext('sendAction("move",0,1)',context);
 const body=JSON.parse(requests.find(([p])=>p==='/api/battle/actions')[1].body);
 assert.deepEqual(body,{kind:'move',index:0,target:1,revision:2});
});
test('passive state, full move explanations and opening reason are readable',async()=>{
 const {get}=await setup();
 assert.match(get('hud-0').innerHTML,/Last Light/);
 assert.match(get('hud-0').innerHTML,/used/i);
 assert.match(get('move-reference-copy').innerHTML,/Full explanation stays readable/);
 assert.match(get('initiative-message').textContent,/Lead Speed 12 vs 10/);
});

test('existing battle descriptions omit generic delivery and scaling labels',async()=>{
 const {context}=await setup();
 const ranged=vm.runInContext(`moveDescription({effect:'damage',contact:false,description:'Magic / ranged. Scales with Focus. A direct attack.'})`,context);
 assert.doesNotMatch(ranged,/Scales with|Uses Focus/);assert.doesNotMatch(ranged,/Ranged|Thorn Coat/);
 const contact=vm.runInContext(`moveDescription({effect:'damage',contact:true,description:'Physical. Scales with Power. Can trigger thorn retaliation. A direct attack.'})`,context);
 const newer=vm.runInContext(`moveDescription({effect:'damage',contact:false,description:'Magic. Ranged: avoids Thorn Coat retaliation. A direct attack.'})`,context);
 assert.equal(newer,'Magic. A direct attack.');
 assert.doesNotMatch(contact,/Scales with/);assert.doesNotMatch(contact,/Contact|Thorn Coat/);
});
