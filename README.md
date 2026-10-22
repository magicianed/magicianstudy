# magicianstudy

Three browser study games, hosted with GitHub Pages. No build step, no dependencies, no server: plain HTML, CSS and JavaScript.

**Live site:** https://magicianed.github.io/magicianstudy/

| Game | Subject | Path |
| --- | --- | --- |
| **Algebraic** | Algebra 2 Honors, Units 1 and 2 | [`/algebra/`](algebra/) |
| **Periodic Study** | Chemistry, the periodic table | [`/chemistry/`](chemistry/) |
| **Handshake** | Cybersecurity, Unit 4: Layer 4 protocols + DNS | [`/network/`](network/) |

## Algebraic

Every question from the Unit 1 and Unit 2 review sheets, rebuilt as levels you work through step by step instead of reading. Wrong answers get a specific explanation of the mistake, not just "try again."

**Unit 1** — six chapters ordered so each one sets up the next: piecewise functions, composition, inverses, transformations, sequences, and series/sums. Covers review questions 1–37.

**Unit 2** — switch between **Learn** and **Practice** at the top of the Unit 2 page.

- **Learn**: eight chapters covering the four forms (piecewise, standard, vertex, intercept), graph behavior, reading values off a graph, graph-to-rule, rule-to-graph, and all of quadratics.
- **Practice: master the quiz**: the four questions from Quiz 2.1–2.2 (vertex form, intercept form, standard form, and a three-piece piecewise function), learned one at a time. Each question has four steps:
  1. **Watch**: a slow walk-through of that exact question in the style of Create's Ponder scenes. One short line at a time in big text, while the graph animates, the table fills in, and an arrow points at each part.
  2. **Together**: the exact question, interactive, with help at every step.
  3. **Twin**: the same kind of question with new numbers and lighter help.
  4. **Prove it**: new numbers, no hints, and every part must be right. Parts you get right are kept. If you miss some, only those come back, on new numbers, with the rest filled in for you.

  The walk-throughs stop for **quick checks**: you have to answer before they continue, and "Show me again" rewinds to where that idea was taught. Every question step has two help buttons. **? See an example** plays the same step solved on a different problem. **Where was this taught?** replays that part of the original walk-through. Both open over your question, so closing them puts you right back where you were. In "Prove it" these buttons only appear after a mistake.

  After that comes the **final quiz** (all four real questions, no hints, every part right; missed parts come back on their own), then endless **keep sharp** twins. Domains, ranges and intervals are typed with real brackets, like on paper. When you graph, your table sits right under the point box and each row ticks off as you plot it. Coordinates are shown as decimals (2.5, not 5/2).

Every question also has a **Skip step** button that fills in the rest of that step and moves on. A skipped step counts as done.

Also includes:
- **Practice test** — 16 questions matching the real test length and topic mix, no hints, with a report that links each miss to the level that teaches it
- **Speed rounds** for each unit
- **Cheat sheet** drawer with every rule
- XP, streaks and stars, saved per device

## Periodic Study

Learn the first 36 elements and their symbols four at a time with AsapSCIENCE's periodic table song (2018 update). Each section plays just its part of the song, then ends in a short test that needs 100% to unlock the next four:

- two questions on each new element, one of them always about its symbol
- one fill-in per earlier section: type the symbol and name of all four (spelling is very forgiving)
- a quick click-the-element round on a real periodic table

Returning learners can open any section and skip ahead past what they already know.

The clip timings come from the video's English captions plus YouTube's word-timed auto captions, and they skip the chorus. If a clip ever feels off, the **Fix timing** button in the player lets you nudge each element; your changes are saved in that browser.

## Handshake

Follows the Unit 4 study guide (Form A): Part I is the Transport Layer, Part II is DNS. Nine stops, each with three tabs:

1. **Watch**: a Ponder-style walk-through on an animated network. Short lines, packets actually moving, quick checks you must answer to go on.
2. **Play**: a game built around that one idea.
3. **Quiz**: exam-style questions with an explanation for every answer. Pass at 80%; "Fix the ones I missed" only re-asks your misses.

| Stop | Game |
| --- | --- |
| The delivery service (segmentation, error checking) | **Packet Puzzle**: rebuild scrambled segments by sequence number, bin damaged ones, request resends |
| Flow control | **Pour Control**: set the send rate to keep the receiver's buffer fed without overflowing |
| Port numbers | **Port Authority**: route packets off a conveyor to the right app door; the doors lose their numbers halfway |
| TCP vs UDP | **Dispatch**: send each job by TCP truck or UDP drone, then watch it play out on a lossy network |
| The handshake | **Handshake Hero**: rhythm game answering SYN / SYN-ACK / ACK / FIN on the beat, as client and server |
| Wireshark | **Packet Detective**: seven cases in a working mock of Wireshark's three panes |
| DNS and HOSTS | **HOSTS Panic**: keep every device's HOSTS file current as sites move and devices multiply, then switch on DNS |
| Record types | **DNS Diner**: serve A, AAAA, CNAME, MX, NS, PTR and TXT to impatient customers |
| Spoofing and defenses | **Poison Patrol**: Seal (DNSSEC) the forged answers, Tunnel (DoH/DoT) the snoopers |

Then the **final exam**: 22 mixed questions and the TCP vs UDP short answer (build the comparison table, then write it with a live checklist of what a full-credit answer needs). The study guide's self-check list ticks itself off as you pass each stop.

## Running locally

Clone the repo and open `index.html` in any browser. That's it.

```
git clone https://github.com/magicianed/magicianstudy.git
cd magicianstudy
open index.html
```

## Notes

- Progress is stored in the browser's `localStorage`, so it's per-device and per-browser. Clearing site data resets it.
- `.nojekyll` is present so GitHub Pages serves the files exactly as they are.
- Fonts load from Google Fonts and Periodic Study streams the song from YouTube; everything else ships in the repo.
- Handshake's files use `?v=N` stamps; bump them when you change a file so browsers skip the cached copy.
