'use strict';
/* Handshake — the screens: the map, each stop (Watch → Play → Quiz) and the final exam. */

const LV = {};
LEVELS.forEach((l, i) => { l.num = i + 1; LV[l.id] = l; });
const levelDone = id => lvlState(id).quiz >= 80;
const app = $('#app');
let cleanup = null;

function setScreen(fn) {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null; app.innerHTML = ''; scrollTo(0, 0);
  cleanup = fn(app) || null;
}
function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'l' && LV[h[1]]) return setScreen(host => levelScreen(host, LV[h[1]], h[2]));
  if (h[0] === 'exam') return setScreen(host => examScreen(host, h[1] === 'sa' ? 'sa' : 'q'));
  setScreen(homeScreen);
}
const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
const backBtn = (label, hash) => el('button', { class: 'back', type: 'button', onclick: () => go(hash), html: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${label}` });

/* ───────────────────────── home ───────────────────────── */
function homeScreen(host) {
  let alive = true;
  const next = LEVELS.find(l => !levelDone(l.id));
  const art = el('div', { class: 'hero-art' });
  const started = Object.values(state.levels).some(s => s.watch || s.play || s.quiz);
  const startLabel = !next ? 'Take the final exam' : started ? `Continue: ${next.title}` : 'Start at stop 1';
  host.append(el('div', { class: 'home scr' },
    el('section', { class: 'hero' },
      el('div', {},
        el('p', { class: 'eyebrow' }, 'Unit 4 · Layer 4 protocols + DNS'),
        el('h1', {}, 'Handshake', el('span', {}, 'how data really travels.')),
        el('p', { class: 'lede' }, 'Watch it happen. Play with it. Prove it on the quiz. Nine stops, then the exam.'),
        el('div', { class: 'actions' },
          el('button', { class: 'btn primary', type: 'button', onclick: () => go(next ? `#/l/${next.id}` : '#/exam') }, startLabel),
          el('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/exam') }, 'Skip to the exam'))),
      art),
    el('section', { class: 'mapwrap' },
      el('h2', {}, 'The route'),
      el('p', {}, 'Each stop: watch it, play the game, pass the quiz (80%+). Jump in anywhere.'),
      el('div', { class: 'parts' }, [1, 2].map(p => el('div', { class: 'part' },
        el('h3', {}, p === 1 ? 'Part I · Layer 4: Transport' : 'Part II · DNS'),
        LEVELS.filter(l => l.part === p).map(l => {
          const st = lvlState(l.id);
          return el('button', { class: 'lvl' + (levelDone(l.id) ? ' done' : '') + (l === next ? ' next' : ''), type: 'button', onclick: () => go(`#/l/${l.id}`) },
            el('span', { class: 'num' }, levelDone(l.id) ? '✓' : l.num),
            el('span', {}, el('b', {}, l.title), el('small', {}, l.blurb)),
            el('span', { class: 'pips', title: 'Watched · Played · Quiz passed' }, [st.watch, st.play > 0, st.quiz >= 80].map(on => el('i', { class: 'pip' + (on ? ' on' : '') }))));
        })))),
      el('div', { class: 'exam-card' },
        el('div', {}, el('h3', {}, 'Final exam'), el('p', {}, state.exam.runs ? `Best so far: ${state.exam.best}%. 22 questions plus the TCP vs UDP short answer.` : '22 mixed questions plus the TCP vs UDP short answer, like the real test.')),
        el('button', { class: 'btn cyan', type: 'button', onclick: () => go('#/exam') }, state.exam.runs ? 'Take it again' : 'Take the exam')),
      checklistCard())));
  /* the hero: a handshake that never stops */
  const S = new Stage(art, 640, 400);
  S.node('A', 130, 210, 'laptop', 'you'); S.node('B', 510, 210, 'server', 'server'); S.link('AB', 'A', 'B');
  (async () => {
    const live = () => alive && document.body.contains(art);
    S.quiet = true; /* no blips on the home screen */
    const seq = [['A', 'B', 'SYN', 'cyan'], ['B', 'A', 'SYN-ACK', 'cyan'], ['A', 'B', 'ACK', 'mint']];
    {
      while (live()) {
        S.linkCls('AB', 'solid', false); S.text('cap', 320, 340, 'opening a connection…', 'mono');
        for (const [a, b, l, c] of seq) { if (!live()) return; await S.packet(a, b, l, c, { dy: a === 'A' ? -26 : 26, ms: 1300 }); }
        if (!live()) return;
        S.linkCls('AB', 'solid'); S.text('cap', 320, 340, 'connected: data flows', 'mono mint');
        for (let i = 0; i < 3; i++) { if (!live()) return; await Promise.all([S.packet('A', 'B', 'data', 'cyan', { dy: -26, ms: 900 }), S.packet('B', 'A', 'data', 'amber', { dy: 26, ms: 900 })]); }
        S.text('cap', 320, 340, 'saying goodbye', 'mono coral');
        for (const [a, b, l, c] of [['A', 'B', 'FIN', 'coral'], ['B', 'A', 'ACK', 'mint'], ['B', 'A', 'FIN', 'coral'], ['A', 'B', 'ACK', 'mint']]) { if (!live()) return; await S.packet(a, b, l, c, { dy: a === 'A' ? -26 : 26, ms: 1000 }); }
        await wait(900);
      }
    }
  })();
  return () => { alive = false; };
}

