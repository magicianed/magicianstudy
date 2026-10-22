'use strict';
/* Handshake — shared helpers, saving, sound, XP. */

const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(9)) { if (kid == null || kid === false) continue; e.append(kid instanceof Node ? kid : document.createTextNode(String(kid))); }
  return e;
}
const NS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
const wait = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 40) : ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.95 6.1 6.7.92-4.88 4.66 1.2 6.62L12 17.3l-5.97 3.2 1.2-6.62L2.35 9.22l6.7-.92z"/></svg>';
const praise = () => pick(['Nailed it.', 'Clean.', 'Exactly right.', 'Locked in.', 'Perfect.', 'Yes.']);

/* ── saved progress ── */
const KEY = 'handshake-v1';
const state = { xp: 0, sound: true, levels: {}, exam: { best: 0, runs: 0 }, checks: {}, answer: '' };
try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); Object.assign(state, s); state.levels = s.levels || {}; state.checks = s.checks || {}; state.exam = s.exam || { best: 0, runs: 0 }; } } catch (e) { /* private window: play without saving */ }
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 300); }
const lvlState = id => (state.levels[id] = state.levels[id] || { watch: false, play: 0, quiz: 0 });

/* ── sound: tiny synth blips, no files ── */
const Sound = {
  ctx: null,
  tone(freq, dur = .12, type = 'sine', vol = .05, delay = 0, slide = 0) {
    if (!state.sound) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + .03);
    } catch (e) {}
  },
  good() { this.tone(660, .1); this.tone(990, .16, 'sine', .05, .07); },
  bad() { this.tone(180, .22, 'triangle', .07, 0, -60); },
  pop() { this.tone(520 + Math.random() * 300, .07, 'sine', .04); },
  tick() { this.tone(1400, .025, 'square', .012); },
  send() { this.tone(420, .14, 'sine', .03, 0, 380); },
  drop() { this.tone(300, .25, 'sawtooth', .025, 0, -220); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .24, 'sine', .05, i * .09)); },
  beat(i) { this.tone([392, 494, 587, 698][i % 4], .09, 'triangle', .045); }
};

/* ── XP and ranks ── */
const RANKS = ['Packet', 'Segment', 'Port', 'Socket', 'Handshaker', 'Resolver', 'Sniffer', 'Net Admin', 'Network Wizard'];
const PER_RANK = 400;
function renderHUD() {
  const r = Math.min(RANKS.length - 1, Math.floor(state.xp / PER_RANK));
  $('#rank').textContent = RANKS[r];
  $('#xpFill').style.width = (r === RANKS.length - 1 ? 100 : (state.xp % PER_RANK) / PER_RANK * 100) + '%';
  $('#xpNum').textContent = state.xp + ' XP';
  const sb = $('#soundBtn');
  sb.setAttribute('aria-pressed', String(state.sound));
  sb.innerHTML = state.sound
    ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
}
function award(n, target) {
  if (!n) return;
  const before = Math.floor(state.xp / PER_RANK);
  state.xp += n;
  floatXP(target, n);
  if (Math.floor(state.xp / PER_RANK) > before && before < RANKS.length - 1) { toast(`New rank: ${RANKS[Math.min(RANKS.length - 1, before + 1)]}`); Sound.win(); }
  renderHUD(); save();
}
function floatXP(target, n) {
  const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const s = el('span', { class: 'xpfloat' }, '+' + n + ' XP');
  s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = Math.max(70, r.top - 8) + 'px';
  document.body.append(s); setTimeout(() => s.remove(), 1000);
}
function toast(msg) { const t = el('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2700); }
function shake(node) { if (!node || RM) return; node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); setTimeout(() => node.classList.remove('shake'), 420); }
function confetti() {
  if (RM) return;
  const c = $('#confetti'), g = c.getContext('2d'), dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#4cc9f0', '#3ddc97', '#ffb703', '#a78bfa', '#ff5d73'];
  const parts = Array.from({ length: 140 }, () => {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.3, sp = 7 + Math.random() * 10;
    return { x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6.3, vr: (Math.random() - .5) * .35, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, col: pick(cols) };
  });
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0; g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - t / 2200); g.fillStyle = p.col; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
    if (t < 2300) requestAnimationFrame(frame); else g.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}
const starsHTML = (n, max = 3) => Array.from({ length: max }, (_, i) => STAR.replace('<svg', `<svg class="${i < n ? 'on' : ''}" style="animation-delay:${200 + i * 180}ms"`)).join('');

/* ── a living background: faint links and packets drifting between nodes ── */
(function bgNet() {
  const c = document.getElementById('bgnet'); if (!c) return;
  const g = c.getContext('2d');
  let W, H, nodes, pkts;
  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 52000) + 8;
    nodes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H }));
    pkts = [];
  };
  size(); addEventListener('resize', size);
  const links = () => { const L = []; nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 210) L.push([a, b]); })); return L; };
  let L = links(), last = 0;
  addEventListener('resize', () => (L = links()));
  function frame(t) {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(76,201,240,.07)'; g.lineWidth = 1;
    for (const [a, b] of L) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.fillStyle = 'rgba(179,192,205,.18)';
    for (const n of nodes) { g.beginPath(); g.arc(n.x, n.y, 2, 0, 6.3); g.fill(); }
    if (!RM && L.length && t - last > 420) { last = t; const [a, b] = pick(L); pkts.push({ a, b, t: 0, c: pick(['76,201,240', '61,220,151', '255,183,3']) }); }
    pkts = pkts.filter(p => (p.t += .006) < 1);
    for (const p of pkts) { const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t); g.fillStyle = `rgba(${p.c},${.55 * Math.sin(p.t * Math.PI)})`; g.fillRect(x - 3, y - 3, 6, 6); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* each game file registers itself here: { title, tagline, how: [...], preview(S), run(area, api) } */
const GAMES = {};
