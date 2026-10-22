'use strict';
/* Handshake — the walk-through player. One short line at a time while the network stage
   shows it happening. Each scene ends with a quick check that has to be answered to go on.
   scenes: [{ name, setup(S), beats: [{ say, run(S) }], check: { q, options: [{ html, ok, why }], again } }] */

function ponder(host, scenes, opts = {}) {
  let si = 0, bi = 0, token = 0, playing = true, holdT = 0, barAnim = null, stepDone = false, finished = false, alive = true;
  const passed = new Set();
  const sceneLbl = el('span', { class: 'pz-scene' });
  const say = el('p', { class: 'pz-say', 'aria-live': 'polite' });
  const qz = el('div', { class: 'pz-quiz' });
  const bar = el('div', { class: 'pz-bar' }, el('i'));
  const dots = el('div', { class: 'pz-dots', role: 'group', 'aria-label': 'Steps' });
  const icon = (label, path, fn, cls = '') => el('button', { class: 'iconbtn ' + cls, type: 'button', 'aria-label': label, title: label, html: `<svg viewBox="0 0 24 24">${path}</svg>`, onclick: fn });
  const PLAY = '<path d="M8 5v14l11-7z"/>', PAUSE = '<path d="M7 5h4v14H7zM14 5h4v14h-4z"/>';
  const playB = icon('Pause', PAUSE, () => { playing = !playing; paintPlay(); if (playing && stepDone) go(bi + 1); else if (!playing) stopHold(); }, 'main');
  const nextB = icon('Next', '<path d="M9 5l7 7-7 7"/>', () => go(bi + 1));
  const end = el('div', { class: 'actions', style: 'margin-top:0' });
  const side = el('div', { class: 'pz-side' },
    el('div', { class: 'pz-top' }, sceneLbl, opts.onSkip ? el('button', { class: 'linkbtn', type: 'button', onclick: () => { stopHold(); opts.onSkip(); } }, 'Skip the walk-through') : null),
    say, qz, bar,
    el('div', { class: 'pz-ctrl' },
      icon('Back', '<path d="M15 5l-7 7 7 7"/>', () => go(bi - 1)),
      playB, nextB,
      icon('Show this step again', '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>', () => go(bi)),
      dots),
    end);
  const stageCard = el('div', { class: 'stage-card' });
  const root = el('div', { class: 'pz scr' }, side, stageCard);
  host.innerHTML = ''; host.append(root);
  const S = new Stage(stageCard);

  const beats = () => scenes[si].beats.concat(scenes[si].check ? [{ say: scenes[si].check.q, quiz: scenes[si].check, run: () => {} }] : []);
  function paintPlay() { playB.setAttribute('aria-label', playing ? 'Pause' : 'Play'); playB.title = playing ? 'Pause' : 'Play'; playB.querySelector('svg').innerHTML = playing ? PAUSE : PLAY; }
  function stopHold() { clearTimeout(holdT); if (barAnim) barAnim.cancel(); bar.firstChild.style.width = '0'; nextB.classList.remove('ready'); }
  function paintDots() {
    dots.innerHTML = '';
    beats().forEach((b, i) => dots.append(el('button', { type: 'button', class: i < bi ? 'done' : i === bi ? 'cur' : '', 'aria-label': `Step ${i + 1}`, onclick: () => go(i) })));
  }
  function caption(html) {
    /* one word at a time; coloured words stay in one piece */
    /* every space inside a coloured word, including the one in its <b class> tag, is protected from the split */
    const keep = String(html).replace(/<b class="[a-z]+">[\s\S]*?<\/b>/g, m => m.replace(/ /g, '\u0001'));
    say.innerHTML = keep.split(' ').filter(Boolean).map((p, i) => `<span class="w" style="animation-delay:${i * 70}ms">${p.replace(/\u0001/g, ' ')}</span>`).join(' ');
  }
  async function runTo(i) {
    const my = ++token;
    stopHold(); stepDone = false; finished = false; end.innerHTML = ''; qz.innerHTML = '';
    bi = i; paintDots();
    S.svg.classList.remove('quizdim');
    S.clear(); S.fast = true;
    const sc = scenes[si];
    if (sc.setup) await sc.setup(S);
    for (let j = 0; j < i; j++) { await beats()[j].run(S); if (my !== token) return; }
    const B = beats()[i];
    caption(B.say);
    S.fast = false;
    await wait(220);
    if (my !== token) return;
    await B.run(S);
    if (my !== token || !alive) return;
    if (B.quiz && !passed.has(si + '.' + bi)) return showQuiz(B, my);
    stepDone = true;
    nextB.classList.add('ready');
    if (si === scenes.length - 1 && bi === beats().length - 1) return showEnd();
    if (playing) hold();
  }
  function showQuiz(B, my) {
    const key = si + '.' + bi, fb = el('p', { class: 'pz-qfb' });
    S.svg.classList.add('quizdim');
    const options = B.quiz.keep ? B.quiz.options : shuffle(B.quiz.options);
    const again = el('button', { class: 'btn ghost sm', type: 'button', onclick: () => go(B.quiz.again || 0) }, '↺ Show me again');
    const box = el('div', { class: 'opts' + (options.length > 2 && options.every(o => o.html.length < 26) ? ' two' : '') }, options.map(o => {
      const b = el('button', { class: 'opt', type: 'button', html: o.html });
      b.onclick = () => {
        if (my !== token || passed.has(key) || b.classList.contains('bad')) return;
        if (o.ok) {
          passed.add(key); b.classList.add('ok'); [...box.children].forEach(x => x !== b && x.classList.add('dim'));
          fb.className = 'pz-qfb good'; fb.innerHTML = B.quiz.yes || 'Yes! You’ve got it.'; again.remove();
          Sound.good(); award(5, b); stepDone = true; nextB.classList.add('ready');
          if (si === scenes.length - 1 && bi === beats().length - 1) return showEnd();
          if (playing) holdT = setTimeout(() => { if (alive && my === token) go(bi + 1); }, 2600);
        } else {
          b.classList.add('bad'); Sound.bad(); shake(b);
          fb.className = 'pz-qfb bad'; fb.innerHTML = o.why || 'Not quite.';
        }
      };
      return b;
    }));
    qz.append(el('p', { class: 'pz-qtag' }, 'Quick check'), box, fb, el('div', { class: 'actions', style: 'margin-top:8px' }, again));
    api.quiz = right => { const i = options.findIndex(o => !!o.ok === right); box.children[i].click(); };
    nextB.classList.remove('ready');
  }
  function gate(i) {
    const bs = beats();
    for (let j = bi; j < Math.min(i, bs.length); j++) if (bs[j].quiz && !passed.has(si + '.' + j)) return j;
    return -1;
  }
  function hold() {
    /* slow on purpose: read it, look at the picture, then move on */
    const ms = RM ? 6000 : clamp(3200 + say.textContent.length * 80, 4800, 9500);
    if (!RM && bar.firstChild.animate) barAnim = bar.firstChild.animate([{ width: '0%' }, { width: '100%' }], { duration: ms, fill: 'forwards' });
    holdT = setTimeout(() => { if (alive) go(bi + 1); }, ms);
  }
  function setScene(i) { si = i; sceneLbl.textContent = `${si + 1} of ${scenes.length} · ${scenes[si].name}`; }
  function go(i) {
    if (!alive) return;
    if (i > bi) {
      const b = gate(i);
      if (b === bi) { if (qz.animate) qz.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 300 }); return; }
      if (b >= 0) i = b;
    }
    if (i < 0) { if (si > 0) { setScene(si - 1); i = beats().length - 1; } else i = 0; }
    else if (i >= beats().length) { if (si < scenes.length - 1) { setScene(si + 1); i = 0; } else return showEnd(); }
    api.quiz = null;
    runTo(i);
  }
  function showEnd() {
    if (finished) return; finished = true; stopHold();
    end.innerHTML = '';
    const b = el('button', { class: 'btn primary', type: 'button', onclick: () => opts.onDone && opts.onDone() }, opts.doneLabel || 'Done');
    end.append(b, el('button', { class: 'btn ghost', type: 'button', onclick: () => { setScene(0); runTo(0); } }, 'Watch it all again'));
    api.done = b;
  }
  const onKey = e => {
    if (!alive) return document.removeEventListener('keydown', onKey);
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(bi + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(bi - 1); }
  };
  document.addEventListener('keydown', onKey);
  const api = { next: () => go(bi + 1), quiz: null, done: null, get state() { return { si, bi, stepDone, finished }; }, destroy() { alive = false; token++; stopHold(); document.removeEventListener('keydown', onKey); } };
  setScene(0); paintPlay(); runTo(0);
  return api;
}
