/* Illustrated sparring: a fixed-foot puppet mesh, never a gameplay simulation. */
(() => {
  'use strict';
  const stage = document.querySelector('.alliance-art');
  if (!stage || !window.IntersectionObserver || !window.ResizeObserver) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const rigs = [];
  const cycle = 9.6;
  let visible = false, frame = 0, time = 0, last = 0;
  const NS = 'http://www.w3.org/2000/svg';
  const effects = document.createElementNS(NS, 'svg');
  effects.classList.add('accord-combat-effects');
  effects.setAttribute('aria-hidden', 'true');
  effects.setAttribute('preserveAspectRatio', 'none');
  effects.innerHTML = `<defs>
    <linearGradient id="accord-breath-fill"><stop stop-color="#6d949e" stop-opacity="0"/><stop offset=".35" stop-color="#82afae" stop-opacity=".32"/><stop offset="1" stop-color="#bce6cf" stop-opacity=".62"/></linearGradient>
    <linearGradient id="accord-sword-light"><stop stop-color="#d5b572" stop-opacity="0"/><stop offset=".65" stop-color="#d9d6ae" stop-opacity=".8"/><stop offset="1" stop-color="#e9f4dc"/></linearGradient>
    <filter id="accord-soften" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.3"/></filter>
    </defs><g class="accord-ground-shadows"><ellipse class="accord-ground-contact"/><ellipse class="accord-ground-contact"/></g>
    <path class="accord-breath"/><path class="accord-breath-thread"/>
    <path class="accord-sword-trail"/><circle class="accord-contact-ring"/>
    <g class="accord-contact"></g><g class="accord-counter-contact"></g>`;
  stage.append(effects);
  const part = selector => effects.querySelector(selector);
  const breath = part('.accord-breath'), thread = part('.accord-breath-thread');
  const trail = part('.accord-sword-trail'), ring = part('.accord-contact-ring');
  const contact = part('.accord-contact'), counterContact = part('.accord-counter-contact');
  for (const group of [contact, counterContact]) {
    for (let i = 0; i < 7; i++) group.append(document.createElementNS(NS, 'line'));
  }
  const vertex = `precision mediump float;attribute vec2 uv;varying vec2 tex;
    uniform float dragon,attack,windup,block,counter,recoil,breath;
    float area(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d)*2.0);}
    vec2 rotateAround(vec2 p,vec2 c,float a){float s=sin(a),v=cos(a);vec2 d=p-c;return c+vec2(v*d.x-s*d.y,s*d.x+v*d.y);}
    void main(){tex=uv;vec2 p=uv;float planted=1.0-smoothstep(.66,.82,uv.y);
      if(dragon>.5){
        float head=area(uv,vec2(.91,.65),vec2(.19,.32));
        float chest=area(uv,vec2(.65,.56),vec2(.31,.36));
        float wing=(1.0-smoothstep(.39,.59,uv.y))*smoothstep(.09,.32,uv.x)*(1.0-smoothstep(.72,.90,uv.x));
        p.x+=planted*(chest*(.047*attack-.018*windup-.035*recoil)+head*(.048*attack-.018*windup-.030*recoil));
        p.y+=planted*(head*(.023*attack-.025*windup-.015*recoil)+chest*(.010*windup-.013*attack));
        p+=wing*(rotateAround(uv,vec2(.68,.42),-.035*windup+.055*attack-.03*recoil)-uv);
        p.y-=.004*breath*chest*planted;
        float jaw=area(uv,vec2(.953,.775),vec2(.07,.07));p.y+=jaw*.014*attack;
      }else{
        float torso=area(uv,vec2(.43,.40),vec2(.30,.46));
        p.x+=planted*torso*(.018*block-.024*counter);
        p.y+=planted*torso*(.010*block-.010*counter+.0025*breath);
        float shield=smoothstep(.43,.49,uv.x)*(1.0-smoothstep(.65,.69,uv.x))*smoothstep(.19,.25,uv.y)*(1.0-smoothstep(.77,.81,uv.y));
        p+=shield*(rotateAround(uv,vec2(.48,.38),-.12*block+.07*counter)-uv+vec2(-.025*block,-.014*block));
        // The blade and sword arm pivot at the shoulder; neither boot participates.
        float blade=(1.0-smoothstep(.29,.35,uv.x))*smoothstep(.43,.49,uv.y)*(1.0-smoothstep(.83,.86,uv.y));
        float arm=area(uv,vec2(.32,.44),vec2(.09,.16));
        float weapon=max(blade,arm)*(1.0-smoothstep(.34,.40,uv.x));
        p+=weapon*(rotateAround(uv,vec2(.365,.34),.94*counter)-uv);
        float cape=smoothstep(.67,.9,uv.x)*smoothstep(.40,.65,uv.y)*(1.0-smoothstep(.87,.96,uv.y));
        p.x+=cape*(.009*breath+.016*counter);
      }
      vec2 q=(p+vec2(.30))/1.60;gl_Position=vec4(q.x*2.0-1.0,1.0-q.y*2.0,0,1);
    }`;
  const fragment = `precision mediump float;varying vec2 tex;uniform sampler2D art;uniform float dragon,attack,block;
    void main(){vec4 c=texture2D(art,tex);vec2 at=dragon>.5?vec2(.943,.727):vec2(.368,.159);vec2 d=(tex-at)/vec2(.025,.028);float eye=exp(-dot(d,d)*2.0);c.rgb+=eye*vec3(.11,.28,.27)*(dragon>.5?attack:block);gl_FragColor=c;}`;
  function compile(gl, kind, source) {
    const shader = gl.createShader(kind); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Puppet shader unavailable');
    return shader;
  }
  function setup(img, dragon) {
    if (!img.naturalWidth) return;
    const el = document.createElement('div'); el.className = 'accord-rig'; el.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas'); el.append(canvas);
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return;
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Puppet program unavailable');
      gl.useProgram(program);
      const points = [], divisions = 96;
      for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
        const a=x/divisions,b=y/divisions,c=(x+1)/divisions,d=(y+1)/divisions;
        points.push(a,b,c,b,a,d,a,d,c,b,c,d);
      }
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const uv=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.uniform1i(gl.getUniformLocation(program,'art'),0);gl.uniform1f(gl.getUniformLocation(program,'dragon'),dragon?1:0);
      const uniforms={};for(const name of ['attack','windup','block','counter','recoil','breath'])uniforms[name]=gl.getUniformLocation(program,name);
      const rig={img,el,canvas,gl,uniforms,count:points.length/2,dragon,lost:false};
      stage.append(el);rigs.push(rig);img.dataset.accordRig='ready';resizeRig(rig);draw(rig,pose(0));
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();rig.lost=true;img.removeAttribute('data-accord-rig');el.remove();schedule();});
      schedule();
    } catch { el.remove();img.removeAttribute('data-accord-rig'); }
  }
  const smooth = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
  function pulse(t,a,b,c,d) { return smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c))); }
  function pose(t) {
    return {
      windup:pulse(t,.9,1.65,1.8,2.2),
      attack:pulse(t,1.85,2.35,2.7,3.25),
      block:pulse(t,1.8,2.25,2.78,3.45)+.13*pulse(t,2.34,2.38,2.4,2.5),
      counter:pulse(t,4.4,4.95,5.1,5.8),
      recoil:pulse(t,4.64,4.92,5.1,5.9),
      breath:Math.sin(t*Math.PI*2/cycle)
    };
  }
  function draw(rig, state) {
    if(rig.lost)return;
    for(const name in state)rig.gl.uniform1f(rig.uniforms[name],state[name]);
    rig.gl.clear(rig.gl.COLOR_BUFFER_BIT);rig.gl.drawArrays(rig.gl.TRIANGLES,0,rig.count);
  }
  function resizeRig(rig) {
    const img=rig.img;rig.box={x:img.offsetLeft,y:img.offsetTop,w:img.offsetWidth,h:img.offsetHeight};
    const b=rig.box;Object.assign(rig.el.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'});
    const dpr=Math.min(window.devicePixelRatio||1,1.7);
    rig.canvas.width=Math.round(b.w*1.60*dpr);rig.canvas.height=Math.round(b.h*1.60*dpr);rig.gl.viewport(0,0,rig.canvas.width,rig.canvas.height);
    draw(rig,pose(time%cycle));
  }
  function point(rig,u,v){const b=rig.box;return{x:b.x+u*b.w,y:b.y+v*b.h};}
  function sparks(group,at,amount,spread) {
    group.style.opacity=String(amount);
    [...group.children].forEach((line,i)=>{
      const angle=(i/7)*Math.PI*2+.2, start=2+spread*8, end=start+3+spread*8;
      line.setAttribute('x1',at.x+Math.cos(angle)*start);line.setAttribute('y1',at.y+Math.sin(angle)*start);
      line.setAttribute('x2',at.x+Math.cos(angle)*end);line.setAttribute('y2',at.y+Math.sin(angle)*end);
    });
  }
  function drawEffects(t,state) {
    const dragon=rigs.find(r=>r.dragon&&!r.lost),knight=rigs.find(r=>!r.dragon&&!r.lost);
    if(!dragon||!knight)return;
    const mouth=point(dragon,.963+state.attack*.027,.774+state.attack*.004);
    const shield=point(knight,.51-state.block*.024,.47-state.block*.014);
    const beam=pulse(t,2.13,2.35,2.73,3.03);
    const bend=(shield.x-mouth.x)*.5, thickness=5+beam*7;
    breath.setAttribute('d',`M${mouth.x} ${mouth.y-2} Q${mouth.x+bend} ${mouth.y-thickness} ${shield.x} ${shield.y-6} L${shield.x} ${shield.y+8} Q${mouth.x+bend} ${mouth.y+thickness} ${mouth.x} ${mouth.y+2}Z`);
    breath.style.opacity=String(beam*.7);
    thread.setAttribute('d',`M${mouth.x} ${mouth.y} Q${mouth.x+bend} ${mouth.y-2-Math.sin(t*13)*3} ${shield.x} ${shield.y}`);thread.style.opacity=String(beam*.42);
    const impact=pulse(t,2.34,2.38,2.42,2.72), spread=smooth((t-2.36)/.36);
    sparks(contact,shield,impact*.95,spread);
    ring.setAttribute('cx',shield.x);ring.setAttribute('cy',shield.y);ring.setAttribute('r',3+spread*17);ring.style.opacity=String(impact*.48);
    const shoulder=point(knight,.365,.34), angle=state.counter*.94;
    function bladeTip(a){const dx=-.345,dy=.46;return point(knight,.365+Math.cos(a)*dx-Math.sin(a)*dy,.34+Math.sin(a)*dx+Math.cos(a)*dy);}
    const tip=bladeTip(angle),start=bladeTip(Math.max(0,angle-.32));
    const middle=bladeTip(Math.max(0,angle-.16));
    const arc=pulse(t,4.52,4.67,4.97,5.2);
    trail.setAttribute('d',`M${start.x} ${start.y} Q${middle.x} ${middle.y} ${tip.x} ${tip.y}`);trail.style.opacity=String(arc*.7);
    sparks(counterContact,{x:mouth.x-7,y:mouth.y-12},pulse(t,4.65,4.7,4.74,4.96)*.75,smooth((t-4.68)/.28));
    const shadows=effects.querySelectorAll('.accord-ground-contact');
    [dragon,knight].forEach((rig,i)=>{const p=point(rig,i?.42:.64,.94);shadows[i].setAttribute('cx',p.x);shadows[i].setAttribute('cy',p.y);shadows[i].setAttribute('rx',rig.box.w*(i?.16:.3));shadows[i].setAttribute('ry',Math.max(2,rig.box.h*.018));});
  }
  function active(){return visible&&!document.hidden&&!reduced.matches&&!root.classList.contains('is-still')&&!root.classList.contains('needs-landscape')&&rigs.some(r=>!r.lost);}
  function schedule(){
    if(!active()){
      if(frame)cancelAnimationFrame(frame);frame=0;stage.classList.remove('is-sparring');
      if(reduced.matches||root.classList.contains('is-still')||root.classList.contains('needs-landscape')){time=0;for(const rig of rigs)draw(rig,pose(0));}
      return;
    }
    stage.classList.add('is-sparring');if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  }
  function tick(now){frame=0;if(!active()){schedule();return;}time+=Math.min((now-last)/1000,.05);last=now;const t=time%cycle,state=pose(t);for(const rig of rigs)draw(rig,state);drawEffects(t,state);frame=requestAnimationFrame(tick);}
  const resize=new ResizeObserver(()=>{effects.setAttribute('viewBox',`0 0 ${stage.offsetWidth} ${stage.offsetHeight}`);for(const rig of rigs)resizeRig(rig);drawEffects(time%cycle,pose(time%cycle));});resize.observe(stage);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.08}).observe(stage);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  for(const [selector,dragon] of [['.alliance-dragon',true],['.alliance-knight',false]]){
    const img=stage.querySelector(selector);if(!img)continue;
    if(img.complete&&img.naturalWidth)setup(img,dragon);else img.addEventListener('load',()=>setup(img,dragon),{once:true});
  }
  stage.setAttribute('role','img');stage.setAttribute('aria-label','Illustrated sparring between Vesperfang and Bastion: a shadow breath, a shield block, and a measured sword counter.');
})();
