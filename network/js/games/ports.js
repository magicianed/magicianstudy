'use strict';
/* Port Authority — packets roll down the belt into one server. Read the destination port and
   send each one through the right app's door before it falls off the end. */

GAMES.ports = {
  title: 'Port Authority',
  tagline: 'One server, five apps. The port number says which door each packet goes through.',
  how: [
    'Packets ride the belt. The one at the front glows.',
    'Click its app door, or press <span class="kbd">1</span>–<span class="kbd">5</span>.',
    'Halfway through, the doors <b>lose their numbers</b>. You’ll need to remember them.',
    'Three wrong doors or drops and you’re out. Streaks multiply your points.'
  ],
  preview(S) {
    S.node('B', 110, 190, 'server', 'server');
    [['www', 'Web :80', 50], ['www', 'Secure :443', 115], ['@', 'Email :25', 180], ['DNS', 'DNS :53', 245], ['>_', 'SSH :22', 310]].forEach(([gl, l, y], i) => { S.node('d' + i, 520, y, 'app', ''); S.glyph('d' + i, gl); S.text('l' + i, 455, y + 5, l, 'mono', 'end'); });
    S.chip('p', 250, 190, ':443', 'cyan'); S.chip('p2', 320, 190, ':25', 'mint');
  },
  run(area, api) {
    const DOORS = [
      { port: 80, name: 'Web (HTTP)', glyph: 'www', cls: 'cyan', says: ['GET /index.html', 'GET /menu.html'] },
      { port: 443, name: 'Secure web (HTTPS)', glyph: '🔒', cls: 'cyan', says: ['GET /cats.png 🔒', 'login page 🔒'] },
      { port: 25, name: 'Email', glyph: '@', cls: 'mint', says: ['To: mrs.lee@school.edu', 'Subject: homework'] },
      { port: 53, name: 'DNS', glyph: 'DNS', cls: 'violet', says: ['where is shop.com?', 'IP for game.net?'] },
      { port: 22, name: 'Remote login (SSH)', glyph: '>_', cls: 'amber', says: ['login: admin', 'ssh session'] }
    ];
    const TOTAL = 40;
    let lives = 3, sent = 0, correct = 0, streak = 0, score = 0, speed = 70, gap = 2.3, nextIn = .4, pk = [];
    const belt = el('div', { class: 'pa-belt' }, el('div', { class: 'pa-end' }, 'drop!'));
    const doorsBox = el('div', { class: 'pa-doors' });
    const note = el('p', { class: 'pa-note' }, 'Read the port number. Pick the door.');
    area.append(el('div', { class: 'pa scr' }, note, belt, doorsBox));
    DOORS.forEach((d, i) => {
      const b = el('button', { class: `pa-door ${d.cls}`, type: 'button' }, el('span', { class: 'pa-glyph' }, d.glyph), el('b', {}, d.name), el('span', { class: 'pa-port mono' }, ':' + d.port), el('span', { class: 'kbd' }, i + 1));
      b.onclick = () => route(i, b);
      doorsBox.append(b); d.el = b;
    });
    const paint = () => api.stats({ Lives: '♥'.repeat(lives) + '♡'.repeat(3 - lives), Streak: [streak, streak >= 5], Score: score, Left: TOTAL - sent });
    paint();
    const front = () => pk.reduce((a, p) => (!a || p.x > a.x ? p : a), null);
    function spawn() {
      const d = pick(DOORS), labels = sent + pk.length < 14;
      const p = { d, x: -110, el: el('div', { class: `pa-pkt ${d.cls}` }, el('b', { class: 'mono' }, ':' + d.port), labels ? el('small', {}, pick(d.says)) : null) };
      belt.append(p.el); pk.push(p);
    }
    function paintFront() { const f = front(); pk.forEach(p => p.el.classList.toggle('front', p === f)); }
    function lose(p, why, html) {
      lives--; streak = 0; paint(); Sound.bad(); shake(belt);
      api.msg(why, false); if (html) api.lesson(html, 3600);
      if (lives <= 0) api.after(700, finish);
    }
    function route(i, btn) {
      const p = front(); if (!p || lives <= 0) return;
      pk = pk.filter(q => q !== p); sent++;
      const ok = p.d === DOORS[i];
      const dr = btn.getBoundingClientRect(), pr = p.el.getBoundingClientRect();
      const dx = dr.left + dr.width / 2 - (pr.left + pr.width / 2), dy = dr.top + dr.height / 2 - (pr.top + pr.height / 2);
      p.el.classList.remove('front');
      const a = p.el.animate([{ transform: `translateX(${p.x}px)` }, { transform: `translate(${p.x + dx}px, ${dy}px) scale(.4)`, opacity: .2 }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => p.el.remove();
      btn.classList.remove('hit', 'miss'); void btn.offsetWidth; btn.classList.add(ok ? 'hit' : 'miss');
      if (ok) { correct++; streak++; const mult = Math.min(4, 1 + Math.floor(streak / 5)); score += 100 * mult; Sound.good(); if (streak % 5 === 0) api.msg(`Streak ×${mult}!`); paint(); }
      else lose(p, `:${p.d.port} isn’t ${DOORS[i].name}`, `<b>Port ${p.d.port}</b> = ${p.d.name}. You sent it to ${DOORS[i].name} (:${DOORS[i].port}).`);
      check();
    }
    function check() { if (sent >= TOTAL && !pk.length && lives > 0) api.after(500, finish); }
    let ended = false;
    function finish() {
      if (ended) return; ended = true;
      api.done({ score, stars: lives > 0 ? starsFor(correct / TOTAL, .9, .7, .3) : starsFor(correct / TOTAL, 2, .7, .35), line: `${correct} of ${sent} packets reached the right app. The <b>IP address</b> found the server; the <b>port number</b> found the app.` });
    }
    api.key(e => { const n = +e.key; if (n >= 1 && n <= 5) DOORS[n - 1].el.click(); });
    let hidden = false;
    api.loop(dt => {
      if (lives <= 0 || ended) return false;
      const W = belt.clientWidth;
      nextIn -= dt;
      if (nextIn <= 0 && sent + pk.length < TOTAL) { spawn(); nextIn = gap; }
      if (!hidden && sent >= 14) { hidden = true; doorsBox.classList.add('nolabels'); note.textContent = 'The doors lost their numbers! Remember which port goes where.'; api.msg('Doors lost their numbers!'); }
      if (sent >= 26) { speed = 115; gap = 1.45; } else if (sent >= 14) { speed = 90; gap = 1.85; }
      const v = speed * clamp(W / 720, .62, 1); /* a short belt on a phone moves slower */
      for (const p of pk) { p.x += v * dt; p.el.style.transform = `translateX(${p.x}px)`; }
      const f = front();
      if (f && f.x > W - 90) {
        pk = pk.filter(q => q !== f); sent++;
        f.el.classList.add('fall'); setTimeout(() => f.el.remove(), 500);
        lose(f, 'Dropped off the end!', `That was <b>:${f.d.port}</b>, which is ${f.d.name}.`);
        check();
      }
      paintFront();
      api.stats({ Left: TOTAL - sent });
    });
  }
};
