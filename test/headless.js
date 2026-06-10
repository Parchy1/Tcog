/* Headless season simulator — validates the game logic without a browser.
   Run: node test/headless.js [seasons] [clubKey] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Date, JSON, Object, Array, Number, String };
vm.createContext(ctx);
['util.js', 'data.js', 'core.js', 'sim.js', 'match.js'].forEach(f => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
});

const seasons = Number(process.argv[2] || 2);
const clubKey = process.argv[3] || 'NEW';
let failures = 0;
function assert(cond, msg) {
  if (!cond) { failures++; console.error('  ✗ FAIL: ' + msg); }
}

vm.runInContext('newGame("' + clubKey + '", "Test Manager")', ctx);
const G = () => vm.runInContext('G', ctx);
const run = (code) => vm.runInContext(code, ctx);

console.log('Managing: ' + run('userClub().full') + ' | squad size: ' + run('userSquad().length'));
assert(run('userSquad().length') >= 20, 'squad has at least 20 players');
assert(run('Object.values(PLAYERS).length') > 400, 'world has 400+ players, got ' + run('Object.values(PLAYERS).length'));
assert(run('G.calendar.length') > 38, 'calendar has cup/euro entries');
// every PL round must have 10 matches covering all 20 clubs
assert(run('G.rounds.length') === 38, '38 PL rounds');
assert(run('G.rounds.every(r => r.length === 10)'), 'each round has 10 matches');
assert(run('G.rounds.every(r => new Set(r.flatMap(m=>[m.h,m.a])).size === 20)'), 'each round covers all 20 clubs');
// each pairing appears exactly twice (home & away)
assert(run(`(function(){
  const seen = {};
  G.rounds.forEach(r => r.forEach(m => { const k = m.h + '>' + m.a; seen[k] = (seen[k]||0)+1; }));
  return Object.values(seen).every(v => v === 1) && Object.keys(seen).length === 380;
})()`), 'full double round-robin (380 unique fixtures)');

for (let s = 1; s <= seasons; s++) {
  let matches = 0, goalsFor = 0, goalsAgainst = 0;
  const t0 = Date.now();
  for (;;) {
    const fix = run('advanceWorld()');
    if (!fix) break;
    run('autoPickXI()');
    assert(run('G.xi.every(id => id !== null)'), 'auto-picked XI is complete (match ' + matches + ', comp ' + fix.comp + ')');
    const res = run('simulateFullMatch(G.curFix)');
    matches++;
    goalsFor += run('G.userResults[G.userResults.length-1].hg');
    goalsAgainst += run('G.userResults[G.userResults.length-1].ag');
    assert(['W', 'D', 'L'].indexOf(res.out) >= 0, 'valid result');
    if (matches > 80) { assert(false, 'season never ends (runaway)'); break; }
  }
  const pos = run('leaguePos()');
  const tbl = run('tableSorted()');
  assert(tbl.every(r => r.p === 38), 'every club played 38, got ' + tbl.map(r => r.p).join(','));
  const totalPts = tbl.reduce((x, r) => x + r.pts, 0);
  assert(totalPts >= 380 * 2 && totalPts <= 380 * 3, 'sane total points: ' + totalPts);
  assert(run('G.plW + G.plD + G.plL') === 38, 'user played 38 PL games');
  assert(!Number.isNaN(pos) && pos >= 1 && pos <= 20, 'valid league position');
  // no NaN stats anywhere
  assert(run('Object.values(PLAYERS).every(p => Number.isFinite(p.r) && Number.isFinite(p.fit) && Number.isFinite(p.val))'), 'no NaN player stats');
  const boot = run('seasonAwards().goldenBoot');
  console.log('Season ' + s + ': finished ' + pos + (pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th') +
    ' | ' + matches + ' matches | GF ' + goalsFor + ' GA ' + goalsAgainst +
    ' | PL pts ' + run('G.pts') +
    ' | budget £' + run('G.budget') + 'm' +
    ' | board ' + run('G.boardConf') +
    (boot ? ' | Golden Boot: ' + boot.n + ' (' + boot.plG + ')' : '') +
    ' | ' + (Date.now() - t0) + 'ms');
  const top3 = tbl.slice(0, 3).map(r => r.name + ' ' + r.pts).join(', ');
  console.log('  Top 3: ' + top3 + ' | Champion GD: ' + (tbl[0].gf - tbl[0].ga));
  if (run('G.sacked')) { console.log('  (sacked — stopping)'); break; }
  if (s < seasons) {
    const end = run('processSeasonEnd()');
    run('startNewSeason(' + JSON.stringify(end.newEuro) + ')');
    assert(run('G.season') === s + 1, 'season rolled over');
    assert(run('tableSorted().every(r => r.p === 0)'), 'table reset');
  }
}
// save round-trip sanity (uses a stub localStorage)
run('var _store={}; var localStorage = {setItem:(k,v)=>{_store[k]=v},getItem:k=>_store[k]||null,removeItem:k=>{delete _store[k]}};');
run('saveGame()');
const beforeSeason = run('G.season');
run('G = null; PLAYERS = {};');
assert(run('loadGame()') === true, 'save/load round-trip works');
assert(run('G.season') === beforeSeason, 'loaded state matches');

console.log(failures === 0 ? '\nALL CHECKS PASSED ✓' : '\n' + failures + ' FAILURES ✗');
process.exit(failures === 0 ? 0 : 1);
