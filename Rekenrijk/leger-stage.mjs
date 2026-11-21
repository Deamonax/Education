/* Rekenleger-speelveld: een weg in perspectief met een menigte ridders, tonnen en vijanden.
   Getekend op één canvas dat tussen renders blijft bestaan. Alleen beeld; de spelregels staan in leger.mjs. */

const TAU = Math.PI * 2;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function createStage() {
  const canvas = document.createElement('canvas');
  canvas.className = 'lg-canvas';
  canvas.setAttribute('role', 'img');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, scroll = 0, running = false;
  // toestand van wat je ziet
  const S = {
    army: 0, shown: 0, armyX: 0, leader: null,
    enemies: 0, enemyShown: 0, enemyZ: 2, enemyOn: false,
    barrels: null,            // [{label, x, z, burst}]
    boss: null,               // {hp, max, z, hit}
    pops: [], bolts: [], joiners: [], texts: [],
    moving: true, queue: []
  };
  let img = null;

  /* ---------- perspectief ---------- */
  const horizon = () => H * .1;
  const sc = z => 1 / (1 + 2.6 * Math.max(-.2, z));
  const Y = z => horizon() + (H * .96 - horizon()) * sc(z);
  const X = (x, z) => W / 2 + x * W * .42 * sc(z);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- tekenen ---------- */
  function road() {
    g.fillStyle = '#d9b98a'; g.fillRect(0, 0, W, H);
    // zand-textuur
    g.fillStyle = '#cfae7d';
    for (let i = 0; i < 40; i++) { const z = ((i * .137 + scroll * .5) % 1.6) - .1, x = (i % 2 ? -1 : 1) * (1.25 + (i * 7 % 5) * .25); g.beginPath(); g.ellipse(X(x, z), Y(z), 16 * sc(z), 4 * sc(z), 0, 0, TAU); g.fill(); }
    const zf = 6, zn = -.15;
    // weg
    g.fillStyle = '#8d9097';
    g.beginPath(); g.moveTo(X(-1, zn), Y(zn)); g.lineTo(X(-1, zf), Y(zf)); g.lineTo(X(1, zf), Y(zf)); g.lineTo(X(1, zn), Y(zn)); g.fill();
    // vangrails
    for (const side of [-1, 1]) {
      g.strokeStyle = '#6d7078'; g.lineWidth = 6; g.beginPath(); g.moveTo(X(side * 1.04, zn), Y(zn) - 10); g.lineTo(X(side * 1.04, zf), Y(zf)); g.stroke();
      for (let i = 0; i < 14; i++) { const z = ((i * .35 - scroll) % 4.9 + 4.9) % 4.9 - .15; const s = sc(z); g.fillStyle = '#7b7e86'; g.fillRect(X(side * 1.04, z) - 4 * s, Y(z) - 22 * s, 8 * s, 22 * s); }
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(side * .93, zn), Y(zn)); g.lineTo(X(side * .93, zf), Y(zf)); g.stroke();
    }
    // middenstrepen
    g.fillStyle = '#f2f2f2';
    for (let i = 0; i < 16; i++) {
      const z0 = ((i * .3 - scroll) % 4.8 + 4.8) % 4.8 - .15, z1 = z0 + .12;
      for (const lx of [-.33, .33]) { g.beginPath(); g.moveTo(X(lx - .015, z0), Y(z0)); g.lineTo(X(lx - .015, z1), Y(z1)); g.lineTo(X(lx + .015, z1), Y(z1)); g.lineTo(X(lx + .015, z0), Y(z0)); g.fill(); }
    }
  }
  function person(x, z, team, t, scale = 1) {
    const s = sc(z) * scale * Math.min(W, 700) / 700 * 1.25, px = X(x, z), py = Y(z), bob = Math.sin(t * 9 + x * 13 + z * 7) * 2 * s;
    if (s < .05) return;
    // schaduw
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(px, py, 11 * s, 4 * s, 0, 0, TAU); g.fill();
    // benen
    g.fillStyle = team === 'me' ? '#3d5fa8' : '#9a2f2f';
    const step = Math.sin(t * 12 + x * 9) * 3 * s;
    g.fillRect(px - 6 * s, py - 12 * s + bob, 5 * s, 12 * s + step); g.fillRect(px + 1 * s, py - 12 * s + bob, 5 * s, 12 * s - step);
    // lijf
    g.fillStyle = team === 'me' ? '#ead2a8' : '#e7c9a0';
    g.beginPath(); g.roundRect(px - 9 * s, py - 30 * s + bob, 18 * s, 20 * s, 6 * s); g.fill();
    g.fillStyle = team === 'me' ? '#7a5a3a' : '#6e4b32'; g.fillRect(px - 9 * s, py - 16 * s + bob, 18 * s, 3 * s);
    // hoofd
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(px, py - 36 * s + bob, 8 * s, 0, TAU); g.fill();
    // helm
    g.fillStyle = team === 'me' ? '#2f7de1' : '#e2452f';
    g.beginPath(); g.arc(px, py - 39 * s + bob, 9.5 * s, Math.PI, 0); g.fill();
    g.fillRect(px - 11 * s, py - 40 * s + bob, 22 * s, 3.5 * s);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(px - 3 * s, py - 43 * s + bob, 3 * s, 0, TAU); g.fill();
  }
  // posities in een rond groepje (zonnebloem-patroon)
  const SPOTS = Array.from({ length: 80 }, (_, i) => { const r = Math.sqrt(i + .5) * .052, a = i * 2.39996; return { x: Math.cos(a) * r, z: Math.sin(a) * r * .55 }; });
  const visible = n => n <= 40 ? n : Math.min(80, 40 + Math.round(Math.sqrt(n - 40) * 3.2));
  function crowd(n, cx, cz, team, t) {
    const v = visible(Math.max(0, Math.round(n)));
    const pts = SPOTS.slice(0, v).map(p => ({ x: cx + p.x, z: cz + p.z })).sort((a, b) => b.z - a.z);
    for (const p of pts) person(p.x, p.z, team, t);
  }
  function label(txt, x, y, size, fill = '#fff') {
    g.font = `900 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 6); g.strokeStyle = 'rgba(20,24,40,.85)'; g.lineJoin = 'round'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
  }
  function barrel(b, t) {
    const s = sc(b.z) * Math.min(W, 700) / 700 * 1.25, px = X(b.x, b.z), py = Y(b.z), w = 120 * s, h = 92 * s;
    if (b.burst > 0) { // spaanders
      g.fillStyle = '#9b6a3b';
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, d = b.burst * 120 * s; g.fillRect(px + Math.cos(a) * d, py - h / 2 + Math.sin(a) * d * .6, 10 * s, 5 * s); }
      if (b.burst > .6) return;
    }
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(px, py, w * .55, 10 * s, 0, 0, TAU); g.fill();
    const grd = g.createLinearGradient(px - w / 2, 0, px + w / 2, 0); grd.addColorStop(0, '#7a4b25'); grd.addColorStop(.5, b.best === undefined ? '#b77c45' : '#b77c45'); grd.addColorStop(1, '#6b3f1d');
    g.fillStyle = grd; g.beginPath(); g.roundRect(px - w / 2, py - h, w, h, 14 * s); g.fill();
    g.strokeStyle = '#4a2c14'; g.lineWidth = 1.5 * s;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(px - w / 2 + i * w / 6, py - h + 4 * s); g.lineTo(px - w / 2 + i * w / 6, py - 4 * s); g.stroke(); }
    g.fillStyle = '#8f949c'; g.fillRect(px - w / 2, py - h + 12 * s, w, 7 * s); g.fillRect(px - w / 2, py - 19 * s, w, 7 * s);
    if (b.glow) { g.strokeStyle = '#ffe38a'; g.lineWidth = 5 * s; g.beginPath(); g.roundRect(px - w / 2 - 4 * s, py - h - 4 * s, w + 8 * s, h + 8 * s, 16 * s); g.stroke(); }
    label(b.label, px, py - h / 2, Math.max(16, 44 * s));
  }
  function bossDraw(b, t) {
    const z = b.z, s = sc(z) * Math.min(W, 700) / 700 * 1.25 * 3.2, px = X(0, z), py = Y(z) + (b.shake ? Math.sin(t * 80) * 3 : 0);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py, 22 * s, 6 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#5a1f1f'; g.fillRect(px - 10 * s, py - 14 * s, 8 * s, 14 * s); g.fillRect(px + 2 * s, py - 14 * s, 8 * s, 14 * s);
    g.fillStyle = '#8a2d2d'; g.beginPath(); g.roundRect(px - 16 * s, py - 42 * s, 32 * s, 30 * s, 8 * s); g.fill();
    g.fillStyle = '#e7c9a0'; g.beginPath(); g.arc(px, py - 50 * s, 10 * s, 0, TAU); g.fill();
    g.fillStyle = '#3b3b45'; g.beginPath(); g.arc(px, py - 54 * s, 12 * s, Math.PI, 0); g.fill(); g.fillRect(px - 14 * s, py - 55 * s, 28 * s, 5 * s);
    g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(px - 12 * s, py - 60 * s); g.lineTo(px - 20 * s, py - 74 * s); g.lineTo(px - 6 * s, py - 64 * s); g.fill(); g.beginPath(); g.moveTo(px + 12 * s, py - 60 * s); g.lineTo(px + 20 * s, py - 74 * s); g.lineTo(px + 6 * s, py - 64 * s); g.fill();
    g.fillStyle = '#ff4d4d'; g.fillRect(px - 6 * s, py - 51 * s, 4 * s, 2.5 * s); g.fillRect(px + 2 * s, py - 51 * s, 4 * s, 2.5 * s);
    // levensbalk
    const bw = 70 * s, by = py - 86 * s;
    g.fillStyle = 'rgba(20,20,30,.7)'; g.beginPath(); g.roundRect(px - bw / 2, by, bw, 9 * s, 4 * s); g.fill();
    g.fillStyle = '#ff5d5d'; g.beginPath(); g.roundRect(px - bw / 2, by, bw * Math.max(0, b.shownHp / b.max), 9 * s, 4 * s); g.fill();
    label(String(Math.max(0, Math.round(b.shownHp))), px, by - 14 * s, Math.max(18, 16 * s));
  }
  function leaderDraw(t) {
    const z = -.02, s = sc(z) * Math.min(W, 700) / 700 * 1.25, px = X(S.armyX, z) , py = Y(z) - 8;
    person(S.armyX, z + .001, 'me', t, 1.5);
    // vlag met het gezicht van het vriendje
    const fx = px + 26 * s, fy = py - 120 * s;
    g.strokeStyle = '#5b4a3a'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(fx, py - 20 * s); g.lineTo(fx, fy - 10 * s); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(fx + 22 * s, fy + 6 * s, 20 * s, 0, TAU); g.fill();
    if (img && img.complete && img.naturalWidth) { g.save(); g.beginPath(); g.arc(fx + 22 * s, fy + 6 * s, 17 * s, 0, TAU); g.clip(); g.drawImage(img, fx + 5 * s, fy - 11 * s, 34 * s, 34 * s); g.restore(); }
    g.strokeStyle = '#2f7de1'; g.lineWidth = 3 * s; g.beginPath(); g.arc(fx + 22 * s, fy + 6 * s, 19 * s, 0, TAU); g.stroke();
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!canvas.isConnected) { running = false; return; }
    if (!W || canvas.width !== Math.round(canvas.getBoundingClientRect().width * dpr)) resize();
    if (!W) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const t = now / 1000;
    if (S.moving) scroll += dt * .5;
    // aantallen tellen soepel naar het doel
    S.shown += (S.army - S.shown) * Math.min(1, dt * 6); if (Math.abs(S.army - S.shown) < .5) S.shown = S.army;
    S.enemyShown += (S.enemies - S.enemyShown) * Math.min(1, dt * 6); if (Math.abs(S.enemies - S.enemyShown) < .5) S.enemyShown = S.enemies;
    if (S.boss) { S.boss.shownHp += (S.boss.hp - S.boss.shownHp) * Math.min(1, dt * 5); }
    runQueue(dt);
    road();
    // ver weg eerst
    if (S.boss) bossDraw(S.boss, t);
    if (S.enemyOn && S.enemyShown > .5) { crowd(S.enemyShown, 0, S.enemyZ, 'foe', t); label(String(Math.round(S.enemyShown)), X(0, S.enemyZ), Y(S.enemyZ + .2) - 70 * sc(S.enemyZ), Math.max(18, 40 * sc(S.enemyZ)), '#ffd9d2'); }
    if (S.barrels) for (const b of S.barrels) barrel(b, t);
    for (const j of S.joiners) person(j.x, j.z, 'me', t);
    crowd(S.shown, S.armyX, .16, 'me', t);
    leaderDraw(t);
    for (const p of S.pops) { g.globalAlpha = 1 - p.t; g.fillStyle = p.c; g.beginPath(); g.arc(X(p.x, p.z), Y(p.z) - 20 * sc(p.z), (6 + p.t * 18) * sc(p.z), 0, TAU); g.fill(); g.globalAlpha = 1; }
    for (const b of S.bolts) { const x0 = X(S.armyX, 0), y0 = Y(0) - 90, x1 = X(0, b.z), y1 = Y(b.z) - 140 * sc(b.z), k = b.t; g.strokeStyle = `rgba(140,200,255,${1 - k})`; g.lineWidth = 6; g.beginPath(); g.moveTo(x0 + (x1 - x0) * Math.max(0, k - .3), y0 + (y1 - y0) * Math.max(0, k - .3)); g.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); g.stroke(); }
    label(String(Math.round(S.shown)), X(S.armyX, .16), Y(.16) - 105 * sc(.16) * Math.min(W, 700) / 700 * 1.25, Math.max(26, W * .07));
    for (const x of S.texts) { g.globalAlpha = Math.min(1, 2 - 2 * x.t); label(x.txt, W / 2, H * .38 - x.t * 40, Math.max(24, W * .06), x.c); g.globalAlpha = 1; }
  }

  /* ---------- animaties als wachtrij van stappen ---------- */
  function runQueue(dt) {
    S.pops = S.pops.filter(p => (p.t += dt * 2) < 1);
    S.bolts = S.bolts.filter(b => (b.t += dt * 2.5) < 1);
    S.texts = S.texts.filter(x => (x.t += dt * .7) < 1);
    S.joiners = S.joiners.filter(j => { j.k += dt * 1.6; j.x += (j.tx - j.x) * Math.min(1, dt * 4); j.z += (j.tz - j.z) * Math.min(1, dt * 4); if (j.k >= 1) { S.army += 1; return false; } return true; });
    if (S.barrels) for (const b of S.barrels) if (b.burst > 0) b.burst = Math.min(1, b.burst + dt * 2);
    const step = S.queue[0];
    if (!step) return;
    step.t = (step.t || 0) + dt;
    if (!step.started) { step.started = true; step.start && step.start(); }
    if (step.tick) step.tick(Math.min(1, step.t / step.d), dt);
    if (step.t >= step.d) { S.queue.shift(); step.end && step.end(); }
  }
  const then = (d, opt = {}) => new Promise(res => S.queue.push({ d, ...opt, end: () => { opt.end && opt.end(); res(); } }));

  /* ---------- wat de rest van het spel kan vragen ---------- */
  const api = {
    canvas,
    mount(slot) { if (!slot) return; if (canvas.parentNode !== slot) slot.appendChild(canvas); resize(); if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    busy: () => S.queue.length > 0 || S.joiners.length > 0,
    reset(army, leaderSrc) { S.army = S.shown = army; S.armyX = 0; S.enemies = S.enemyShown = 0; S.enemyOn = false; S.barrels = null; S.boss = null; S.queue = []; S.joiners = []; S.moving = true; if (leaderSrc) { img = new Image(); img.src = leaderSrc; } },
    set(army) { S.army = army; },
    say(txt, c = '#fff') { S.texts.push({ txt, t: 0, c }); },
    /* nieuwe ridders rennen van de zijkant je groep in */
    recruit(n) {
      const k = Math.min(n, 24), extra = n - k;
      for (let i = 0; i < k; i++) { const side = i % 2 ? 1 : -1; S.joiners.push({ x: side * (1.1 + Math.random() * .3), z: .1 + Math.random() * .5, tx: S.armyX + (Math.random() - .5) * .2, tz: .16, k: -i * .05 }); }
      S.army += extra; api.say('+' + n, '#b8ffc9');
      return then(.9);
    },
    lose(n) { S.army = Math.max(0, S.army - n); return then(.3); },
    /* twee tonnen komen aanrollen */
    gates(opts) {
      S.barrels = opts.map((o, i) => ({ label: o.label, x: i ? .48 : -.48, z: 3, burst: 0 }));
      return then(1.1, { tick: k => { for (const b of S.barrels) b.z = 3 - 2.45 * ease(k); } });
    },
    async choose(i, result) {
      const b = S.barrels[i], other = S.barrels[1 - i]; b.glow = true;
      await then(.5, { tick: k => { S.armyX = b.x * ease(k); } });
      await then(.5, { tick: k => { b.z = .55 - .4 * ease(k); other.z = .55 - .4 * ease(k); }, end: () => { b.burst = .01; } });
      S.army = result; S.shown = Math.min(S.shown, result + 0);
      api.say(b.label, '#ffe38a');
      await then(.5, { tick: k => { S.armyX = b.x * (1 - ease(k)); other.z = .15 - .6 * k; } });
      S.barrels = null;
    },
    /* gevecht: rood loopt op je af; daarna verdwijnen ze één voor één tegen elkaar weg */
    preview(enemies) { S.enemies = enemies; if (!S.enemyOn) { S.enemyShown = enemies; S.enemyZ = 3; S.enemyOn = true; return then(1, { tick: k => { S.enemyZ = 3 - 1.2 * ease(k); } }); } return then(.1); },
    async battle(mine, enemies, skipped) {
      S.army = S.shown = mine;
      if (!S.enemyOn) { S.enemyOn = true; S.enemyZ = 3; }
      S.enemies = S.enemyShown = enemies; const z0 = S.enemyZ;
      await then(1.1, { tick: k => { S.enemyZ = z0 - (z0 - .45) * ease(k); } });
      if (skipped) { await then(.9, { tick: k => { S.enemyZ = .45 + k * 3; } }); S.enemyOn = false; return; }
      const n = Math.min(mine, enemies), d = Math.min(2.2, .5 + n * .04);
      let done = 0;
      await then(d, { tick: k => { const target = Math.round(n * k); while (done < target) { done++; S.army = Math.max(0, S.army - 1); S.enemies = Math.max(0, S.enemies - 1); S.shown = S.army; S.enemyShown = S.enemies; S.pops.push({ x: (Math.random() - .5) * .4, z: .32 + Math.random() * .1, t: 0, c: Math.random() < .5 ? '#ffd166' : '#ff8a5d' }); } S.enemyZ = .45 - .08 * k; } });
      if (S.enemies > 0) { api.say('Oei!', '#ffb4a8'); await then(.6, { tick: k => { S.enemyZ = .37 + k * 3; } }); }
      S.enemyOn = false; S.enemies = 0;
    },
    boss(max, hp) { S.boss = { max, hp, shownHp: hp, z: 3 }; return then(1.2, { tick: k => { S.boss.z = 3 - 2.4 * ease(k); } }); },
    hit(hp) { S.bolts.push({ t: 0, z: S.boss ? S.boss.z : 1 }); return then(.35, { end: () => { if (S.boss) { S.boss.hp = hp; S.boss.shake = true; setTimeout(() => { if (S.boss) S.boss.shake = false; }, 300); } } }); },
    async final(mine, need, won) {
      const n = Math.min(mine, need);
      await then(.6, { tick: k => { if (S.boss) S.boss.z = .8 - .3 * ease(k); } });
      let done = 0;
      await then(Math.min(2.4, .6 + n * .03), { tick: k => { const target = Math.round(n * k); while (done < target) { done++; S.army = Math.max(0, S.army - 1); S.shown = S.army; if (S.boss) S.boss.hp = Math.max(0, S.boss.hp - 1); S.pops.push({ x: (Math.random() - .5) * .5, z: .45 + Math.random() * .1, t: 0, c: '#ffd166' }); } } });
      if (won) { S.boss = null; api.say('Gewonnen!', '#ffe38a'); } else api.say('Te sterk!', '#ffb4a8');
      await then(1);
    },
    setBossHp(hp) { if (S.boss) S.boss.hp = hp; },
    debug: () => S
  };
  window.addEventListener('resize', resize);
  return api;
}
