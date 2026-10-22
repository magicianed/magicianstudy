'use strict';
/* Dispatch — every job needs a delivery service. The careful TCP truck or the fast UDP drone?
   Each choice plays out on a lossy network, so you see exactly what goes right or wrong. */

GAMES.courier = {
  title: 'Dispatch',
  tagline: 'Send each job by TCP truck or UDP drone, then watch what happens on a messy network.',
  how: [
    '<b class="c-cyan">TCP truck</b> <span class="kbd">←</span>: connects first, checks every piece, resends lost ones. Reliable, slower.',
    '<b class="c-amber">UDP drone</b> <span class="kbd">→</span>: just sends. No checks. Fast.',
    'The network drops a piece every time. Watch the result of each pick.',
    'Pick quickly for a speed bonus.'
  ],
  preview(S) {
    S.node('A', 100, 190, 'laptop', 'you'); S.node('B', 540, 190, 'server', 'them'); S.link('AB', 'A', 'B', 'live');
    S.chip('t', 230, 140, 'TCP: file.pdf', 'cyan'); S.chip('u', 400, 240, 'UDP: video frame', 'amber'); S.text('x', 450, 210, '✕', 'coral');
  },
  run(area, api) {
    const JOBS = [
      ['📄', 'Download homework.pdf', 'tcp', 'A file with a missing piece won’t open.'],
      ['✉️', 'Send an email to your teacher', 'tcp', 'Every word of an email has to arrive.'],
      ['🌐', 'Load a web page', 'tcp', 'Web pages need every byte to show up right.'],
      ['🖼️', 'Upload a photo to the cloud', 'tcp', 'A photo with holes is a broken photo.'],
      ['⬇️', 'Download a game update', 'tcp', 'One bad byte and the update crashes.'],
      ['🏦', 'Check your bank balance', 'tcp', 'Money numbers have to be exact.'],
      ['📝', 'Submit an online test', 'tcp', 'Your answers must all arrive.'],
      ['🎮', 'Live online match', 'udp', 'A late move is useless. Skip it and keep playing.'],
      ['📹', 'Video call with grandma', 'udp', 'A dropped frame is a tiny blip. Waiting would freeze the call.'],
      ['🏟️', 'Watch a live sports stream', 'udp', 'Live means now. Old frames don’t matter.'],
      ['🎧', 'Voice chat while gaming', 'udp', 'A tiny gap in a voice beats a long pause.'],
      ['🏎️', 'Online racing game', 'udp', 'Positions update constantly. The newest one is all that counts.'],
      ['📡', 'Livestream your gameplay', 'udp', 'Viewers want it live, not perfect.'],
      ['📻', 'Live internet radio', 'udp', 'A tiny skip is better than buffering.']
    ];
    const deck = shuffle(JOBS.filter(j => j[2] === 'tcp')).slice(0, 6).concat(shuffle(JOBS.filter(j => j[2] === 'udp')).slice(0, 6));
    const jobs = shuffle(deck);
    let ji = 0, score = 0, right = 0, streak = 0, t0 = 0, token = 0, locked = false;
    const card = el('div', { class: 'dc-card' });
    const tcpB = el('button', { class: 'dc-pick tcp', type: 'button' }, el('span', { class: 'dc-ico' }, '🚚'), el('b', {}, 'TCP truck'), el('small', {}, 'connects · checks · resends'), el('span', { class: 'kbd' }, '←'));
    const udpB = el('button', { class: 'dc-pick udp', type: 'button' }, el('span', { class: 'dc-ico' }, '🛸'), el('b', {}, 'UDP drone'), el('small', {}, 'just sends · fast'), el('span', { class: 'kbd' }, '→'));
    const simHost = el('div', { class: 'dc-sim' }), cap = el('p', { class: 'dc-cap' }, 'Results show up here.');
    area.append(el('div', { class: 'dc scr' }, el('div', { class: 'dc-left' }, card, el('div', { class: 'dc-btns' }, tcpB, udpB)), el('div', { class: 'dc-right' }, simHost, cap)));
    const S = new Stage(simHost, 640, 260);
    const paint = () => api.stats({ Job: `${Math.min(ji + 1, jobs.length)}/${jobs.length}`, Streak: [streak, streak >= 4], Score: score });

    function show() {
      const [ico, name] = jobs[ji];
      card.innerHTML = '';
      card.append(el('span', { class: 'dc-big' }, ico), el('b', {}, name), el('span', { class: 'dc-timer' }, el('i')));
      card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
      t0 = performance.now(); locked = false; paint();
      const bar = card.querySelector('.dc-timer i');
      if (bar.animate) bar.animate([{ width: '100%' }, { width: '0%' }], { duration: 6000, fill: 'forwards' });
    }
    function choose(proto, btn) {
      if (locked || ji >= jobs.length) return;
      locked = true;
      const [, name, need, why] = jobs[ji], ok = proto === need;
      const bonus = ok ? Math.round(clamp(1 - (performance.now() - t0) / 6000, 0, 1) * 50) : 0;
      if (ok) { right++; streak++; score += 100 + bonus; Sound.good(); api.msg(bonus > 30 ? `Quick! +${100 + bonus}` : `+${100 + bonus}`); }
      else { streak = 0; Sound.bad(); shake(btn); api.lesson(`<b>${name}</b> needs <b>${need.toUpperCase()}</b>. ${why}`, 4200); }
      btn.classList.remove('hit', 'miss'); void btn.offsetWidth; btn.classList.add(ok ? 'hit' : 'miss');
      paint();
      play(proto, need, name);
      ji++;
      api.after(ok ? 900 : 1800, () => {
        if (ji < jobs.length) show();
        else api.after(2600, () => api.done({ score, stars: starsFor(right / jobs.length, .95, .75, .4), line: `${right} of ${jobs.length} right. <b>TCP</b> when every byte matters; <b>UDP</b> when speed matters more than a missing piece.` }));
      });
    }
    /* the network always loses one piece; what happens next depends on the pick */
    async function play(proto, need, name) {
      const my = ++token, live = () => my === token && api.alive;
      S.clear();
      S.node('A', 80, 140, 'server', 'sender'); S.node('B', 560, 140, need === 'tcp' ? 'laptop' : 'phone', 'you'); S.link('AB', 'A', 'B', proto === 'tcp' ? 'solid' : 'live');
      const cls = proto === 'tcp' ? 'cyan' : 'amber';
      cap.className = 'dc-cap'; cap.innerHTML = `${proto === 'tcp' ? '🚚 TCP' : '🛸 UDP'} carrying <b>${name}</b>…`;
      const lostAt = 3, got = [];
      const n = proto === 'tcp' ? 4 : 5;
      for (let i = 1; i <= n; i++) {
        if (!live()) return;
        const ms = proto === 'tcp' ? 520 : 330;
        const lost = i === lostAt;
        const p = S.packet('A', 'B', String(i), cls, { ms, dy: -26, lose: lost ? .55 : null });
        if (proto === 'tcp' && !lost) { await p; if (!live()) return; got.push(i); S.packet('B', 'A', 'ACK', 'mint', { ms: 380, dy: 26 }); await wait(140); }
        else { await wait(proto === 'tcp' ? ms + 200 : 160); if (!lost) got.push(i); }
      }
      await wait(500); if (!live()) return;
      if (proto === 'tcp') {
        S.badge('B', need === 'tcp' ? 'missing #3, resend?' : 'waiting for frame 3…', need === 'tcp' ? 'cyan' : 'coral');
        await S.packet('B', 'A', 'RESEND 3', 'mint', { ms: 500, dy: 26 }); if (!live()) return;
        await S.packet('A', 'B', '3', 'cyan', { ms: 520, dy: -26 }); if (!live()) return;
        if (need === 'tcp') { S.badge('B', '✓ complete', 'mint'); S.state('B', 'good'); cap.className = 'dc-cap good'; cap.innerHTML = 'TCP noticed piece 3 was lost and got it again. <b>Every byte arrived.</b>'; }
        else { S.badge('B', '⏳ lag spike', 'coral'); S.state('B', 'bad'); cap.className = 'dc-cap bad'; cap.innerHTML = 'TCP held everything back to resend one old frame. <b>In a live app, that’s lag.</b>'; }
      } else {
        await wait(400); if (!live()) return;
        if (need === 'udp') { S.badge('B', '▶ still smooth', 'mint'); S.state('B', 'good'); cap.className = 'dc-cap good'; cap.innerHTML = 'One frame never came. Nobody noticed. <b>Fast and still live.</b>'; }
        else { S.badge('B', '✗ file corrupted', 'coral'); S.state('B', 'bad'); cap.className = 'dc-cap bad'; cap.innerHTML = 'UDP never checked, so piece 3 is just gone. <b>The file is broken.</b>'; }
      }
    }
    tcpB.onclick = () => choose('tcp', tcpB);
    udpB.onclick = () => choose('udp', udpB);
    api.key(e => { if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); tcpB.click(); } if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); udpB.click(); } });
    show();
    return () => { token++; };
  }
};
