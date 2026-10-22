'use strict';
/* Packet Puzzle — segments land scrambled; put them back in order by sequence number,
   bin the damaged ones, and ask for a resend of anything that never showed up. */

GAMES.reassembly = {
  title: 'Packet Puzzle',
  tagline: 'A message arrives in pieces, out of order. Rebuild it before the receiver gives up.',
  how: [
    'Tap a segment, then tap the slot it belongs in. Lowest <b>SEQ</b> number goes first.',
    'Slot still empty after everything arrived? Tap it to ask for a <b>resend</b>.',
    '<b class="c-coral">Checksum ✗</b> means it got damaged. Bin it, then ask for a resend.',
    'Quicker rebuilds score more.'
  ],
  preview(S) {
    S.node('A', 90, 150, 'laptop', 'sender'); S.node('B', 550, 150, 'server', 'receiver'); S.link('AB', 'A', 'B', 'live');
    [['4128', 'cyan', 250, 110], ['4126', 'cyan', 330, 160], ['4129', 'coral', 410, 120]].forEach(([t, c, x, y], i) => S.chip('p' + i, x, y, 'SEQ ' + t, c));
    ['4126', '4127', '4128', '4129'].forEach((t, i) => { S.zone('z' + i, 130 + i * 98, 250, 86, 56, '', i === 1 ? 'lit' : ''); S.text('t' + i, 173 + i * 98, 284, t, 'mono'); });
    S.text('q', 271, 330, 'resend?', 'cyan');
  },
  run(area, api) {
    const ROUNDS = [
      { words: 'your pizza is here', lost: 0, bad: 0, labels: true },
      { words: 'meet me by the lockers', lost: 1, bad: 0, labels: true },
      { words: 'every byte arrived safe and sound', lost: 1, bad: 1, labels: false },
      { words: 'I tried to tell a UDP joke', lost: 1, bad: 1, labels: false },
      { words: 'but I am not sure you got it', lost: 2, bad: 1, labels: false }
    ];
    let ri = 0, score = 0, max = 0, sel = null, round = null;
    const head = el('div', { class: 'pp-head' });
    const slots = el('div', { class: 'pp-slots' });
    const tray = el('div', { class: 'pp-tray', 'aria-label': 'Arrived segments' });
    const status = el('span', { class: 'pp-status' });
    const timer = el('div', { class: 'pp-timer' }, el('i'));
    const bin = el('button', { class: 'pp-bin', type: 'button', title: 'Bin a damaged segment' }, '🗑 Bin it');
    area.append(el('div', { class: 'pp scr' }, head, el('p', { class: 'pp-lbl' }, 'Receiver: rebuild in SEQ order'), slots, el('p', { class: 'pp-lbl' }, 'Arrived (tap one)'), tray, el('div', { class: 'pp-foot' }, status, timer, bin)));
    const paintStats = () => api.stats({ Round: `${ri + 1}/${ROUNDS.length}`, Score: score });

    function startRound() {
      const R = ROUNDS[ri], words = R.words.split(' '), isn = randInt(1200, 8800);
      const ids = words.map((_, i) => i);
      const lost = new Set(shuffle(ids.slice(1)).slice(0, R.lost));
      const bad = new Set(shuffle(ids.filter(i => !lost.has(i))).slice(0, R.bad));
      const limit = 14 + words.length * 4;
      round = { R, words, isn, lost, bad, filled: words.map(() => false), resent: new Set(), arrived: 0, allSent: false, t: limit, limit, segs: [] };
      max += words.length * 100 + limit * 8;
      sel = null; tray.innerHTML = ''; slots.innerHTML = '';
      head.innerHTML = '';
      head.append(el('b', {}, `Message ${ri + 1}`), el('span', { class: 'muted' }, ` · ${words.length} segments` + (R.lost ? ` · watch for gaps` : '') + (R.bad ? ' · and damage' : '')));
      slots.style.setProperty('--n', words.length);
      words.forEach((w, i) => {
        const s = el('button', { class: 'pp-slot', type: 'button' }, el('span', { class: 'pp-seq' }, R.labels || i === 0 ? 'SEQ ' + (isn + i) : '?'), el('span', { class: 'pp-word' }, ''));
        s.onclick = () => slotTap(i, s);
        slots.append(s);
      });
      paintStats();
      /* segments arrive one at a time, scrambled; the lost ones never come */
      const order = shuffle(ids.filter(i => !lost.has(i)));
      order.forEach((i, k) => api.after(450 + k * 620, () => { arrive(i, bad.has(i)); round.arrived++; if (k === order.length - 1) api.after(500, () => { round.allSent = true; status.textContent = lost.size ? 'Everything sent. Any gaps?' : 'Everything sent.'; status.className = 'pp-status hot'; }); }));
      status.textContent = 'Receiving…'; status.className = 'pp-status';
      round.tick = api.every(100, () => {
        round.t = Math.max(0, round.t - .1);
        timer.firstChild.style.width = (round.t / round.limit * 100) + '%';
        timer.classList.toggle('low', round.t < round.limit * .25);
      });
    }
    function arrive(i, damaged) {
      const R = round, w = R.words[i];
      const seg = el('button', { class: 'pp-seg' + (damaged ? ' bad' : ''), type: 'button', style: `--r:${rand(-7, 7).toFixed(1)}deg` },
        el('span', { class: 'pp-seq' }, 'SEQ ' + (R.isn + i)),
        el('span', { class: 'pp-word' }, damaged ? w.replace(/[aeiouy]/gi, () => pick(['#', '%', '&', '@'])) : w),
        el('span', { class: 'pp-ck' }, damaged ? 'checksum ✗' : 'checksum ✓'));
      seg.dataset.i = i; if (damaged) seg.dataset.bad = '1';
      seg.onclick = () => { if (sel === seg) { sel = null; seg.classList.remove('sel'); return; } if (sel) sel.classList.remove('sel'); sel = seg; seg.classList.add('sel'); Sound.tick(); };
      R.segs.push(seg);
      const at = Math.floor(Math.random() * (tray.children.length + 1));
      tray.insertBefore(seg, tray.children[at] || null);
      Sound.pop();
    }
    function slotTap(i, s) {
      const R = round;
      if (!R || R.filled[i]) return;
      if (sel) {
        const j = +sel.dataset.i;
        if (sel.dataset.bad) {
          score = Math.max(0, score - 30); paintStats(); Sound.bad(); shake(sel);
          api.lesson('<b>Damaged segment.</b> Its checksum doesn’t match, so the receiver can’t use it. Bin it, then tap its empty slot to ask for a resend.');
          return;
        }
        if (j !== i) {
          score = Math.max(0, score - 25); paintStats(); Sound.bad(); shake(s);
          api.msg(`SEQ ${R.isn + j} doesn’t go there`, false);
          return;
        }
        R.filled[i] = true;
        s.classList.add('fill'); s.querySelector('.pp-word').textContent = R.words[i]; s.querySelector('.pp-seq').textContent = 'SEQ ' + (R.isn + i);
        sel.remove(); sel = null;
        score += 100; paintStats(); Sound.good();
        if (R.filled.every(Boolean)) finishRound();
        return;
      }
      /* nothing picked up: this is a resend request */
      const inTray = R.segs.some(g => g.isConnected && +g.dataset.i === i && !g.dataset.bad);
      if (inTray) { Sound.bad(); shake(s); score = Math.max(0, score - 20); paintStats(); api.msg(`SEQ ${R.isn + i} is already in your tray`, false); return; }
      const binned = R.binned && R.binned.has(i);
      if (!R.allSent && !binned) { api.msg('Still receiving. Wait for everything to arrive', false); return; }
      if (R.resent.has(i)) return;
      R.resent.add(i);
      s.classList.add('asking'); s.querySelector('.pp-word').textContent = 'resend…';
      api.msg(`Asked for SEQ ${R.isn + i} again`);
      Sound.send();
      api.after(1000, () => { s.classList.remove('asking'); s.querySelector('.pp-word').textContent = ''; R.resent.delete(i); R.lost.delete(i); arrive(i, false); });
    }
    bin.onclick = () => {
      if (!sel) { api.msg('Pick a damaged segment first', false); return; }
      if (!sel.dataset.bad) { Sound.bad(); shake(sel); score = Math.max(0, score - 20); paintStats(); api.msg('That one’s fine. Checksum ✓', false); return; }
      const i = +sel.dataset.i;
      (round.binned = round.binned || new Set()).add(i);
      sel.classList.add('gone'); const g = sel; sel = null; setTimeout(() => g.remove(), 300);
      Sound.drop(); api.msg(`Binned. Now ask for SEQ ${round.isn + i} again`);
    };
    function finishRound() {
      const R = round;
      api.stop(R.tick);
      const bonus = Math.round(R.t * 8);
      score += bonus; paintStats();
      slots.classList.add('done');
      api.msg(bonus ? `Rebuilt! +${bonus} speed bonus` : 'Rebuilt!');
      Sound.win();
      status.textContent = '“' + R.words.join(' ') + '”'; status.className = 'pp-status good';
      ri++;
      api.after(2200, () => {
        slots.classList.remove('done');
        if (ri < ROUNDS.length) startRound();
        else api.done({ score, stars: starsFor(score / max, .78, .55, .1), line: 'Segments get numbered so the receiver can rebuild them in order, and <b>error checking</b> asks for anything lost or damaged again.' });
      });
    }
    api.key(e => { if (e.key === 'Backspace' || e.key === 'Delete') bin.click(); });
    startRound();
  }
};