function checklistCard() {
  const box = el('div', { class: 'checklist' }, el('h3', {}, 'Before the test, can you…'), el('p', {}, 'Ticks itself when you pass that stop’s quiz. Tap to tick by hand.'));
  const draw = () => {
    box.querySelectorAll('.ck').forEach(n => n.remove());
    CHECKLIST.forEach((c, i) => {
      const on = state.checks[i] || levelDone(c.lv);
      box.append(el('button', { class: 'ck' + (on ? ' on' : ''), type: 'button', onclick: () => { state.checks[i] = !state.checks[i]; save(); draw(); } },
        el('span', { class: 'box' }, on ? '✓' : ''),
        el('span', {}, c.t, ' ', el('a', { class: 'ck-go', href: `#/l/${c.lv}`, onclick: e => e.stopPropagation() }, `stop ${LV[c.lv].num} →`))));
    });
  };
  draw();
  return box;
}

/* ───────────────────────── a stop ───────────────────────── */
function levelScreen(host, L, tab) {
  const st = lvlState(L.id);
  if (!['watch', 'play', 'quiz'].includes(tab)) tab = !st.watch ? 'watch' : !st.play ? 'play' : 'quiz';
  const tabs = [['watch', 'Watch', st.watch], ['play', 'Play', st.play > 0], ['quiz', 'Quiz', st.quiz >= 80]];
  host.append(el('div', { class: 'lvl-head' },
    backBtn('Map', '#/'),
    el('div', { class: 'lvl-title' }, el('div', { class: 'eye' }, `Part ${L.part === 1 ? 'I' : 'II'} · Stop ${L.num} of ${LEVELS.length}`), el('h2', {}, L.title)),
    el('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label, done], i) =>
      el('button', { class: 'tab' + (id === tab ? ' on' : '') + (done ? ' done' : ''), type: 'button', role: 'tab', 'aria-selected': String(id === tab), onclick: () => go(`#/l/${L.id}/${id}`) },
        el('span', { class: 'n' }, done ? '✓' : i + 1), label)))));
  const body = el('div', { class: 'lvl-body' });
  host.append(body);
  const nextLevel = LEVELS[L.num];
  if (tab === 'watch') {
    const finish = () => { if (!st.watch) { st.watch = true; save(); award(20); } go(`#/l/${L.id}/play`); };
    const pz = ponder(body, L.scenes(), { onDone: finish, doneLabel: 'Play the game →', onSkip: finish });
    return () => pz.destroy();
  }
  if (tab === 'play') return runGame(body, L);
  const q = quizRun(body, L.quiz, {
    label: 'Question',
    onFinish: pct => { const was = levelDone(L.id); st.quiz = Math.max(st.quiz, pct); save(); if (!was && levelDone(L.id)) toast(`Stop ${L.num} cleared!`); },
    after: () => [nextLevel ? el('button', { class: 'btn primary', type: 'button', onclick: () => go(`#/l/${nextLevel.id}`) }, `Next stop: ${nextLevel.title} →`) : el('button', { class: 'btn primary', type: 'button', onclick: () => go('#/exam') }, 'Take the final exam →'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/') }, 'Back to the map')]
  });
  return q.destroy;
}

/* ───────────────────────── the game frame ───────────────────────── */
function runGame(host, L) {
  const G = GAMES[L.game];
  const statsBox = el('div', { class: 'g-stats' });
  const area = el('div', { class: 'g-area' });
  const tip = el('div', { class: 'g-tip', 'aria-live': 'polite' });
  host.append(el('div', { class: 'game scr' }, el('div', { class: 'g-top' }, el('h3', {}, G.title), statsBox), area, tip));
  let session = null;
  const kill = () => { if (session) session.kill(); session = null; };

  function intro() {
    kill(); area.innerHTML = ''; statsBox.innerHTML = ''; tip.className = 'g-tip';
    const st = lvlState(L.id), prev = el('div', { class: 'preview' });
    const play = el('button', { class: 'btn primary', type: 'button', onclick: start }, st.play ? 'Play again' : 'Play');
    area.append(el('div', { class: 'g-intro scr' },
      el('div', {},
        el('h2', {}, G.title), el('p', { class: 'tagline' }, G.tagline),
        el('ul', {}, G.how.map((h, i) => el('li', {}, el('span', {}, i + 1), el('span', { html: h })))),
        el('div', { class: 'actions' }, play,
          st.play ? el('span', { class: 'stars sm', html: starsHTML(st.play) }) : null,
          el('button', { class: 'btn ghost', type: 'button', onclick: () => go(`#/l/${L.id}/quiz`) }, 'Skip to the quiz'))),
      prev));
    if (G.preview) { const S = new Stage(prev); S.fast = true; G.preview(S); }
    play.focus({ preventScroll: true });
  }
  function start() {
    kill(); area.innerHTML = ''; statsBox.innerHTML = ''; tip.className = 'g-tip';
    session = makeSession(area, statsBox, tip, end);
    try { session.extra = G.run(area, session.api); } catch (e) { console.error(e); }
  }
  function end(res) {
    const st = lvlState(L.id), before = st.play;
    st.play = Math.max(st.play, res.stars); st.best = Math.max(st.best || 0, res.score); save();
    area.innerHTML = ''; tip.className = 'g-tip';
    const nx = el('button', { class: 'btn primary', type: 'button', onclick: () => go(`#/l/${L.id}/quiz`) }, 'Take the quiz →');
    area.append(el('div', { class: 'g-end scr' },
      el('h2', {}, res.stars >= 3 ? 'Flawless.' : res.stars === 2 ? 'Nice run!' : res.stars === 1 ? 'You got it working.' : 'Rough one. Again?'),
      el('div', { class: 'stars', html: starsHTML(res.stars) }),
      el('p', {}, `Score ${res.score}` + (st.best > res.score ? ` · best ${st.best}` : res.score > 0 ? ' · new best!' : '')),
      res.line ? el('p', { class: 'g-line', html: res.line }) : null,
      el('div', { class: 'actions' }, nx, el('button', { class: 'btn ghost', type: 'button', onclick: start }, 'Play again'))));
    award(10 + Math.max(0, res.stars - before) * 15, nx);
    if (res.stars) { Sound.win(); if (res.stars >= 2) confetti(); }
    nx.focus({ preventScroll: true });
  }
  intro();
  return kill;
}

/* everything a game needs; all timers and keys die with the session */
function makeSession(area, statsBox, tip, onDone) {
  let alive = true, extra = null, tipT = 0;
  const timers = new Set(), keys = [], chips = {};
  const api = {
    area,
    get alive() { return alive; },
    after(ms, fn) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; },
    every(ms, fn) { const t = setInterval(() => { if (alive) fn(); }, ms); timers.add(t); return t; },
    stop(t) { clearTimeout(t); clearInterval(t); timers.delete(t); },
    loop(fn) {
      let last = performance.now();
      const step = now => { if (!alive) return; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; if (fn(dt, now) !== false) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    },
    key(fn) { const h = e => { if (alive && !(e.target.closest && e.target.closest('input, textarea')) && !e.repeat) fn(e); }; document.addEventListener('keydown', h); keys.push(h); },
    stats(o) {
      for (const k in o) {
        const v = Array.isArray(o[k]) ? o[k] : [o[k]];
        if (!chips[k]) { chips[k] = el('b'); statsBox.append(el('span', { class: 'stat' }, k, chips[k])); }
        chips[k].textContent = v[0]; chips[k].parentNode.classList.toggle('hot', !!v[1]);
      }
    },
    msg(t, good = true) { const m = el('div', { class: 'g-msg ' + (good ? 'good' : 'bad') }, t); area.append(m); setTimeout(() => m.remove(), 1600); },
    /* a teaching note in the strip under the game, so it never covers anything you need to click */
    lesson(html, ms = 4200) {
      clearTimeout(tipT); tip.innerHTML = html; tip.className = 'g-tip';
      void tip.offsetWidth; tip.className = 'g-tip show';
      tipT = setTimeout(() => { if (tip.innerHTML === html) tip.className = 'g-tip'; }, ms + 1500);
    },
    award,
    done(res) { if (!alive) return; kill(); onDone(res); }
  };
  function kill() {
    if (!alive) return; alive = false;
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); clearTimeout(tipT);
    keys.forEach(h => document.removeEventListener('keydown', h));
    if (typeof sess.extra === 'function') try { sess.extra(); } catch (e) {}
  }
  const sess = { api, kill, extra };
  return sess;
}
const starsFor = (frac, a = .8, b = .55, c = .2) => frac >= a ? 3 : frac >= b ? 2 : frac >= c ? 1 : 0;

