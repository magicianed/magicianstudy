'use strict';
/* Handshake — the network stage: devices, wires and packets drawn in SVG.
   When `fast` is on (replaying earlier steps), things appear instantly and moving packets are skipped. */

const ICONS = {
  laptop: '<rect x="-25" y="-21" width="50" height="32" rx="4"/><rect x="-20" y="-16" width="40" height="22" rx="2" class="scr"/><path d="M-32 13h64l-5 7h-54z"/>',
  server: '<rect x="-21" y="-26" width="42" height="15" rx="3"/><rect x="-21" y="-8" width="42" height="15" rx="3"/><rect x="-21" y="10" width="42" height="15" rx="3"/><circle cx="-13" cy="-18.5" r="2.2" class="led"/><circle cx="-13" cy="-.5" r="2.2" class="led"/><circle cx="-13" cy="17.5" r="2.2" class="led"/><path d="M-4 -18.5h18M-4 -.5h18M-4 17.5h18" class="thin"/>',
  router: '<rect x="-27" y="-6" width="54" height="20" rx="7"/><path d="M-15 -6l-6-15M15 -6l6-15" class="thin"/><circle cx="-14" cy="4" r="2.2" class="led"/><circle cx="-5" cy="4" r="2.2" class="led"/><circle cx="4" cy="4" r="2.2" class="led"/>',
  phone: '<rect x="-13" y="-24" width="26" height="46" rx="6"/><rect x="-9" y="-18" width="18" height="30" rx="2" class="scr"/><circle cx="0" cy="17" r="2" class="led"/>',
  cloud: '<path d="M-30 16a14 14 0 0 1 2-28a19 19 0 0 1 35-6a14 14 0 0 1 21 13a11 11 0 0 1 1 21z"/>',
  dns: '<rect x="-22" y="-25" width="44" height="50" rx="6"/><path d="M-13 -13h26M-13 -3h26M-13 7h18" class="thin"/><circle cx="12" cy="7" r="2.6" class="led"/>',
  app: '<rect x="-21" y="-17" width="42" height="34" rx="5"/><path d="M-21 -8h42" class="thin"/>',
  attacker: '<path d="M-19 24c0-16 6-30 19-30s19 14 19 30z"/><path d="M-11 -2a11 12 0 0 1 22 0v7h-22z" class="scr"/><path d="M-6 0h4M2 0h4" class="eyes"/>',
  eye: '<path d="M-24 0c10-15 38-15 48 0c-10 15-38 15-48 0z"/><circle cx="0" cy="0" r="7" class="scr"/><circle cx="0" cy="0" r="3" class="led"/>',
  user: '<circle cx="0" cy="-10" r="10"/><path d="M-20 24c0-15 9-22 20-22s20 7 20 22z"/>',
  bucket: '<path d="M-24 -22h48l-5 46h-38z"/>'
};

