/* Original Blender wing cycle, flown along curved paths in the distant ruins. */
(() => {
  'use strict';
  const image = new Image();
  const frame = { width: 192, height: 144, columns: 6, count: 24, glide: 6 };
  const scenes = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ready = false, request = 0, last = 0, clock = 0;
  const controlsAllowMotion = () => !document.hidden && !reduced.matches &&
    !document.documentElement.classList.contains('is-still') &&
    !document.documentElement.classList.contains('needs-landscape');
  const cubic = (a,b,c,d,t) => { const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d; };
  const tangent = (a,b,c,d,t) => 3*(1-t)*(1-t)*(b-a)+6*(1-t)*t*(c-b)+3*t*t*(d-c);

  document.querySelectorAll('.ruin-bats').forEach((sky,index) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'bat-sky';canvas.setAttribute('aria-hidden','true');
    const context = canvas.getContext('2d');if (!context) return;
    sky.append(canvas);
    const scene = { sky, canvas, context, visible: false, width: 0, height: 0, ratio: 1,
      bats: [
        { offset: 4.5+index*3.1, duration: 10.8, gap: 6.7, direction: 1, size: 84, frequency: 4.4, glide: .34, lane: [.50,.10,.68,.34] },
        { offset: 12.2+index*2.3, duration: 12.6, gap: 8.2, direction: -1, size: 58, frequency: 5.1, glide: .28, lane: [.24,.64,.12,.54] },
        { offset: 7.8+index*5.0, duration: 9.5, gap: 11.3, direction: 1, size: 42, frequency: 5.6, glide: .42, lane: [.68,.31,.50,.15] }
      ] };
    scenes.push(scene);
    new ResizeObserver(() => {
      scene.width=sky.clientWidth;scene.height=sky.clientHeight;scene.ratio=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.round(scene.width*scene.ratio);canvas.height=Math.round(scene.height*scene.ratio);
      paint(scene,clock);
    }).observe(sky);
  });

  function paint(scene,time) {
    const {context:ctx,width:w,height:h,ratio:d}=scene;
    ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
    if (!ready || !w || !h) return;
    for (const bat of scene.bats) {
      const age=(time+bat.offset)%(bat.duration+bat.gap);
      if (age>bat.duration) continue;
      const t=age/bat.duration,dir=bat.direction;
      const xx=dir>0?[-.08,.26,.72,1.08]:[1.08,.70,.30,-.08];
      const yy=bat.lane.map(y=>20+y*(h-45));
      const x=cubic(...xx,t)*w,y=cubic(...yy,t);
      const dx=tangent(...xx,t)*w,dy=tangent(...yy,t);
      const flapTime=5/bat.frequency,period=flapTime+bat.glide;
      const stroke=(age+bat.offset*.3)%period;
      const gliding=stroke>=flapTime;
      const phase=(frame.glide/frame.count+(gliding?0:stroke*bat.frequency))%1;
      const cell=gliding?frame.glide:Math.floor(phase*frame.count);
      const approach=Math.sin(Math.PI*t);
      const size=bat.size*(.72+.32*approach)*Math.min(1,w/1440+.3);
      const bank=Math.atan2(dy,Math.abs(dx))*dir;
      const lift=gliding?0:Math.sin(phase*Math.PI*2)*size*.012;
      ctx.save();ctx.translate(x,y+lift);ctx.rotate(bank);ctx.scale(dir,1);
      ctx.globalAlpha=(.58+.28*approach)*Math.min(1,t*15,(1-t)*15);
      ctx.drawImage(image,(cell%frame.columns)*frame.width,Math.floor(cell/frame.columns)*frame.height,
        frame.width,frame.height,-size*.5,-size*frame.height/frame.width*.5,size,size*frame.height/frame.width);
      ctx.restore();
    }
  }
  function tick(now) {
    request=0;
    if (!controlsAllowMotion() || !scenes.some(s=>s.visible)) return;
    clock+=Math.min((now-last)/1000,.05);last=now;
    scenes.filter(s=>s.visible).forEach(s=>paint(s,clock));
    request=requestAnimationFrame(tick);
  }
  function schedule() {
    const playing=ready&&controlsAllowMotion()&&scenes.some(s=>s.visible);
    if (!playing && request) {cancelAnimationFrame(request);request=0;}
    if (playing && !request) {last=performance.now();request=requestAnimationFrame(tick);}
    if (!playing) scenes.filter(s=>s.visible).forEach(s=>paint(s,clock));
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { const scene=scenes.find(s=>s.sky===entry.target);scene.visible=entry.isIntersecting; });
    schedule();
  });
  scenes.forEach(s=>observer.observe(s.sky));
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  image.onload=()=>{ready=true;scenes.forEach(s=>paint(s,clock));schedule();};
  image.src='shadow-theatre/assets/bat-flight-atlas.png';
})();