/* ───────────────────────── quizzes ───────────────────────── */
function quizRun(host, qs, opts = {}) {
  const res = qs.map(() => null);
  let queue = qs.map((_, i) => i), qi = 0, firstPass = true, onKey = null;
  const wrap = el('div', { class: 'quiz scr' });
  host.append(wrap);
  const setKey = fn => { if (onKey) document.removeEventListener('keydown', onKey); onKey = fn; if (fn) document.addEventListener('keydown', fn); };

  function ask() {
    const idx = queue[qi], q = qs[idx];
    let answered = false;
    wrap.innerHTML = '';
    const fb = el('div', { class: 'q-fb', 'aria-live': 'polite' }), act = el('div', { class: 'actions' });
    const nextBtn = el('button', { class: 'btn primary', type: 'button', onclick: () => { qi++; qi < queue.length ? ask() : results(); } }, qi === queue.length - 1 ? 'See results' : 'Next →');
    const card = el('div', { class: 'q-card scr' },
      el('div', { class: 'q-meta' }, el('span', {}, `${opts.label || 'Question'} ${qi + 1} of ${queue.length}`), el('span', {}, firstPass ? '' : 'Fixing the ones you missed')),
      el('div', { class: 'progress' }, el('i', { style: `width:${qi / queue.length * 100}%` })),
      el('p', { class: 'q-text', html: q.q }));
    wrap.append(card);
    const finish = (ok, pre = '') => {
      answered = true; res[idx] = ok;
      if (ok) { Sound.good(); award(firstPass ? 10 : 5, card); } else { Sound.bad(); shake(card); }
      fb.className = 'q-fb show ' + (ok ? 'good' : 'bad');
      fb.innerHTML = `<b>${ok ? praise() : 'Not quite.'}</b> ${pre}${q.exp || ''}`;
      act.append(nextBtn); nextBtn.focus({ preventScroll: true });
    };
    if (q.type === 'order') {
      const slots = el('div', { class: 'order-slots', style: `--n:${q.items.length}` }), picked = [];
      const pool = el('div', { class: 'chips' });
      const paint = () => {
        slots.innerHTML = '';
        q.items.forEach((_, i) => slots.append(el('span', { class: picked[i] ? 'fill' : '', onclick: () => { if (answered || !picked[i]) return; picked.splice(i, 1); paint(); } }, picked[i] ? picked[i].t : i + 1)));
        pool.querySelectorAll('.chip').forEach(c => c.classList.toggle('used', picked.some(p => p.c === c)));
      };
      shuffle(q.items).forEach(t => { const c = el('button', { class: 'chip mono', type: 'button' }, t); c.onclick = () => { if (answered) return; picked.push({ t, c }); Sound.tick(); paint(); if (picked.length === q.items.length) check(); }; pool.append(c); });
      const check = () => {
        const ok = picked.every((p, i) => p.t === q.items[i]);
        [...slots.children].forEach((s, i) => s.classList.add(picked[i].t === q.items[i] ? 'right' : 'wrong'));
        finish(ok, ok ? '' : `Right order: <b>${q.items.join(' → ')}</b>. `);
      };
      card.append(el('p', { class: 'muted', style: 'margin:-6px 0 12px' }, 'Tap them in order. Tap a slot to take one back.'), slots, pool, fb, act);
      paint();
      setKey(e => { if (e.key === 'Enter' && answered) { e.preventDefault(); nextBtn.click(); } });
    } else {
      const options = shuffle(q.options);
      const box = el('div', { class: 'opts' + (options.every(o => o.html.length < 28) ? ' two' : '') }, options.map((o, i) => {
        const b = el('button', { class: 'opt', type: 'button', html: `<span class="kbd">${i + 1}</span> ${o.html}` });
        b.onclick = () => {
          if (answered) return;
          b.classList.add(o.ok ? 'ok' : 'bad');
          [...box.children].forEach((x, j) => { if (x !== b) x.classList.add(options[j].ok ? 'ok' : 'dim'); });
          finish(!!o.ok);
        };
        return b;
      }));
      card.append(box, fb, act);
      setKey(e => {
        if (e.target.closest && e.target.closest('input, textarea')) return;
        const n = +e.key;
        if (!answered && n >= 1 && n <= options.length) box.children[n - 1].click();
        else if (answered && e.key === 'Enter') { e.preventDefault(); nextBtn.click(); }
      });
    }
  }
  function results() {
    setKey(null);
    const right = res.filter(Boolean).length, pct = Math.round(right / qs.length * 100);
    if (opts.onFinish) opts.onFinish(pct, res);
    const missed = res.map((r, i) => (r ? -1 : i)).filter(i => i >= 0);
    wrap.innerHTML = '';
    const actions = el('div', { class: 'actions', style: 'justify-content:center' },
      missed.length ? el('button', { class: 'btn cyan', type: 'button', onclick: () => { queue = missed; qi = 0; firstPass = false; ask(); } }, `Fix the ${missed.length === 1 ? 'one' : missed.length} I missed`) : null,
      opts.after ? opts.after(pct) : null);
    wrap.append(el('div', { class: 'q-card scr' }, el('div', { class: 'result' },
      el('h2', { class: pct >= 80 ? 'c-mint' : pct >= 60 ? 'c-amber' : 'c-coral' }, pct + '%'),
      el('p', {}, `${right} of ${qs.length} right. ` + (pct === 100 ? 'Perfect.' : pct >= 80 ? 'Passed! Fix the misses for a perfect score.' : 'Fix the misses: you only redo those.')),
      actions,
      missed.length ? el('div', { class: 'review' }, missed.map(i => el('div', { class: 'item bad', html: `<b>${qs[i].q}</b><br>${qs[i].type === 'order' ? 'Order: ' + qs[i].items.join(' → ') : 'Answer: ' + qs[i].options.find(o => o.ok).html}. <span class="muted">${qs[i].exp || ''}</span>` }))) : null)));
    if (pct >= 80) { Sound.win(); confetti(); }
  }
  ask();
  return { destroy: () => setKey(null) };
}

