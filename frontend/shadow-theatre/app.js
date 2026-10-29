(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = $('.hero'), camera = $('.camera'), motionButton = $('#motion');
  const closing = $('.closing'), film = $('.eclipse-film');
  let paused = read('shadow-motion') === 'off' || reduced.matches;
  const orientationQuery = matchMedia('(max-width:650px) and (orientation:portrait), (max-width:1100px) and (orientation:portrait) and (pointer:coarse)');
  let needsLandscape = orientationQuery.matches;
  let context, introduced = false, closingVisible = false;
  const filmAllowed = () => !paused && !needsLandscape && closingVisible && !document.hidden;
  function updateFilm() {
    if (!filmAllowed()) { film.pause(); closing.classList.remove('has-film'); return; }
    film.play().then(() => {
      if (filmAllowed()) closing.classList.add('has-film');
      else { film.pause(); closing.classList.remove('has-film'); }
    }).catch(() => closing.classList.remove('has-film'));
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      closingVisible = entries[0].isIntersecting;
      updateFilm();
    }, { threshold: .12 }).observe(closing);
  }
  function motion() {
    if (context) context.revert();
    document.documentElement.classList.toggle('is-still', paused);
    motionButton.textContent = paused ? 'Enable motion' : 'Pause motion';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.title = paused ? 'Enable animation' : 'Pause animation';
    if (window.gsap) {
      gsap.killTweensOf('.portrait-ring');
      gsap.set('.portrait-ring', { clearProps: 'opacity,filter' });
      gsap.set([camera, ...document.querySelectorAll('.atmosphere-depth')], { x: 0, y: 0 });
    }
    updateFilm();
    if (!window.gsap || !window.ScrollTrigger || paused) return;
    gsap.registerPlugin(ScrollTrigger);
    context = gsap.context(() => {
      if (!introduced && window.scrollY < 50) {
        gsap.from('.hero-copy h1', { opacity: 0, y: 12, filter: 'blur(5px)', duration: 1.25, ease: 'power2.out' });
        gsap.from('.hero-copy .edition, .hero-copy .tagline', { opacity: 0, duration: 1.4, ease: 'power2.out' });
        gsap.from('.scene-depth', { opacity: .3, duration: 1.5, ease: 'power2.out' });
        introduced = true;
      }
      // The complete stage scales together: feet cannot detach from their ledges.
      gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.1 } })
        .to('.scene-depth', { scale: 1.065, y: 65, ease: 'none' }, 0)
        .fromTo('.hero-copy', { y: 0, opacity: 1 }, { y: -70, opacity: 0, ease: 'none', immediateRender: false }, 0);
      document.querySelectorAll('.section-ruins').forEach(scenery => {
        const section = scenery.closest('section');
        scenery.querySelectorAll('.ruin-travel').forEach((layer, index) => {
          gsap.fromTo(layer, { y: index ? 34 : 52 }, {
            y: index ? -28 : -44, ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
          });
        });
      });
      gsap.to('.alliance-moon', { scale: 1.1, opacity: .5, scrollTrigger: { trigger: '.accord', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      gsap.to('.world-illustration', { y: 65, scale: 1.06, scrollTrigger: { trigger: '.world', start: 'top bottom', end: 'bottom top', scrub: 1 }, ease: 'none' });

    });
  }
  motionButton.addEventListener('click', () => { paused = !paused; save('shadow-motion', paused ? 'off' : 'on'); motion(); });
  reduced.addEventListener('change', () => { paused = reduced.matches || read('shadow-motion') === 'off'; motion(); });
  motion();
  if ('IntersectionObserver' in window) {
    const sceneryObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    });
    document.querySelectorAll('.section-ruins').forEach(scenery => sceneryObserver.observe(scenery));
  }
  hero.addEventListener('pointermove', event => {
    if (paused || !window.gsap || event.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    const x=(event.clientX-r.left)/r.width-.5, y=(event.clientY-r.top)/r.height-.5;
    gsap.to(camera, { x:x*10, y:y*5, duration:1.2, overwrite:true, ease:'power2.out' });
    // Ledges and feet share the camera. Atmospheric planes supply independent depth.
    gsap.to('.depth-far', { x:x*-12, y:y*-6, duration:1.8, overwrite:true });
    gsap.to('.depth-middle', { x:x*8, y:y*4, duration:1.5, overwrite:true });
    gsap.to('.depth-near', { x:x*24, y:y*10, duration:1.1, overwrite:true });
  });
  hero.addEventListener('pointerleave', () => { if (window.gsap) gsap.to([camera, ...document.querySelectorAll('.atmosphere-depth')], { x: 0, y: 0, duration: 1, overwrite: true }); });
  const fighters = {
    bastion: { name:'Bastion', role:'The protector', art:'bastion-grounded.png', alt:'Bastion, an armoured knight with a sword and shield', lore:'Bastion protects humans and creatures alike. His shield is a promise: no ally stands alone.', note:'A steady presence when every decision matters.' },
    vesperfang: { name:'Vesperfang', role:'Guardian of twilight', art:'vesperfang-detailed.png', alt:'Vesperfang, an armoured dragon with a luminous blue eye', lore:'Vesperfang guards the twilight crossings, watching over the places where one world gives way to another.', note:'A creature of the threshold. An ally of the Accord.' },
    hushwing: { name:'Hushwing', role:'Five spirits. One presence.', art:'hushwing.svg', alt:'Five ghostly spirit bats moving together as Hushwing', lore:'Hushwing is a gathering of five spirit bats. Together they calm troubled minds in a world still learning to heal.', note:'Five silhouettes, moving as one fighter.' }
  };
  let portraitRevision = 0;
  document.querySelectorAll('[data-fighter]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.fighter, f = fighters[key], revision = ++portraitRevision;
    $('.portrait').dataset.shape = key;
    if (!paused && window.gsap) gsap.fromTo('.portrait-ring', { opacity: .4, filter: 'brightness(2)' }, { opacity: 1, filter: 'brightness(1)', duration: .85, overwrite: true });
    const portrait = $('#portrait'); portrait.src = `shadow-theatre/assets/${f.art}`; portrait.alt = f.alt;
    $('#fighter-name').textContent = f.name; $('#fighter-role').textContent = f.role;
    $('#fighter-lore').textContent = f.lore; $('#fighter-note').textContent = f.note;
    document.querySelectorAll('[data-fighter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    portrait.decode().then(() => {
      if (revision === portraitRevision && !paused && window.gsap) gsap.fromTo(portrait, { opacity: .3 }, { opacity: 1, duration: .35, overwrite: true });
    }).catch(() => {});
  }));
  // Original sample-free soundtrack; metallic interface impacts use short partials.
  const music = new Audio('shadow-theatre/assets/accord-forge.mp3'); music.loop = true; music.preload = 'none'; music.volume = .23;
  const soundButton = $('#sound');
  let audio, effects, soundOn = false, wantedSound = false, soundRevision = 0;
  async function setSound(on) {
    const revision = ++soundRevision; wantedSound = on;
    if (!on) { soundOn = false; music.pause(); save('shadow-sound','off'); soundButton.textContent = 'Sound off'; soundButton.setAttribute('aria-pressed','false'); return; }
    try {
      if (!audio) {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        effects = audio.createGain(); effects.gain.value = .12; effects.connect(audio.destination);
      }
      await audio.resume(); await music.play();
      if (revision !== soundRevision) { if (!wantedSound) music.pause(); return; }
      soundOn = true; save('shadow-sound','on'); soundButton.textContent = 'Sound on'; soundButton.setAttribute('aria-pressed','true');
    } catch {
      if (revision === soundRevision) { music.pause(); soundOn = false; wantedSound = false; soundButton.textContent = 'Sound off'; soundButton.setAttribute('aria-pressed','false'); }
    }
  }
  soundButton.addEventListener('click', () => setSound(!wantedSound));
  const startSavedSound = event => {
    if (needsLandscape) return;
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    document.removeEventListener('pointerdown', startSavedSound); document.removeEventListener('keydown', startSavedSound);
    if (read('shadow-sound') !== 'off' && !event.target.closest('#sound')) setSound(true);
  };
  document.addEventListener('pointerdown', startSavedSound); document.addEventListener('keydown', startSavedSound);
  document.addEventListener('visibilitychange', () => {
    updateFilm();
    if (document.hidden || needsLandscape) { music.pause(); if (audio) audio.suspend(); }
    else if (soundOn) { if (audio) audio.resume().catch(() => {}); music.play().catch(() => {}); }
  });
  document.addEventListener('click', event => {
    if (!soundOn || !audio || !event.target.closest('button,a')) return;
    const now = audio.currentTime;
    [420,1158,2270,3754].forEach((hz,i) => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = hz;
      gain.gain.setValueAtTime(.18/(i+1),now); gain.gain.exponentialRampToValueAtTime(.0001,now+.16+i*.022);
      osc.connect(gain); gain.connect(effects); osc.start(now); osc.stop(now+.25);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  });
  // Mobile has one landscape layout. Unsupported orientation locks use a rotate screen.
  const orientationGate = $('#orientation-gate'), enterLandscape = $('#enter-landscape');
  let focusBeforeGate;
  function updateOrientationGate() {
    needsLandscape = orientationQuery.matches;
    document.documentElement.classList.toggle('needs-landscape', needsLandscape);
    orientationGate.hidden = !needsLandscape;
    document.querySelectorAll('body > header, body > main, body > footer, .skip').forEach(e => { e.inert = needsLandscape; });
    if (needsLandscape) {
      if (!orientationGate.contains(document.activeElement)) focusBeforeGate = document.activeElement;
      enterLandscape.focus({ preventScroll: true }); music.pause();
    } else {
      if (focusBeforeGate && focusBeforeGate.isConnected) focusBeforeGate.focus({ preventScroll: true });
      focusBeforeGate = null;
      if (soundOn && !document.hidden) music.play().catch(() => {});
    }
    updateFilm();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  orientationQuery.addEventListener('change', updateOrientationGate);
  enterLandscape.addEventListener('click', async () => {
    const status = $('#rotate-status');
    if (!screen.orientation || typeof screen.orientation.lock !== 'function' || !document.documentElement.requestFullscreen) {
      status.textContent = 'Turn your phone sideways. If it stays upright, turn off your phone’s rotation lock.'; return;
    }
    enterLandscape.disabled = true;
    try {
      await document.documentElement.requestFullscreen();
      await screen.orientation.lock('landscape');
      status.textContent = ''; updateOrientationGate();
    } catch {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen().catch(() => {});
      status.textContent = 'Turn your phone sideways. If it stays upright, turn off your phone’s rotation lock.';
    } finally { enterLandscape.disabled = false; }
  });
  updateOrientationGate();
  $('#share').addEventListener('click', async () => {
    const url = new URL('./', window.location.href).href;
    try {
      if (navigator.share) await navigator.share({ title:'Clashbound', text:'Choose three allies. Make your next move matter.', url });
      else { await navigator.clipboard.writeText(url); $('#share-status').textContent = 'Game link copied. Share it with a friend.'; }
    } catch (error) { if (error.name !== 'AbortError') $('#share-status').textContent = 'Share the game: '+url; }
  });
})();
