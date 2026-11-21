/* Rekenleger-renspel: echt rennen en sturen. Eén canvas, eigen spellus.
   Besturen: veeg of tik links/rechts, pijltjestoetsen, of tik direct op het antwoord. */
import * as RN from './runner.mjs';
import * as PZ from './puzzles.mjs';

const TAU = Math.PI * 2;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const LANES = [-.62, 0, .62];

export function createRunnerGame(ctx) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lg-canvas';
  canvas.setAttribute('aria-label', 'Speelveld: stuur je leger naar het goede antwoord');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false, paused = false;
  let run = null, onEnd = null, onChange = null, img = null;
  // spelwereld
  let lane = 1, px = 0, scroll = 0, speed = .5, objs = [], spawnIn = .6, freeze = 0, flash = null, texts = [], pops = [], joiners = [], bolts = [];
  // de vriendjes van het kind als poppetjes: elk hoofd is een vriendje, het shirt in de kleur van de familie
  let faces = [], pace = 1, onPace = null, lastSteer = 0;
  function makeFace(src, hue) {
    const f = { c: document.createElement('canvas'), ok: false, shirt: `hsl(${hue},62%,52%)`, dark: `hsl(${hue},55%,34%)` }; f.c.width = f.c.height = 96;
    const im = new Image(); im.onload = () => { const x = f.c.getContext('2d'); x.save(); x.beginPath(); x.arc(48, 48, 44, 0, TAU); x.clip(); x.drawImage(im, -6, -6, 108, 108); x.restore(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.beginPath(); x.arc(48, 48, 44, 0, TAU); x.stroke(); f.ok = true; }; im.src = src;
    return f;
  }
  let shown = 0, bossObj = null, bannerQ = null, qStart = 0, finalAnim = null, clashAnim = null;

  /* ---------- perspectief ---------- */
  const horizon = () => H * .14;
  const sc = z => 1 / (1 + 2.4 * Math.max(-.2, z));
  const Y = z => horizon() + (H * .97 - horizon()) * sc(z);
  const X = (x, z) => W / 2 + x * W * .46 * sc(z);
  const unit = () => Math.min(Math.max(W, 560), 780) / 700 * 1.2;
  function resize() { const r = canvas.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); }

  /* ---------- tekenen ---------- */
  function sky() {
    const gr = g.createLinearGradient(0, 0, 0, horizon() + 10); gr.addColorStop(0, '#8fd3ff'); gr.addColorStop(1, '#d9f1ff');
    g.fillStyle = gr; g.fillRect(0, 0, W, horizon() + 2);
    g.fillStyle = '#7fb069'; // heuvels
    for (let i = 0; i < 6; i++) { const x = ((i * 220 - scroll * 30) % (W + 300) + W + 300) % (W + 300) - 150; g.beginPath(); g.ellipse(x, horizon() + 4, 140, 34, 0, Math.PI, 0); g.fill(); }
  }
  function ground() {
    g.fillStyle = '#7cc46a'; g.fillRect(0, horizon(), W, H);
    g.fillStyle = '#6db35c';
    for (let i = 0; i < 30; i++) { const z = ((i * .19 - scroll) % 5.7 + 5.7) % 5.7 - .15, side = i % 2 ? -1 : 1; g.beginPath(); g.ellipse(X(side * (1.3 + (i * 7 % 4) * .3), z), Y(z), 22 * sc(z), 7 * sc(z), 0, 0, TAU); g.fill(); }
    const zf = 7, zn = -.18;
    // de weg: blauw zoals een racebaan
    g.fillStyle = '#3d8fe0'; poly([[-1, zn], [-1, zf], [1, zf], [1, zn]]);
    g.fillStyle = '#5aa9f0'; poly([[-.94, zn], [-.94, zf], [.94, zf], [.94, zn]]);
    // randen
    for (const s of [-1, 1]) { g.fillStyle = '#ffd34d'; poly([[s * .94, zn], [s * .94, zf], [s * 1.0, zf], [s * 1.0, zn]]); }
    // baanlijnen
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 18; i++) { const z0 = ((i * .3 - scroll) % 5.4 + 5.4) % 5.4 - .18, z1 = z0 + .14; for (const lx of [-.31, .31]) poly([[lx - .012, z0], [lx - .012, z1], [lx + .012, z1], [lx + .012, z0]]); }
    // torentjes langs de kant
    for (let i = 0; i < 10; i++) { const z = ((i * .55 - scroll) % 5.5 + 5.5) % 5.5 - .1; for (const s of [-1, 1]) tower(s * 1.12, z, i); }
  }
  function poly(pts) { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x, z), Y(z)) : g.moveTo(X(x, z), Y(z))); g.closePath(); g.fill(); }
  function tower(x, z, i) {
    const s = sc(z) * unit(), px = X(x, z), py = Y(z), w = 18 * s, h = 60 * s;
    g.fillStyle = ['#e85d5d', '#ffb648', '#7a6cf0', '#44c2a0'][i % 4]; g.fillRect(px - w / 2, py - h, w, h);
    g.fillStyle = '#f7f1e3'; g.beginPath(); g.moveTo(px - w * .7, py - h); g.lineTo(px, py - h - 22 * s); g.lineTo(px + w * .7, py - h); g.fill();
  }
  function person(x, z, team, t, scale = 1, fi = 0) {
    const s = sc(z) * scale * unit(), p_x = X(x, z), py = Y(z), bob = Math.sin(t * 12 + x * 13 + z * 7) * 2 * s;
    if (s < .04) return;
    const f = team === 'me' && faces.length ? faces[fi % faces.length] : null;
    if (f) { // vriendje: lijfje in familiekleur met een groot hoofd
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(p_x, py, 12 * s, 4 * s, 0, 0, TAU); g.fill();
      const step = Math.sin(t * 14 + x * 9) * 4 * s;
      g.fillStyle = f.dark; g.fillRect(p_x - 6 * s, py - 11 * s + bob, 5 * s, 11 * s + step); g.fillRect(p_x + 1 * s, py - 11 * s + bob, 5 * s, 11 * s - step);
      g.fillStyle = f.shirt; g.beginPath(); g.roundRect(p_x - 9 * s, py - 26 * s + bob, 18 * s, 17 * s, 7 * s); g.fill();
      const hs = 30 * s;
      if (f.ok) g.drawImage(f.c, p_x - hs / 2, py - 26 * s - hs + 4 * s + bob, hs, hs);
      else { g.fillStyle = '#fff'; g.beginPath(); g.arc(p_x, py - 37 * s + bob, hs / 2, 0, TAU); g.fill(); }
      return;
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(p_x, py, 11 * s, 4 * s, 0, 0, TAU); g.fill();
    g.fillStyle = team === 'me' ? '#2f4f9a' : '#8f2a2a'; const step = Math.sin(t * 14 + x * 9) * 4 * s;
    g.fillRect(p_x - 6 * s, py - 12 * s + bob, 5 * s, 12 * s + step); g.fillRect(p_x + 1 * s, py - 12 * s + bob, 5 * s, 12 * s - step);
    g.fillStyle = team === 'me' ? '#f4f4f4' : '#e7c9a0'; g.beginPath(); g.roundRect(p_x - 9 * s, py - 30 * s + bob, 18 * s, 20 * s, 6 * s); g.fill();
    g.fillStyle = team === 'me' ? '#e2452f' : '#5b3b2a'; g.fillRect(p_x - 2 * s, py - 30 * s + bob, 4 * s, 18 * s);
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(p_x, py - 36 * s + bob, 8 * s, 0, TAU); g.fill();
    g.fillStyle = team === 'me' ? '#2f7de1' : '#e2452f'; g.beginPath(); g.arc(p_x, py - 39 * s + bob, 9.5 * s, Math.PI, 0); g.fill(); g.fillRect(p_x - 11 * s, py - 40 * s + bob, 22 * s, 3.5 * s);
  }
  const SPOTS = Array.from({ length: 70 }, (_, i) => { const r = Math.sqrt(i + .5) * .05, a = i * 2.39996; return { x: Math.cos(a) * r, z: .05 + Math.abs(Math.sin(a) * r) * .9 }; });
  const visible = n => n <= 30 ? n : Math.min(70, 30 + Math.round(Math.sqrt(n - 30) * 3));
  function crowd(n, cx, cz, team, t) { const v = visible(Math.max(0, Math.round(n))); SPOTS.slice(0, v).map((p, i) => ({ x: cx + p.x, z: cz + p.z, i })).sort((a, b) => b.z - a.z).forEach(p => person(p.x, p.z, team, t, 1, p.i)); }
  function label(txt, x, y, size, fill = '#fff', stroke = 'rgba(20,24,60,.9)') {
    g.font = `900 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 5); g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
  }
  function arch(o, i, t) {
    const z = o.z, s = sc(z) * unit(), x = LANES[i], px = X(x, z), py = Y(z), w = 150 * s, h = 120 * s;
    const right = i === o.right, reveal = o.done && right, hint = o.hint && right && Math.sin(t * 10) > 0;
    const col = o.done ? (right ? '#3fbf6e' : o.picked === i ? '#e85d5d' : '#9aa6c4') : hint ? '#ffe04d' : ['#ff7a59', '#9b6bff', '#ffb02e'][i];
    g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    g.fillRect(px - w / 2, py - h, 14 * s, h); g.fillRect(px + w / 2 - 14 * s, py - h, 14 * s, h);
    g.beginPath(); g.roundRect(px - w / 2, py - h - 18 * s, w, 46 * s, 14 * s); g.fill();
    if (!o.done || right || o.picked === i) label(String(o.options[i]), px, py - h + 5 * s, Math.max(16, 38 * s));
    if (reveal && o.picked !== i) label('✓', px, py - h - 34 * s, Math.max(14, 30 * s), '#c9ffd8');
  }
  function barrel(o, i, t) {
    const z = o.z, s = sc(z) * unit(), x = i ? .45 : -.45, px = X(x, z), py = Y(z), w = 130 * s, h = 100 * s;
    if (o.picked === i && o.burst) { g.fillStyle = '#9b6a3b'; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, d = o.burst * 120 * s; g.fillRect(px + Math.cos(a) * d, py - h / 2 + Math.sin(a) * d * .6, 10 * s, 5 * s); } return; }
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(px, py, w * .55, 10 * s, 0, 0, TAU); g.fill();
    const grd = g.createLinearGradient(px - w / 2, 0, px + w / 2, 0); grd.addColorStop(0, '#7a4b25'); grd.addColorStop(.5, '#c08850'); grd.addColorStop(1, '#6b3f1d');
    g.fillStyle = grd; g.beginPath(); g.roundRect(px - w / 2, py - h, w, h, 14 * s); g.fill();
    g.fillStyle = '#8f949c'; g.fillRect(px - w / 2, py - h + 12 * s, w, 7 * s); g.fillRect(px - w / 2, py - 19 * s, w, 7 * s);
    label(o.opts[i].label, px, py - h / 2, Math.max(16, 46 * s));
  }
  function coinRow(o, t) { const x = LANES[o.lane]; for (let k = 0; k < 3; k++) { const z = o.z + k * .12; if (o.got > k) continue; const s = sc(z) * unit(), cx = X(x, z), cy = Y(z) - 26 * s + Math.sin(t * 6 + k) * 4 * s; const sq = Math.abs(Math.cos(t * 3 + k)); g.fillStyle = '#f4b400'; g.beginPath(); g.ellipse(cx, cy, 13 * s * sq + 2, 13 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd95a'; g.beginPath(); g.ellipse(cx, cy, 9 * s * sq + 1, 9 * s, 0, 0, TAU); g.fill(); } }
  function bossDraw(b, t) {
    const z = b.z, s = sc(z) * unit() * 5.5, px = X(0, z), py = Y(z) + (b.shake > 0 ? Math.sin(t * 80) * 4 : 0);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py, 24 * s, 6 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#4a1f3a'; g.fillRect(px - 10 * s, py - 14 * s, 8 * s, 14 * s); g.fillRect(px + 2 * s, py - 14 * s, 8 * s, 14 * s);
    g.fillStyle = '#6b2a7a'; g.beginPath(); g.roundRect(px - 17 * s, py - 44 * s, 34 * s, 32 * s, 9 * s); g.fill();
    g.fillStyle = '#2a1030'; g.beginPath(); g.moveTo(px - 17 * s, py - 40 * s); g.lineTo(px - 34 * s, py - 60 * s); g.lineTo(px - 14 * s, py - 30 * s); g.fill(); g.beginPath(); g.moveTo(px + 17 * s, py - 40 * s); g.lineTo(px + 34 * s, py - 60 * s); g.lineTo(px + 14 * s, py - 30 * s); g.fill();
    g.fillStyle = '#c98b5a'; g.beginPath(); g.arc(px, py - 52 * s, 10 * s, 0, TAU); g.fill();
    g.fillStyle = '#1d0f24'; g.beginPath(); g.arc(px, py - 56 * s, 11 * s, Math.PI, 0); g.fill();
    g.fillStyle = '#e8d8ff'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(px + d * 8 * s, py - 62 * s); g.lineTo(px + d * 18 * s, py - 80 * s); g.lineTo(px + d * 3 * s, py - 64 * s); g.fill(); }
    g.fillStyle = '#ff4df0'; g.fillRect(px - 6 * s, py - 53 * s, 4 * s, 2.5 * s); g.fillRect(px + 2 * s, py - 53 * s, 4 * s, 2.5 * s);
    const bw = 70 * s, by = py - 92 * s;
    g.fillStyle = 'rgba(20,20,30,.7)'; g.beginPath(); g.roundRect(px - bw / 2, by, bw, 9 * s, 4 * s); g.fill();
    g.fillStyle = '#ff5d5d'; g.beginPath(); g.roundRect(px - bw / 2, by, bw * Math.max(0, b.shownHp / b.max), 9 * s, 4 * s); g.fill();
    label(String(Math.max(0, Math.round(b.shownHp))), px, by - 14 * s, Math.max(18, 15 * s));
  }
  function leader(t) {
    // je eerste vriendje rent groot voorop
    person(px, .02, 'me', t, 1.9, 0);
  }
  function hud(t) {
    // som-banner bovenaan
    const q = objs.find(o => o.t === 'q' && !o.done);
    if (q) {
      const txt = q.text, size = Math.max(26, Math.min(56, W * .075)), bw = Math.min(W - 30, size * txt.length * .62 + 60), bx = W / 2 - bw / 2, by = 14;
      g.fillStyle = 'rgba(40,110,210,.92)'; g.beginPath(); g.roundRect(bx, by, bw, size * 1.5, size * .75); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      label(txt, W / 2, by + size * .76, size, '#fff', 'rgba(10,30,80,.6)');
    } else if (run && run.phase === 'boss' && !finalAnim) { label('Eindbaas!', W / 2, 40, Math.max(26, W * .06), '#ffd1ff', '#3a0d40'); }
    // munten, harten, voortgang
    label('🪙 ' + run.coins, 60, H - 26, 22, '#fff8d6');
    const hs = Array.from({ length: Math.max(run.maxHearts, run.hearts) }, (_, i) => i < run.hearts ? '♥' : '♡').join('');
    label(hs, W - 70, H - 26, 26, '#ff6b6b');
    const prog = run.i / run.track.events.length;
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.roundRect(16, horizon() + 8, 10, H * .45, 5); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.roundRect(16, horizon() + 8 + H * .45 * (1 - prog), 10, H * .45 * prog, 5); g.fill();
    if (paused) { g.fillStyle = 'rgba(10,20,50,.55)'; g.fillRect(0, 0, W, H); label('Pauze', W / 2, H / 2 - 20, 54); label('Tik om verder te spelen', W / 2, H / 2 + 34, 22); }
  }

  /* ---------- spellus ---------- */
  function spawn() {
    const ev = RN.current(run);
    if (!ev) return;
    if (objs.some(o => !o.done && o.idx === run.i)) return;
    const z = 3.4;
    if (ev.t === 'q') { const sum = makeSum(); objs.push({ t: 'q', idx: run.i, z, z0: z, ...sum, hint: run.fx.hint }); run.fx.hint = false; qStart = performance.now(); ctx.speak(sum.spoken); }
    else if (ev.t === 'g') { objs.push({ t: 'g', idx: run.i, z, opts: RN.gates(run) }); }
    else if (ev.t === 'c') { objs.push({ t: 'c', idx: run.i, z, lane: Math.floor(Math.random() * 3), got: 0, n: ev.n }); }
    else if (ev.t === 'e') { objs.push({ t: 'e', idx: run.i, z, n: RN.squadSize(run, ev) }); }
    else if (ev.t === 'b') { bossObj = { z: 4.5, max: run.boss, shownHp: run.bossLeft, shake: 0 }; RN.startBoss(run); ctx.speak('De eindbaas! Kies drie keer het goede antwoord om hem aan te vallen.'); spawnIn = 1.6; change(); }
  }
  function makeSum() {
    const steps = ctx.steps(false), types = ctx.types();
    let q;
    for (let i = 0; i < 20; i++) { q = PZ.quickPuzzle(types[Math.floor(Math.random() * types.length)], steps); if (q.tokens && q.cells.length === 1 && Number.isInteger(+q.cells[0].answer)) break; }
    if (!q || !q.tokens) { const a = 2 + Math.floor(Math.random() * 8), b = 1 + Math.floor(Math.random() * 9); q = { tokens: [a, '+', b, '=', { cell: 'x' }], cells: [{ id: 'x', answer: a + b }], spoken: `${a} plus ${b}`, kind: 'sum', topic: 'add', key: 'r' + a + b }; }
    const ans = +q.cells[0].answer, ch = RN.choices(ans);
    const text = q.tokens.map(t => typeof t === 'object' ? '?' : String(t)).join(' ');
    return { q, text, options: ch.options, right: ch.right, spoken: (q.spoken || text).replace(/\?/g, 'hoeveel'), T: thinkTime(q) * pace };
  }
  /* bedenktijd: grotere getallen, keer/delen, een gat in het midden en tientallen over = meer tijd */
  function thinkTime(q) {
    const nums = q.tokens.filter(t => typeof t === 'number' || /^\d+$/.test(t)).map(Number).concat(+q.cells[0].answer), op = q.tokens[1], big = Math.max(...nums);
    let T = 5.5;
    if (big > 10) T += 1.5; if (big > 20) T += 2; if (big > 100) T += 2.5;
    if (op === '×' || op === ':') T += 2;
    if (typeof q.tokens[q.tokens.length - 1] !== 'object') T += 2;
    const [a, , b] = q.tokens; if ((op === '+' || op === '−') && typeof a === 'number' && typeof b === 'number' && big > 10) { const o = op === '+' ? a % 10 + b % 10 >= 10 : a % 10 < b % 10; if (o) T += 2; }
    return T;
  }
  function change() { onChange && onChange(); }
  function say(txt, c = '#fff') { texts.push({ txt, t: 0, c }); }

  function resolve(o) {
    const pick = lane;
    if (o.t === 'q') {
      const ok = pick === o.right; o.done = true; o.picked = pick;
      ctx.record(o.q, ok, performance.now() - qStart);
      // tempo past zich aan: fout = volgende keer meer tijd; snel en goed = iets vlotter
      const used = lastSteer > qStart ? (lastSteer - qStart) / 1000 : o.T;
      if (!ok) pace = Math.min(1.8, pace * 1.15); else if (used < o.T * .45) pace = Math.max(.8, pace * .96);
      onPace && onPace(pace);
      const wasBoss = run.phase === 'boss';
      const r = RN.answer(run, ok);
      if (ok) { ctx.sound('correct'); flash = { c: 'rgba(60,200,110,.25)', t: 0 }; if (wasBoss) { bolts.push({ t: 0 }); setTimeout(() => { if (bossObj) bossObj.shake = .4; }, 250); say('Raak!', '#d6ffe0'); } else { addJoiners(r.gain); say('+' + r.gain, '#c9ffd8'); } ctx.speak(wasBoss ? 'Raak!' : 'Goed zo!'); }
      else { flash = { c: 'rgba(230,70,70,.25)', t: 0 }; say(`Het was ${o.options[o.right]}`, '#ffd1cc'); if (r.gain < 0) for (let k = 0; k < Math.min(-r.gain, 12); k++) pops.push({ x: px + (Math.random() - .5) * .3, z: .1 + Math.random() * .2, t: 0, c: '#ff8a7a' }); ctx.speak(`Oei. Het was ${o.options[o.right]}.`); }
      freeze = .5; change();
    } else if (o.t === 'g') {
      const i = px < 0 ? 0 : 1; o.picked = i; o.burst = .01;
      const r = RN.gate(run, o.opts[i]); say(`${r.before} ${o.opts[i].label} = ${r.after}`, '#fff3b0');
      if (r.after > r.before) addJoiners(Math.min(20, r.after - r.before), true); else shown = run.army;
      ctx.sound(r.best ? 'correct' : 'tap'); ctx.speak(r.best ? 'Slim gekozen!' : `De andere ton was beter: ${o.opts[1 - i].result}.`); o.done = true; change();
    } else if (o.t === 'c') {
      const got = lane === o.lane ? o.n : 0; o.got = got; RN.coins(run, got); if (got) { ctx.sound('tap'); say('+' + got + ' 🪙', '#fff3b0'); } o.done = true; change();
    } else if (o.t === 'e') {
      const before = run.army, res = RN.clash(run); clashAnim = { o, t: 0, from: res.mine, enemies: res.enemies, res, dur: res.skipped ? .8 : Math.min(2, .6 + Math.min(res.mine, res.enemies) * .03) };
      o.done = true; freeze = clashAnim.dur; change();
    }
  }
  function addJoiners(n, silent) { const k = Math.min(n, 20); for (let i = 0; i < k; i++) joiners.push({ x: (i % 2 ? 1 : -1) * (1.15 + Math.random() * .3), z: .1 + Math.random() * .6, k: -i * .04, f: i }); shown = run.army - k; if (!silent) { } }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!canvas.isConnected) { running = false; return; }
    if (!W || canvas.width !== Math.round(canvas.getBoundingClientRect().width * dpr)) resize();
    if (!W || !run) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const t = now / 1000;
    if (!paused) step(dt);
    sky(); ground();
    // van ver naar dichtbij
    const list = objs.slice().sort((a, b) => b.z - a.z);
    if (bossObj) bossDraw(bossObj, t);
    for (const o of list) {
      if (o.t === 'q') [0, 1, 2].forEach(i => arch(o, i, t));
      else if (o.t === 'g') [0, 1].forEach(i => barrel(o, i, t));
      else if (o.t === 'c') coinRow(o, t);
      else if (o.t === 'e' && (!o.done || clashAnim?.o === o)) { const n = clashAnim?.o === o ? clashAnim.enemiesLeft ?? o.n : o.n; if (n > 0) { crowd(n, 0, o.z, 'foe', t); label(String(Math.round(n)), X(0, o.z), Y(o.z + .15) - 70 * sc(o.z) * unit(), Math.max(18, 40 * sc(o.z)), '#ffd9d2'); } }
    }
    for (const j of joiners) person(j.x, j.z, 'me', t, 1, j.f || 0);
    crowd(shown, px, .12, 'me', t);
    leader(t);
    for (const p of pops) { g.globalAlpha = 1 - p.t; g.fillStyle = p.c; g.beginPath(); g.arc(X(p.x, p.z), Y(p.z) - 20 * sc(p.z), (6 + p.t * 18) * sc(p.z), 0, TAU); g.fill(); g.globalAlpha = 1; }
    for (const b of bolts) if (bossObj) { const x0 = X(px, 0), y0 = Y(0) - 120, x1 = X(0, bossObj.z), y1 = Y(bossObj.z) - 150 * sc(bossObj.z), k = b.t; g.strokeStyle = `rgba(120,220,255,${1 - k})`; g.lineWidth = 8; g.beginPath(); g.moveTo(x0 + (x1 - x0) * Math.max(0, k - .3), y0 + (y1 - y0) * Math.max(0, k - .3)); g.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); g.stroke(); }
    label(String(Math.max(0, Math.round(shown + joiners.length * 0))), X(px, .12), Y(.12) - 200 * sc(.12) * unit(), Math.max(28, W * .07));
    for (const x of texts) { g.globalAlpha = Math.min(1, 2 - 2 * x.t); label(x.txt, W / 2, H * .42 - x.t * 50, Math.max(24, W * .06), x.c); g.globalAlpha = 1; }
    if (flash) { g.fillStyle = flash.c; g.globalAlpha = 1 - flash.t; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    hud(t);
  }
  function step(dt) {
    // stuur soepel naar je baan
    px += (LANES[lane] - px) * Math.min(1, dt * 10);
    texts = texts.filter(x => (x.t += dt * .8) < 1);
    pops = pops.filter(p => (p.t += dt * 2) < 1);
    bolts = bolts.filter(b => (b.t += dt * 2.5) < 1);
    if (flash && (flash.t += dt * 2.5) >= 1) flash = null;
    if (bossObj) { bossObj.shownHp += (run.bossLeft - bossObj.shownHp) * Math.min(1, dt * 5); if (bossObj.shake > 0) bossObj.shake -= dt; }
    joiners = joiners.filter(j => { j.k += dt * 1.8; if (j.k < 0) return true; j.x += (px - j.x) * Math.min(1, dt * 5); j.z += (.12 - j.z) * Math.min(1, dt * 5); if (j.k >= 1) { shown = Math.min(run.army, shown + 1); return false; } return true; });
    if (!joiners.length) shown += (run.army - shown) * Math.min(1, dt * 6);
    if (clashAnim) { const c = clashAnim; c.t += dt; const k = Math.min(1, c.t / c.dur), n = c.res.skipped ? 0 : Math.min(c.from, c.enemies) * k; c.enemiesLeft = c.enemies - n; if (!c.res.skipped) { shown = Math.max(0, c.from - n); if (Math.random() < .5) pops.push({ x: (Math.random() - .5) * .5, z: .3 + Math.random() * .1, t: 0, c: Math.random() < .5 ? '#ffd166' : '#ff8a5d' }); } else c.o.z += dt * 3; if (k >= 1) { const r = c.res; clashAnim = null; shown = run.army; say(r.skipped ? 'Overgevlogen!' : r.won ? `${r.mine} − ${r.enemies} = ${r.mine - r.enemies}` : 'Oei! Een hart kwijt', r.won ? '#fff3b0' : '#ffd1cc'); ctx.speak(r.skipped ? 'Ze vlogen over je heen.' : r.won ? `${r.mine} min ${r.enemies} is ${r.mine - r.enemies}.` : 'Oei, zij waren sterker. Je verliest een hart, maar je krijgt hulp.'); if (run.done) end(); } return; }
    if (finalAnim) { const f = finalAnim; f.t += dt; const k = Math.min(1, f.t / f.dur), n = Math.min(f.res.mine, f.res.need) * k; shown = Math.max(0, f.res.mine - n); if (bossObj) { bossObj.shownHp = Math.max(0, f.res.need - n); bossObj.z += (.55 - bossObj.z) * Math.min(1, dt * 2); } if (Math.random() < .6) pops.push({ x: (Math.random() - .5) * .5, z: .4 + Math.random() * .1, t: 0, c: '#ffd166' }); if (k >= 1 && f.t > f.dur + .8) { finalAnim = null; end(); } else if (k >= 1 && !f.said) { f.said = true; if (f.res.won) { bossObj = null; say('Gewonnen!', '#fff3b0'); } else say('Te sterk!', '#ffd1cc'); } return; }
    if (freeze > 0) { freeze -= dt; return; }
    for (const o of objs) if (o.t === 'e' && !o.done) o.n = run.fx.skip ? 0 : RN.squadSize(run, run.track.events[o.idx]);
    const nq = objs.filter(o => o.t === 'q' && !o.done).sort((a, b) => a.z - b.z)[0];
    const v = nq ? Math.min(speed, (nq.z0 - .2) / nq.T) : speed;
    scroll += dt * v * 1.2;
    for (const o of objs) o.z -= dt * v;
    if (bossObj && run.phase === 'boss') bossObj.z += (2.9 - bossObj.z) * Math.min(1, dt * 1.5);
    // aankomen bij je leger
    for (const o of objs) if (!o.done && o.z <= (o.t === 'e' ? .45 : o.t === 'c' ? .15 : .2)) resolve(o);
    objs = objs.filter(o => o.z > -.3 && !(o.done && o.t === 'e' && clashAnim?.o !== o));
    // volgende ding op de weg
    if (run.done) return;
    if (run.phase === 'boss') {
      if (run.bossQ >= run.track.bossQ) { if (!objs.some(o => !o.done)) { const res = RN.finalFight(run); finalAnim = { t: 0, dur: Math.min(2.6, .8 + Math.min(res.mine, res.need) * .03), res }; change(); } return; }
      if (!objs.some(o => !o.done)) { spawnIn -= dt; if (spawnIn <= 0) { const sum = makeSum(); objs.push({ t: 'q', idx: 'b' + run.bossQ, z: 2.5, z0: 2.5, ...sum, hint: run.fx.hint }); run.fx.hint = false; qStart = performance.now(); ctx.speak(sum.spoken); spawnIn = 1.2; } }
      return;
    }
    const pending = objs.filter(o => !o.done);
    const lastZ = pending.length ? Math.max(...pending.map(o => o.z)) : -1;
    if (lastZ < 2.1 && !pending.some(o => o.idx === run.i)) { spawnIn -= dt; if (spawnIn <= 0) { const ev = RN.current(run); spawn(); spawnIn = ev && ev.t === 'c' ? .3 : .9; } }
  }
  function end() { if (!run || run.ended) return; run.ended = true; setTimeout(() => onEnd && onEnd(run), 400); }

  /* ---------- besturen ---------- */
  function steer(d) { if (paused || !run) return; lastSteer = performance.now(); lane = Math.max(0, Math.min(2, lane + d)); ctx.sound && ctx.sound('tap'); }
  function laneAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    // tik op een antwoordboog of ton: stuur daarheen
    const q = objs.filter(o => !o.done && (o.t === 'q' || o.t === 'g')).sort((a, b) => a.z - b.z)[0];
    if (q) { const xs = q.t === 'q' ? LANES.map(l => X(l, q.z)) : [X(-.45, q.z), X(.45, q.z)]; let best = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i; }); return q.t === 'q' ? best : best ? 2 : 0; }
    return x < W / 3 ? lane - 1 : x > W * 2 / 3 ? lane + 1 : lane;
  }
  let touchX = null, touchY = null;
  canvas.addEventListener('pointerdown', e => { touchX = e.clientX; touchY = e.clientY; });
  canvas.addEventListener('pointerup', e => {
    if (paused) { paused = false; change(); return; }
    if (touchX === null) return;
    const dx = e.clientX - touchX; touchX = null;
    if (Math.abs(dx) > 30) steer(dx > 0 ? 1 : -1);
    else { lane = Math.max(0, Math.min(2, laneAt(e.clientX, e.clientY))); lastSteer = performance.now(); }
  });

  return {
    canvas,
    start(r, opts) { run = r; onEnd = opts.onEnd; onChange = opts.onChange; onPace = opts.onPace; pace = opts.pace || 1; faces = (opts.team || []).map(t => makeFace(t.src, t.hue)); lane = 1; px = 0; objs = []; joiners = []; texts = []; pops = []; bolts = []; bossObj = null; finalAnim = null; clashAnim = null; shown = r.army; spawnIn = 1.2; paused = false; freeze = 0; speed = opts.speed || .5; },
    mount(slot) { if (!slot) return; if (canvas.parentNode !== slot) slot.appendChild(canvas); resize(); if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    key(e) { if (!run) return false; if (e.key === 'ArrowLeft' || e.key === 'a') { steer(-1); return true; } if (e.key === 'ArrowRight' || e.key === 'd') { steer(1); return true; } if (e.key === ' ' || e.key === 'p') { paused = !paused; change(); return true; } if (['1', '2', '3'].includes(e.key)) { lane = +e.key - 1; return true; } return false; },
    pause(v = true) { paused = v; change(); },
    paused: () => paused,
    stop() { running = false; cancelAnimationFrame(raf); run = null; },
    powerUsed() { shown = run.army; if (run.fx.hint) { const q = objs.find(o => o.t === 'q' && !o.done); if (q) { q.hint = true; run.fx.hint = false; } } },
    debug: () => ({ objs, lane, run }),
    setLane(i) { lane = Math.max(0, Math.min(2, i)); }
  };
}
