'use strict';
/* Handshake — what gets taught: the walk-throughs, the quiz questions and the self-check list,
   all following the Unit 4 study guide (Form A). Coloured words in captions:
   t = TCP / Layer 4 (cyan)   k = ACK, good (mint)   u = UDP (amber)   x = attack, FIN (coral)   d = DNS (violet) */

const T = s => `<b class="t">${s}</b>`, K = s => `<b class="k">${s}</b>`, U = s => `<b class="u">${s}</b>`, X = s => `<b class="x">${s}</b>`, D = s => `<b class="d">${s}</b>`;
const mc = (q, right, wrongs, exp) => ({ type: 'mc', q, options: [{ html: right, ok: true }].concat(wrongs.map(w => typeof w === 'string' ? { html: w } : w)), exp });
const ck = (q, right, wrongs, again, yes) => ({ q, again, yes, options: [{ html: right, ok: true }].concat(wrongs.map(([html, why]) => ({ html, why }))) });

/* two devices joined by a wire, the setup most scenes start from */
function pair(S, a = 'you', b = 'server', kindA = 'laptop', kindB = 'server', y = 230) {
  S.node('A', 105, y, kindA, a); S.node('B', 535, y, kindB, b); S.link('AB', 'A', 'B');
}

const LEVELS = [
  /* ───────────────────────── PART I: LAYER 4 ───────────────────────── */
  { id: 'transport', part: 1, title: 'The delivery service', blurb: 'What the Transport Layer does: segments, numbering, and fixing gaps.', game: 'reassembly',
    scenes: () => [
      { name: 'Layer 4', beats: [
        { say: 'Networks are built in 7 layers.', run: S => S.stack(236, 62, 0) },
        { say: `Layer 4 is the ${T('Transport Layer')}.`, run: S => S.stack(236, 62, 4) },
        { say: 'Think of it as the delivery service.', run: S => S.text('t1', 320, 300, 'the delivery service', 'big cyan') },
        { say: `It decides ${T('HOW')} your data gets delivered:`, run: S => S.text('t2', 320, 330, 'HOW data gets delivered', 'mono') },
        { say: 'how reliable, how fast, and at what pace.', run: S => { S.chip('r', 190, 358, 'reliable', 'mint'); S.chip('f', 320, 358, 'fast', 'amber'); S.chip('p', 450, 358, 'pace', 'cyan'); } }
      ],
      check: ck('What is Layer 4 called?', 'The Transport Layer', [['The Network Layer', 'That’s Layer 3. It picks routes, not delivery rules.'], ['The Application Layer', 'That’s Layer 7, where apps live.'], ['The Physical Layer', 'That’s Layer 1: cables and signals.']], 1) },
      { name: 'Segmentation', setup: S => pair(S), beats: [
        { say: 'Here’s a photo you want to send.', run: S => S.chip('blk', 105, 150, 'PHOTO.JPG  4 MB', 'cyan') },
        { say: 'It’s too big to send in one piece.', run: S => S.text('big', 105, 112, 'too big!', 'coral') },
        { say: `So Layer 4 cuts it into ${T('segments')}.`, run: S => { S.remove('blk'); S.remove('big'); [1, 2, 3, 4].forEach((n, i) => S.chip('s' + n, 54 + i * 34, 150, String(n), 'cyan')); } },
        { say: 'Each segment gets a number.', run: S => S.text('num', 105, 112, 'numbered 1 to 4', 'cyan') },
        { say: 'Off they go across the network.', run: async S => {
          [1, 2, 3, 4].forEach(n => S.remove('s' + n)); S.remove('num');
          const ms = { 1: 1700, 2: 1150, 3: 2000, 4: 1400 }, rank = { 2: 0, 4: 1, 1: 2, 3: 3 };
          await Promise.all([1, 2, 3, 4].map(n => S.packet('A', 'B', String(n), 'cyan', { ms: ms[n], dy: -80, keep: 'r' + n, kx: -54 + rank[n] * 36 })));
        } },
        { say: 'They can arrive out of order.', run: S => S.text('ord', 535, 108, 'arrived: 2, 4, 1, 3', 'amber') },
        { say: 'The receiver puts them back in order.', run: async S => { S.remove('ord'); await Promise.all([1, 2, 3, 4].map(n => S.move('r' + n, 481 + (n - 1) * 36, 150, 800))); } },
        { say: 'Your photo, rebuilt in one piece.', run: S => { [1, 2, 3, 4].forEach(n => S.remove('r' + n)); S.chip('done', 535, 150, 'PHOTO.JPG ✓', 'mint'); } }
      ],
      check: ck('What is segmentation?', 'Cutting data into numbered pieces, then rebuilding it at the other end', [['Encrypting data so nobody can read it', 'That’s encryption. Segmentation is about cutting data into pieces.'], ['Turning a name into an IP address', 'That’s DNS.'], ['Choosing the best route across the Internet', 'That’s routing, at Layer 3.']], 2) },
      { name: 'Error checking', setup: S => { pair(S); [1, 2, 3, 4].forEach((n, i) => S.chip('s' + n, 54 + i * 34, 150, String(n), 'cyan')); }, beats: [
        { say: 'Layer 4 keeps track of every segment it sends.', run: S => S.text('sent', 105, 112, 'sent: 1 2 3 4', 'mono') },
        { say: 'Segments 1 and 2 arrive.', run: async S => { await S.packet('A', 'B', '1', 'cyan', { dy: -80, keep: 'r1', kx: -54 }); await S.packet('A', 'B', '2', 'cyan', { dy: -80, keep: 'r2', kx: -18 }); } },
        { say: `Segment 3 gets ${X('lost')} on the way.`, run: S => S.packet('A', 'B', '3', 'cyan', { dy: -80, lose: .55 }) },
        { say: 'Segment 4 arrives.', run: S => S.packet('A', 'B', '4', 'cyan', { dy: -80, keep: 'r4', kx: 54 }) },
        { say: 'The receiver spots a gap where 3 should be.', run: S => { S.chip('gap', 553, 150, '3?', 'ghost'); S.badge('B', '3 is missing!', 'coral', -128); } },
        { say: `It asks: “Please ${K('resend 3')}.”`, run: S => S.packet('B', 'A', 'RESEND 3', 'mint', { dy: 40 }) },
        { say: 'Segment 3 comes again. All there!', run: async S => { S.unbadge('B'); await S.packet('A', 'B', '3', 'cyan', { dy: -80 }); S.remove('gap'); S.chip('r3', 553, 150, '3', 'cyan'); S.badge('B', 'complete ✓', 'mint', -128); } }
      ],
      check: ck('A segment goes missing. What does error checking do?', 'Notices the gap and asks for that segment again', [['Ignores it and keeps going', 'Layer 4 tracks what was sent and asks for missing pieces.'], ['Starts the whole file over', 'Only the missing segment gets sent again.'], ['Asks DNS for a new address', 'DNS has nothing to do with lost segments.']], 4) }
    ],
    quiz: [
      mc('Which Transport Layer job breaks data into pieces to send, then rebuilds it on arrival?', 'Segmentation', ['Flow control', 'Error checking', 'Port numbers'], 'Segmentation cuts data into numbered segments and puts them back together at the other end.'),
      mc('What does the Transport Layer decide?', 'HOW data is delivered: reliability, speed and flow', ['Which route packets take across the Internet', 'What a web page looks like', 'The IP address of a website'], 'Layer 4 is the delivery service: it decides how data gets there.'),
      mc('Segment 6 of 10 never arrives. Which job deals with that?', 'Error checking', ['Segmentation', 'Port numbers', 'Name resolution'], 'Error checking tracks what was sent and asks for missing segments again.'),
      mc('Which list names the main jobs of the Transport Layer?', 'Segmentation, flow control, error checking, port numbers', ['Routing, addressing, encryption, DNS', 'Cables, Wi-Fi, MAC addresses, signals', 'HTML, CSS, images, scripts'], 'Those four are the Transport Layer’s jobs.')
    ] },

  { id: 'flow', part: 1, title: 'Flow control', blurb: 'Matching the sender’s speed to what the receiver can handle.', game: 'flow',
    scenes: () => [
      { name: 'Too fast?', setup: S => { S.node('A', 100, 230, 'laptop', 'sender'); S.node('B', 420, 230, 'server', 'receiver'); S.link('AB', 'A', 'B'); S.meter('buf', 512, 120, 56, 190, .15); S.text('bl', 540, 336, 'buffer', 'mono'); }, beats: [
        { say: 'The receiver holds incoming data in a buffer.', run: S => S.meter('buf', 512, 120, 56, 190, .3) },
        { say: 'It can only hold so much at once.', run: S => S.text('full', 540, 108, 'full line', 'coral') },
        { say: 'If the sender goes too fast…', run: async S => { await Promise.all([0, 1, 2, 3, 4].map(i => wait(i * 160).then(() => S.packet('A', 'B', 'seg', 'cyan', { ms: 900 })))); await S.meter('buf', 512, 120, 56, 190, .97); } },
        { say: `…the buffer ${X('overflows')} and data is lost.`, run: async S => { S.badge('B', 'overflow!', 'coral'); await S.packet('A', 'B', 'seg', 'cyan', { lose: .92 }); } }
      ],
      check: ck('What happens when a sender ignores the receiver and goes too fast?', 'The receiver’s buffer overflows and data is lost', [['The data arrives faster, so it’s fine', 'The receiver can’t keep up, so some data is dropped.'], ['The port number changes', 'Ports pick the app. Speed is a flow control problem.'], ['DNS slows it down', 'DNS only turns names into addresses.']], 2) },
      { name: 'Agreeing on a speed', setup: S => { S.node('A', 100, 230, 'laptop', 'sender'); S.node('B', 420, 230, 'server', 'receiver'); S.link('AB', 'A', 'B'); S.meter('buf', 512, 120, 56, 190, .4); S.text('bl', 540, 336, 'buffer', 'mono'); }, beats: [
        { say: `${T('Flow control')}: the two sides agree on a speed.`, run: S => S.linkCls('AB', 'live') },
        { say: 'The receiver says how much it can take.', run: S => S.badge('B', 'I can take 3 more', 'cyan') },
        { say: 'The sender sends just that much.', run: async S => { for (let i = 0; i < 3; i++) { await S.packet('A', 'B', 'seg', 'cyan', { ms: 700 }); } await S.meter('buf', 512, 120, 56, 190, .7); } },
        { say: `When it’s busy: “${U('Slow down!')}”`, run: S => S.badge('B', 'Slow down!', 'amber') },
        { say: 'The sender slows down. Nothing spills.', run: async S => { await S.packet('A', 'B', 'seg', 'cyan', { ms: 1800 }); await S.meter('buf', 512, 120, 56, 190, .55); S.badge('B', 'just right ✓', 'mint'); } }
      ],
      check: ck('What does flow control do?', 'Matches the sending speed to what the receiver can handle', [['Encrypts the data', 'Encryption hides data. Flow control is about speed.'], ['Picks TCP or UDP', 'The app picks the protocol. Flow control manages pace.'], ['Assigns port numbers', 'Ports pick the app on the device.']], 0) }
    ],
    quiz: [
      mc('A fast server sends to a slow phone. What stops the phone from being flooded?', 'Flow control', ['Segmentation', 'Port numbers', 'DNS'], 'Flow control coordinates with the receiver to decide how fast to send.'),
      mc('Flow control coordinates with the receiver to decide…', 'how fast to send segments', ['which app gets the data', 'which website to visit', 'how to encrypt the data'], 'Flow control is about pace.'),
      mc('What happens if a sender ignores flow control?', 'The receiver’s buffer overflows and data is lost', ['The data gets there sooner with no problems', 'The data is sent to the wrong app', 'The connection becomes encrypted'], 'Too fast means the receiver can’t store it all, so some gets dropped.')
    ] },

  { id: 'ports', part: 1, title: 'Port numbers', blurb: 'The IP address finds the device. The port finds the app.', game: 'ports',
    scenes: () => [
      { name: 'Which app?', setup: S => { S.node('A', 80, 200, 'laptop', 'you'); S.node('B', 300, 200, 'server', '10.0.0.9'); S.link('AB', 'A', 'B'); }, beats: [
        { say: 'One server runs lots of apps at once.', run: S => { S.node('web', 540, 70, 'app', 'Web'); S.glyph('web', 'www'); S.node('mail', 540, 195, 'app', 'Email'); S.glyph('mail', '@'); S.node('dns', 540, 320, 'app', 'DNS'); S.glyph('dns', 'DNS'); ['web', 'mail', 'dns'].forEach(k => S.link('L' + k, 'B', k)); } },
        { say: 'The IP address gets data to the right device.', run: S => S.packet('A', 'B', '10.0.0.9', 'cyan', { dy: -30 }) },
        { say: `The ${T('port number')} gets it to the right app.`, run: S => S.lit('web', 'mail', 'dns') },
        { say: 'Like an apartment number on an address.', run: S => { S.lit(); S.text('apt', 300, 330, 'IP = building · port = apartment', 'mono cyan'); } },
        { say: 'Web pages use port 443.', run: S => S.packet('B', 'web', ':443', 'cyan') },
        { say: 'Email uses port 25.', run: S => S.packet('B', 'mail', ':25', 'mint') },
        { say: 'DNS uses port 53.', run: S => S.packet('B', 'dns', ':53', 'violet') }
      ],
      check: ck('What does a port number do?', 'Gets the data to the right app on a device', [['Finds the right device on the Internet', 'That’s the IP address. The port picks the app.'], ['Makes data travel faster', 'Ports don’t change speed.'], ['Checks for missing segments', 'That’s error checking.']], 2) },
      { name: 'Ports you’ll see', beats: [
        { say: 'A few port numbers come up a lot.', run: S => S.text('h', 320, 60, 'common ports', 'big') },
        { say: '80: web pages (HTTP).', run: S => { S.chip('p80', 210, 120, ':80', 'cyan'); S.text('t80', 260, 125, 'web (HTTP)', '', 'start'); } },
        { say: '443: secure web pages (HTTPS).', run: S => { S.chip('p443', 210, 170, ':443', 'cyan'); S.text('t443', 260, 175, 'secure web (HTTPS)', '', 'start'); } },
        { say: '25: email.', run: S => { S.chip('p25', 210, 220, ':25', 'mint'); S.text('t25', 260, 225, 'email', '', 'start'); } },
        { say: '53: DNS.', run: S => { S.chip('p53', 210, 270, ':53', 'violet'); S.text('t53', 260, 275, 'DNS', '', 'start'); } },
        { say: '22: remote login (SSH).', run: S => { S.chip('p22', 210, 320, ':22', 'amber'); S.text('t22', 260, 325, 'remote login (SSH)', '', 'start'); } }
      ],
      check: ck('A packet is headed to port 53. Which app gets it?', 'DNS', [['Secure web (HTTPS)', 'HTTPS is 443.'], ['Email', 'Email is 25.'], ['Remote login (SSH)', 'SSH is 22.']], 4) }
    ],
    quiz: [
      mc('What does a port number do?', 'Gets data to the right application on a device', ['Gets data to the right device on the Internet', 'Speeds up delivery', 'Encrypts the data'], 'Each application type gets its own number, so data reaches the right app.'),
      mc('IP address vs port number:', 'The IP finds the device; the port finds the app', ['The port finds the device; the IP finds the app', 'Both find the device', 'Both find the app'], 'IP = building, port = apartment.'),
      mc('Data arrives for port 25. Which app gets it?', 'Email', ['Web browser', 'DNS', 'Remote login'], 'Port 25 is email.'),
      mc('Which port does secure web (HTTPS) usually use?', '443', ['80', '25', '53'], 'HTTPS uses 443. Plain HTTP uses 80.')
    ] },

  { id: 'tcpudp', part: 1, title: 'TCP vs UDP', blurb: 'Careful and reliable, or fast and loose: which one, and when.', game: 'courier',
    scenes: () => [
      { name: 'TCP', setup: S => pair(S), beats: [
        { say: `${T('TCP')} is connection oriented.`, run: S => S.linkCls('AB', 'solid') },
        { say: 'It sets up a connection before sending.', run: async S => { S.badge('A', 'ready?', 'cyan'); await wait(S.fast ? 0 : 500); S.badge('B', 'ready!', 'mint'); } },
        { say: 'Every segment gets checked when it lands.', run: async S => { S.unbadge('A'); S.unbadge('B'); await S.packet('A', 'B', '1', 'cyan', { dy: -30 }); await S.packet('B', 'A', 'ACK 1', 'mint', { dy: 30 }); } },
        { say: 'Lost one? TCP sends it again.', run: async S => { await S.packet('A', 'B', '2', 'cyan', { dy: -30, lose: .5 }); await S.packet('A', 'B', '2', 'cyan', { dy: -30 }); await S.packet('B', 'A', 'ACK 2', 'mint', { dy: 30 }); } },
        { say: `${K('Reliable')}: the message gets there.`, run: S => S.text('rel', 320, 320, 'reliable ✓', 'big mint') },
        { say: 'But all that checking makes it slower.', run: S => S.text('slow', 320, 352, 'slower', 'amber') }
      ],
      check: ck('TCP is…', 'connection oriented, and it checks that data arrives', [['connectionless, and never checks', 'That’s UDP.'], ['only used for DNS', 'TCP carries all kinds of things: web, email, files.'], ['the fastest option', 'TCP’s checking makes it slower than UDP.']], 0) },
      { name: 'UDP', setup: S => { pair(S); S.linkCls('AB', 'live'); }, beats: [
        { say: `${U('UDP')} is connectionless.`, run: () => {} },
        { say: 'It just sends. No setup. No checking.', run: async S => { await Promise.all([0, 1, 2].map(i => wait(i * 220).then(() => S.packet('A', 'B', String(i + 1), 'amber', { ms: 700, dy: -30 })))); } },
        { say: 'Lost one? UDP doesn’t even notice.', run: async S => { await S.packet('A', 'B', '4', 'amber', { ms: 700, dy: -30, lose: .5 }); await S.packet('A', 'B', '5', 'amber', { ms: 700, dy: -30 }); } },
        { say: `No waiting, so it’s ${U('fast and efficient')}.`, run: S => S.text('fast', 320, 320, 'fast ⚡', 'big amber') }
      ],
      check: ck('Why is UDP faster than TCP?', 'It skips the setup and the checking', [['It uses bigger segments', 'Size isn’t the reason. Skipping the checks is.'], ['It is encrypted', 'Neither TCP nor UDP is encryption.'], ['It has a shorter address', 'Addresses aren’t the reason.']], 1) },
      { name: 'Which one, when?', beats: [
        { say: `Files, email, web pages: ${T('TCP')}.`, run: S => { S.text('th', 170, 70, 'TCP', 'big cyan'); ['file download', 'email', 'web page'].forEach((s, i) => S.chip('t' + i, 170, 120 + i * 44, s, 'cyan')); } },
        { say: 'One missing byte would break them.', run: S => S.text('tw', 170, 270, 'every byte matters', 'cyan') },
        { say: `Games, video calls, live streams: ${U('UDP')}.`, run: S => { S.text('uh', 470, 70, 'UDP', 'big amber'); ['online game', 'video call', 'live stream'].forEach((s, i) => S.chip('u' + i, 470, 120 + i * 44, s, 'amber')); } },
        { say: 'In a live game, a late packet is useless.', run: S => S.text('uw', 470, 270, 'late = useless', 'amber') },
        { say: 'Better to skip it and keep playing.', run: S => S.text('uw2', 470, 296, 'skip it, keep going', 'amber') }
      ],
      check: ck('Why do online games and video streaming use UDP?', 'Speed: a late packet is useless, so skip it and keep going', [['UDP is more reliable', 'TCP is the reliable one.'], ['UDP checks every packet', 'UDP doesn’t check anything.'], ['Games need encryption', 'UDP isn’t encryption.']], 3) }
    ],
    quiz: [
      mc('Which protocol is connection oriented?', 'TCP', ['UDP', 'DNS', 'HOSTS'], 'TCP sets up a connection and checks delivery.'),
      mc('Which protocol does NOT check that the message arrives?', 'UDP', ['TCP', 'DNSSEC', 'HTTPS'], 'UDP is connectionless and doesn’t check.'),
      mc('Why do online games and video streams use UDP?', 'Speed matters more than catching every packet; a late packet is useless', ['UDP is more reliable', 'UDP encrypts the stream', 'UDP resends lost packets'], 'Real-time apps can’t wait for resends.'),
      mc('Downloading your homework file should use…', 'TCP, because every byte has to arrive', ['UDP, because it’s faster', 'Either one, it doesn’t matter', 'DNS'], 'A file with missing bytes is broken.'),
      mc('Which comparison is right?', 'TCP is reliable but slower, while UDP is fast but doesn’t check delivery', ['TCP is fast but unreliable, while UDP is reliable but slower', 'Both check delivery', 'Neither sets up a connection'], 'A strong answer compares the two side by side.')
    ] },

  { id: 'handshake', part: 1, title: 'The handshake', blurb: 'SYN, SYN-ACK, ACK to connect. FIN and ACK to say goodbye.', game: 'handshake',
    scenes: () => [
      { name: 'Opening a connection', setup: S => pair(S, 'client', 'server'), beats: [
        { say: 'Before TCP sends data, it shakes hands.', run: () => {} },
        { say: `Step 1: the client sends ${T('SYN')}.`, run: async S => { S.badge('A', '“Can we talk?”', 'cyan'); await S.packet('A', 'B', 'SYN', 'cyan', { dy: -30 }); } },
        { say: 'SYN means synchronize: “let’s connect.”', run: S => S.text('syn', 320, 330, 'SYN = synchronize', 'mono cyan') },
        { say: `Step 2: the server sends ${T('SYN-ACK')}.`, run: async S => { S.unbadge('A'); S.badge('B', '“Yes! Ready?”', 'cyan'); await S.packet('B', 'A', 'SYN-ACK', 'cyan', { dy: 30 }); } },
        { say: `Step 3: the client sends ${K('ACK')}.`, run: async S => { S.unbadge('B'); S.badge('A', '“Got it!”', 'mint'); await S.packet('A', 'B', 'ACK', 'mint', { dy: -30 }); } },
        { say: 'Three packets. Now they’re connected.', run: S => { S.unbadge('A'); S.linkCls('AB', 'solid'); S.text('con', 320, 200, 'connected', 'mint'); } },
        { say: 'Now data can flow both ways.', run: async S => { await Promise.all([S.packet('A', 'B', 'data', 'cyan', { dy: -30 }), S.packet('B', 'A', 'data', 'cyan', { dy: 30 })]); } }
      ],
      check: ck('What’s the right order for the handshake?', 'SYN → SYN-ACK → ACK', [['ACK → SYN → SYN-ACK', 'It starts with SYN: you ask before anyone acknowledges.'], ['SYN-ACK → SYN → ACK', 'The client asks first with SYN.'], ['SYN → ACK → SYN-ACK', 'The server answers SYN-ACK before the client’s final ACK.']], 1) },
      { name: 'Closing it', setup: S => { pair(S, 'client', 'server'); S.linkCls('AB', 'solid'); }, beats: [
        { say: 'When they’re done, TCP says goodbye.', run: () => {} },
        { say: `One side sends ${X('FIN')}: “I’m finished.”`, run: S => S.packet('A', 'B', 'FIN', 'coral', { dy: -30 }) },
        { say: `The other side replies ${K('ACK')}.`, run: S => S.packet('B', 'A', 'ACK', 'mint', { dy: 30 }) },
        { say: 'Then it sends its own FIN.', run: S => S.packet('B', 'A', 'FIN', 'coral', { dy: 30 }) },
        { say: 'And gets an ACK back. Closed.', run: async S => { await S.packet('A', 'B', 'ACK', 'mint', { dy: -30 }); S.linkCls('AB', 'solid', false); S.text('cl', 320, 200, 'closed', 'muted'); } }
      ],
      check: ck('Which packets usually close a TCP connection?', 'FIN and ACK', [['SYN and ACK', 'Those open a connection.'], ['SYN-ACK only', 'That’s step 2 of opening.'], ['DNS and HTTP', 'Those aren’t TCP control packets.']], 1) },
      { name: 'No answer', setup: S => { pair(S, 'client', 'server'); S.state('B', 'off'); }, beats: [
        { say: 'What if a SYN gets no answer?', run: () => {} },
        { say: 'The client sends SYN…', run: S => S.packet('A', 'B', 'SYN', 'cyan', { dy: -30, lose: .88 }) },
        { say: 'Nothing comes back. It tries again.', run: S => S.packet('A', 'B', 'SYN', 'cyan', { dy: -30, lose: .88 }) },
        { say: 'And again. Still nothing.', run: S => S.packet('A', 'B', 'SYN', 'cyan', { dy: -30, lose: .88 }) },
        { say: `No SYN-ACK means ${X('no handshake')}.`, run: S => { S.linkCls('AB', 'dead'); S.text('no', 320, 200, 'no connection', 'coral'); } },
        { say: 'The server is down, unreachable, or blocked by a firewall.', run: S => S.badge('B', 'down? blocked?', 'coral') }
      ],
      check: ck('In Wireshark you see SYN, SYN, SYN, and never a SYN-ACK. What does it mean?', 'The server never answered, so no connection was made', [['The connection worked', 'Without a SYN-ACK the handshake never finished.'], ['The data was encrypted', 'This is about the handshake, not encryption.'], ['DNS returned a fake address', 'That’s spoofing; here the server simply never replied.']], 4) }
    ],
    quiz: [
      { type: 'order', q: 'Put the TCP three-way handshake in order.', items: ['SYN', 'SYN-ACK', 'ACK'], exp: 'Client SYN, server SYN-ACK, client ACK.' },
      mc('What does the SYN-ACK packet mean?', 'The server agrees and syncs back: “Yes, ready?”', ['The client is finished', 'The client confirms the connection', 'The data was received'], 'SYN-ACK is the server’s reply to the client’s SYN.'),
      mc('Which packets usually close a TCP connection?', 'FIN and ACK', ['SYN and ACK', 'SYN-ACK and RST', 'DNS and HTTP'], 'FIN says “I’m finished”; ACK confirms it.'),
      mc('A capture shows SYN packets with no reply. What does that mean?', 'The handshake never happened: the server is down, unreachable or blocked', ['The connection is open and working', 'The packets were sent with UDP', 'The website was spoofed'], 'No SYN-ACK means no connection.')
    ] },

  { id: 'wireshark', part: 1, title: 'Wireshark', blurb: 'Packet List, Packet Details, Packet Bytes: what each pane shows.', game: 'detective',
    scenes: () => {
      const win = S => {
        S.zone('list', 20, 20, 600, 120, 'Packet List');
        S.zone('det', 20, 150, 600, 120, 'Packet Details');
        S.zone('bytes', 20, 280, 600, 82, 'Packet Bytes');
      };
      const rows = S => {
        S.text('r0', 36, 62, 'No.  Source       Destination     Proto  Info', 'mono', 'start'); S.text('r1', 36, 86, '1    10.0.0.5     142.251.40.238  TCP    52144 → 443 [SYN]', 'mono', 'start'); S.text('r2', 36, 110, '2    142.251.40.238  10.0.0.5     TCP    443 → 52144 [SYN, ACK]', 'mono', 'start');
        S.text('d1', 36, 192, '▸ Ethernet II, Src: 3c:22:fb:9a:11:07', 'mono', 'start'); S.text('d2', 36, 216, '▸ Internet Protocol, Src: 10.0.0.5', 'mono', 'start'); S.text('d3', 36, 240, '▸ TCP, Src Port: 52144, Dst Port: 443', 'mono', 'start');
      };
      return [
        { name: 'Meet Wireshark', setup: win, beats: [
          { say: `${T('Wireshark')} is a free packet sniffer.`, run: () => {} },
          { say: 'It captures packets so you can look inside.', run: S => { rows(S); ['d1', 'd2', 'd3'].forEach(k => S.remove(k)); } },
          { say: `Top: the ${T('Packet List')}.`, run: S => S.state('list', 'lit') },
          { say: 'One quick summary row per packet.', run: S => S.state('r1', 'cyan') },
          { say: `Middle: ${T('Packet Details')}.`, run: S => { S.state('list', 'lit', false); S.state('det', 'lit'); S.text('d1', 36, 192, '▸ Ethernet II, Src: 3c:22:fb:9a:11:07', 'mono', 'start'); S.text('d2', 36, 216, '▸ Internet Protocol, Src: 10.0.0.5', 'mono', 'start'); S.text('d3', 36, 240, '▸ TCP, Src Port: 52144, Dst Port: 443', 'mono', 'start'); } },
          { say: 'Click a layer to open it up.', run: () => {} },
          { say: 'This is where you find MAC addresses and ports.', run: S => { S.state('d1', 'mint'); S.state('d3', 'mint'); } }
        ],
        check: ck('Which Wireshark section would you use to find port numbers?', 'Packet Details', [['Packet List', 'The list is a quick one-line summary. Details shows the ports clearly.'], ['Packet Bytes', 'Bytes is raw hex.'], ['None of them', 'Packet Details shows them.']], 4) },
        { name: 'The raw bytes', setup: S => { win(S); rows(S); }, beats: [
          { say: `Bottom: ${T('Packet Bytes')}.`, run: S => { S.state('bytes', 'lit'); S.text('b1', 36, 322, '0000  a4 83 e7 2c 0d 51 3c 22  fb 9a 11 07 08 00 45 00', 'mono', 'start'); S.text('b2', 36, 346, '0030  fa f0 3a 1c 00 00 47 45  54 20 2f 20   ..:...GET / ', 'mono', 'start'); } },
          { say: 'It shows the raw data in hex…', run: S => S.state('b1', 'amber') },
          { say: '…and the same bytes as ASCII text.', run: S => S.state('b2', 'amber') }
        ],
        check: ck('Which section shows the raw hex?', 'Packet Bytes', [['Packet List', 'The list is one summary row per packet.'], ['Packet Details', 'Details is the expandable layers.'], ['The Info column', 'Info is part of the summary row.']], 0) }
      ];
    },
    quiz: [
      mc('Which Wireshark section would you use to find port numbers?', 'Packet Details', ['Packet List', 'Packet Bytes', 'The title bar'], 'Packet Details shows each layer, including MAC addresses and ports.'),
      mc('Which section shows raw hex and ASCII?', 'Packet Bytes', ['Packet List', 'Packet Details', 'Statistics'], 'Packet Bytes is the raw data.'),
      mc('Which section gives one quick summary row per packet?', 'Packet List', ['Packet Details', 'Packet Bytes', 'Capture Options'], 'Packet List is the summary.'),
      mc('What is Wireshark?', 'A free packet sniffer / protocol analyzer', ['A firewall', 'A DNS server', 'An antivirus program'], 'It captures packets so you can inspect them.')
    ] },

  /* ───────────────────────── PART II: DNS ───────────────────────── */
  { id: 'dns', part: 2, title: 'DNS and HOSTS', blurb: 'The Internet’s phonebook, and why a local list can’t do the job.', game: 'hosts',
    scenes: () => [
      { name: 'Names into numbers', setup: S => { S.node('A', 95, 260, 'laptop', 'you'); S.node('N', 320, 100, 'dns', 'DNS server'); S.node('B', 545, 260, 'server', 'google.com'); S.link('AN', 'A', 'N'); S.link('AB', 'A', 'B'); }, beats: [
        { say: 'Computers find each other by IP address.', run: S => S.text('ip', 545, 338, '142.251.40.238', 'mono cyan') },
        { say: 'But people remember names, like google.com.', run: S => S.badge('A', 'google.com', 'cyan') },
        { say: `${D('DNS')} turns names into IP addresses.`, run: S => S.lit('N') },
        { say: 'You ask DNS: “Where is google.com?”', run: S => S.packet('A', 'N', 'google.com?', 'violet') },
        { say: 'DNS answers with the IP address.', run: S => S.packet('N', 'A', '142.251.40.238', 'violet') },
        { say: 'Now your computer can connect.', run: async S => { S.lit(); S.unbadge('A'); await S.packet('A', 'B', 'hello', 'cyan', { dy: 20 }); S.linkCls('AB', 'solid'); } },
        { say: `That’s called ${D('name resolution')}.`, run: S => S.text('nr', 320, 200, 'name resolution', 'big violet') }
      ],
      check: ck('What does DNS do?', 'Turns names like google.com into IP addresses', [['Encrypts web traffic', 'That’s HTTPS. DNS looks up addresses.'], ['Puts segments back in order', 'That’s the Transport Layer.'], ['Assigns port numbers', 'Ports are part of Layer 4.']], 2) },
      { name: 'The HOSTS file', setup: S => S.node('A', 110, 210, 'laptop', 'your device'), beats: [
        { say: `Before DNS, each computer kept a ${D('HOSTS file')}.`, run: S => S.zone('hf', 220, 120, 390, 160, 'HOSTS file') },
        { say: 'A small local list: name and IP address.', run: S => { S.text('h1', 240, 175, 'shop.com     203.0.113.9', 'mono', 'start'); S.text('h2', 240, 205, 'school.edu   198.51.100.4', 'mono', 'start'); S.text('h3', 240, 235, 'game.net     192.0.2.77', 'mono', 'start'); } },
        { say: 'You can still edit it on your own device.', run: S => S.state('hf', 'lit') },
        { say: 'But websites move to new addresses all the time.', run: S => { S.state('h1', 'coral'); S.text('mv', 415, 310, 'shop.com moved!', 'coral'); } },
        { say: 'Every device would need its list updated…', run: S => { [0, 1, 2, 3, 4, 5].forEach(i => { S.node('d' + i, 250 + i * 64, 352, i % 2 ? 'phone' : 'laptop', ''); }); } },
        { say: '…all the time, by hand.', run: S => [0, 1, 2, 3, 4, 5].forEach(i => S.state('d' + i, 'bad')) },
        { say: 'For the whole Internet? Impossible. So we use DNS.', run: S => S.text('imp', 415, 98, 'impossible at Internet scale', 'coral') }
      ],
      check: ck('Why can’t HOSTS files run the Internet?', 'Every device would need its list updated constantly', [['They’re too slow to read', 'Reading them is quick. Keeping millions of copies current is the problem.'], ['They only work with UDP', 'HOSTS files aren’t tied to a protocol.'], ['They can’t store IP addresses', 'They store exactly that: names and IPs.']], 3) }
    ],
    quiz: [
      mc('What does DNS do?', 'Maps Internet names to IP addresses', ['Encrypts web pages', 'Assigns port numbers', 'Puts segments in order'], 'Name resolution: google.com → 142.251.40.238.'),
      mc('Turning a name into an IP address is called…', 'name resolution', ['flow control', 'segmentation', 'spoofing'], 'That’s DNS’s whole job.'),
      mc('What is a HOSTS file?', 'A local list of hostnames and IP addresses on one device', ['A list of every website on the Internet', 'A Wireshark capture file', 'A DNS security certificate'], 'You can edit it on your own device.'),
      mc('Why can’t HOSTS files run the Internet?', 'Every device would need constant updates', ['They are encrypted', 'They only hold IPv6 addresses', 'They need a port number'], 'Sites change addresses; millions of local lists can’t keep up.')
    ] },

  { id: 'records', part: 2, title: 'Record types', blurb: 'A, AAAA, CNAME, MX, NS, PTR, TXT: which one answers which question.', game: 'diner',
    scenes: () => {
      const row = (S, i, type, txt, cls = 'violet') => { S.chip('c' + type, 70, 70 + i * 44, type, cls); S.text('t' + type, 120, 75 + i * 44, txt, 'mono', 'start'); };
      return [
        { name: 'Addresses and nicknames', setup: S => S.text('hd', 320, 32, 'DNS records for shop.com', 'mono violet'), beats: [
          { say: `DNS stores ${D('records')}. Each type answers one question.`, run: () => {} },
          { say: `${D('A')}: the IPv4 address.`, run: S => row(S, 0, 'A', 'shop.com → 203.0.113.9') },
          { say: `${D('AAAA')}: the IPv6 address. Four As, longer address.`, run: S => row(S, 1, 'AAAA', 'shop.com → 2001:db8::9') },
          { say: `${D('CNAME')}: an alias, a nickname.`, run: S => row(S, 2, 'CNAME', 'www.shop.com → shop.com') }
        ],
        check: ck('Which record holds an IPv6 address?', 'AAAA', [['A', 'A holds IPv4.'], ['CNAME', 'CNAME is an alias.'], ['MX', 'MX is for email.']], 2) },
        { name: 'Mail, bosses, reverse, notes', setup: S => { S.text('hd', 320, 32, 'DNS records for shop.com', 'mono violet'); row(S, 0, 'A', 'shop.com → 203.0.113.9'); row(S, 1, 'AAAA', 'shop.com → 2001:db8::9'); row(S, 2, 'CNAME', 'www.shop.com → shop.com'); }, beats: [
          { say: `${D('MX')}: where email for the domain goes.`, run: S => row(S, 3, 'MX', 'mail for shop.com → mail.shop.com') },
          { say: `${D('NS')}: which server is in charge of the domain.`, run: S => row(S, 4, 'NS', 'ns1.host.net runs shop.com') },
          { say: `${D('PTR')}: reverse lookup, from IP back to name.`, run: S => row(S, 5, 'PTR', '203.0.113.9 → shop.com') },
          { say: `${D('TXT')}: extra info, often for security.`, run: S => row(S, 6, 'TXT', '"v=spf1 …" (anti-spam note)') }
        ],
        check: ck('Which record says where email for a domain goes?', 'MX', [['NS', 'NS says who’s in charge of the domain.'], ['PTR', 'PTR is a reverse lookup.'], ['TXT', 'TXT is extra info.']], 0) }
      ];
    },
    quiz: [
      mc('Which record type holds an IPv6 address?', 'AAAA', ['A', 'CNAME', 'PTR'], 'A is IPv4; AAAA is IPv6.'),
      mc('www.shop.com is just another name for shop.com. Which record?', 'CNAME', ['A', 'MX', 'NS'], 'CNAME = alias / nickname.'),
      mc('Which record tells the world where to deliver email?', 'MX', ['TXT', 'NS', 'AAAA'], 'MX = mail exchange.'),
      mc('You have an IP address and want the name. Which record?', 'PTR', ['A', 'CNAME', 'NS'], 'PTR is the reverse lookup.'),
      mc('Which record says which server is in charge of a domain?', 'NS', ['MX', 'PTR', 'A'], 'NS = name server.'),
      mc('Which record often holds security info, like anti-spam settings?', 'TXT', ['A', 'CNAME', 'PTR'], 'TXT is extra information, often used for security.')
    ] },

  { id: 'security', part: 2, title: 'Spoofing and defenses', blurb: 'Cache poisoning, then DNSSEC (prove it) vs DoH/DoT (hide it).', game: 'patrol',
    scenes: () => [
      { name: 'DNS spoofing', setup: S => { S.node('A', 90, 270, 'laptop', 'you'); S.node('N', 320, 270, 'dns', 'DNS server'); S.node('R', 555, 110, 'server', 'bank.com'); S.node('E', 555, 280, 'attacker', 'attacker'); S.link('AN', 'A', 'N'); S.link('NR', 'N', 'R'); S.link('NE', 'N', 'E'); S.text('rip', 555, 182, '198.51.100.7', 'mono cyan'); }, beats: [
        { say: 'You look up bank.com.', run: S => S.packet('A', 'N', 'bank.com?', 'violet', { dy: -26 }) },
        { say: 'An attacker races in with a fake answer.', run: S => S.packet('E', 'N', '6.6.6.6', 'coral') },
        { say: 'The DNS server believes it and saves it.', run: S => S.badge('N', 'bank.com = 6.6.6.6', 'coral') },
        { say: 'Now it hands that fake IP to everyone who asks.', run: S => S.packet('N', 'A', '6.6.6.6', 'coral', { dy: 26 }) },
        { say: 'You land on a look-alike site.', run: S => { S.lit('E'); S.badge('A', 'looks real…', 'coral'); } },
        { say: `That’s ${X('DNS spoofing')}, or cache poisoning.`, run: S => S.text('sp', 320, 360, 'DNS spoofing = cache poisoning', 'coral') }
      ],
      check: ck('In DNS spoofing, what does the attacker do?', 'Tricks a DNS server into saving a fake IP for a real site', [['Reads which sites you visit', 'That’s snooping. Spoofing plants a fake answer.'], ['Floods the server with traffic', 'That’s a denial-of-service attack.'], ['Steals your MAC address', 'Spoofing here is about fake DNS answers.']], 1) },
      { name: 'DNSSEC: prove it', setup: S => { S.node('A', 90, 270, 'laptop', 'you'); S.node('N', 320, 270, 'dns', 'DNS server'); S.node('R', 555, 110, 'server', 'bank.com'); S.node('E', 555, 280, 'attacker', 'attacker'); S.link('AN', 'A', 'N'); S.link('NR', 'N', 'R'); S.link('NE', 'N', 'E'); }, beats: [
        { say: `${K('DNSSEC')} adds a digital signature to answers.`, run: () => {} },
        { say: 'Like a wax seal only the real owner can make.', run: S => S.badge('R', 'signed ✓', 'mint') },
        { say: 'A real answer: the seal checks out.', run: S => S.packet('R', 'N', '198.51.100.7 ✓', 'mint') },
        { say: 'A fake answer has no valid seal. Rejected!', run: async S => { await S.packet('E', 'N', '6.6.6.6', 'coral', { lose: .85 }); S.badge('N', 'fake: rejected', 'mint'); } },
        { say: `DNSSEC = ${K('SECURITY')}. It proves the answer is real.`, run: S => S.text('sec', 320, 360, 'DNSSEC proves it’s authentic', 'mint') }
      ],
      check: ck('What does DNSSEC protect?', 'Authenticity: it proves the answer really came from the owner', [['Privacy: it hides the sites you visit', 'That’s DoH and DoT.'], ['Speed: it makes DNS faster', 'Signatures don’t speed anything up.'], ['Port numbers', 'Ports aren’t part of this.']], 1) },
      { name: 'DoH and DoT: hide it', setup: S => { S.node('A', 90, 270, 'laptop', 'you'); S.node('N', 545, 270, 'dns', 'DNS server'); S.node('W', 318, 100, 'eye', 'snooper'); S.link('AN', 'A', 'N'); }, beats: [
        { say: 'Normal DNS questions travel in plain view.', run: S => S.packet('A', 'N', 'bank.com?', 'violet') },
        { say: 'Anyone watching can see which sites you look up.', run: S => { S.lit('W'); S.badge('W', 'bank.com, huh?', 'coral'); } },
        { say: `${D('DoH')} and ${D('DoT')} encrypt your DNS questions.`, run: S => { S.lit(); S.unbadge('W'); S.linkCls('AN', 'tunnel'); } },
        { say: 'DoH hides them inside normal web traffic (HTTPS).', run: S => S.text('doh', 318, 330, 'DoH → inside HTTPS, port 443', 'mono violet') },
        { say: 'DoT uses its own secure port.', run: S => S.text('dot', 318, 356, 'DoT → its own port, 853', 'mono violet') },
        { say: 'The snooper only sees scrambled data.', run: async S => { await S.packet('A', 'N', '#$@!%&', 'violet'); S.badge('W', '???', 'coral'); } },
        { say: `DoH/DoT = ${D('PRIVACY')}. Seal proves. Tunnel hides.`, run: S => S.text('sum', 318, 200, 'seal proves · tunnel hides', 'big') }
      ],
      check: ck('Which one hides the sites you look up from people on your network?', 'DoH / DoT', [['DNSSEC', 'DNSSEC proves answers are real, but anyone can still read them.'], ['A HOSTS file', 'A HOSTS file doesn’t encrypt anything.'], ['An A record', 'That’s just an IPv4 address.']], 2) }
    ],
    quiz: [
      mc('You type bank.com but land on a look-alike. The DNS server had saved a fake IP. This is…', 'DNS spoofing (cache poisoning)', ['DNSSEC', 'Flow control', 'A CNAME record'], 'An attacker poisoned the DNS cache with a fake address.'),
      mc('DNSSEC provides…', 'authenticity: a digital signature proves the data is real', ['privacy: it hides which sites you visit', 'speed: it caches answers', 'a backup HOSTS file'], 'DNSSEC is about SECURITY / authenticity.'),
      mc('DoH and DoT provide…', 'privacy: they encrypt DNS so others can’t see your lookups', ['authenticity: they prove answers are real', 'faster downloads', 'reverse lookups'], 'DoH/DoT are about PRIVACY.'),
      mc('Which one sends DNS inside normal web traffic?', 'DoH (DNS over HTTPS)', ['DoT (DNS over TLS)', 'DNSSEC', 'PTR'], 'DoH rides in HTTPS; DoT uses its own secure port.'),
      mc('Which statement is right?', 'DNSSEC proves answers are real; DoH/DoT hide what you look up', ['DNSSEC hides lookups; DoH proves answers', 'Both only make DNS faster', 'Both replace DNS with HOSTS files'], 'Seal proves, tunnel hides.')
    ] }
];

