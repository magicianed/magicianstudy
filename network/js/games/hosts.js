'use strict';
/* HOSTS Panic — keep every device's HOSTS file up to date by hand while sites keep moving
   and more devices keep showing up. It can't be done. Then switch on DNS and feel the difference. */

GAMES.hosts = {
  title: 'HOSTS Panic',
  tagline: 'Every device has its own list of names and IPs. Sites keep moving. Keep up… if you can.',
  how: [
    'When a site <b>moves</b>, every device’s HOSTS file goes out of date (red).',
    'Click a device to fix its HOSTS file. One device at a time, by hand.',
    'If a device opens a site with an old IP, it <b class="c-coral">fails</b>. Ten fails and you’re swamped.',
    'More devices keep joining. Then you get to try it with <b class="c-violet">DNS</b>.'
  ],
  preview(S) {
    [0, 1, 2, 3, 4, 5].forEach(i => { S.node('d' + i, 90 + (i % 3) * 230, 110 + Math.floor(i / 3) * 170, i % 2 ? 'phone' : 'laptop', 'HOSTS', i === 2 || i === 4 ? 'bad' : ''); });
    S.text('m', 320, 30, 'game.net moved!', 'coral');
  },
  run(area, api) {
    const SITES = ['shop.com', 'school.edu', 'game.net', 'news.org'];
    const NAMES = ['Ava’s laptop', 'Dad’s phone', 'Library PC', 'Tablet', 'Lab PC 1', 'Lab PC 2', 'Mia’s phone', 'Smart TV', 'Lab PC 3', 'Office PC', 'Leo’s laptop', 'Game console', 'Lab PC 4', 'Printer', 'Kiosk', 'Coach’s phone'];
    const ADDS = [[7, 2], [14, 2], [21, 3], [28, 3], [35, 4]];
    const newIP = () => pick(['203.0.113.', '198.51.100.', '192.0.2.']) + randInt(2, 250);
    const truth = {}; SITES.forEach(s => (truth[s] = newIP()));
    let phase = 'manual', t = 0, fails = 0, ok = 0, dnsOk = 0, dnsAll = 0, survived = 0, devs = [], dns = null, changeIn = 4.5;
    const feed = el('div', { class: 'hp-feed' }, el('b', {}, 'News feed'), el('span', { class: 'muted' }, ' · sites announce when they move'));
    const top = el('div', { class: 'hp-top' });
    const grid = el('div', { class: 'hp-grid' });
    const root = el('div', { class: 'hp scr' }, feed, top, grid);
    area.append(root);
    const paint = () => api.stats(phase !== 'dns' ? { Devices: devs.length, Worked: ok, Failed: [fails + '/10', fails >= 6] } : { Devices: devs.length, Worked: dnsOk, Failed: '–', 'DNS time': Math.max(0, Math.ceil(25 - t)) });

    function table(map, stale) {
      return el('div', { class: 'hp-tbl' }, SITES.map(s => el('span', { class: stale && map[s] !== truth[s] ? 'old' : '' }, el('i', {}, s), el('b', { class: 'mono' }, '…' + map[s].split('.').slice(-2).join('.')))));
    }
    function addDevice() {
      const i = devs.length;
      const d = { name: NAMES[i % NAMES.length], kind: /phone/i.test(NAMES[i]) ? '📱' : /TV|console|Printer|Kiosk/.test(NAMES[i]) ? '🖥' : '💻', hosts: Object.assign({}, truth), busy: false };
      d.el = el('button', { class: 'hp-dev new', type: 'button' });
      d.el.onclick = () => fix(d);
      devs.push(d); grid.append(d.el); draw(d);
      setTimeout(() => d.el.classList.remove('new'), 500);
    }
    function draw(d) {
      d.el.innerHTML = '';
      const stale = SITES.some(s => d.hosts[s] !== truth[s]);
      d.el.classList.toggle('stale', phase === 'manual' && stale);
      d.el.append(el('span', { class: 'hp-name' }, d.kind + ' ' + d.name));
      if (phase === 'manual') d.el.append(d.busy ? el('span', { class: 'hp-busy' }, 'editing HOSTS…') : table(d.hosts, true));
      else d.el.append(el('span', { class: 'hp-asks' }, 'asks DNS'));
      if (d.req) d.el.append(d.req);
    }
    function fix(d) {
      if (phase !== 'manual' || d.busy) return;
      if (!SITES.some(s => d.hosts[s] !== truth[s])) { api.msg('Already up to date', true); return; }
      d.busy = true; draw(d); Sound.tick();
      api.after(650, () => { d.busy = false; d.hosts = Object.assign({}, truth); draw(d); Sound.pop(); });
    }
    function move() {
      const s = pick(SITES); let ip = newIP(); while (ip === truth[s]) ip = newIP();
      truth[s] = ip;
      const line = el('p', { class: 'hp-news' }, el('b', {}, s), ' moved to ', el('span', { class: 'mono' }, ip));
      feed.insertBefore(line, feed.children[2] || null);
      while (feed.children.length > 5) feed.lastChild.remove();
      Sound.tick();
      if (phase === 'manual') devs.forEach(draw);
      else { dns.el.classList.add('stale'); drawDNS(); }
    }
    function request() {
      const d = pick(devs), s = pick(SITES);
      if (d.req) return;
      const b = el('span', { class: 'hp-req' }, '→ ' + s);
      d.req = b; d.el.append(b);
      api.after(phase === 'manual' ? 1500 : 900, () => {
        b.remove(); d.req = null;
        if (phase === 'over') return;
        const map = phase === 'manual' ? d.hosts : dns.table;
        const good = map[s] === truth[s];
        if (phase === 'dns') dnsAll++;
        if (good) { phase === 'manual' ? ok++ : dnsOk++; d.el.classList.remove('okf', 'badf'); void d.el.offsetWidth; d.el.classList.add('okf'); }
        else {
          d.el.classList.remove('okf', 'badf'); void d.el.offsetWidth; d.el.classList.add('badf');
          if (phase === 'manual') { fails++; Sound.bad(); api.msg(`${d.name} couldn’t reach ${s}`, false); if (fails >= 10) swamped(); }
          else Sound.bad();
        }
        paint();
      });
    }
    function swamped() {
      if (phase !== 'manual') return;
      phase = 'over'; survived = t;
      const ov = el('div', { class: 'hp-over scr' },
        el('h3', {}, 'Swamped.'),
        el('p', {}, `${devs.length} devices, each with its own list, and sites keep moving. Now picture every computer on Earth.`),
        el('p', {}, el('b', {}, 'That’s why HOSTS files can’t run the Internet.'), ' Every device would need constant updates.'),
        el('button', { class: 'btn primary', type: 'button', onclick: () => { ov.remove(); startDNS(); } }, 'Switch on DNS →'));
      root.append(ov);
    }
    function drawDNS() {
      dns.el.innerHTML = '';
      dns.el.append(el('span', { class: 'hp-name' }, '🗂 DNS server'), table(dns.table, true), el('small', {}, dns.el.classList.contains('stale') ? 'a site moved: click to update' : 'everyone asks me'));
    }
    function startDNS() {
      phase = 'dns'; t = 0; changeIn = 3;
      dns = { table: Object.assign({}, truth), el: el('button', { class: 'hp-dev hp-dns', type: 'button' }) };
      dns.el.onclick = () => {
        if (!dns.el.classList.contains('stale')) return api.msg('DNS is up to date');
        dns.table = Object.assign({}, truth); dns.el.classList.remove('stale'); drawDNS(); Sound.good();
        api.msg(`One update. All ${devs.length} devices fixed.`);
      };
      top.append(dns.el); drawDNS();
      devs.forEach(draw);
      root.classList.add('dnsmode');
      api.lesson('<b>DNS:</b> devices don’t keep their own lists anymore. They just ask the DNS server. When a site moves, it’s updated in <b>one</b> place.', 5200);
      paint();
    }
    addDevice(); addDevice(); paint();
    let reqIn = 1.2;
    api.loop(dt => {
      if (phase === 'over') return;
      t += dt;
      if (phase === 'manual') {
        while (ADDS.length && t >= ADDS[0][0]) { const [, n] = ADDS.shift(); for (let i = 0; i < n; i++) addDevice(); api.msg(`+${n} devices joined the network`); paint(); }
        if (t >= 55) { swamped(); return; }
      } else if (t >= 25) {
        const rate = dnsAll ? dnsOk / dnsAll : 1;
        api.done({ score: ok * 10 + dnsOk * 10, stars: 1 + (survived >= 40 ? 1 : 0) + (rate >= .85 ? 1 : 0), line: `By hand you lasted ${Math.round(survived)}s. With DNS, ${Math.round(rate * 100)}% of lookups worked. <b>HOSTS files</b> = a local list on every device; <b>DNS</b> = one shared phonebook.` });
        return false;
      }
      changeIn -= dt;
      if (changeIn <= 0) { move(); changeIn = phase === 'dns' ? rand(2.5, 4) : Math.max(2.2, 5 - t / 14); }
      reqIn -= dt;
      if (reqIn <= 0) { request(); reqIn = phase === 'dns' ? .25 : Math.max(.35, 1.3 - devs.length * .06); }
      if (phase === 'dns') paint();
    });
  }
};
