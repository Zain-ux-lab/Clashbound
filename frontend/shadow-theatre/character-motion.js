/* Local 2D puppet mesh: deformation fades to zero at the planted feet. */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const rigs = [];
  const vertex = `precision mediump float; attribute vec2 uv; attribute vec2 groundOffset; varying vec2 tex; uniform float time, hover, dragon, frameHeight;
  float area(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d)*2.0);}
  void main(){tex=uv;vec2 p=uv;float breath=sin(time*1.05);float planted=1.0-smoothstep(.72,.86,p.y);
  if(dragon>0.5){
    float chest=area(p,vec2(.64,.57),vec2(.30,.40));
    float head=area(p,vec2(.91,.64),vec2(.17,.25));
    p.y-=.007*breath*chest*planted;
    p.x+=.004*breath*chest*planted;
    p.x+=head*(.009*hover+.002*sin(time*.75))*planted;
    p.y-=head*.012*hover*planted;
  }else{
    float cape=smoothstep(.65,.91,p.x)*smoothstep(.35,.58,p.y)*(1.0-smoothstep(.85,.96,p.y));
    p.x+=.015*sin(time*1.3-p.y*5.0)*cape;
    p.y+=.006*cos(time*1.3-p.x*4.0)*cape;
    p.x+=.0035*sin(time*.75)*planted*(1.0-cape);
  }
  // Each foot uses one rigid transform, blended into its own lower leg.
  p+=groundOffset;
  gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0/frameHeight,0,1);}`;
  const fragment = `precision mediump float; varying vec2 tex; uniform sampler2D art; uniform float time,dragon;
  void main(){vec4 c=texture2D(art,tex);float phase=mod(time,11.0);
    if(dragon>.5){vec2 d=(tex-vec2(.944,.727))/vec2(.012,.024);float eye=exp(-dot(d,d)*2.0);float pulse=pow(max(0.0,sin(phase*3.14159/2.0)),6.0)*step(phase,2.0);c.rgb+=vec3(.18,.65,.85)*eye*pulse;}
    else{float sweep=mod(time,13.0);float band=max(0.0,1.0-abs(tex.x+tex.y-(sweep-9.0)*.65)/.022)*step(9.0,sweep);float shield=step(.48,tex.x)*step(tex.x,.66)*step(.20,tex.y)*step(tex.y,.81);float sword=step(tex.x,.37)*step(.51,tex.y)*step(tex.y,.83);c.rgb+=vec3(.5,.57,.65)*band*max(shield,sword)*.65;}
    gl_FragColor=c;}`;
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function setup(el){
    const img=el.querySelector('.character-art');
    const canvas=document.createElement('canvas');canvas.className='puppet-canvas';canvas.setAttribute('aria-hidden','true');
    // Extra drawing room keeps feet visible after they reach the lower ledge.
    // The vertex projection compensates, so the body keeps its original size.
    const frameHeight=1.35;canvas.style.height=(frameHeight*100)+'%';
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)return;
    let contactShadow;
    try{
      const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const points=[],n=160;
      const isDragon=el.classList.contains('dragon-character');
      // The support is the underside of the paw pad / boot sole. Talons and
      // the pointed sabaton extend over the stone's front face unchanged.
      // [left, right, start of ankle blend, start of fully rigid foot]
      const zones=isDragon?[[.305,.465,.745,.855],[.510,.640,.755,.850],[.655,.805,.745,.860],[.830,.975,.755,.855]]:
        [[.225,.395,.735,.885],[.520,.625,.735,.895]];
      // Two native artwork landmarks describe each actual load-bearing edge.
      const padAnchors=isDragon?[
        [[540.5,860.5],[674.5,860.5]],
        [[900.5,832.5],[937.5,831.5]],
        [[1140.5,862.5],[1250.5,863.5]],
        [[1415.5,854.5],[1510.5,854.5]]
      ]:[[[344.5,1060.5],[524.5,1056.5]],[[754.5,1092.5],[802.5,1104.5]]];
      const feet=zones.map(([left,right,ankle,sole],index)=>{
        const anchors=padAnchors[index].map(([x,y])=>({u:x/img.naturalWidth,v:y/img.naturalHeight}));
        return {left,right,ankle,sole,anchors,soleSlope:0,shift:0};
      });
      const scene=el.parentElement;
      // Front edges traced in the actual 1672 x 941 background image.
      // Use artwork coordinates: a cropped screenshot has a different origin.
      const knightLedge=[[1248,603],[1309,605],[1370,616],[1431,627],[1492,641],[1553,654],[1594,659]]
        .map(([x,y])=>[x/1672,y/941]);
      function terrain(x){
        const sceneW=scene.offsetWidth,sceneH=scene.offsetHeight,u=x/sceneW;
        if(isDragon)return {y:(556+.17532294*u*1672)/941*sceneH,slope:.17532294*1672/941*sceneH/sceneW};
        let i=0;while(i<knightLedge.length-2&&u>knightLedge[i+1][0])i++;
        const a=knightLedge[i],b=knightLedge[i+1],slope=(b[1]-a[1])/(b[0]-a[0]);
        return {y:(a[1]+(u-a[0])*slope)*sceneH,slope:slope*sceneH/sceneW};
      }
      for(let y=0;y<n;y++)for(let x=0;x<n;x++)points.push(x/n,y/n,(x+1)/n,y/n,x/n,(y+1)/n,x/n,(y+1)/n,(x+1)/n,y/n,(x+1)/n,(y+1)/n);
      const svgNS='http://www.w3.org/2000/svg';
      contactShadow=document.createElementNS(svgNS,'svg');
      contactShadow.setAttribute('aria-hidden','true');
      contactShadow.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
      const shadowId='contact-'+(isDragon?'dragon':'knight');
      contactShadow.innerHTML='<defs><radialGradient id="'+shadowId+'"><stop offset="0" stop-color="#01050a" stop-opacity=".88"/><stop offset=".48" stop-color="#01050a" stop-opacity=".55"/><stop offset="1" stop-color="#01050a" stop-opacity="0"/></radialGradient></defs>';
      const shadowMarks=feet.map(()=>{
        const mark=document.createElementNS(svgNS,'ellipse');mark.setAttribute('fill','url(#'+shadowId+')');contactShadow.append(mark);return mark;
      });
      scene.insertBefore(contactShadow,el);
      const groundBuffer=gl.createBuffer();
      const groundLoc=gl.getAttribLocation(program,'groundOffset');gl.enableVertexAttribArray(groundLoc);
      function smoothstep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
      function updateGrounding(){
        const W=el.offsetWidth,H=el.offsetHeight;if(!W||!H||!scene.offsetWidth)return;
        const angle=isDragon?7*Math.PI/180:0,c=Math.cos(angle),sn=Math.sin(angle);
        const ox=isDragon?W*.65:W*.5,oy=isDragon?H:H*.5;
        const overlap=scene.offsetHeight/941;
        function scenePoint(x,y){return {x:el.offsetLeft+ox+c*(x-ox)-sn*(y-oy),y:el.offsetTop+oy+sn*(x-ox)+c*(y-oy)};}
        function supportShift(x,y){
          let shift=0;
          for(let step=0;step<5;step++){
            const point=scenePoint(x,y+shift),ground=terrain(point.x);
            shift-=(point.y-ground.y-overlap)/(c+sn*ground.slope);
          }
          return shift;
        }
        function rigidPoint(foot,u,v){
          const dx=u*W-foot.cx,dy=v*H-foot.cy;
          return {x:foot.cx+foot.fc*dx-foot.fs*dy,y:foot.cy+foot.fs*dx+foot.fc*dy+foot.shift};
        }
        let shadowIndex=0;
        const contacts=[];
        contactShadow.setAttribute('viewBox','0 0 '+scene.offsetWidth+' '+scene.offsetHeight);
        for(const foot of feet){
          const [a,b]=foot.anchors;
          const cx=(foot.left+foot.right)*.5*W,cy=foot.sole*H;
          // Align the actual sole edge, which is diagonal on the right boot.
          foot.soleSlope=(b.v-a.v)*H/((b.u-a.u)*W);
          const centerX=el.offsetLeft+ox+c*(cx-ox)-sn*(cy-oy);
          let rotation=Math.atan(terrain(centerX).slope)-angle-Math.atan(foot.soleSlope);
          foot.cx=cx;foot.cy=cy;
          // Preserve the repaired boot anatomy: only a small ankle adjustment is allowed.
          // A boot can span two stone slopes: fit its complete support edge
          // to both terrain samples rather than using only the ankle tangent.
          for(let pass=0;pass<4;pass++){
            rotation=Math.max(isDragon?-.20:-.07,Math.min(isDragon?.20:.07,rotation));
            foot.fc=Math.cos(rotation);foot.fs=Math.sin(rotation);foot.shift=0;
            const initial=foot.anchors.map(anchor=>rigidPoint(foot,anchor.u,anchor.v));
            foot.shift=initial.reduce((sum,point)=>sum+supportShift(point.x,point.y),0)/initial.length;
            if(pass<3){
              const ends=foot.anchors.map(anchor=>{const point=rigidPoint(foot,anchor.u,anchor.v);return scenePoint(point.x,point.y);});
              const slope=(terrain(ends[1].x).y-terrain(ends[0].x).y)/(ends[1].x-ends[0].x);
              rotation=Math.atan(slope)-angle-Math.atan(foot.soleSlope);
            }
          }
          const supports=foot.anchors.map(anchor=>{
            const point=rigidPoint(foot,anchor.u,anchor.v),contact=scenePoint(point.x,point.y),ground=terrain(contact.x);
            contacts.push({x:contact.x,y:contact.y,residual:contact.y-ground.y});
            return contact;
          });
          // A compact shadow sits under the pad / heel, never under a talon.
          const center={x:(supports[0].x+supports[1].x)/2,y:(supports[0].y+supports[1].y)/2};
          const ground=terrain(center.x),mark=shadowMarks[shadowIndex++];
          const rx=Math.max(8*scene.offsetWidth/1672,Math.abs(supports[1].x-supports[0].x)*.58),ry=3*scene.offsetHeight/941;
          mark.setAttribute('cx',center.x);mark.setAttribute('cy',ground.y+.4*overlap);mark.setAttribute('rx',rx);mark.setAttribute('ry',ry);
          mark.setAttribute('transform','rotate('+Math.atan(ground.slope)*180/Math.PI+' '+center.x+' '+ground.y+')');
        }
        // Available for visual review without changing motion or pause controls.
        el.groundContacts=contacts;
        const offsets=[];
        for(let i=0;i<points.length;i+=2){
          const u=points[i],v=points[i+1];let offsetX=0,offsetY=0;
          for(const foot of feet){
            if(u<foot.left-.012||u>foot.right+.012||v<foot.ankle)continue;
            const side=smoothstep(foot.left-.012,foot.left,u)*(1-smoothstep(foot.right,foot.right+.012,u));
            const weight=side*smoothstep(foot.ankle,foot.sole,v);
            const dx=u*W-foot.cx,dy=v*H-foot.cy;
            offsetX+=weight*((foot.fc-1)*dx-foot.fs*dy)/W;
            offsetY+=weight*(foot.fs*dx+(foot.fc-1)*dy+foot.shift)/H;
          }
          offsets.push(offsetX,offsetY);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER,groundBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(offsets),gl.STATIC_DRAW);
        gl.vertexAttribPointer(groundLoc,2,gl.FLOAT,false,0,0);
      }
      updateGrounding();
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.uniform1i(gl.getUniformLocation(program,'art'),0);gl.uniform1f(gl.getUniformLocation(program,'frameHeight'),frameHeight);gl.uniform1f(gl.getUniformLocation(program,'dragon'),el.classList.contains('dragon-character')?1:0);
      const rig={el,canvas,gl,count:points.length/2,t:gl.getUniformLocation(program,'time'),h:gl.getUniformLocation(program,'hover'),hover:0,target:0};
      el.append(canvas);el.classList.add('has-puppet','has-contact-shadows');rigs.push(rig);
      el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')rig.target=1;});el.addEventListener('pointerleave',()=>rig.target=0);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();el.classList.remove('has-puppet','has-contact-shadows');contactShadow.remove();rig.lost=true;});
      const resize=new ResizeObserver(()=>{const d=Math.min(devicePixelRatio,2);canvas.width=Math.round(el.offsetWidth*d);canvas.height=Math.round(el.offsetHeight*d*frameHeight);gl.viewport(0,0,canvas.width,canvas.height);updateGrounding();draw(rig,0);});resize.observe(el);resize.observe(scene);
      draw(rig,0);
    }catch(error){console.warn('Static character fallback:',error.message);canvas.remove();if(contactShadow)contactShadow.remove();el.classList.remove('has-puppet','has-contact-shadows');}
  }
  function draw(r,t){if(r.lost)return;r.gl.uniform1f(r.t,t);r.gl.uniform1f(r.h,r.hover);r.gl.clear(r.gl.COLOR_BUFFER_BIT);r.gl.drawArrays(r.gl.TRIANGLES,0,r.count);}
  document.querySelectorAll('.hero .character').forEach(el=>{const img=el.querySelector('.character-art');if(img.complete&&img.naturalWidth)setup(el);else img.addEventListener('load',()=>setup(el),{once:true});});
  let visible=true,clock=0,last=0,frame=0;
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(hero);
  function active(){return visible&&!document.hidden&&!document.documentElement.classList.contains('is-still')&&!document.documentElement.classList.contains('needs-landscape');}
  function schedule(){if(!active()){for(const r of rigs){r.hover=0;draw(r,0);}}if(active()&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
  function tick(now){frame=0;if(!active())return;const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;for(const r of rigs){r.hover+=(r.target-r.hover)*Math.min(1,dt*4);draw(r,clock);}frame=requestAnimationFrame(tick);}
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',schedule);schedule();
})();