/* ───────────────────────── the exam ───────────────────────── */
function examQuestions() {
  const qs = [];
  LEVELS.forEach(l => qs.push(...shuffle(l.quiz).slice(0, 2)));
  qs.push(...shuffle(EXAM_EXTRA).slice(0, 4));
  return shuffle(qs);
}
function examScreen(host, tab) {
  const tabs = [['q', 'Questions', state.exam.best >= 80], ['sa', 'Short answer', !!state.saDone]];
  host.append(el('div', { class: 'lvl-head' },
    backBtn('Map', '#/'),
    el('div', { class: 'lvl-title' }, el('div', { class: 'eye' }, 'Unit 4 · Form A'), el('h2', {}, 'Final exam')),
    el('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label, done], i) =>
      el('button', { class: 'tab' + (id === tab ? ' on' : '') + (done ? ' done' : ''), type: 'button', role: 'tab', onclick: () => go(id === 'q' ? '#/exam' : '#/exam/sa') },
        el('span', { class: 'n' }, done ? '✓' : i + 1), label)))));
  const body = el('div', { class: 'lvl-body' });
  host.append(body);
  if (tab === 'sa') { shortAnswer(body); return null; }
  const q = quizRun(body, examQuestions(), {
    label: 'Exam question',
    onFinish: pct => { state.exam.best = Math.max(state.exam.best, pct); state.exam.runs++; save(); },
    after: () => [el('button', { class: 'btn primary', type: 'button', onclick: () => go('#/exam/sa') }, 'Short answer: TCP vs UDP →'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/exam') }, 'New set of questions')]
  });
  return q.destroy;
}

/* the TCP vs UDP comparison: fill the table, then write it as sentences */
function shortAnswer(host) {
  const n = COMPARE.rows.length, cells = [], placed = {};
  let sel = null;
  const facts = [];
  COMPARE.rows.forEach((_, r) => ['tcp', 'udp'].forEach(side => facts.push({ id: side + r, side, r, t: COMPARE[side][r] })));
  const grid = el('div', { class: 'sa-grid' }, el('span', { class: 'hd blank' }), el('span', { class: 'hd c-cyan' }, 'TCP'), el('span', { class: 'hd c-amber' }, 'UDP'));
  const pool = el('div', { class: 'chips' });
  const msg = el('p', { class: 'sa-msg', 'aria-live': 'polite' });
  COMPARE.rows.forEach((row, r) => {
    grid.append(el('span', { class: 'rowh' }, row));
    ['tcp', 'udp'].forEach(side => {
      const c = el('button', { class: `sa-cell ${side}`, type: 'button' }, 'tap, then pick a fact');
      c.onclick = () => {
        if (c.classList.contains('right')) return;
        if (placed[side + r]) { unplace(side + r); return; }
        sel = sel === c ? null : c; paint();
      };
      c.dataset.key = side + r; cells.push(c); grid.append(c);
    });
  });
  const chipEls = {};
  shuffle(facts).forEach(f => { const ch = el('button', { class: 'chip', type: 'button' }, f.t); ch.onclick = () => place(f); chipEls[f.id] = ch; pool.append(ch); });
  function place(f) {
    const target = sel || cells.find(c => !placed[c.dataset.key]);
    if (!target) return;
    const k = target.dataset.key;
    if (placed[k]) unplace(k, true);
    placed[k] = f; sel = cells.find(c => !placed[c.dataset.key] && cells.indexOf(c) > cells.indexOf(target)) || null; Sound.tick(); paint();
  }
  function unplace(k, quiet) { delete placed[k]; if (!quiet) Sound.pop(); paint(); }
  function paint() {
    cells.forEach(c => {
      const f = placed[c.dataset.key];
      c.textContent = f ? f.t : 'tap, then pick a fact';
      c.classList.toggle('fill', !!f); c.classList.toggle('sel', c === sel);
      if (!f) c.classList.remove('wrong');
    });
    Object.entries(chipEls).forEach(([id, ch]) => ch.classList.toggle('used', Object.values(placed).some(f => f.id === id)));
    check.disabled = Object.keys(placed).length < n * 2;
  }
  const check = el('button', { class: 'btn primary', type: 'button' }, 'Check my table');
  check.onclick = () => {
    let wrong = 0;
    cells.forEach(c => { const f = placed[c.dataset.key], ok = f.id === c.dataset.key; c.classList.toggle('right', ok); c.classList.toggle('wrong', !ok); if (!ok) wrong++; });
    if (!wrong) { Sound.win(); award(30, check); msg.className = 'sa-msg good'; msg.textContent = 'Table locked in. Now say it the way the test wants it.'; check.remove(); pool.remove(); step2(); return; }
    Sound.bad(); msg.className = 'sa-msg bad'; msg.textContent = `${wrong} cell${wrong > 1 ? 's are' : ' is'} off. The right ones are locked; the red ones go back to the pile.`;
    setTimeout(() => { cells.forEach(c => { if (c.classList.contains('wrong')) { delete placed[c.dataset.key]; c.classList.remove('wrong'); } }); sel = null; paint(); }, 1300);
  };
  const card = el('div', { class: 'sa scr' },
    el('h3', {}, 'Compare TCP and UDP'),
    el('p', {}, 'Step 1: build the table. Tap a box, then tap the fact that belongs in it.'),
    grid, pool, el('div', { class: 'actions' }, check), msg);
  host.append(card);
  paint();

  function step2() {
    const ta = el('textarea', { placeholder: 'TCP is … while UDP is …', 'aria-label': 'Your answer' });
    ta.value = state.answer || '';
    const tips = [
      ['Connection: TCP connects first, UDP doesn’t', /connect|handshake/i],
      ['Reliability: TCP checks and resends, UDP doesn’t', /reliab|check|resend|re-send|guarant|confirm|arriv|\backs?\b|lost|lose/i],
      ['Speed: TCP slower, UDP faster', /fast|slow|speed|quick/i],
      ['An example for each (file, email, web vs game, video, stream)', /(file|email|web|download|page)[\s\S]*(game|video|stream|call|voice)|(game|video|stream|call|voice)[\s\S]*(file|email|web|download|page)/i],
      ['Compare them in one go: “TCP does ___, while UDP does ___”', /\b(while|whereas|but|however|unlike)\b/i]
    ];
    const tipBox = el('div', { class: 'tips' });
    const model = el('div', { class: 'model', hidden: true, html: '<b>One strong answer:</b> TCP is connection oriented: it sets up a connection with a handshake, checks that every segment arrives and resends anything lost, so it is reliable but slower (file downloads, email, web pages), <b>while</b> UDP is connectionless: it just sends without checking, so lost packets are skipped, which makes it fast and efficient (online games, video calls, live streaming).' });
    const paintTips = () => {
      tipBox.innerHTML = '';
      let got = 0;
      tips.forEach(([t, re]) => { const on = re.test(ta.value); got += on; tipBox.append(el('span', { class: on ? 'on' : '' }, (on ? '✓ ' : '○ ') + t)); });
      if (got === tips.length && !state.saDone) { state.saDone = true; award(40, ta); toast('Short answer: full marks shape!'); Sound.win(); }
      state.answer = ta.value; save();
    };
    ta.addEventListener('input', paintTips);
    card.append(el('h3', { style: 'margin-top:26px' }, 'Step 2: write it'),
      el('p', {}, 'Use your table. Hit all five points below and you’ve got a full-credit answer.'),
      ta, tipBox,
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { model.hidden = !model.hidden; } }, 'Show a model answer'),
        el('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('#/') }, 'Back to the map')),
      model);
    paintTips();
    ta.focus({ preventScroll: true });
  }
}

/* ───────────────────────── boot ───────────────────────── */
$('#soundBtn').onclick = () => { state.sound = !state.sound; save(); renderHUD(); if (state.sound) Sound.good(); };
renderHUD();
addEventListener('hashchange', route);
route();
