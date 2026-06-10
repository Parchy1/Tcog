/* Repro driver: play many matches through the real UI in jsdom */
'use strict';
const path = require('path');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { ({ JSDOM } = require('/tmp/node_modules/jsdom')); }

(async () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    url: 'file://' + indexPath,
    virtualConsole: new (require('/tmp/node_modules/jsdom').VirtualConsole)().on('jsdomError', () => {}),
    beforeParse(window) {
      const store = {};
      const mock = {
        getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
        setItem: (k, v) => { store[String(k)] = String(v); },
        removeItem: k => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        key: i => Object.keys(store)[i] || null,
        get length() { return Object.keys(store).length; }
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, value: mock });
    }
  });
  const w = dom.window;
  await new Promise(res => { w.addEventListener('load', res); setTimeout(res, 3000); });
  await new Promise(res => setTimeout(res, 300));

  w.UI.pickClub('NEW');
  w.document.getElementById('su-name').value = 'Repro';
  w.UI.confirmNewGame();
  console.log('calendar length:', w.G.calendar.length);
  console.log('first entries:', JSON.stringify(w.G.calendar.slice(0, 8)));

  for (let match = 1; match <= 10; match++) {
    if (!w.G.curFix) { console.log('!! SEASON ENDED after ' + (match - 1) + ' matches. ci=' + w.G.ci); break; }
    const fix = w.G.curFix;
    console.log('match ' + match + ': ci=' + w.G.ci + ' ei=' + fix.ei + ' comp=' + fix.comp +
      ' round=' + (fix.round || fix.phase) + ' opp=' + fix.opp + ' day=' + fix.day);
    w.UI.nav('lineup');
    w.UI.autoFill();
    if (!w.G.xi.every(id => id !== null)) { console.log('!! XI incomplete'); break; }
    w.UI.preMatch();
    if (w.UI.page !== 'prepress') { console.log('!! preMatch blocked, page=' + w.UI.page); break; }
    w.UI.skipPress();
    await new Promise(res => setTimeout(res, 150));
    // pause the visual loop and drive the engine directly
    w.UI.paused = true;
    while (w.M.min < 90) {
      const evs = w.matchMinute();
      if (w.M.min === 45 && !w.UI.htShown) { w.UI.htShown = true; }
    }
    w.UI.fullTime();
    await new Promise(res => setTimeout(res, 50));
    console.log('  result: ' + w.M.score[0] + '-' + w.M.score[1] + ' ' + w.M.out + '  page=' + w.UI.page);
    w.UI.afterMatch();
    await new Promise(res => setTimeout(res, 50));
    console.log('  after: page=' + w.UI.page + ' ci=' + w.G.ci + ' nextFix=' + (w.G.curFix ? w.G.curFix.comp + ' vs ' + w.G.curFix.opp : 'NONE'));
    if (w.UI.page === 'end') { console.log('!! SEASON END SCREEN after ' + match + ' matches'); break; }
  }
  process.exit(0);
})().catch(e => { console.error('FATAL: ' + e.stack); process.exit(1); });