/* the self-check list from the study guide, and which level teaches each item */
const CHECKLIST = [
  { t: 'Name the main jobs of the Transport Layer.', lv: 'transport' },
  { t: 'Put the three TCP handshake packets in order and say what each one means.', lv: 'handshake' },
  { t: 'Explain why online games and video streaming use UDP.', lv: 'tcpudp' },
  { t: 'Explain what a port number does.', lv: 'ports' },
  { t: 'Explain what it means in Wireshark when SYN packets get no reply.', lv: 'handshake' },
  { t: 'Tell which Wireshark section you would use to find ports, and which shows raw hex.', lv: 'wireshark' },
  { t: 'Pick the correct DNS record for IPv6, an alias, or email delivery.', lv: 'records' },
  { t: 'Explain why HOSTS files cannot run the Internet.', lv: 'dns' },
  { t: 'Describe a DNS spoofing scenario.', lv: 'security' },
  { t: 'Explain the difference between DNSSEC (authenticity) and DoH/DoT (privacy).', lv: 'security' }
];

/* extra exam-only questions, phrased the way the exam asks: explain, apply, interpret */
const EXAM_EXTRA = [
  mc('A Wireshark capture shows 10.0.0.5 sending SYN to 10.0.0.9 three times. Nothing comes back. What should you conclude?', 'The server never replied, so the handshake and connection never happened', ['The connection was made and data is flowing', 'The client is using UDP', 'The packets were encrypted with DoT'], 'No SYN-ACK = no handshake: the server is down, unreachable, or a firewall is dropping it.'),
  mc('A video call keeps playing through brief glitches instead of freezing. Which protocol is it most likely using?', 'UDP', ['TCP', 'DNS', 'ARP'], 'UDP skips lost packets so real-time audio and video keep going.'),
  mc('Your phone needs the IPv6 address of a site. Which record does it ask for?', 'AAAA', ['A', 'MX', 'TXT'], 'AAAA = IPv6.'),
  mc('Why would a network admin edit a computer’s HOSTS file?', 'To force one device to use a specific IP for a name', ['To update every computer on the Internet', 'To encrypt DNS traffic', 'To speed up TCP'], 'HOSTS is local to one device, which is also why it can’t scale.'),
  mc('In the TCP handshake, what does the final ACK from the client mean?', '“Got your SYN-ACK; we’re connected.”', ['“I’m finished.”', '“Please resend.”', '“What’s your IP address?”'], 'The client’s ACK completes the handshake.'),
  mc('Which Transport Layer job makes sure data reaches the right application on a device?', 'Port numbers', ['Flow control', 'Segmentation', 'Name resolution'], 'Each application type has its own port number.'),
  mc('An attacker on the café Wi-Fi wants to see which websites you look up. Which defense stops that?', 'DoH or DoT', ['DNSSEC', 'A CNAME record', 'Flow control'], 'Encryption hides the lookups: that’s privacy.'),
  mc('An attacker sends fake DNS answers to a resolver. Which defense lets the resolver reject them?', 'DNSSEC', ['DoH', 'DoT', 'A bigger HOSTS file'], 'Digital signatures prove which answers are authentic.')
];

/* the short-answer builder: TCP vs UDP, row by row */
const COMPARE = {
  rows: ['Connection', 'Reliability / delivery checking', 'Speed', 'Example uses'],
  tcp: ['Connection oriented: sets up a connection first (handshake)', 'Checks every segment and resends anything missing', 'Slower, because of all the checking', 'File downloads, email, web pages'],
  udp: ['Connectionless: just sends, no setup', 'Doesn’t check that data arrives; lost packets are skipped', 'Fast and efficient', 'Online games, video calls, live streaming']
};
