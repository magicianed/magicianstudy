'use strict';
/* Packet Detective — a working mock of Wireshark's three panes. Each case asks you to find
   something real: a port, a MAC address, the bytes for "GET", the handshake, a dead connection. */

GAMES.detective = {
  title: 'Packet Detective',
  tagline: 'Crack seven cases inside a real-looking Wireshark. Click rows, open layers, read the bytes.',
  how: [
    '<b>Packet List</b> (top): one row per packet. Click a row to open it.',
    '<b>Packet Details</b> (middle): click ▸ to open a layer, then click the line you need.',
    '<b>Packet Bytes</b> (bottom): the raw hex, with the ASCII text on the right.',
    'Wrong clicks cost points. Stuck? The hint shows you where, for a price.'
  ],
  preview(S) {
    S.zone('l', 20, 20, 600, 110, 'Packet List', 'lit'); S.zone('d', 20, 140, 600, 120, 'Packet Details'); S.zone('b', 20, 270, 600, 90, 'Packet Bytes');
    S.text('r', 40, 70, '3  10.0.0.5 → 203.0.113.9  TCP  52144 → 80 [SYN]', 'mono cyan', 'start');
    S.text('f', 40, 196, '▾ TCP, Src Port: 52144, Dst Port: 80', 'mono', 'start');
    S.text('x', 40, 318, '0030  fa f0 00 00 00 00 47 45 54 20   ......GET ', 'mono amber', 'start');
  },
  run(area, api) {
    /* ── building realistic packets ── */
    const MAC = { me: '3c:22:fb:9a:11:07', gw: 'a4:83:e7:2c:0d:51' };
    const hx = n => n.toString(16).padStart(2, '0');
    const ipB = ip => ip.split('.').map(Number);
    const macB = m => m.split(':').map(h => parseInt(h, 16));
    const u16 = n => [n >> 8 & 255, n & 255], u32 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255];
    const FL = { SYN: 0x02, 'SYN, ACK': 0x12, ACK: 0x10, 'PSH, ACK': 0x18, 'FIN, ACK': 0x11 };
    let tick = 0;
    function make(o) {
      const out = o.src.startsWith('10.0.0.5');
      const sm = out ? MAC.me : MAC.gw, dm = out ? MAC.gw : MAC.me;
      const pay = [...(o.payload || '')].map(c => c.charCodeAt(0));
      const tcp = o.l4 === 'TCP';
      const l4 = tcp ? [...u16(o.sp), ...u16(o.dp), ...u32(o.seq || 0), ...u32(o.ack || 0), 0x50, FL[o.flags] || 0x18, 0xfa, 0xf0, 0x3a, 0x1c, 0, 0]
        : [...u16(o.sp), ...u16(o.dp), ...u16(8 + pay.length), 0x7c, 0x2e];
      const total = 20 + l4.length + pay.length;
      const bytes = [...macB(dm), ...macB(sm), 8, 0, 0x45, 0, ...u16(total), ...u16(0x1c46 + o.no), 0x40, 0, 0x40, tcp ? 6 : 17, 0xb1, 0xe6, ...ipB(o.src), ...ipB(o.dst), ...l4, ...pay];
      const L = 34 + l4.length;
      const flagsTxt = o.flags ? ` [${o.flags}]` : '';
      const tree = [
        { h: `Frame ${o.no}: ${bytes.length} bytes on wire`, r: [0, bytes.length], kids: [{ t: `Arrival Time: 13:42:0${o.no}.${String(81 + o.no * 37).padStart(3, '0')}` }, { t: `Frame Length: ${bytes.length} bytes` }] },
        { h: `Ethernet II, Src: ${sm}, Dst: ${dm}`, r: [0, 14], kids: [{ t: `Destination: ${dm}`, id: 'eth.dst', r: [0, 6] }, { t: `Source: ${sm}`, id: 'eth.src', r: [6, 6] }, { t: 'Type: IPv4 (0x0800)', id: 'eth.type', r: [12, 2] }] },
        { h: `Internet Protocol Version 4, Src: ${o.src}, Dst: ${o.dst}`, r: [14, 20], kids: [{ t: 'Version: 4', r: [14, 1] }, { t: `Total Length: ${total}`, r: [16, 2] }, { t: `Protocol: ${tcp ? 'TCP (6)' : 'UDP (17)'}`, id: 'ip.proto', r: [23, 1] }, { t: `Source Address: ${o.src}`, id: 'ip.src', r: [26, 4] }, { t: `Destination Address: ${o.dst}`, id: 'ip.dst', r: [30, 4] }] },
        tcp ? { h: `Transmission Control Protocol, Src Port: ${o.sp}, Dst Port: ${o.dp}${flagsTxt}`, r: [34, 20], kids: [{ t: `Source Port: ${o.sp}`, id: 'tcp.srcport', r: [34, 2] }, { t: `Destination Port: ${o.dp}`, id: 'tcp.dstport', r: [36, 2] }, { t: `Sequence Number: ${o.rseq || 0}  (relative)`, r: [38, 4] }, { t: `Flags: 0x0${hx(FL[o.flags] || 0x18)} (${o.flags || 'PSH, ACK'})`, id: 'tcp.flags', r: [46, 2] }, { t: 'Window: 64240', r: [48, 2] }] }
          : { h: `User Datagram Protocol, Src Port: ${o.sp}, Dst Port: ${o.dp}`, r: [34, 8], kids: [{ t: `Source Port: ${o.sp}`, id: 'udp.srcport', r: [34, 2] }, { t: `Destination Port: ${o.dp}`, id: 'udp.dstport', r: [36, 2] }, { t: `Length: ${8 + pay.length}`, r: [38, 2] }] }
      ];
      if (o.app === 'HTTP') tree.push({ h: 'Hypertext Transfer Protocol', r: [L, pay.length], kids: [{ t: 'GET / HTTP/1.1\\r\\n', id: 'http.get', r: [L, 16] }, { t: `Host: ${o.host}\\r\\n`, r: [L + 16, 8 + o.host.length] }] });
      if (o.app === 'DNS') tree.push({ h: `Domain Name System (${o.dp === 53 ? 'query' : 'response'})`, r: [L, pay.length], kids: [{ t: o.dp === 53 ? `Queries: ${o.host}: type A, class IN` : `Answers: ${o.host}: type A, addr ${o.addr}`, id: 'dns.q', r: [L, pay.length] }] });
      return Object.assign({ bytes, tree, time: (tick++ * .0213 + .0004).toFixed(4), len: bytes.length, proto: o.app || o.l4 }, o);
    }
    const CAP = {
      browse: [
        make({ no: 1, src: '10.0.0.5', dst: '10.0.0.1', l4: 'UDP', app: 'DNS', sp: 51515, dp: 53, host: 'shop.com', payload: '\u00124\u0001\u0000\u0000\u0001shop\u0003com', info: 'Standard query 0x1234 A shop.com' }),
        make({ no: 2, src: '10.0.0.1', dst: '10.0.0.5', l4: 'UDP', app: 'DNS', sp: 53, dp: 51515, host: 'shop.com', addr: '203.0.113.9', payload: '\u00124\u0081\u0080shop\u0003comË\u0000q\u0009', info: 'Standard query response 0x1234 A shop.com A 203.0.113.9' }),
        make({ no: 3, src: '10.0.0.5', dst: '203.0.113.9', l4: 'TCP', sp: 52144, dp: 80, flags: 'SYN', seq: 0x2a3f1c00, info: '52144 → 80 [SYN] Seq=0 Win=64240' }),
        make({ no: 4, src: '203.0.113.9', dst: '10.0.0.5', l4: 'TCP', sp: 80, dp: 52144, flags: 'SYN, ACK', seq: 0x71c0be00, ack: 0x2a3f1c01, info: '80 → 52144 [SYN, ACK] Seq=0 Ack=1' }),
        make({ no: 5, src: '10.0.0.5', dst: '203.0.113.9', l4: 'TCP', sp: 52144, dp: 80, flags: 'ACK', seq: 0x2a3f1c01, ack: 0x71c0be01, rseq: 1, info: '52144 → 80 [ACK] Seq=1 Ack=1' }),
        make({ no: 6, src: '10.0.0.5', dst: '203.0.113.9', l4: 'TCP', app: 'HTTP', sp: 52144, dp: 80, flags: 'PSH, ACK', seq: 0x2a3f1c01, ack: 0x71c0be01, rseq: 1, host: 'shop.com', payload: 'GET / HTTP/1.1\r\nHost: shop.com\r\n\r\n', info: 'GET / HTTP/1.1' }),
        make({ no: 7, src: '203.0.113.9', dst: '10.0.0.5', l4: 'TCP', sp: 80, dp: 52144, flags: 'ACK', seq: 0x71c0be01, ack: 0x2a3f1c23, rseq: 1, info: '80 → 52144 [ACK] Seq=1 Ack=35' })
      ],
      dead: [
        make({ no: 1, src: '10.0.0.5', dst: '10.0.0.1', l4: 'UDP', app: 'DNS', sp: 50022, dp: 53, host: 'game.net', payload: '«Í\u0001\u0000game\u0003net', info: 'Standard query 0xabcd A game.net' }),
        make({ no: 2, src: '10.0.0.1', dst: '10.0.0.5', l4: 'UDP', app: 'DNS', sp: 53, dp: 50022, host: 'game.net', addr: '192.0.2.77', payload: '«Í\u0081\u0080game\u0003netÀ\u0000\u0002M', info: 'Standard query response 0xabcd A game.net A 192.0.2.77' }),
        make({ no: 3, src: '10.0.0.5', dst: '192.0.2.77', l4: 'TCP', sp: 52200, dp: 443, flags: 'SYN', seq: 0x11d00000, info: '52200 → 443 [SYN] Seq=0 Win=64240' }),
        make({ no: 4, src: '10.0.0.5', dst: '192.0.2.77', l4: 'TCP', sp: 52200, dp: 443, flags: 'SYN', seq: 0x11d00000, info: '[TCP Retransmission] 52200 → 443 [SYN] Seq=0' }),
        make({ no: 5, src: '10.0.0.5', dst: '192.0.2.77', l4: 'TCP', sp: 52200, dp: 443, flags: 'SYN', seq: 0x11d00000, info: '[TCP Retransmission] 52200 → 443 [SYN] Seq=0' })
      ]
    };
    CAP.dead.forEach((p, i) => { p.time = [0, .0118, .0302, 1.0331, 3.0390][i].toFixed(4); });

    const CASES = [
      { cap: 'browse', sel: 3, title: 'Which app?', steps: [{ field: 'tcp.dstport', say: 'Packet 3 is headed to a server. Which app is it for? Find its <b>destination port</b>.' }], win: 'Port 80 = web (HTTP). Ports are in <b>Packet Details</b>, inside the TCP layer.' },
      { cap: 'browse', sel: 3, title: 'Name the panes', hideNames: true, steps: [{ pane: 'bytes', say: 'The pane names are hidden. Click the <b>Packet Bytes</b> pane.' }, { pane: 'list', say: 'Now click the <b>Packet List</b> pane.' }, { pane: 'det', say: 'And the <b>Packet Details</b> pane.' }], win: 'List = one row per packet. Details = the layers. Bytes = raw hex.' },
      { cap: 'browse', sel: 3, title: 'Who sent it?', steps: [{ field: 'eth.src', say: 'Find the <b>sender’s MAC address</b> for packet 3.' }], win: 'MAC addresses live in the <b>Ethernet II</b> layer of Packet Details.' },
      { cap: 'browse', sel: 6, title: 'Raw bytes', steps: [{ byte: 54, say: 'Packet 6 asks for a web page. In <b>Packet Bytes</b>, find the letters G E T (hex <span class="mono">47 45 54</span>). Click the <b>G</b>.' }], win: '<span class="mono">47 45 54</span> = “GET”. Hex on the left, the same bytes as text on the right.' },
      { cap: 'browse', sel: null, title: 'The handshake', steps: [{ row: 3, say: 'Click the three <b>handshake</b> packets in order. First one?' }, { row: 4, say: 'Second one?' }, { row: 5, say: 'And the last one?' }], win: '<b>SYN → SYN-ACK → ACK.</b> Connection open; packet 6 can ask for the page.' },
      { cap: 'browse', sel: null, title: 'The lookup', steps: [{ row: 1, say: 'Find the <b>DNS lookup</b> (the question, not the answer) in the Packet List.' }, { field: 'udp.dstport', say: 'Prove it went to <b>port 53</b> using <b>UDP</b>: click that line in Packet Details.' }], win: 'DNS questions usually go over <b>UDP to port 53</b>: small, quick, no handshake needed.' },
      { cap: 'dead', sel: null, title: 'Dead line', steps: [{ mc: true, say: 'Something’s wrong here. Look at packets 3, 4 and 5. What happened?', options: [['The server never answered the SYN, so no connection was made', true], ['The handshake worked and the page loaded', false, 'There’s no SYN-ACK anywhere, so the handshake never finished.'], ['DNS gave back a fake address', false, 'The DNS answer looks normal. The problem is the server never replied.'], ['The client was using UDP', false, 'These are TCP SYN packets, sent again and again.']] }], win: 'Repeated SYNs with no SYN-ACK: the server is down, unreachable, or a firewall is blocking it.' }
    ];

    let ci = 0, si = 0, score = 0, caseScore = 0, sel = null, open = new Set([3]), fieldSel = null, byteSel = null;
    const prompt = el('div', { class: 'wd-prompt' });
    const hintB = el('button', { class: 'btn ghost sm', type: 'button' }, '🔍 Hint (−40)');
    const ws = el('div', { class: 'ws' });
    area.append(el('div', { class: 'wd scr' }, el('div', { class: 'wd-top' }, prompt, hintB), ws));
    const paint = () => api.stats({ Case: `${ci + 1}/${CASES.length}`, Score: score });
    const C = () => CASES[ci], step = () => C().steps[si] || {}, pk = () => CAP[C().cap].find(p => p.no === sel);

    function render() {
      const c = C(), cap = CAP[c.cap], p = pk();
      ws.innerHTML = '';
      ws.classList.toggle('noname', !!c.hideNames);
      const bar = el('div', { class: 'ws-bar' }, el('i'), el('i'), el('i'), el('span', {}, (c.cap === 'dead' ? 'game-night' : 'homework-break') + '.pcapng · Wireshark'));
      const list = el('div', { class: 'ws-pane ws-list', 'data-pane': 'list' }, el('span', { class: 'ws-name' }, 'Packet List'));
      const tbl = el('table', {}, el('thead', {}, el('tr', {}, ['No.', 'Time', 'Source', 'Destination', 'Protocol', 'Length', 'Info'].map((h, i) => el('th', { class: i === 1 || i === 5 ? 'ws-opt' : '' }, h)))));
      const tb = el('tbody');
      cap.forEach(r => {
        const tr = el('tr', { class: `p-${r.proto.toLowerCase()}` + (r.no === sel ? ' sel' : '') + (r.flags === 'SYN' && c.cap === 'dead' && r.no > 3 ? ' retx' : '') },
          [r.no, r.time, r.src, r.dst, r.proto, r.len, r.info].map((v, i) => el('td', { class: i === 1 || i === 5 ? 'ws-opt' : '' }, String(v))));
        tr.onclick = e => { if (!pane(e)) rowClick(r.no); };
        tb.append(tr);
      });
      tbl.append(tb); list.append(tbl);
      const det = el('div', { class: 'ws-pane ws-det', 'data-pane': 'det' }, el('span', { class: 'ws-name' }, 'Packet Details'));
      const bytes = el('div', { class: 'ws-pane ws-bytes', 'data-pane': 'bytes' }, el('span', { class: 'ws-name' }, 'Packet Bytes'));
      if (p) {
        p.tree.forEach((L, li) => {
          const isOpen = open.has(li);
          const hd = el('div', { class: 'ws-node' + (fieldSel === 'h' + li ? ' sel' : ''), 'data-h': li }, el('span', { class: 'tw' }, isOpen ? '▾' : '▸'), L.h);
          hd.onclick = e => { if (pane(e)) return; open.has(li) ? open.delete(li) : open.add(li); fieldSel = 'h' + li; hl = L.r; Sound.tick(); render(); };
          det.append(hd);
          if (isOpen) L.kids.forEach(k => {
            const kd = el('div', { class: 'ws-leaf' + (fieldSel === k.id && k.id ? ' sel' : ''), 'data-id': k.id || '' }, k.t);
            kd.onclick = e => { if (pane(e)) return; fieldClick(k, kd); };
            det.append(kd);
          });
        });
        const B = p.bytes;
        for (let o = 0; o < B.length; o += 16) {
          const row = el('div', { class: 'ws-hex' }, el('span', { class: 'off' }, o.toString(16).padStart(4, '0')));
          const hexes = el('span', { class: 'hx' }), asc = el('span', { class: 'as' });
          for (let j = o; j < Math.min(o + 16, B.length); j++) {
            const on = hl && j >= hl[0] && j < hl[0] + hl[1];
            const a = el('span', { class: (on ? 'hl' : '') + (byteSel === j ? ' sel' : ''), 'data-off': j }, hx(B[j]));
            const ch = B[j] >= 32 && B[j] < 127 ? String.fromCharCode(B[j]) : '.';
            const b = el('span', { class: (on ? 'hl' : '') + (byteSel === j ? ' sel' : ''), 'data-off': j }, ch);
            a.onclick = b.onclick = e => { if (pane(e)) return; byteClick(j); };
            hexes.append(a); asc.append(b);
            if ((j - o) === 7) hexes.append(el('span', { class: 'gap' }));
          }
          row.append(hexes, asc); bytes.append(row);
        }
      } else {
        det.append(el('p', { class: 'ws-empty' }, 'Click a packet in the list to see its layers.'));
        bytes.append(el('p', { class: 'ws-empty' }, 'Raw bytes show up here.'));
      }
      [list, det, bytes].forEach(pn => pn.addEventListener('click', e => { if (step().pane) pane(e); }));
      ws.append(bar, list, det, bytes);
      const pr = (step().row || step().field || step().byte || step().pane) && hintOn ? hintTarget() : null;
      if (pr) pr.classList.add('hint');
    }
    let hl = null, hintOn = false;
    function hintTarget() {
      const s = step();
      if (s.row) return ws.querySelectorAll('tbody tr')[s.row - 1];
      if (s.pane) return ws.querySelector(`[data-pane="${s.pane}"]`);
      if (s.byte != null) return ws.querySelector(`.hx [data-off="${s.byte}"]`);
      if (s.field) return ws.querySelector(`[data-id="${s.field}"]`) || ws.querySelector(`.ws-node[data-h="${s.field.startsWith('eth') ? 1 : 3}"]`);
    }
    /* a pane-naming step treats any click as a click on that pane */
    function pane(e) {
      const s = step();
      if (!s.pane) return false;
      e.stopPropagation();
      const pn = e.target.closest('[data-pane]');
      if (!pn) return true;
      if (pn.dataset.pane === s.pane) good(); else bad(pn, `That’s the <b>${{ list: 'Packet List', det: 'Packet Details', bytes: 'Packet Bytes' }[pn.dataset.pane]}</b>.`);
      return true;
    }
    function rowClick(no) {
      const s = step();
      if (s.row) {
        if (no !== s.row) { sel = no; open = new Set([3]); render(); return bad(ws.querySelectorAll('tbody tr')[no - 1], s.row >= 3 && s.row <= 5 ? 'Look at the <b>Info</b> column for [SYN], [SYN, ACK], [ACK].' : 'The DNS question is the one going <b>to</b> the DNS server (port 53).'); }
        sel = no; open = new Set([3]); fieldSel = null; hl = null; byteSel = null; render();
        const t = ws.querySelectorAll('tbody tr')[no - 1]; t.classList.add('ok');
        return good();
      }
      if (sel !== no) { sel = no; open = new Set([3]); fieldSel = null; byteSel = null; hl = null; Sound.tick(); render(); }
    }
    function fieldClick(k, node) {
      fieldSel = k.id || null; hl = k.r || null; byteSel = null;
      const s = step();
      if (s.field) {
        if (k.id === s.field) { render(); return good(); }
        render();
        return bad(ws.querySelector('.ws-leaf.sel') || node, s.field.startsWith('eth') ? 'MAC addresses are in <b>Ethernet II</b>. The sender is the <b>Source</b>.' : s.field === 'tcp.dstport' ? 'You want <b>Destination Port</b>, inside the TCP layer.' : 'Open the <b>User Datagram Protocol</b> layer and find <b>Destination Port</b>.');
      }
      Sound.tick(); render();
    }
    function byteClick(j) {
      byteSel = j; hl = null; fieldSel = null;
      const s = step();
      render();
      if (s.byte != null) { if (j === s.byte) return good(); return bad(ws.querySelector('.hx .sel'), `That’s <span class="mono">${hx(pk().bytes[j])}</span>. Look for <span class="mono">47 45 54</span>, or “GET” in the text column.`); }
      Sound.tick();
    }
    function bad(node, why) {
      caseScore = Math.max(40, caseScore - 30); Sound.bad(); if (node) shake(node);
      api.lesson(why, 3600);
    }
    function good() {
      Sound.good(); si++; hintOn = false;
      if (si < C().steps.length) { showPrompt(); render(); return; }
      score += caseScore; paint();
      api.msg(`Case closed! +${caseScore}`);
      prompt.innerHTML = `<b class="c-mint">Solved.</b> ${C().win}`;
      prompt.append(el('div', { class: 'actions', style: 'margin-top:10px' }, el('button', { class: 'btn primary sm', type: 'button', onclick: nextCase }, ci < CASES.length - 1 ? 'Next case →' : 'Finish')));
      hintB.disabled = true;
    }
    function nextCase() {
      ci++;
      if (ci >= CASES.length) return api.done({ score, stars: starsFor(score / (150 * CASES.length), .85, .6, .25), line: 'Find ports and MACs in <b>Packet Details</b>, raw hex in <b>Packet Bytes</b>, and SYNs with no SYN-ACK mean <b>no connection</b>.' });
      startCase();
    }
    function showPrompt() {
      const s = step();
      prompt.innerHTML = `<span class="wd-case">Case ${ci + 1} · ${C().title}</span><p>${s.say}</p>`;
      if (s.mc) {
        const box = el('div', { class: 'opts' }, shuffle(s.options).map(([t, ok, why]) => {
          const b = el('button', { class: 'opt', type: 'button' }, t);
          b.onclick = () => { if (b.classList.contains('bad') || b.classList.contains('ok')) return; if (ok) { b.classList.add('ok'); good(); } else { b.classList.add('bad'); bad(b, why); } };
          return b;
        }));
        prompt.append(box);
      }
      hintB.disabled = !!s.mc;
    }
    function startCase() {
      si = 0; caseScore = 150; hintOn = false;
      sel = C().sel; open = new Set([3]); fieldSel = null; byteSel = null; hl = null;
      showPrompt(); render(); paint();
    }
    hintB.onclick = () => { if (hintOn) return; hintOn = true; caseScore = Math.max(40, caseScore - 40); render(); const t = hintTarget(); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    startCase();
  }
};
