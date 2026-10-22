// Cutout articulation: preserve the approved pixels, move limbs around their joints.
const ACTION_RIGS={
 sporestag:{pivot:[.70,.73],points:[[.67,.73],[.76,.66],[.84,.65],[.90,.75],[1,.92],[1,1],[.91,.95],[.83,.82],[.77,.76],[.70,.78]]},
 bramblebelly:{pivot:[.73,.31],points:[[.70,.29],[.73,.21],[.81,.16],[.88,.18],[.94,.24],[.98,.36],[.98,.43],[.91,.47],[.82,.43],[.77,.36]]},
 bastion:{pivot:[.72,.43],points:[[.69,.28],[.79,.20],[.90,.23],[.99,.37],[.99,.52],[.91,.66],[.78,.63],[.68,.54],[.66,.40]]},
 mage:{pivot:[.68,.41],points:[[.70,.40],[.78,.40],[.80,.32],[.79,.20],[.86,.03],[.92,.03],[.99,.22],[.92,.35],[.88,.44],[.86,.98],[.80,.98],[.84,.45],[.73,.46]]},
 coil:{pivot:[.69,.34],points:[[.70,.29],[.79,.24],[.89,.16],[.98,.19],[.99,.30],[.90,.38],[.83,.40],[.72,.38]]},
 veyne:{pivot:[.69,.29],points:[[.67,.26],[.77,.20],[.98,.18],[1,.28],[.86,.33],[.78,.36],[.69,.33]]},
 riftclaw:{pivot:[.69,.66],points:[[.68,.62],[.77,.56],[.86,.63],[.87,.74],[.98,.89],[.99,.96],[.90,.94],[.79,.78],[.71,.76]]},
 vesperfang:{pivot:[.39,.42],points:[[.36,.40],[.31,.18],[.06,.01],[.08,.22],[.18,.38],[.04,.47],[.28,.52],[.40,.50]]}
};
function poseAmount(u){if(u<0||u>=1)return 0;if(u<.23)return -.35*ease(u/.23);if(u<.46)return -.35+1.35*ease((u-.23)/.23);if(u<.57)return 1;return 1-ease((u-.57)/.43)}
function rigPath(r,w,h){ctx.beginPath();for(let i=0;i<r.points.length;i++){const [a,b]=r.points[i];i?ctx.lineTo((a-.5)*w,(b-1)*h):ctx.moveTo((a-.5)*w,(b-1)*h)}ctx.closePath()}
function posedCharacter(img,id,x,y,h,u,moveName){let r=ACTION_RIGS[id];if(id==='sporestag'&&moveName!=='Chitin Kick')r={pivot:[.70,.56],points:[[.57,.01],[.81,0],[.82,.12],[.87,.11],[1,.30],[1,.60],[.82,.65],[.68,.56],[.60,.43]]};const w=h*img.width/img.height;if(!r){character(img,x,y,h);return}const amount=poseAmount(u);let angle=0,tx=0,ty=0;
 if(id==='sporestag'){angle=moveName==='Chitin Kick'?-1.18*amount:-.20*amount;}
 if(id==='bramblebelly'){angle=.80*amount;tx=33*amount;ty=-6*amount;}
 if(id==='bastion'){angle=-.12*amount;tx=22*amount;ty=-6*amount;}
 if(id==='mage'){angle=-.30*amount;tx=8*amount;}
 if(id==='coil'){angle=-.65*amount;tx=12*amount;}
 if(id==='veyne'){angle=-.18*amount;tx=8*amount;}
 if(id==='riftclaw'){angle=-.82*amount;tx=12*amount;}
 if(id==='vesperfang'){angle=-.48*amount;}
 ctx.save();ctx.translate(x,y);
 // Draw the body with only the articulated region excluded.
 ctx.save();ctx.beginPath();ctx.rect(-w/2-2,-h-2,w+4,h+4);for(let i=r.points.length-1;i>=0;i--){const [a,b]=r.points[i];i===r.points.length-1?ctx.moveTo((a-.5)*w,(b-1)*h):ctx.lineTo((a-.5)*w,(b-1)*h)}ctx.closePath();ctx.clip('evenodd');ctx.drawImage(img,-w/2,-h,w,h);ctx.restore();
 const px=(r.pivot[0]-.5)*w,py=(r.pivot[1]-1)*h;
 ctx.translate(px+tx,py+ty);ctx.rotate(angle);ctx.translate(-px,-py);rigPath(r,w,h);ctx.clip();ctx.drawImage(img,-w/2,-h,w,h);ctx.restore();
}