class Stage {
  constructor(host, w = 640, h = 380) {
    this.w = w; this.h = h; this.fast = false; this.quiet = false;
    this.svg = sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'stage', role: 'img' });
    const defs = sv('defs', {}, this.svg);
    defs.innerHTML = `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(179,192,205,.09)"/></pattern>`;
    sv('rect', { width: w, height: h, fill: 'url(#dots)' }, this.svg);
    this.gZones = sv('g', {}, this.svg);
    this.gLinks = sv('g', {}, this.svg);
    this.gNodes = sv('g', {}, this.svg);
    this.gFx = sv('g', {}, this.svg);
    this.gText = sv('g', {}, this.svg);
    host.appendChild(this.svg);
    this.items = {};
  }
  clear() { [this.gZones, this.gLinks, this.gNodes, this.gFx, this.gText].forEach(g => (g.innerHTML = '')); this.items = {}; }
  /* fade in; only an inner group gets scaled, because a CSS transform on a positioned
     SVG group would override its translate() and flash it at the corner */
  _in(node) {
    if (this.fast || RM || !node.animate) return;
    const o = { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' };
    node.animate([{ opacity: 0 }, { opacity: 1 }], o);
    const inner = node.firstElementChild;
    if (node.hasAttribute('transform') && inner && inner.tagName === 'g' && !inner.hasAttribute('transform')) inner.animate([{ transform: 'scale(.85)' }, { transform: 'none' }], o);
  }
  get(id) { return this.items[id]; }
  remove(id) { const it = this.items[id]; if (it) { it.g.remove(); delete this.items[id]; } }

  node(id, x, y, kind, label, cls = '') {
    this.remove(id);
    const g = sv('g', { class: `nd ${kind} ${cls}`, transform: `translate(${x},${y})` }, this.gNodes);
    const ic = sv('g', { class: 'ic' }, g); ic.innerHTML = ICONS[kind] || ICONS.app;
    if (label) { const t = sv('text', { x: 0, y: kind === 'router' ? 34 : 44, class: 'nd-label', 'text-anchor': 'middle' }, g); t.textContent = label; }
    this.items[id] = { g, x, y, kind };
    this._in(g);
    return g;
  }
  glyph(id, txt) { const it = this.items[id]; if (!it) return; const t = sv('text', { x: 0, y: 5, class: 'nd-glyph', 'text-anchor': 'middle' }, it.g); t.textContent = txt; }
  lit(...ids) { Object.entries(this.items).forEach(([k, it]) => it.g.classList.toggle('lit', ids.includes(k))); }
  dim(...ids) { ids.forEach(k => this.items[k] && this.items[k].g.classList.add('dimmed')); }
  undim() { Object.values(this.items).forEach(it => it.g.classList.remove('dimmed')); }
  state(id, cls, on = true) { const it = this.items[id]; if (it) it.g.classList.toggle(cls, on); }

  link(id, a, b, cls = '') {
    const A = this.items[a], B = this.items[b];
    const ln = sv('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'ln ' + cls }, this.gLinks);
    this.items[id] = { g: ln, a, b };
    return ln;
  }
  linkCls(id, cls, on = true) { const it = this.items[id]; if (it) it.g.classList.toggle(cls, on); }

  text(id, x, y, str, cls = '', anchor = 'middle') {
    this.remove(id);
    const t = sv('text', { x, y, class: 'st-text ' + cls, 'text-anchor': anchor }, this.gText);
    t.textContent = str;
    this.items[id] = { g: t, x, y };
    this._in(t);
    return t;
  }
  zone(id, x, y, w, h, label, cls = '') {
    this.remove(id);
    const g = sv('g', { class: 'zone ' + cls }, this.gZones);
    sv('rect', { x, y, width: w, height: h, rx: 14 }, g);
    if (label) { const t = sv('text', { x: x + 12, y: y + 20, class: 'zone-label' }, g); t.textContent = label; }
    this.items[id] = { g, x, y, w, h };
    this._in(g);
    return g;
  }
  /* a speech bubble over a node */
  badge(nodeId, txt, cls = '', dy = -52) {
    const id = 'badge:' + nodeId; this.remove(id);
    const n = this.items[nodeId]; if (!n) return;
    const w = Math.max(44, txt.length * 8.4 + 22);
    const g = sv('g', { class: 'bubble ' + cls, transform: `translate(${n.x},${n.y + dy})` }, this.gText);
    sv('rect', { x: -w / 2, y: -16, width: w, height: 30, rx: 10 }, g);
    sv('path', { d: 'M-6 14l6 7l6-7z' }, g);
    const t = sv('text', { x: 0, y: 4, 'text-anchor': 'middle' }, g); t.textContent = txt;
    this.items[id] = { g };
    this._in(g);
    return g;
  }
  unbadge(nodeId) { this.remove('badge:' + nodeId); }

  /* a labelled chip; persistent ones get an id, moving ones don't */
  _chip(parent, x, y, label, cls) {
    const w = Math.max(30, label.length * 8.2 + 18);
    const g = sv('g', { class: 'chip-p ' + cls, transform: `translate(${x},${y})` }, parent);
    sv('rect', { x: -w / 2, y: -13, width: w, height: 26, rx: 7 }, g);
    const t = sv('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, g); t.textContent = label;
    return g;
  }
  chip(id, x, y, label, cls = 'cyan') {
    this.remove(id);
    const g = this._chip(this.gFx, x, y, label, cls);
    this.items[id] = { g, x, y };
    this._in(g);
    return g;
  }
  async move(id, x, y, ms = 700) {
    const it = this.items[id]; if (!it) return;
    const x0 = it.x, y0 = it.y; it.x = x; it.y = y;
    if (this.fast || RM) { it.g.setAttribute('transform', `translate(${x},${y})`); return; }
    await this._tween(ms, u => it.g.setAttribute('transform', `translate(${lerp(x0, x, u)},${lerp(y0, y, u)})`));
  }
  _tween(ms, fn) {
    return new Promise(res => {
      let t0 = null;
      const step = ts => { if (t0 == null) t0 = ts; const u = Math.min(1, (ts - t0) / ms); fn(ease(u)); if (u < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  /* send a packet from node a to node b. opts: { ms, lose (0..1 where it vanishes), lift (arc height), dy } */
  async packet(a, b, label, cls = 'cyan', opts = {}) {
    const A = this.items[a], B = this.items[b]; if (!A || !B) return;
    if (this.fast || RM) { if (opts.keep && opts.lose == null) this.chip(opts.keep, B.x + (opts.kx || 0), B.y + (opts.dy || 0) + (opts.ky || 0), label, cls); return opts.lose == null; }
    const dy = opts.dy || 0, lift = opts.lift || 0;
    const g = this._chip(this.gFx, A.x, A.y + dy, label, cls);
    if (!this.quiet) Sound.send();
    const stop = opts.lose != null ? opts.lose : 1;
    await this._tween((opts.ms || 1100) * stop, u => {
      const t = u * stop, x = lerp(A.x, B.x, t), y = lerp(A.y, B.y, t) + dy - Math.sin(t * Math.PI) * lift;
      g.setAttribute('transform', `translate(${x},${y})`);
    });
    if (opts.lose != null) {
      if (!this.quiet) Sound.drop();
      g.classList.add('lost');
      const x = lerp(A.x, B.x, stop), y = lerp(A.y, B.y, stop) + dy;
      const burst = sv('text', { x, y: y - 18, class: 'lost-x', 'text-anchor': 'middle' }, this.gFx); burst.textContent = '✕';
      await wait(650); g.remove(); burst.remove();
      return false;
    }
    g.remove();
    if (opts.keep) { this.chip(opts.keep, B.x + (opts.kx || 0), B.y + dy + (opts.ky || 0), label, cls); }
    if (!this.quiet) Sound.pop();
    return true;
  }
  /* the OSI layers, with one lit */
  stack(x, y, litN) {
    if (this.items.stack) { this.items.stack.g.querySelectorAll('.osi-row').forEach((r, i) => r.classList.toggle('lit', 7 - i === litN)); return; }
    const g = sv('g', { class: 'osi', transform: `translate(${x},${y})` }, this.gNodes);
    const names = ['Application', 'Presentation', 'Session', 'Transport', 'Network', 'Data link', 'Physical'];
    names.forEach((n, i) => {
      const num = 7 - i, row = sv('g', { class: 'osi-row' + (num === litN ? ' lit' : ''), transform: `translate(0,${i * 30})` }, g);
      sv('rect', { x: 0, y: 0, width: 168, height: 26, rx: 6 }, row);
      const t1 = sv('text', { x: 12, y: 18, class: 'osi-n' }, row); t1.textContent = num;
      const t2 = sv('text', { x: 34, y: 18 }, row); t2.textContent = n;
    });
    this.items.stack = { g };
    this._in(g);
  }
  /* a fill meter (the receiver's buffer) */
  meter(id, x, y, w, h, frac, cls = '') {
    let it = this.items[id];
    if (!it) {
      const g = sv('g', { class: 'meter ' + cls, transform: `translate(${x},${y})` }, this.gNodes);
      sv('rect', { x: 0, y: 0, width: w, height: h, rx: 8, class: 'meter-bg' }, g);
      const f = sv('rect', { x: 3, y: h - 3, width: w - 6, height: 0, rx: 6, class: 'meter-fill' }, g);
      sv('line', { x1: -6, y1: h * .15, x2: w + 6, y2: h * .15, class: 'meter-top' }, g);
      it = this.items[id] = { g, f, w, h, frac: 0 };
      this._in(g);
    }
    const from = it.frac; it.frac = frac;
    const set = v => { const hh = (it.h - 6) * v; it.f.setAttribute('y', it.h - 3 - hh); it.f.setAttribute('height', hh); it.g.classList.toggle('over', v > .85); };
    if (this.fast || RM) return set(frac);
    return this._tween(600, u => set(lerp(from, frac, u)));
  }
}
