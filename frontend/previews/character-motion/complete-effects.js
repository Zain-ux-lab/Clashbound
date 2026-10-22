// Individually timed move studies. No randomness, combat state, or external animation dependency.
function stroke(points,color,width=3,a=1){line(points,color,width,a)}
function arc(x,y,r,start,end,color,width=3,a=1){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.restore()}
function oval(x,y,rx,ry,color,a=1){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function slash(x,y,angle,length,color,a=1,width=7){ctx.save();ctx.translate(x,y);ctx.rotate(angle);poly([[-length/2,0],[length*.24,-width],[length/2,0],[-length*.22,width*.4]],color,a);ctx.restore()}
function ringRune(x,y,r,color,a=1){ctx.save();ctx.translate(x,y);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);stroke([[r,-12],[r,12],[r-6,4]],color,2,a)}ctx.restore()}
function wing(x,y,size,color,a=1,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(size*flip,size);poly([[-25,-9],[-13,-3],[-5,-10],[0,-3],[6,-10],[15,-3],[25,-9],[17,8],[7,5],[0,13],[-7,5],[-17,8]],color,a);ctx.restore()}
function burst(x,y,color,p,size=30){const a=1-p;for(let i=0;i<5;i++){const angle=i*1.32-.7,r=10+size*ease(p);slash(x+Math.cos(angle)*r,y+Math.sin(angle)*r,angle,10*(1-p)+4,color,a,3)}}
function arrow(x,y,angle,color,a=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);stroke([[-44,0],[9,0]],color,2,a);poly([[17,0],[4,-5],[6,0],[4,5]],color,a);stroke([[-34,0],[-41,-5],[-35,0],[-41,5]],'#81745d',2,a);ctx.restore()}
function vine(points,color,a=1){stroke(points,color,4,a);for(let i=1;i<points.length-1;i++){const [x,y]=points[i];poly([[x,y],[x-9,y-12],[x+2,y-4]],color,a)}}
function lightning(points,color,a=1,width=3){stroke(points,'#302a1f',width+4,a*.7);stroke(points,color,width,a)}
function crack(x,y,p,color,a=1){stroke([[x-12,y-75*p],[x+4,y-34*p],[x-8,y],[x+9,y+30*p],[x-3,y+67*p]],'#080b16',9,a);stroke([[x-16,y-75*p],[x,y-34*p],[x-12,y],[x+5,y+30*p],[x-7,y+67*p]],color,2,a)}
function orbitBits(x,y,p,color,count=5){for(let i=0;i<count;i++){const angle=i*Math.PI*2/count+p*2;diamond(x+Math.cos(angle)*36,y+Math.sin(angle)*25,3,5,color,Math.sin(Math.PI*clamp(p)))}}
function drawComplete(t,c){
 const id=c.character,n=c.name,col=c.color,d=c.duration,u=t/d,at=t>=0;
 const q=clamp((u-.12)/.32),impact=clamp((u-.44)/.35),a=1-impact,hit=u>=.44;
 const support=['heal','guard'].includes(c.kind)||['escort','relief','seal','shed'].includes(c.mechanic);
 const targetX=850,targetY=407,casterX=c.contact?650:350,casterY=409;let dx=0,dy=0;
 if(at&&id==='glowmire')dy=-4*Math.sin(clamp(u)*Math.PI);
 ctx.clearRect(0,0,1280,720);ctx.drawImage(assets.arena,0,0,1280,720);ctx.fillStyle='#07101b66';ctx.fillRect(0,0,1280,720);
 const shade=ctx.createLinearGradient(0,490,0,720);shade.addColorStop(0,'#070c1200');shade.addColorStop(1,'#070c12ef');ctx.fillStyle=shade;ctx.fillRect(0,490,1280,230);
 const heights={sporestag:315,riftclaw:315,hushwing:345,glowmire:385,vesperfang:410};
 const damaging=c.kind==='attack'||c.mechanic==='copy';
 const selfHit=c.mechanic==='seal';
 const recoil=hit&&damaging?Math.sin(impact*Math.PI)*12*(1-impact):0;
 if(c.contact&&ACTION_RIGS[id])posedCharacter(assets[id],id,casterX,592,heights[id]||420,u,n);else character(assets[id],casterX,592,heights[id]||420,false,dx,dy);
 dx=casterX-350;
 const enemy=id==='mage'?'bastion':'mage';character(assets[enemy],905,592,420,true,recoil,0,hit&&damaging&&u<.49?1.5:1);
 bar(casterX,610,c.kind==='heal'&&at?.7+.3*ease((u-.44)/.3):selfHit&&hit?.85:1,c.characterName.toUpperCase());bar(901,610,hit&&damaging&&c.mechanic!=='ground_fault'?1-.16*ease((u-.44)/.2):1,enemy.toUpperCase());
 if(at){
 const X=support?casterX:targetX,Y=support?casterY:targetY;
 // Every branch below is a named choreography, rather than a palette swap.
 if(id==='mage'){
  if(n==='Staff Strike'){if(u>.2&&u<.6){slash(400+dx,402,-.85,105,'#9cacc2',1-clamp((u-.44)/.16),5)}if(hit&&u<.8)burst(837,415,'#c2c9d0',impact,17)}
  if(n==='Spell Echo'){for(let i=0;i<2;i++){const p=clamp((u-.17-i*.17)/.22);if(p>0&&p<1)diamond(463+380*p,250+155*p,11-i*3,5,col,1);const k=clamp((u-.39-i*.17)/.2);if(k>0&&k<1){ringRune(850,407,19+14*k,col,1-k);slash(850,407,-.8,42,col,1-k)}}}
  if(n==='Forbidden Script'){if(u<.4){ringRune(460,260,30-15*ease(u/.4),col,Math.sin(u/.4*Math.PI));stroke([[443,249],[454,249],[449,261],[460,261],[454,273]],'#f1ffff',2,Math.sin(u/.4*Math.PI))}if(u>.25&&u<.5){const p=(u-.25)/.25;diamond(460+390*p,260+147*p,10,17,'#d2d2f0',1)}if(hit&&u<.85){ringRune(850,407,33,col,a);stroke([[835,383],[858,383],[842,407],[861,407],[845,431]],'#eee3f5',3,a)}}
  if(n==='Sapping Rune'){if(u>.12&&u<.82){const p=ease((u-.12)/.3),f=1-clamp((u-.6)/.22);stroke([[828,385],[850,373],[872,385],[862,421],[850,437],[838,421],[828,385]],col,2,p*f);stroke([[850,385],[843,399],[858,405],[850,423]],'#b0b6d5',3,p*f);for(let i=0;i<3;i++)slash(833+i*16,442+24*impact,1.5,13,col,impact*f,3)}}
  if(n==='Spectral Lance'){if(u>.16&&u<.48){const p=clamp((u-.16)/.28),x=462+390*p,y=249+158*p;slash(x,y,.38,140,'#b3c5f0',1,6);slash(x+14,y+6,.38,78,'#f6edff',1,2)}if(hit&&u<.75){slash(850,407,.38,100,'#d7d4f6',a,3);burst(850,407,'#acb9dc',impact,25)}}
  if(n==='Rune Aegis'){if(u>.12&&u<.8){const p=ease((u-.12)/.25);for(let i=0;i<3;i++){ringRune(350,365+i*48,25+20*p,col,(1-clamp((u-.55)/.25))*.8)}stroke([[330,318],[350,301],[370,318]],'#e0faff',2,p*a)}}
 }
 if(id==='sporestag'){
  if(n==='Horn Jab'){if(u>.25&&u<.6){slash(408+dx,454,-.1,76,'#b5ad80',a,9);slash(407+dx,479,.1,62,'#d0c99a',a,6)}if(hit&&u<.8)burst(834,457,'#d6cba3',impact,14)}
  if(n==='Spore Cloud'||n==='Fungal Haze'){const haze=n==='Fungal Haze';for(let i=0;i<11;i++){const start=.12+(i%4)*.025,p=clamp((u-start)/.48),f=Math.sin(Math.PI*p);if(p>0&&p<1){const x=410+430*p+(i%3-1)*19,y=420+Math.sin(p*Math.PI)*(i-5)*13;oval(x,y,haze?10:5,haze?7:4,haze?'#888f64':'#c1c77a',f*.7);oval(x-2,y-3,2,2,'#d8d3a1',f)}}}
  if(n==='Antler Harvest'){if(u<.45&&u>.16){for(let i=0;i<3;i++)slash(847,395+i*15,-.75,45,col,q,4)}if(hit&&u<.9){for(let i=0;i<5;i++){const p=clamp((u-.44-i*.025)/.34);oval(850-500*p,414+Math.sin(p*Math.PI)*40+(i-2)*8,4,3,'#b6c272',Math.sin(p*Math.PI))}}}
  if(n==='Shed the Husk'){if(u>.15&&u<.85){const p=clamp((u-.15)/.6);for(let i=0;i<4;i++){const x=350+(i-1.5)*(18+35*p),y=450+70*p;poly([[x-11,y-25],[x+10,y-20],[x+16,y],[x-4,y+12]],'#827b5c',(1-p)*.8)}oval(350,540,57,8,'#c8d69a',Math.sin(p*Math.PI)*.4)}}
  if(n==='Chitin Kick'&&hit&&u<.8)burst(812,465,'#ded3ac',impact,13);
  if(n==='Chitin Shell'){if(u>.12&&u<.82){const p=ease((u-.12)/.3),f=1-clamp((u-.6)/.22);for(let i=0;i<4;i++){const x=310+i*27;stroke([[x-12,448+25*(1-p)],[x,426],[x+13,447],[x+10,488]],'#c3be89',3,f*p)}}}
  if(n==='Bark Lance'){if(u>.16&&u<.5){const p=clamp((u-.16)/.28),x=410+440*p;poly([[x-75,455],[x-18,447],[x+18,456],[x-19,463]],'#a28b5a');stroke([[x-60,456],[x,456]],'#d3c28d',2)}if(hit&&u<.8)burst(850,455,'#bca777',impact,23)}
 }
 if(id==='glowmire'){
  if(n==='Ember Beam'){if(u>.17&&u<.56){const p=clamp((u-.17)/.27),f=1-clamp((u-.44)/.12);stroke([[404,372],[490,360],[600,388],[730,378],[405+445*p,398]],'#aa563a',15,f*.5);stroke([[404,372],[500,372],[610,391],[405+445*p,398]],'#f5bf70',5,f)}if(hit&&u<.8)burst(850,398,'#efbb73',impact,27)}
  if(n==='Soul Siphon'){if(u>.2&&u<.84){const p=clamp((u-.2)/.64);for(let i=0;i<5;i++){const k=clamp((p-i*.06)/.7);oval(850-480*k,407-37*Math.sin(k*Math.PI)+(i-2)*8,7*(1-k)+2,3,'#f1bd79',Math.sin(k*Math.PI))}}}
  if(n==='Lantern Flare'){if(u>.15&&u<.85){const p=clamp((u-.15)/.7);for(let i=0;i<5;i++){const x=350+(i-2)*15,y=465-90*ease(p)+Math.abs(i-2)*12;poly([[x-5,y],[x,y-20],[x+7,y+4],[x,y+12]],'#f8c575',Math.sin(p*Math.PI))}oval(350,535,48,10,'#e6ab59',Math.sin(p*Math.PI)*.2)}}
  if(n==='Revealing Light'){if(u>.16&&u<.8){const p=ease((u-.16)/.35),f=1-clamp((u-.6)/.2);poly([[407,363],[850,325+55*(1-p)],[850,478-55*(1-p)]],'#e2b96c',p*f*.12);arc(850,407,46,-1.4,1.4,'#f6d99f',3,f*p);oval(850,407,4,7,'#fff0c6',p*f)}}
  if(n==='Ghost Spark'){if(u>.15&&u<.5){const p=clamp((u-.15)/.29);const x=405+445*p,y=375+32*p-24*Math.sin(p*Math.PI);oval(x,y,12,6,'#e6bd88');slash(x-12,y,-.25,34,'#a58163',.6,3)}if(hit&&u<.8){arc(850,407,12+22*impact,0,Math.PI*1.4,'#f0cf9e',3,a)}}
  if(n==='Lantern Ward'||n==='Beacon Aegis'){const beacon=n==='Beacon Aegis';if(u>.14&&u<.82){const p=ease((u-.14)/.3),f=1-clamp((u-.6)/.22);arc(350,420,60*p,Math.PI*.95,Math.PI*2.05,'#edba73',beacon?5:3,f);stroke([[307,462],[307,380],[350,352],[393,380],[393,462]],'#bc8c50',2,p*f);if(beacon)stroke([[350,345],[350,315]],'#ffe0a1',5,p*f)}}
  if(n==='Follow the Lantern'){if(u>.15&&u<.9){const p=clamp((u-.15)/.75);for(let i=0;i<4;i++){const x=355+i*38,y=531-8*Math.sin(i);oval(x,y,4,7,'#f2c77c',Math.sin(clamp(p*1.5-i*.15)*Math.PI))}arc(499,450,35,-Math.PI/2,Math.PI/2,'#dcb071',3,Math.sin(p*Math.PI))}}
 }
 if(id==='bramblebelly'){
  if(n==='Bramble Bash'&&hit&&u<.85){for(let i=0;i<3;i++)slash(842,318+i*10,-.2,30,'#e4b088',a,5-i);burst(842,330,'#bd8060',impact,19)}
  if(n==='Root Snare'||n==='Briar Aegis'){if(u>.12&&u<.85){const p=ease((u-.12)/.35),f=1-clamp((u-.65)/.2);for(const side of [-1,1])vine([[350+side*55,565],[350+side*60,525-70*p],[350+side*48,500-100*p],[350+side*28,465-95*p]],n==='Root Snare'?'#8d9a63':'#b0a372',p*f)}}
  if(n==='Thorn Burst'){for(let i=0;i<5;i++){const p=clamp((u-.15-i*.035)/.27);if(p>0&&p<1){const x=400+450*p,y=445+(i-2)*9*Math.sin(p*Math.PI);poly([[x-15,y+4],[x+13,y],[x-8,y-5]],'#aa9b6b')}}if(hit&&u<.8)burst(850,440,'#b6a772',impact,23)}
  if(n==='Thorn Coat'){if(u>.15&&u<.83){const p=ease((u-.15)/.3),f=1-clamp((u-.65)/.18);for(let i=0;i<7;i++){const an=i*.65-2.4,x=350+Math.cos(an)*65,y=421+Math.sin(an)*90;poly([[x-5,y+5],[x+Math.cos(an)*18*p,y+Math.sin(an)*18*p],[x+5,y+6]],'#b6a878',f*p)}}}
  if(n==='Drag Through the Thorns'){if(u>.17&&u<.9){const p=ease((u-.17)/.27),pull=ease((u-.48)/.32),f=1-clamp((u-.75)/.15);vine([[400,545],[550,530],[700,548],[400+450*p-55*pull,520]],'#a48d62',f);stroke([[827-55*pull,507],[842-55*pull,530],[820-55*pull,537]],'#cfb084',3,f*p)}}
  if(n==='Second Wind'){if(u>.2&&u<.85){const p=clamp((u-.2)/.65);for(let i=0;i<3;i++){stroke([[315,480+i*13-50*p],[340,467+i*13-50*p],[368,475+i*13-50*p]],'#e7b893',3,Math.sin(p*Math.PI))}}}
  if(n==='Stone Toss'){if(u>.15&&u<.5){const p=clamp((u-.15)/.29),x=400+450*p,y=410-100*Math.sin(p*Math.PI);ctx.save();ctx.translate(x,y);ctx.rotate(p*3);poly([[-10,-7],[4,-12],[13,-1],[5,11],[-9,6]],'#a79583');poly([[-10,-7],[4,-12],[1,0]],'#d0c0a4');ctx.restore()}if(hit&&u<.8)burst(850,410,'#baa58c',impact,17)}
 }
 if(id==='veyne'){
  if(['Steady Shot','Runic Arrow','Spirit Arrow','Disarming Shot'].includes(n)){const spirit=n==='Spirit Arrow',rune=n==='Runic Arrow';const shotcol=spirit?'#b2accc':rune?'#c5a47b':col;if(u>.16&&u<.47){const p=clamp((u-.16)/.28);arrow(420+430*p,319+88*p,.05,shotcol);if(rune)ringRune(420+430*p,319+88*p,13,shotcol,.7)}if(hit&&u<.8){if(n==='Disarming Shot'){stroke([[834,422],[852,443],[871,437]],'#e2d2ac',3,a);slash(858,453,1.3,25,'#a88d70',a,4)}else burst(850,407,shotcol,impact,13)}}
  if(n==='Piercing Volley'){for(let i=0;i<3;i++){const p=clamp((u-.12-i*.09)/.24);if(p>0&&p<1)arrow(420+430*p,319+i*13+88*p,.03,col);const k=clamp((u-.36-i*.09)/.2);if(k>0&&k<1)slash(850,395+i*16,.05,33,col,1-k,2)}}
  if(n==='Mark Prey'){if(u>.14&&u<.83){const p=ease((u-.14)/.27),f=1-clamp((u-.65)/.18);const r=48-20*p;stroke([[850-r,392],[850-r,377],[865,377]],'#dbb39a',2,p*f);stroke([[850+r,422],[850+r,437],[835,437]],'#dbb39a',2,p*f);stroke([[850,398],[850,416]],'#d7b397',2,p*f)}}
  if(n==='Called Shot'){if(u>.12&&u<.86){const p=ease((u-.12)/.38),f=1-clamp((u-.68)/.18);for(const side of [-1,1])stroke([[850+side*(54-25*p),380],[850+side*(54-25*p),407],[850+side*(66-25*p),407]],'#e9dec1',2,p*f);stroke([[827,445],[873,445]],'#987a5c',2,p*f);oval(850,407,2,2,'#f9ead0',p*f)}}
  if(n==='Close Quarters'){if(u>.25&&u<.63){stroke([[390+dx,400],[425+dx,382]],'#ddcdb5',7,a);stroke([[391+dx,408],[420+dx,390]],'#86705c',3,a)}if(hit&&u<.8)burst(834,395,col,impact,14)}
 }
 if(id==='coil'){
  if(n==='Spark Bolt'){if(u>.17&&u<.59){const p=clamp((u-.17)/.27),f=1-clamp((u-.44)/.15);lightning([[410,388],[477,375],[498,400],[569,379],[592,404],[670,386],[706,418],[410+440*p,407]],col,f,3)}if(hit&&u<.8)burst(850,407,col,impact,16)}
  if(n==='Coil Lash'||n==='Live Wire'){if(u>.17&&u<.65){const p=ease((u-.17)/.27),f=1-clamp((u-.48)/.17);const start=400+dx;stroke([[start,403],[start+60,362],[start+110,397],[start+145*p,438]],'#b67f4b',5,f);if(n==='Live Wire')lightning([[start,403],[start+55,378],[start+70,400],[start+100,386],[start+145*p,438]],col,f,2)}if(hit&&u<.8)burst(845,425,col,impact,20)}
  if(n==='Static Lock'){if(u>.15&&u<.85){const p=ease((u-.15)/.29),f=1-clamp((u-.65)/.2);for(let i=0;i<3;i++){const y=375+i*32;stroke([[820,y-8],[814,y],[824,y+9]],'#bd925d',4,p*f);stroke([[880,y-8],[886,y],[876,y+9]],'#bd925d',4,p*f);lightning([[827,y],[838,y-5],[847,y+4],[861,y]],col,p*f,2)}}}
  if(n==='Voltage Leak'){if(u>.2&&u<.85){const p=clamp((u-.2)/.65);lightning([[840,365],[853,390],[840,409],[852,434],[839,459]],col,Math.sin(p*Math.PI),2);for(let i=0;i<3;i++){const y=389+i*28+18*p;stroke([[861,y],[875,y+7],[871,y+15]],'#b2a36b',2,Math.sin(p*Math.PI))}}}
  if(n==='Magnetic Screen'){if(u>.13&&u<.83){const p=ease((u-.13)/.31),f=1-clamp((u-.64)/.19);for(let i=0;i<3;i++){arc(350,414,48+i*10,Math.PI*.65,Math.PI*(.65+1.7*p),'#b78351',3,f);if(i===1)arc(350,414,58,-.5,.6,col,2,f*p)}}}
  if(n==='Soul Current'){if(u>.17&&u<.62){const p=clamp((u-.17)/.27),f=1-clamp((u-.44)/.18);for(let i=0;i<2;i++){const pts=[];for(let j=0;j<8;j++){const x=410+j*63*p;pts.push([x,404+Math.sin(j*1.7+i*Math.PI)*12])}stroke(pts,i?'#d7c3ab':'#a7b779',3,f)}}}
  if(n==='Ground Fault'){if(u>.14&&u<.8){const p=clamp((u-.14)/.3),f=1-clamp((u-.55)/.25);lightning([[399,548],[470,536],[510,552],[604,538],[658,553],[730,540],[875*p+399*(1-p),543]],'#bcd37a',f,3);if(hit){lightning([[1000,539],[990,513],[1005,492],[996,465]],col,f,3);stroke([[972,553],[1026,553]],'#b58452',3,f);text('RESERVE',1000,578,11,'#9aab8b')}}}
 }
 if(id==='bastion'){
  if(n==='Reprisal'&&hit&&u<.82){stroke([[821,379],[843,397],[830,414],[853,435]],'#ecd39c',4,a);burst(840,407,col,impact,18)}
  if(n==='Shield Bash'||n==='Shield Wall'){if(u>.15&&u<.85){const p=ease((u-.15)/.29),f=1-clamp((u-.65)/.2);const x=410+dx;stroke([[x-26,360],[x,345],[x+29,362],[x+24,430],[x,454],[x-24,430],[x-26,360]],col,4,p*f);stroke([[x,357],[x,438]],'#f1dca3',2,p*f);if(n==='Shield Wall')stroke([[x-48,382],[x-48,450],[x+48,450],[x+48,382]],'#9c874d',4,p*f)}}
  if(n==='Stone Fist'){if(u>.25&&u<.64){poly([[389+dx,401],[420+dx,389],[440+dx,399],[439+dx,420],[410+dx,430],[390+dx,418]],'#a9a18b',a);stroke([[403+dx,398],[409+dx,416],[429+dx,412]],'#e5d7ad',3,a)}if(hit&&u<.8)burst(840,410,'#ceb779',impact,18)}
  if(n==='Rune Pulse'){if(u>.15&&u<.8){const p=clamp((u-.15)/.29),f=1-clamp((u-.44)/.36);ringRune(410+440*p,405,15+15*p,col,f);if(hit){stroke([[825,407],[850,380],[875,407],[850,434],[825,407]],'#e4c986',3,f)}}}
  if(n==='Rally'){if(u>.17&&u<.85){const p=ease((u-.17)/.35),f=1-clamp((u-.64)/.21);stroke([[327,495-65*p],[350,469-65*p],[373,495-65*p]],col,5,f);stroke([[327,516-65*p],[350,490-65*p],[373,516-65*p]],'#b59c63',3,f)}}
  if(n==='Crushing Shout'){if(u>.15&&u<.75){for(let i=0;i<3;i++){const p=clamp((u-.15-i*.05)/.32);if(p>0&&p<1){const x=420+430*p;stroke([[x-13,355],[x+5,378],[x+13,410],[x+5,444],[x-13,462]],'#c6b485',3,1-p)}}}}
  if(n==='Relief Guard'){if(u>.12&&u<.9){const p=clamp((u-.12)/.78),f=Math.sin(p*Math.PI);stroke([[360,453],[400,480],[451,480],[475,453]],col,4,f);stroke([[447,468],[460,481],[447,494]],'#e9d39e',3,f);stroke([[479,430],[499,417],[519,430],[515,468],[499,484],[483,468],[479,430]],'#c8b27d',3,f)}}
 }
 if(id==='vesperfang'){
  if(n==='Dusk Bolt'){if(u>.14&&u<.5){const p=clamp((u-.14)/.3),x=430+420*p,y=350+57*p;oval(x,y,19,8,'#54253e');slash(x+6,y,.2,42,col,1,7)}if(hit&&u<.8)burst(850,407,'#b9637d',impact,28)}
  if(n==='Night Fang'){if(u>.25&&u<.67){const x=416+dx;poly([[x-18,365],[x-6,410],[x+1,370]],'#d3b3ad',a);poly([[x+15,415],[x+4,451],[x-3,412]],'#b48491',a)}if(hit&&u<.8){slash(844,402,1.7,62,col,a,3)}}
  if(n==='Dread'||n==='Terrify'){if(u>.17&&u<.84){const p=ease((u-.17)/.3),f=1-clamp((u-.64)/.2);const r=n==='Dread'?39:59;arc(850,402,r*p,Math.PI*.15,Math.PI*.85,col,4,f);poly([[828,385],[843,389],[834,395]],'#e7adac',p*f);poly([[872,385],[857,389],[866,395]],'#e7adac',p*f);if(n==='Terrify')stroke([[819,373],[812,355],[825,363],[837,351]],'#a86076',3,p*f)}}
  if(n==='Shadow Siphon'){if(u>.17&&u<.85){const p=clamp((u-.17)/.68);for(let i=0;i<3;i++){const k=clamp((p-i*.08)/.7);slash(850-450*k,410+32*Math.sin(k*Math.PI)+(i-1)*15,-.2,28,'#b56887',Math.sin(k*Math.PI),5)}}}
  if(n==='Dusk Mantle'){if(u>.14&&u<.86){const p=ease((u-.14)/.3),f=1-clamp((u-.66)/.2);for(const side of [-1,1]){poly([[350,322],[350+side*82*p,370],[350+side*63*p,473],[350+side*32*p,430],[350,487]],'#382239',p*f*.45);stroke([[350,322],[350+side*82*p,370],[350+side*63*p,473]],col,2,p*f)}}}
  if(n==='Nightfall'){if(u>.15&&u<.86){const p=clamp((u-.15)/.71),f=Math.sin(p*Math.PI);ctx.fillStyle=`rgba(15,8,21,${f*.26})`;ctx.fillRect(0,150,1280,435);oval(640,294,48,48,'#a76179',f);oval(652-16*p,285,45,45,'#101320',f);for(const x of [350,850])stroke([[x-14,440],[x,456],[x+14,440]],'#9c6a87',2,f)}}
  if(n==='Night Flight'){if(u>.16&&u<.8){const p=clamp((u-.16)/.28),f=1-clamp((u-.44)/.36);const x=410+440*p,y=350+57*p;poly([[x-55,y-19],[x-20,y-4],[x-8,y-21],[x+10,y],[x-8,y+25],[x-22,y+9],[x-55,y+23],[x-34,y]],'#9f5977',f);slash(x,y,.1,52,'#d0919b',f,3)}}
 }
 if(id==='hushwing'){
  if(n==='Soft Wing'){if(u>.16&&u<.85){const p=clamp((u-.16)/.69);for(let i=0;i<5;i++){const angle=i*1.25+p;const x=350+Math.cos(angle)*(52-25*p),y=420+Math.sin(angle)*40-32*p;wing(x,y,.32,'#c2b1e7',Math.sin(p*Math.PI))}}}
  if(n==='Wing Buffet'){if(u>.22&&u<.78){const p=clamp((u-.22)/.23);for(let i=0;i<3;i++){const x=420+dx+i*8;stroke([[x-17,375+i*22],[x+21,394+i*22],[x-3,417+i*22]],'#bba8d2',4,(1-clamp((u-.44)/.34))*p)}}}
  if(n==='Disorient'){if(u>.15&&u<.85){const p=clamp((u-.15)/.7);for(let i=0;i<3;i++){const angle=i*2.1+p*4;wing(850+Math.cos(angle)*40,386+Math.sin(angle)*20,.25,col,Math.sin(p*Math.PI))}}}
  if(n==='Unsettling Cry'){if(u>.15&&u<.8){for(let i=0;i<3;i++){const p=clamp((u-.15-i*.06)/.27);if(p>0&&p<1)arc(420+430*p,405,18+20*p,-1.2,1.2,i%2?'#a591c7':'#c7b8e4',3,1-p)}}}
  if(n==='Moon Spark'){if(u>.16&&u<.49){const p=clamp((u-.16)/.28),x=420+430*p,y=370+37*p;arc(x,y,12,Math.PI*.3,Math.PI*1.7,'#ded2f2',4,1);slash(x,y,0,24,'#b6a5d6',.6,2)}if(hit&&u<.8){arc(850,407,15+20*impact,-1.4,1.4,'#d8caed',3,a)}}
  if(n==='Encore'){if(u>.16&&u<.87){const p=clamp((u-.16)/.71);for(let i=0;i<2;i++){const r=26+i*15;arc(850,407,r,i?Math.PI:0,i?Math.PI*2-.3:Math.PI-.3,col,3,Math.sin(p*Math.PI));wing(850+(i?-1:1)*r,407,.24,'#e2d6f0',Math.sin(p*Math.PI),i?-1:1)}}}
  if(n==='Razor Gust'){if(u>.16&&u<.7){for(let i=0;i<3;i++){const p=clamp((u-.16-i*.04)/.28);if(p>0&&p<1){const x=420+430*p;stroke([[x-45,380+i*24],[x-12,371+i*24],[x+18,380+i*24]],'#b8b3d8',3,1-p*.5)}}}}
 }
 if(id==='riftclaw'){
  if(n==='Rift Slash'||n==='Nerve Tear'){for(let i=0;i<(n==='Nerve Tear'?2:3);i++){const p=clamp((u-.29-i*.06)/.23);if(p>0&&p<1){ctx.save();ctx.translate(835+i*16,408);ctx.rotate(.36);crack(0,0,ease(p),i===1?'#ead4e3':col,1-p);ctx.restore()}}}
  if(n==='Phase Strike'){if(u>.2&&u<.76){const p=clamp((u-.2)/.56);ctx.save();ctx.translate(850,407);ctx.rotate(.65);poly([[-4,-70],[7,-23],[-3,25],[6,65],[-9,24],[0,-25]],'#080b13',Math.sin(p*Math.PI));stroke([[-6,-70],[5,-23],[-5,25],[4,65]],'#d6a7cf',2,Math.sin(p*Math.PI));ctx.restore()}}
  if(n==='Reality Tear'){if(u>.18&&u<.85){const p=clamp((u-.18)/.67);crack(850,407,Math.sin(p*Math.PI),col,Math.sin(p*Math.PI));for(let i=0;i<3;i++)slash(824+i*23,382+i*22,-.5,19,'#e7bbd8',Math.sin(p*Math.PI),3)}}
  if(n==='Fracture'){if(u>.17&&u<.84){const p=ease((u-.17)/.28),f=1-clamp((u-.64)/.2);stroke([[833,370],[843,394],[833,415],[852,432],[866,452]],col,3,p*f);stroke([[843,394],[868,386],[875,374]],'#aa7f9e',2,p*f)}}
  if(n==='Phase Shell'){if(u>.15&&u<.85){const p=ease((u-.15)/.28),f=1-clamp((u-.64)/.21);for(const side of [-1,1])stroke([[350+side*25,369],[350+side*68*p,400],[350+side*60*p,466],[350+side*21,493]],col,2,p*f);stroke([[302,441],[323,430],[335,441],[364,430],[384,441]],'#e2c4db',2,p*f)}}
  if(n==='Seal the Wound'){if(u>.13&&u<.86){const p=clamp((u-.13)/.73);const r=50*(1-ease(p));stroke([[350-r,393],[350,414],[350+r,393]],col,3,Math.sin(p*Math.PI));stroke([[350-r,448],[350,425],[350+r,448]],'#e7b8d2',3,Math.sin(p*Math.PI));if(p>.4)slash(350,419,0,31*(1-p),'#f1d4e5',1-p,3)}}
  if(n==='Rift Dart'){if(u>.15&&u<.48){const p=clamp((u-.15)/.29),x=410+440*p,y=453-46*p;poly([[x-27,y],[x-5,y-8],[x+12,y],[x-7,y+7]],'#0b0b19');stroke([[x-25,y-1],[x-5,y-8],[x+12,y]],col,2)}if(hit&&u<.8)crack(850,407,1-impact,col,a)}
 }
 // Outcome appears on contact; no outcome label holds up the next action.
 if(u>=.44&&u<1.35){const p=clamp((u-.44)/.75),opacity=1-clamp((p-.65)/.35);let label='',x=905,color='#eee8dc';
 if(damaging){label='−16';if(c.mechanic==='ground_fault')x=1000;}else if(c.kind==='heal'){label='+10';x=350;color='#bdd8a4'}else if(c.kind==='guard'){label='GUARD';x=350;color=col}else if(c.kind==='status'){label={weaken:'WEAKEN',expose:'EXPOSE',confuse:'DISORIENT',mark:'MARK',paralyse:'LOCK',spores:'SPORES',thorns:'THORNS'}[c.mechanic]||'MARK';if(c.mechanic==='thorns')x=350;color=col}else{label={shed:'CLEANSE',escort:'ESCORT',relief:'GUARD TRANSFER',encore:'ENCORE',called_shot:'PREPARED',seal:'SEALED',nightfall:'STRIPPED'}[c.mechanic]||'';if(['shed','escort','relief','seal'].includes(c.mechanic))x=350;color=col}
 ctx.save();ctx.globalAlpha=opacity;text(label,x,316-18*ease(p),label.length>4?16:29,color);ctx.restore();
 }
 }
 text('DROWNED BELFRY',640,49,12,'#7d909e');
}
