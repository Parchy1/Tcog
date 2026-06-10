/* DOM smoke test — boots the real UI in jsdom, starts a career,
   visits every page and plays one full match through the UI loop.
   Run: node test/dom.js  (requires jsdom installed, e.g. in /tmp) */
'use strict';
const path = require('path');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { ({ JSDOM } = require('/tmp/node_modules/jsdom')); }

let failures = 0;
function assert(cond, msg) { if (!cond) { failures++; console.error('  ✗ FAIL: ' + msg); } else console.log('  ✓ ' + msg); }

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

  assert(typeof w.UI === 'object', 'UI loaded');
  assert(typeof w.newGame === 'function', 'core loaded');
  assert(w.document.querySelectorAll('.club-card').length === 20, 'setup shows 20 club cards');

  w.UI.pickClub('NEW');
  w.document.getElementById('su-name').value = 'Smoke Tester';
  w.UI.confirmNewGame();
  assert(w.G && w.G.club === 'NEW', 'new game started');
  assert(w.document.getElementById('app').style.display === 'grid', 'app visible');
  assert(w.G.curFix && w.G.curFix.comp === 'PL', 'first fixture is a PL match');

  // visit every page without exceptions
  ['squad', 'tactics', 'training', 'transfers', 'fixtures', 'table', 'europe', 'cups', 'inbox', 'hub'].forEach(p => {
    try { w.UI.nav(p); assert(true, 'page renders: ' + p); }
    catch (e) { assert(false, 'page ' + p + ' threw: ' + e.message); }
  });
  // squad sub-tabs
  ['stats', 'injuries', 'contracts', 'players'].forEach(t => {
    try { w.UI.nav('squad'); w.UI.sqTab(t); assert(true, 'squad tab: ' + t); }
    catch (e) { assert(false, 'squad tab ' + t + ' threw: ' + e.message); }
  });
  // transfer tabs + a negotiation
  try {
    w.UI.nav('transfers');
    w.UI.trTab('free'); w.UI.trTab('sell'); w.UI.trTab('buy');
    const target = Object.values(w.PLAYERS).find(p => p.club && p.club !== 'NEW' && p.val <= 20);
    w.UI.playerModal(target.id);
    w.UI.openNegotiation(target.id);
    assert(w.document.getElementById('mod-neg').classList.contains('on'), 'negotiation modal opens (window open)');
    w.document.getElementById('neg-offer').value = String(Math.ceil(target.val * 1.6));
    const budgetBefore = w.G.budget;
    w.UI.submitOffer();
    assert(w.G.budget < budgetBefore && target.club === 'NEW', 'signing completes, budget spent');
  } catch (e) { assert(false, 'transfer flow threw: ' + e.message); }

  // lineup → press → match
  w.UI.nav('lineup');
  w.UI.autoFill();
  assert(w.G.xi.every(id => id !== null), 'XI complete');
  w.UI.preMatch();
  assert(w.UI.page === 'prepress', 'press conference shown');
  const firstOpt = w.document.querySelector('#pp-questions .press-opt');
  if (firstOpt) firstOpt.click();
  w.UI.skipPress();
  assert(w.UI.page === 'match', 'match page shown');
  await new Promise(res => setTimeout(res, 300));
  assert(w.M && !w.M.finished, 'match state live');
  w.UI.setSpeed(8);

  // wait for half time, resume, wait for result
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await new Promise(res => setTimeout(res, 250));
    if (w.UI.page === 'halftime') {
      const talk = w.document.querySelector('#ht-talks button');
      if (talk) talk.click();
      w.UI.resumeSecondHalf();
    }
    if (w.UI.page === 'result') break;
    if (w.M && w.M.finished) break;
  }
  assert(w.M && w.M.min >= 90, 'match reached 90 minutes (min=' + (w.M && w.M.min) + ')');
  assert(w.M.finished, 'match finalized');
  assert(w.UI.page === 'result', 'result page shown');
  assert(w.G.userResults.length >= 1, 'result recorded');
  assert(w.G.table.NEW.p === 1, 'league table updated for user club');
  const others = Object.keys(w.G.table).filter(k => k !== 'NEW');
  assert(others.every(k => w.G.table[k].p === 1), 'whole round simulated');

  // continue to next fixture
  w.UI.afterMatch();
  assert(w.UI.page === 'hub', 'back at hub');
  assert(w.G.curFix, 'next fixture queued: ' + (w.G.curFix && w.G.curFix.comp + ' vs ' + w.G.curFix.opp));

  // save/load via UI
  w.UI.quitToMenu();
  assert(w.document.getElementById('pg-setup').style.display === 'block', 'back at menu');
  w.UI.resumeGame();
  assert(w.G && w.G.userResults.length >= 1, 'resume restores state');

  console.log(failures === 0 ? '\nDOM SMOKE TEST PASSED ✓' : '\n' + failures + ' FAILURES ✗');
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL: ' + e.stack); process.exit(1); });
