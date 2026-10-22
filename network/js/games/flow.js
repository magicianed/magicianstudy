'use strict';
/* Pour Control — you set the sending speed. The receiver's buffer drains at whatever pace its app
   can manage, and it keeps telling you how much room is left. Overflow drops data; empty wastes time. */

GAMES.flow = {
  title: 'Pour Control',
  tagline: 'Keep the receiver fed without flooding it. That balance is flow control.',
  how: [
    'Drag the <b>send rate</b> slider (or press <span class="kbd">↑</span> <span class="kbd">↓</span>).',
    'The receiver shouts its <b>window</b>: how many more segments it can take.',
    'Over the top? Segments get <b class="c-coral">dropped</b>. Keep it in the green band for double points.',
    'Its app speeds up and slows down. Packets take a second to arrive, so plan ahead.'
  ],
  preview(S) {
    S.node('A', 90, 190, 'laptop', 'sender'); S.node('B', 400, 190, 'server', 'receiver'); S.link('AB', 'A', 'B', 'live');
    S.meter('m', 500, 70, 60, 230, .62); S.badge('B', 'I can take 6', 'cyan');
    [170, 240, 310].forEach((x, i) => S.chip('c' + i, x, 190, 'seg', 'cyan'));
  },
  run(area, api) {
    const CAP = 16, TRAVEL = 1.1, LEN = 60;
    const PHASES = [[7, 3, 'Steady. Send at a normal pace.'], [6, 6, 'I’ve got time: send more!'], [6, 1.5, 'Busy! Slow down.'], [7, 8, 'Hungry! Send fast!'],
      [5, 0, 'Paused! Stop sending.'], [7, 4, 'Back to work.'], [6, 9, 'Full speed!'], [6, 2, 'Slow down…'], [10, 6, 'Strong finish!']];
    let rate = 3, fill = 4, flying = [], drops = [], leaving = [], spawn = 0, drainAcc = 0, t = 0, pi = 0, pt = 0;
    let delivered = 0, dropped = 0, score = 0, possible = 0, greenT = 0;
    const cv = el('canvas', { class: 'pc-canvas', 'aria-label': 'Sender, network and receiver buffer' });
    const slider = el('input', { type: 'range', min: 0, max: 10, step: .5, value: rate, 'aria-label': 'Send rate' });
    const rateLbl = el('b', { class: 'mono' });
    const bubble = el('div', { class: 'pc-bubble' });
    area.append(el('div', { class: 'pc scr' }, el('div', { class: 'pc-board' }, cv, bubble),
      el('div', { class: 'pc-ctrl' }, el('span', {}, 'Send rate'), slider, rateLbl, el('span', { class: 'muted' }, 'segments / sec'))));
    const setRate = v => { rate = clamp(v, 0, 10); slider.value = rate; rateLbl.textContent = rate.toFixed(1); };
    slider.addEventListener('input', () => setRate(+slider.value));
    api.key(e => { if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); setRate(rate + 1); } if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); setRate(rate - 1); } });
    setRate(rate);
    const g = cv.getContext('2d');
    let W = 0, H = 0;
    const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const C = { cyan: css('--cyan'), mint: css('--mint'), amber: css('--amber'), coral: css('--coral'), ink: css('--ink2'), line: css('--line2'), panel: css('--panel3'), bg: css('--bg2') };
    let lastSay = '';
    const say = (txt, cls) => { if (txt === lastSay) return; lastSay = txt; bubble.className = 'pc-bubble ' + (cls || ''); bubble.innerHTML = txt; };

    function rr(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
    function draw() {
      g.clearRect(0, 0, W, H);
      const sx = 64, tankW = 74, tankH = Math.min(240, H - 90), tx = W - tankW - 110, ty = 46, py = ty + tankH * .45;
      /* sender */
      g.fillStyle = C.panel; g.strokeStyle = C.cyan; g.lineWidth = 2; rr(sx - 34, py - 24, 68, 44, 8); g.fill(); g.stroke();
      g.fillStyle = C.ink; g.font = '600 13px Chakra Petch, sans-serif'; g.textAlign = 'center'; g.fillText('SENDER', sx, py + 42);
      g.fillStyle = C.cyan; g.font = '700 14px JetBrains Mono, monospace'; g.fillText(rate.toFixed(1) + '/s', sx, py + 4);
      g.font = '600 13px Chakra Petch, sans-serif';
      /* pipe */
      g.strokeStyle = C.line; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx + 40, py); g.lineTo(tx - 6, py); g.stroke();
      /* packets in flight */
      for (const p of flying) { const x = lerp(sx + 40, tx - 6, p.t); g.fillStyle = C.cyan; rr(x - 7, py - 7, 14, 14, 3); g.fill(); }
      /* tank */
      g.fillStyle = C.bg; g.strokeStyle = C.line; g.lineWidth = 2; rr(tx, ty, tankW, tankH, 10); g.fill(); g.stroke();
      const cell = (tankH - 8) / CAP;
      for (let i = 0; i < fill; i++) { const frac = (i + 1) / CAP; g.fillStyle = frac > .85 ? C.coral : frac > .25 ? C.mint : C.amber; rr(tx + 5, ty + tankH - 4 - (i + 1) * cell + 1, tankW - 10, cell - 2, 3); g.fill(); }
      /* green band */
      g.setLineDash([5, 5]); g.lineWidth = 1.5;
      [[.85, C.coral], [.25, C.amber]].forEach(([f, c]) => { g.strokeStyle = c; const y = ty + tankH - 4 - f * (tankH - 8); g.beginPath(); g.moveTo(tx - 10, y); g.lineTo(tx + tankW + 10, y); g.stroke(); });
      g.setLineDash([]);
      g.fillStyle = C.ink; g.fillText('BUFFER', tx + tankW / 2, ty + tankH + 22);
      /* the app reading from the buffer */
      const ax = tx + tankW + 62, ay = ty + tankH - 30;
      g.fillStyle = C.panel; g.strokeStyle = C.amber; g.lineWidth = 2; rr(ax - 28, ay - 22, 56, 44, 8); g.fill(); g.stroke();
      g.fillStyle = C.ink; g.fillText('APP', ax, ay + 5);
      g.fillStyle = C.amber; g.font = '700 12px JetBrains Mono, monospace'; g.fillText(PHASES[pi][1] + '/s', ax, ay + 40);
      for (const l of leaving) { g.globalAlpha = 1 - l.t; g.fillStyle = C.mint; rr(lerp(tx + tankW, ax - 30, l.t) - 5, ay - 5, 10, 10, 2); g.fill(); }
      g.globalAlpha = 1;
      /* dropped segments spill over the top */
      for (const d of drops) { g.globalAlpha = 1 - d.t; g.fillStyle = C.coral; rr(tx - 20 - d.t * 30, ty - 6 + d.t * d.t * 160, 12, 12, 2); g.fill(); g.font = '700 16px sans-serif'; g.fillText('✕', tx - 14 - d.t * 30, ty - 12 + d.t * d.t * 160); }
      g.globalAlpha = 1;
      /* time bar */
      g.fillStyle = C.panel; rr(16, H - 18, W - 32, 6, 3); g.fill();
      g.fillStyle = C.cyan; rr(16, H - 18, (W - 32) * (1 - t / LEN), 6, 3); g.fill();
    }

    api.loop(dt => {
      t += dt; pt += dt;
      if (pt >= PHASES[pi][0] && pi < PHASES.length - 1) { pt = 0; pi++; Sound.tick(); }
      const drain = PHASES[pi][1];
      /* send */
      spawn += rate * dt;
      while (spawn >= 1) { spawn -= 1; flying.push({ t: 0 }); }
      /* travel + arrive */
      for (const p of flying) p.t += dt / TRAVEL;
      flying = flying.filter(p => {
        if (p.t < 1) return true;
        if (fill < CAP) { fill++; delivered++; const green = fill / CAP > .25 && fill / CAP <= .85; score += green ? 10 : 5; }
        else { dropped++; score = Math.max(0, score - 25); drops.push({ t: 0 }); Sound.drop(); }
        return false;
      });
      /* the app reads */
      possible += drain * dt * 10;
      drainAcc += drain * dt;
      while (drainAcc >= 1 && fill > 0) { drainAcc -= 1; fill--; leaving.push({ t: 0 }); }
      if (fill === 0) drainAcc = Math.min(drainAcc, 1);
      if (fill / CAP > .25 && fill / CAP <= .85) greenT += dt;
      drops.forEach(d => (d.t += dt * 1.4)); drops = drops.filter(d => d.t < 1);
      leaving.forEach(l => (l.t += dt * 2.5)); leaving = leaving.filter(l => l.t < 1);
      /* what the receiver says: its window, plus a mood */
      const win = CAP - fill, inbound = flying.length;
      const mood = fill >= CAP - 1 ? ['<b>STOP!</b> I’m full!', 'bad'] : win - inbound <= 2 ? ['Slow down!', 'warn'] : fill <= 2 && drain > 0 ? ['Send more, I’m starving!', 'warn'] : [PHASES[pi][2], ''];
      say(`<span class="mono">window: ${win}</span> · ${inbound} on the way<br>${mood[0]}`, mood[1]);
      api.stats({ Time: Math.max(0, Math.ceil(LEN - t)), Delivered: delivered, Dropped: [dropped, dropped > 0], Score: score });
      draw();
      if (t >= LEN) {
        const frac = possible ? score / possible : 0;
        api.done({ score, stars: starsFor(frac, .72, .5, .25), line: `You were in the green band ${Math.round(greenT / LEN * 100)}% of the time. <b>Flow control</b> = the receiver says how much it can take, and the sender matches it.` });
        return false;
      }
    });
    return () => removeEventListener('resize', size);
  }
};
