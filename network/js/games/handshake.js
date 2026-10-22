'use strict';
/* Handshake Hero — a call-and-response rhythm game. Packets come in from the other side;
   hit the correct reply right as each one reaches you. You switch between client and server. */

GAMES.handshake = {
  title: 'Handshake Hero',
  tagline: 'Packets fly at you on the beat. Answer each one with the right reply, right on time.',
  how: [
    'When a note hits the ring, press the reply: <span class="kbd">1</span> SYN · <span class="kbd">2</span> SYN-ACK · <span class="kbd">3</span> ACK · <span class="kbd">4</span> FIN (or tap the buttons).',
    'Watch the tag on each note: are you the <b class="c-cyan">client</b> or the <b class="c-mint">server</b> right now?',
    'Round 1 shows the answer under each note. Round 2 hides it. Round 3 is double time.',
    'Hit it on the beat for PERFECT. Streaks multiply.'
  ],
  preview(S) {
    S.node('A', 90, 190, 'laptop', 'you'); S.node('B', 550, 190, 'server', 'them'); S.link('AB', 'A', 'B');
    S.chip('n1', 260, 190, 'SYN', 'cyan'); S.chip('n2', 380, 190, 'SYN-ACK', 'cyan'); S.chip('n3', 490, 190, 'FIN', 'coral');
    S.text('h', 140, 140, '♪ hit it here', 'mint');
    ['SYN', 'SYN-ACK', 'ACK', 'FIN'].forEach((k, i) => S.chip('k' + i, 170 + i * 100, 320, k, i === 3 ? 'coral' : i === 2 ? 'mint' : 'cyan'));
  },
  run(area, api) {
    const KEYS = ['SYN', 'SYN-ACK', 'ACK', 'FIN'];
    const PH = {
      cOpen: [{ role: 'client', show: '▶ connect!', ans: 'SYN' }, { role: 'client', show: 'SYN-ACK', ans: 'ACK' }],
      sOpen: [{ role: 'server', show: 'SYN', ans: 'SYN-ACK' }],
      cClose: [{ role: 'client', show: '■ all done', ans: 'FIN' }, { role: 'client', show: 'FIN', ans: 'ACK' }],
      sClose: [{ role: 'server', show: 'FIN', ans: 'ACK' }, { role: 'server', show: '↳ close yours', ans: 'FIN' }]
    };
    const WHY = {
      'SYN': 'To start a connection, the client sends <b>SYN</b>.',
      'SYN-ACK': 'A server answers a SYN with <b>SYN-ACK</b>.',
      'ACK': 'Answer a SYN-ACK or a FIN with <b>ACK</b>.',
      'FIN': 'To close your side, send <b>FIN</b>.'
    };
    const ROUNDS = [
      { name: 'Round 1 · warm-up', hints: true, step: 1.25, list: ['cOpen', 'sOpen', 'cOpen', 'sClose', 'sOpen', 'cClose', 'cOpen', 'sClose'] },
      { name: 'Round 2 · no hints', hints: false, step: 1.1, list: ['sOpen', 'cOpen', 'cClose', 'sOpen', 'sClose', 'cOpen', 'sOpen', 'cClose', 'sClose'] },
      { name: 'Round 3 · double time', hints: false, step: .78, list: ['cOpen', 'sOpen', 'sClose', 'cOpen', 'cClose', 'sOpen', 'cOpen', 'sClose', 'sOpen', 'cClose'] }
    ];
    const LEAD = 2.4, WIN = [.09, .18, .28];
    let ri = -1, notes = [], clock = 0, score = 0, combo = 0, hits = 0, total = 0, judged = 0, perfect = 0, running = false;
    const lane = el('div', { class: 'hh-lane' }, el('div', { class: 'hh-ring' }), el('span', { class: 'hh-you' }, 'YOU'), el('span', { class: 'hh-them' }, 'THEM →'));
    const judge = el('div', { class: 'hh-judge' });
    const banner = el('div', { class: 'hh-banner' });
    const fb = el('p', { class: 'hh-fb' }, ' ');
    const btns = el('div', { class: 'hh-btns' }, KEYS.map((k, i) => {
      const b = el('button', { class: 'hh-btn ' + (k === 'FIN' ? 'coral' : k === 'ACK' ? 'mint' : 'cyan'), type: 'button' }, el('span', { class: 'kbd' }, i + 1), k);
      b.addEventListener('pointerdown', e => { e.preventDefault(); press(k, b); });
      return b;
    }));
    area.append(el('div', { class: 'hh scr' }, banner, lane, judge, fb, btns));
    const paint = () => api.stats({ Combo: [combo, combo >= 8], Accuracy: judged ? Math.round(hits / judged * 100) + '%' : '–', Score: score });
    paint();

    function startRound() {
      ri++;
      const R = ROUNDS[ri];
      notes.forEach(n => n.el.remove()); notes = [];
      let t = LEAD + 1.2;
      R.list.forEach(ph => {
        PH[ph].forEach(n => { notes.push(Object.assign({ t, judged: false }, n)); t += R.step; });
        t += R.step * .6;
      });
      notes.forEach(n => {
        n.el = el('div', { class: `hh-note ${n.role}` + (n.show.length > 7 ? ' wide' : '') }, el('small', {}, n.role), el('b', { class: 'mono' }, n.show), R.hints ? el('em', {}, '→ ' + n.ans) : null);
        lane.append(n.el);
      });
      total += notes.length;
      clock = 0; running = true;
      banner.textContent = R.name; banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
    }
    function flash(txt, cls) { judge.textContent = txt; judge.className = 'hh-judge ' + cls; void judge.offsetWidth; judge.classList.add('go'); }
    function press(k, b) {
      if (!running) return;
      if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
      let best = null;
      for (const n of notes) { if (n.judged) continue; const d = Math.abs(clock - n.t); if (d <= WIN[2] && (!best || d < Math.abs(clock - best.t))) best = n; }
      if (!best) { flash('too early', 'meh'); return; }
      best.judged = true; judged++;
      const d = Math.abs(clock - best.t);
      if (k !== best.ans) {
        combo = 0; Sound.bad(); best.el.classList.add('wrong');
        flash('WRONG', 'bad');
        fb.innerHTML = `<b>${best.show}</b> as ${best.role} → reply <b>${best.ans}</b>. ${WHY[best.ans]}`;
      } else {
        hits++; combo++;
        const [lbl, pts, cls] = d <= WIN[0] ? ['PERFECT', 100, 'perfect'] : d <= WIN[1] ? ['GOOD', 70, 'good'] : ['OK', 40, 'ok'];
        if (cls === 'perfect') perfect++;
        score += Math.round(pts * Math.min(3, 1 + Math.floor(combo / 8) * .5));
        Sound.beat(KEYS.indexOf(k)); best.el.classList.add('hit');
        flash(lbl, cls);
        if (combo > 0 && combo % 8 === 0) api.msg(`${combo} streak! ×${Math.min(3, 1 + Math.floor(combo / 8) * .5)}`);
        const out = el('div', { class: 'hh-out ' + (k === 'FIN' ? 'coral' : k === 'ACK' ? 'mint' : 'cyan') }, k);
        lane.append(out); setTimeout(() => out.remove(), 700);
      }
      paint();
    }
    api.key(e => { const i = ['1', '2', '3', '4'].indexOf(e.key) >= 0 ? +e.key - 1 : ['a', 's', 'd', 'f'].indexOf(e.key.toLowerCase()); if (i >= 0) { e.preventDefault(); press(KEYS[i], btns.children[i]); } });

    let beatAt = 0;
    api.loop(dt => {
      if (!running) return;
      clock += dt;
      const W = lane.clientWidth, hitX = 84, speed = (W - hitX - 30) / LEAD;
      for (const n of notes) {
        const x = hitX + (n.t - clock) * speed;
        n.el.style.transform = `translate(${x}px, -50%)`;
        n.el.style.opacity = x > W - 10 ? 0 : n.judged && n.el.classList.contains('hit') ? 0 : 1;
        if (!n.judged && clock - n.t > WIN[2]) {
          n.judged = true; judged++; combo = 0; n.el.classList.add('missed');
          flash('MISS', 'bad'); fb.innerHTML = `<b>${n.show}</b> as ${n.role} → reply <b>${n.ans}</b>.`;
          paint();
        }
      }
      /* a soft tick as each note lands, so the beat is easy to feel */
      const nextN = notes.find(n => n.t > beatAt);
      if (nextN && clock >= nextN.t) { beatAt = nextN.t; Sound.tick(); }
      const last = notes[notes.length - 1];
      if (last && clock > last.t + 1) {
        running = false; beatAt = 0;
        if (ri < ROUNDS.length - 1) { fb.textContent = ''; api.after(900, startRound); }
        else api.after(500, () => api.done({ score, stars: starsFor(hits / total, .9, .7, .4), line: `${hits} of ${total} replies right, ${perfect} perfect. Open: <b>SYN → SYN-ACK → ACK</b>. Close: <b>FIN → ACK</b>, both ways.` }));
      }
    });
    startRound();
  }
};
