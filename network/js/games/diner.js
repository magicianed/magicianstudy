'use strict';
/* DNS Diner — devices walk up to the counter with questions. Serve each one the record type
   that answers it before their patience runs out. */

GAMES.diner = {
  title: 'DNS Diner',
  tagline: 'You run the DNS counter. Every customer wants a different kind of record. Serve fast.',
  how: [
    'Read the order. Serve the record type that answers it: click it, or press <span class="kbd">1</span>–<span class="kbd">7</span>.',
    'Orders go to the customer you’ve selected (or the most impatient one).',
    'Wrong dish? They get grumpy. Patience runs out? They leave. Three walkouts and the shift ends.',
    'After 8 orders the menu loses its captions. Know your records!'
  ],
  preview(S) {
    S.node('c1', 120, 120, 'phone', ''); S.badge('c1', 'IPv6 for shop.com?', 'violet', -50);
    S.node('c2', 320, 120, 'laptop', ''); S.badge('c2', 'email for school.edu?', 'violet', -50);
    S.node('c3', 520, 120, 'server', ''); S.badge('c3', 'name for 203.0.113.9?', 'violet', -50);
    ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'TXT'].forEach((r, i) => S.chip('r' + i, 80 + i * 80, 300, r, 'violet'));
  },
  run(area, api) {
    const MENU = [['A', 'IPv4 address'], ['AAAA', 'IPv6 address'], ['CNAME', 'alias / nickname'], ['MX', 'where email goes'], ['NS', 'who’s in charge'], ['PTR', 'IP → name (reverse)'], ['TXT', 'extra info, security']];
    const DOM = ['shop.com', 'school.edu', 'game.net', 'news.org', 'pizza.place', 'band.camp'];
    const IPS = ['203.0.113.9', '198.51.100.24', '192.0.2.77', '203.0.113.150'];
    const ORD = {
      A: ['What’s the IPv4 address of {d}?', 'I need {d}’s IPv4 address, please.', 'Old network here. Where is {d}? (IPv4)'],
      AAAA: ['What’s the IPv6 address of {d}?', 'My network is IPv6 only. Where’s {d}?', 'Give me {d}’s long new-style address.'],
      CNAME: ['Is www.{d} just a nickname for {d}?', 'blog.{d} is an alias. For what real name?', 'Which name does store.{d} really point to?'],
      MX: ['Where should I deliver email for {d}?', 'I have mail for someone@{d}. Which server takes it?', 'Which mail server handles {d}?'],
      NS: ['Which server is in charge of {d}?', 'Who’s the boss of the {d} records?', 'Which name server runs {d}?'],
      PTR: ['I found {ip} in my logs. What name is that?', 'Reverse it: {ip} → which name?', 'Who owns the address {ip}?'],
      TXT: ['Does {d} have any anti-spam notes?', 'I need the security note for {d}.', 'Got any extra verification info for {d}?']
    };
    const WHY = { A: '<b>A</b> = IPv4 address.', AAAA: '<b>AAAA</b> = IPv6 address. Four As, longer address.', CNAME: '<b>CNAME</b> = alias, a nickname for another name.', MX: '<b>MX</b> = where email for the domain goes.', NS: '<b>NS</b> = which name server is in charge of the domain.', PTR: '<b>PTR</b> = reverse lookup, from IP back to name.', TXT: '<b>TXT</b> = extra text info, often for security (like anti-spam).' };
    const FACES = ['📱', '💻', '🖥️', '📧', '🎮', '📺', '🖨️', '⌚'];
    const LEN = 80;
    let t = 0, score = 0, served = 0, right = 0, walkouts = 0, combo = 0, arriveIn = .6, sel = null, ended = false, captions = true;
    const seats = [null, null, null];
    const seatsBox = el('div', { class: 'dd-seats' });
    const menuBox = el('div', { class: 'dd-menu' });
    const seatEls = seats.map((_, i) => { const s = el('button', { class: 'dd-seat', type: 'button' }, el('span', { class: 'dd-empty' }, 'empty stool')); s.onclick = () => { if (seats[i]) { sel = i; paintSel(); Sound.tick(); } }; seatsBox.append(s); return s; });
    MENU.forEach(([r, cap], i) => { const b = el('button', { class: 'dd-dish', type: 'button' }, el('span', { class: 'kbd' }, i + 1), el('b', { class: 'mono' }, r), el('small', {}, cap)); b.onclick = () => serve(r, b); menuBox.append(b); });
    area.append(el('div', { class: 'dd scr' }, el('div', { class: 'dd-sign' }, el('span', {}, 'DNS'), ' DINER', el('small', {}, 'records served hot')), seatsBox, el('div', { class: 'dd-counter' }), menuBox));
    const paint = () => api.stats({ Time: Math.max(0, Math.ceil(LEN - t)), Combo: [combo, combo >= 4], Walkouts: [walkouts + '/3', walkouts >= 2], Score: score });
    const paintSel = () => seatEls.forEach((s, i) => s.classList.toggle('sel', i === sel && !!seats[i]));

    function arrive() {
      const i = seats.findIndex(s => !s); if (i < 0) return;
      const rec = pick(MENU)[0], d = pick(DOM), ip = pick(IPS);
      const text = pick(ORD[rec]).replace(/\{d\}/g, d).replace('{ip}', ip);
      const max = Math.max(9, 15 - t / 12);
      seats[i] = { rec, text, max, left: max, face: pick(FACES), mood: '' };
      const s = seatEls[i];
      s.innerHTML = '';
      s.append(el('span', { class: 'dd-face' }, seats[i].face), el('span', { class: 'dd-ticket' }, text), el('span', { class: 'dd-pat' }, el('i')));
      s.classList.remove('leave', 'happy', 'angry'); s.classList.add('busy', 'in');
      setTimeout(() => s.classList.remove('in'), 400);
      if (sel == null || !seats[sel]) { sel = i; }
      paintSel(); Sound.pop();
    }
    function leave(i, how) {
      const s = seatEls[i];
      seats[i] = null;
      s.classList.add(how, 'leave');
      setTimeout(() => { if (!seats[i]) { s.className = 'dd-seat'; s.innerHTML = ''; s.append(el('span', { class: 'dd-empty' }, 'empty stool')); } }, 650);
      if (sel === i) { const left = seats.map((c, j) => (c ? j : -1)).filter(j => j >= 0); sel = left.length ? left.reduce((a, j) => (seats[j].left < seats[a].left ? j : a)) : null; }
      paintSel();
    }
    function serve(rec, btn) {
      if (ended) return;
      let i = sel != null && seats[sel] ? sel : -1;
      if (i < 0) { const left = seats.map((c, j) => (c ? j : -1)).filter(j => j >= 0); if (!left.length) return api.msg('No one’s waiting yet', false); i = left.reduce((a, j) => (seats[j].left < seats[a].left ? j : a)); }
      const c = seats[i], s = seatEls[i];
      btn.classList.remove('hit', 'miss'); void btn.offsetWidth;
      if (rec === c.rec) {
        btn.classList.add('hit'); combo++; right++; served++;
        const pts = Math.round((100 + c.left / c.max * 60) * Math.min(3, 1 + Math.floor(combo / 4) * .5));
        score += pts; Sound.good(); api.msg(`+${pts} ${combo >= 4 ? '· combo ×' + Math.min(3, 1 + Math.floor(combo / 4) * .5) : ''}`);
        s.querySelector('.dd-ticket').textContent = '✓ thanks!';
        leave(i, 'happy');
        if (captions && served >= 8) { captions = false; menuBox.classList.add('nocap'); api.msg('The menu lost its captions!'); }
      } else {
        btn.classList.add('miss'); combo = 0; Sound.bad(); shake(s);
        c.left = Math.max(.5, c.left - c.max * .3);
        api.lesson(`That order needs <b>${c.rec}</b>, not ${rec}. ${WHY[c.rec]}`, 3800);
      }
      paint();
    }
    api.key(e => { const n = +e.key; if (n >= 1 && n <= 7) menuBox.children[n - 1].click(); if (e.key === 'Tab') { e.preventDefault(); const occ = [0, 1, 2].filter(j => seats[j]); if (occ.length) { sel = occ[(occ.indexOf(sel) + 1) % occ.length]; paintSel(); } } });
    api.loop(dt => {
      if (ended) return false;
      t += dt;
      arriveIn -= dt;
      if (arriveIn <= 0 && t < LEN - 4) { arrive(); arriveIn = Math.max(2.2, 4.6 - t / 20); }
      seats.forEach((c, i) => {
        if (!c) return;
        c.left -= dt;
        const bar = seatEls[i].querySelector('.dd-pat i');
        if (bar) { bar.style.width = (c.left / c.max * 100) + '%'; bar.parentNode.classList.toggle('low', c.left / c.max < .3); }
        if (c.left <= 0) {
          walkouts++; combo = 0; Sound.drop();
          seatEls[i].querySelector('.dd-ticket').textContent = '😤 forget it';
          api.lesson(`They walked out. They wanted <b>${c.rec}</b>. ${WHY[c.rec]}`, 3600);
          leave(i, 'angry');
        }
      });
      paint();
      if (walkouts >= 3 || t >= LEN) {
        ended = true;
        api.after(700, () => api.done({ score, stars: walkouts >= 3 ? Math.min(1, starsFor(right / 12, 2, 2, .5)) : starsFor(right / 22, .85, .55, .2), line: `${right} orders served right. <b>A</b> IPv4 · <b>AAAA</b> IPv6 · <b>CNAME</b> alias · <b>MX</b> email · <b>NS</b> in charge · <b>PTR</b> reverse · <b>TXT</b> extra/security.` }));
        return false;
      }
    });
  }
};
