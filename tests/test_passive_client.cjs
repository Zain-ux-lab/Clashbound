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

test('team cards describe special abilities without inventing attack power',async()=>{
 const {context,get}=await setup();
 vm.runInContext(`catalog=[{id:'mage',name:'Mage',type:'Magic',maxHp:100,moves:[{name:'Forbidden Script',effect:'special',description:'Cast a recorded spell.'}]}];renderChoices();`,context);
 assert.doesNotMatch(get('team-options').innerHTML,/undefined|NaN/);
 assert.match(get('team-options').innerHTML,/Forbidden Script · ability/);
});

test('formation-changing effects do not animate the new fighter as the old actor',async()=>{
 const {context}=await setup();
 context.effects=[];
 context.setTimeout=callback=>{callback();return 0;};
 vm.runInContext(`playMoveEffect=animation=>effects.push(animation);state.active=[1,0];`,context);
 await vm.runInContext(`presentFrames([{...state,animation:{kind:'special',actor:0,actorSlot:0}}])`,context);
 assert.equal(context.effects.length,0);
 await vm.runInContext(`presentFrames([{...state,animation:{kind:'heal',actor:0,actorSlot:1}}])`,context);
 assert.equal(context.effects.length,1);
});

test('passive state text contrasts with the cream health panel',()=>{
 const css=readFileSync(new URL('../frontend/builds.css',`file://${__filename}`),'utf8');
 const color=css.match(/\.passive-state\{[^}]*color:(#[0-9a-f]{6})/i)[1];
 const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const values=[luminance(color),luminance('#e9e6d4')].sort((a,b)=>b-a);
 assert.ok((values[0]+.05)/(values[1]+.05)>=4.5,`Unreadable passive color ${color}`);
});
