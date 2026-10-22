'use strict';
/* Poison Patrol — guard four users' DNS. Forged answers need the Seal (DNSSEC proves what's real).
   Snoopers need the Tunnel (DoH/DoT hides what you look up). The wrong tool doesn't work. */

GAMES.patrol = {
  title: 'Poison Patrol',
  tagline: 'Attackers forge DNS answers and snoop on lookups. Two tools, two different jobs.',
  how: [
    '<b class="c-coral">Forged answers</b> drop in from the attacker. Hit them with the <b class="c-mint">Seal</b> <span class="kbd">1</span> (DNSSEC): no valid signature, rejected.',
    '<b class="c-coral">Snoopers</b> 👁 sit on a line reading your lookups. Wrap that line in a <b class="c-violet">Tunnel</b> <span class="kbd">2</span> (DoH/DoT).',
    'Pick a tool, then click the target. Real answers (from the DNS server) are fine. Leave them alone.',
    'A fake that reaches a user, or a snooper that reads enough, is a strike. Five strikes and it’s over.'
  ],
  preview(S) {
    S.node('N', 80, 190, 'dns', 'DNS'); S.node('E', 320, 50, 'attacker', 'attacker');
    [0, 1, 2, 3].forEach(i => { S.node('u' + i, 570, 70 + i * 90, 'laptop', ''); S.link('l' + i, 'N', 'u' + i, i === 2 ? 'tunnel' : ''); });
    S.chip('f', 330, 135, 'bank.com=6.6.6.6', 'coral'); S.node('w', 420, 240, 'eye', ''); S.chip('r', 220, 160, 'bank.com ✓', 'violet');
  },
  run(area, api) {
    const LANES = 4, LEN = 75;
    const SITES = ['bank.com', 'school.edu', 'shop.com', 'mail.net', 'game.net'];
    let tool = 'seal', t = 0, score = 0, strikes = 0, stopped = 0, ents = [], tunnels = [0, 0, 0, 0], ended = false, realIn = .5, fakeIn = 3, snoopIn = 6;
    const board = el('div', { class: 'pt-board' });
    const laneY = i => 14 + i * 24;
    board.append(el('div', { class: 'pt-res' }, el('span', {}, '🗂'), el('small', {}, 'DNS server')), el('div', { class: 'pt-att' }, el('span', {}, '🦹'), el('small', {}, 'attacker')));
    const users = [], lanes = [];
    for (let i = 0; i < LANES; i++) {
      const ln = el('div', { class: 'pt-lane', style: `top:${laneY(i)}%` });
      ln.onclick = () => use({ kind: 'lane', lane: i });
      board.append(ln); lanes.push(ln);
      const u = el('div', { class: 'pt-user', style: `top:${laneY(i)}%` }, el('span', {}, ['💻', '📱', '🖥️', '💻'][i]), el('small', {}, ['Ava', 'Ben', 'Lab PC', 'Mia'][i]));
      board.append(u); users.push(u);
    }
    const sealB = el('button', { class: 'pt-tool seal on', type: 'button' }, el('span', { class: 'kbd' }, '1'), el('b', {}, '🔏 Seal'), el('small', {}, 'DNSSEC · proves it’s real'));
    const tunB = el('button', { class: 'pt-tool tunnel', type: 'button' }, el('span', { class: 'kbd' }, '2'), el('b', {}, '🔒 Tunnel'), el('small', {}, 'DoH / DoT · hides lookups'));
    const setTool = k => { tool = k; sealB.classList.toggle('on', k === 'seal'); tunB.classList.toggle('on', k === 'tunnel'); board.dataset.tool = k; Sound.tick(); };
    sealB.onclick = () => setTool('seal'); tunB.onclick = () => setTool('tunnel');
    area.append(el('div', { class: 'pt scr' }, board, el('div', { class: 'pt-tools' }, sealB, tunB)));
    setTool('seal');
    api.key(e => { if (e.key === '1' || e.key === 'q') setTool('seal'); if (e.key === '2' || e.key === 'w') setTool('tunnel'); });
    const paint = () => api.stats({ Time: Math.max(0, Math.ceil(LEN - t)), Stopped: stopped, Strikes: [strikes + '/5', strikes >= 3], Score: score });

    function spawn(kind) {
      const lane = randInt(0, LANES - 1), site = pick(SITES);
      const e = { kind, lane, x: kind === 'fake' ? rand(.28, .5) : .08, read: 0 };
      if (kind === 'snoop') {
        if (ents.some(o => o.kind === 'snoop' && o.lane === lane) || tunnels[lane] > 0) return;
        e.x = rand(.38, .62);
        e.el = el('button', { class: 'pt-snoop in', type: 'button', style: `top:${laneY(lane) - 9}%; left:${e.x * 100}%` }, el('span', {}, '👁'), el('i', { class: 'pt-read' }, el('b')));
      } else {
        const ip = kind === 'fake' ? pick(['6.6.6.6', '66.6.6.66', '13.37.0.1']) : pick(['198.51.100.7', '203.0.113.9', '192.0.2.44']);
        e.el = el('button', { class: `pt-ans ${kind}` + (kind === 'fake' ? ' drop' : ''), type: 'button', style: `top:${laneY(lane)}%` }, `${site} = ${ip}`, kind === 'real' ? el('em', {}, ' ✓sig') : null);
      }
      e.el.onclick = ev => { ev.stopPropagation(); use(e); };
      board.append(e.el); ents.push(e);
    }
    function kill(e, cls) { ents = ents.filter(o => o !== e); e.el.classList.add(cls || 'pop'); setTimeout(() => e.el.remove(), 450); }
    function use(target) {
      if (ended) return;
      const k = target.kind;
      if (tool === 'seal') {
        if (k === 'fake') { stopped++; score += 100; Sound.good(); api.msg('No valid signature. Rejected!'); kill(target, 'shatter'); }
        else if (k === 'real') { score = Math.max(0, score - 20); Sound.bad(); api.msg('Signature checks out. That one’s real', false); }
        else if (k === 'snoop' || k === 'lane') {
          if (k === 'lane' && !ents.some(o => o.kind === 'snoop' && o.lane === target.lane)) return;
          score = Math.max(0, score - 20); Sound.bad(); shake(lanes[target.lane]);
          api.lesson('<b>A seal proves an answer is real</b>, but the snooper can still read it. To <b>hide</b> lookups, use the <b>Tunnel</b> (DoH/DoT).', 4200);
        }
      } else {
        if (k === 'fake') { score = Math.max(0, score - 20); Sound.bad(); shake(target.el); api.lesson('<b>A tunnel hides traffic</b>, but it doesn’t prove who sent an answer. The fake still gets through. Use the <b>Seal</b> (DNSSEC).', 4200); }
        else if (k === 'real') { api.msg('Real answers are fine. Tunnels go on lines with snoopers', false); }
        else {
          const lane = target.lane, sn = ents.find(o => o.kind === 'snoop' && o.lane === lane);
          if (!sn) return api.msg('No snooper on this line', false);
          tunnels[lane] = 12; lanes[lane].classList.add('tunnel'); users[lane].classList.add('safe');
          stopped++; score += 100; Sound.good(); api.msg('Encrypted. Snooper sees “#$@!%”');
          sn.el.querySelector('span').textContent = '❓'; kill(sn, 'flee');
        }
      }
      paint();
    }
    function strike(lane, txt) {
      strikes++; Sound.drop(); shake(users[lane]);
      users[lane].classList.remove('hurt'); void users[lane].offsetWidth; users[lane].classList.add('hurt');
      api.msg(txt, false);
      if (strikes >= 5) finish();
    }
    function finish() {
      if (ended) return; ended = true;
      api.after(600, () => api.done({ score, stars: strikes >= 5 ? (stopped >= 10 ? 1 : 0) : starsFor(1 - strikes / 5, .99, .55, 0), line: `You stopped ${stopped} attacks. <b>DNSSEC</b> = authenticity (the seal proves it’s real). <b>DoH/DoT</b> = privacy (the tunnel hides it).` }));
    }
    api.loop(dt => {
      if (ended) return false;
      t += dt;
      const lvl = Math.min(1, t / LEN);
      realIn -= dt; fakeIn -= dt; snoopIn -= dt;
      if (realIn <= 0) { spawn('real'); realIn = rand(1.1, 2); }
      if (fakeIn <= 0) { spawn('fake'); fakeIn = rand(3.4, 5) - lvl * 1.9; }
      if (snoopIn <= 0) { spawn('snoop'); snoopIn = rand(7, 9) - lvl * 3; }
      for (let i = 0; i < LANES; i++) if (tunnels[i] > 0) { tunnels[i] -= dt; if (tunnels[i] <= 0) { lanes[i].classList.remove('tunnel'); users[i].classList.remove('safe'); } }
      for (const e of ents.slice()) {
        if (e.kind === 'snoop') {
          e.read += dt / 7.5;
          e.el.querySelector('.pt-read b').style.width = Math.min(100, e.read * 100) + '%';
          if (e.read >= 1) { kill(e, 'flee'); strike(e.lane, 'A snooper read the sites they looked up!'); api.lesson('Plain DNS is readable by anyone on the line. <b>DoH/DoT encrypt it</b>, so nobody can see your lookups.', 3600); }
          continue;
        }
        e.x += dt * (e.kind === 'fake' ? .13 + lvl * .05 : .2);
        e.el.style.left = (e.x * 100) + '%';
        if (e.x >= .86) {
          if (e.kind === 'fake') { kill(e, 'hit'); strike(e.lane, 'Poisoned! A fake address got through'); api.lesson('That was <b>DNS spoofing</b>: a forged answer sent the user to a fake site. The <b>Seal</b> (DNSSEC) would have caught it.', 3600); }
          else { kill(e, 'arrive'); score += 5; }
        }
      }
      paint();
      if (t >= LEN) finish();
    });
  }
};
