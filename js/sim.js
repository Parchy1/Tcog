/* ── sim.js — AI world simulation: league, Europe, transfers, season end ── */
'use strict';

/* simulate one AI-vs-AI match by effective strength; returns [hg, ag] */
function simScore(hs, as, homeAdv) {
  const adv = homeAdv === undefined ? 1.12 : homeAdv;
  const ph = clamp(0.0155 * Math.pow(hs / as, 1.7) * adv, 0.003, 0.09);
  const pa = clamp(0.0155 * Math.pow(as / hs, 1.7) * (2 - adv), 0.003, 0.09);
  let hg = 0, ag = 0;
  for (let m = 0; m < 90; m++) { if (Math.random() < ph) hg++; if (Math.random() < pa) ag++; }
  return [hg, ag];
}

function applyTable(tbl, h, a, hg, ag) {
  const ht = tbl[h], at = tbl[a];
  if (!ht || !at) return;
  ht.p++; at.p++; ht.gf += hg; ht.ga += ag; at.gf += ag; at.ga += hg;
  if (hg > ag) { ht.w++; ht.pts += 3; at.l++; }
  else if (hg < ag) { at.w++; at.pts += 3; ht.l++; }
  else { ht.d++; at.d++; ht.pts++; at.pts++; }
}

/* credit goals to plausible scorers in an AI club's squad (for Golden Boot) */
function creditAIScorers(key, goals) {
  if (!goals) return;
  const atk = squadOf(key).filter(p => ['ST', 'LW', 'RW', 'AM', 'CM'].indexOf(p.p) >= 0 && !p.injured);
  if (!atk.length) return;
  const weights = atk.map(p => Math.pow(Math.max(20, p.sho), 2.4));
  const total = weights.reduce((s, w) => s + w, 0);
  for (let g = 0; g < goals; g++) {
    let r = Math.random() * total;
    for (let i = 0; i < atk.length; i++) { r -= weights[i]; if (r <= 0) { atk[i].g++; atk[i].plG++; break; } }
  }
}

/* simulate every match of a PL round except the user's */
function simPLRound(round, userResult) {
  const matches = G.rounds[round - 1];
  matches.forEach(m => {
    if (m.h === G.club || m.a === G.club) {
      if (userResult) applyTable(G.table, m.h, m.a, m.h === G.club ? userResult[0] : userResult[1], m.h === G.club ? userResult[1] : userResult[0]);
      return;
    }
    const sc = simScore(clubEffStr(m.h), clubEffStr(m.a));
    applyTable(G.table, m.h, m.a, sc[0], sc[1]);
    creditAIScorers(m.h, sc[0]); creditAIScorers(m.a, sc[1]);
    G.results.push({ round: round, h: m.h, a: m.a, hg: sc[0], ag: sc[1] });
  });
}

function tableSorted() {
  return CLUBS.map(c => Object.assign({ key: c.key, name: c.name }, G.table[c.key]))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}
function leaguePos() {
  const s = tableSorted();
  for (let i = 0; i < s.length; i++) if (s[i].key === G.club) return i + 1;
  return 0;
}

/* simulate the rest of a European matchday (everyone except the user) */
function simEuroMD(includeUser, userResult, userOpp, userHome) {
  if (!G.euro) return;
  const me = userClub().name;
  let names = Object.keys(G.euro.table).filter(n => n !== me);
  if (includeUser && userOpp) {
    names = names.filter(n => n !== userOpp);
    applyTable(G.euro.table, userHome ? me : userOpp, userHome ? userOpp : me,
      userHome ? userResult[0] : userResult[1], userHome ? userResult[1] : userResult[0]);
  }
  const pool = shuffle(names);
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const sc = simScore(euroStr(pool[i]), euroStr(pool[i + 1]));
    applyTable(G.euro.table, pool[i], pool[i + 1], sc[0], sc[1]);
  }
}

/* ── weekly squad upkeep (run when advancing to the next fixture) ── */
function weeklyTick(days) {
  const playedSet = {};
  (G.lastLineup || []).forEach(id => { playedSet[id] = true; });
  const trainFit = G.training === 'fitness' ? 8 : 0;
  userSquad().forEach(p => {
    // injuries heal
    if (p.injured) {
      p.injD -= days;
      if (p.injD <= 0) { p.injured = false; p.injT = null; p.fit = rnd(58, 75); addInbox('✅', p.n + ' is back in training.', 'return'); }
      return;
    }
    // fitness recovery scaled by rest days
    let rec = Math.round(days * (playedSet[p.id] ? 4.5 : 6.5));
    if (p.age >= 33) rec = Math.round(rec * 0.85);
    if (p.r >= 86) rec = Math.round(rec * 1.08);
    rec += trainFit;
    p.fit = clamp(p.fit + rec, 0, 100);
    // morale drifts to baseline
    p.morale = clamp(Math.round(p.morale + (70 - p.morale) * 0.06), 5, 99);
    // individual training focus: small chance of growth
    if (G.trainFocus.indexOf(p.id) >= 0 && p.r < p.pot && Math.random() < 0.10) {
      p.r++; p.val = valueOf(p.r, p.age, p.pot);
      addInbox('📈', p.n + ' is developing well in training — rating now ' + p.r + '.', 'training');
    }
  });
  // small chance of a training-ground injury
  if (Math.random() < 0.06) {
    const fitPl = userSquad().filter(p => !p.injured);
    if (fitPl.length) injurePlayer(pick(fitPl), 'in training');
  }
}

function injurePlayer(p, contextLabel) {
  if (p.injured) return;
  const t = pick(INJ_TYPES);
  p.injured = true; p.injT = t.n; p.injD = rnd(t.min, t.max) * 7;
  p.fit = Math.max(0, p.fit - rnd(20, 40));
  p.morale = Math.max(20, p.morale - 10);
  addInbox('🚑', 'Injury' + (contextLabel ? ' ' + contextLabel : '') + ': ' + p.n + ' — ' + t.n + ' (' + Math.ceil(p.injD / 7) + 'w out)', 'injury');
}

/* ── AI transfer activity during windows ─────────────────────── */
function runAITransfers() {
  if (G.aiWindowDone || !inWindow()) return;
  G.aiWindowDone = true;
  // foreign stars move between big clubs
  const stars = Object.values(PLAYERS).filter(p => p.foreign && !p._moved);
  shuffle(stars).slice(0, rnd(1, 3)).forEach(p => {
    const buyers = ['Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Inter Milan', 'Juventus'].filter(c => c !== p.clubName);
    p._moved = true; const to = pick(buyers);
    addInbox('💰', to + ' sign ' + p.n + ' from ' + p.clubName + ' for ' + money(Math.round(p.val * rndf(0.9, 1.3))) + '.', 'transfer');
    p.clubName = to;
  });
  // PL clubs trade among themselves
  for (let i = 0; i < rnd(1, 2); i++) {
    const sellers = CLUBS.filter(c => c.key !== G.club);
    const from = pick(sellers);
    const cands = squadOf(from.key).filter(p => p.r >= 78 && p.r <= 88);
    if (!cands.length) continue;
    const p = pick(cands);
    const to = pick(CLUBS.filter(c => c.key !== from.key && c.key !== G.club && c.str >= from.str - 6));
    p.club = to.key;
    addInbox('🔁', to.name + ' sign ' + p.n + ' from ' + from.name + ' for ' + money(Math.round(p.val * rndf(0.95, 1.25))) + '.', 'transfer');
  }
  // maybe an incoming bid for one of the user's players
  if (Math.random() < 0.45) generateIncomingBid();
}

function generateIncomingBid() {
  const targets = userSquad().filter(p => p.val >= 10 && !p.injured);
  if (!targets.length) return;
  const weights = targets.map(p => (p.listed ? 4 : 1) * (p.contract <= 1 ? 2 : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total, target = targets[0];
  for (let i = 0; i < targets.length; i++) { r -= weights[i]; if (r <= 0) { target = targets[i]; break; } }
  const richClubs = ['Real Madrid', 'Barcelona', 'PSG', 'Bayern Munich', 'Al-Hilal', 'Al-Nassr'].concat(
    CLUBS.filter(c => c.key !== G.club && c.bud >= 90).map(c => c.name));
  const mult = target.listed ? rndf(0.95, 1.2) : rndf(1.0, 1.45);
  G.pendingOffer = { pid: target.id, club: pick(richClubs), amt: Math.round(target.val * mult) };
  addInbox('🔥', G.pendingOffer.club + ' bid ' + money(G.pendingOffer.amt) + ' for ' + target.n + '!', 'bid');
}

/* ── board confidence ────────────────────────────────────────── */
function boardTargetPos() { return EXP_POS[userClub().exp] || 10; }
function updateBoardAfterMatch(comp, out) {
  let d = 0;
  if (comp === 'PL') d = out === 'W' ? 4 : out === 'D' ? 1 : -5;
  else if (comp === 'FA' || comp === 'LC') d = out === 'W' ? 2 : out === 'D' ? 0 : -2;
  else d = out === 'W' ? 3 : out === 'D' ? 1 : -2;
  // weigh in current league position vs expectation
  const pos = leaguePos(), tgt = boardTargetPos();
  if (G.table[G.club].p >= 6) d += pos <= tgt ? 1 : -1;
  G.boardConf = clamp(G.boardConf + d, 0, 100);
  if (G.boardConf <= 0) G.sacked = true;
  else if (G.boardConf < 25 && Math.random() < 0.25) addInbox('⚠️', 'The board is losing patience. Results must improve immediately.', 'board');
}

/* ── season end ──────────────────────────────────────────────── */
function seasonAwards() {
  const all = Object.values(PLAYERS).filter(p => p.club);
  const boot = all.slice().sort((a, b) => b.plG - a.plG)[0];
  const mine = userSquad().filter(p => p.apps > 0);
  const potySorted = mine.slice().sort((a, b) => (b.rsum / Math.max(1, b.apps)) - (a.rsum / Math.max(1, a.apps)));
  return {
    goldenBoot: boot && boot.plG > 0 ? boot : null,
    clubPOTY: potySorted[0] || null,
    clubTopScorer: mine.slice().sort((a, b) => b.g - a.g)[0] || null
  };
}

function developSquads() {
  Object.values(PLAYERS).forEach(p => {
    p.age++;
    const isMine = p.club === G.club;
    const mins = isMine ? p.apps : 25; // assume AI players play
    if (p.age <= 23 && p.r < p.pot) {
      let gain = rnd(1, 3);
      if (mins >= 20) gain++;
      if (isMine && G.trainFocus.indexOf(p.id) >= 0) gain++;
      p.r = Math.min(p.pot, p.r + gain);
    } else if (p.age <= 27 && p.r < p.pot && Math.random() < 0.5) {
      p.r = Math.min(p.pot, p.r + 1);
    } else if (p.age >= 31) {
      const drop = p.age >= 34 ? rnd(2, 4) : rnd(1, 2);
      p.r = Math.max(50, p.r - drop);
      p.pac = Math.max(20, p.pac - drop);
      p.phy = Math.max(30, p.phy - 1);
    }
    p.val = p.free ? 0 : valueOf(p.r, p.age, p.pot);
    if (p.contract > 0) p.contract--;
    // reset season stats
    p.g = 0; p.a = 0; p.plG = 0; p.apps = 0; p.rsum = 0; p.yel = 0; p.susp = 0;
    p.fit = 100; p.injured = false; p.injD = 0; p.injT = null;
    if (p.loan) { p.loan = false; if (p.age <= 23 && p.r < p.pot) p.r = Math.min(p.pot, p.r + 1); }
  });
  // expire AI contracts silently (renew), drop retired AI players, top up squads
  Object.values(PLAYERS).forEach(p => {
    if (p.club !== G.club && p.contract <= 0) p.contract = rnd(2, 4);
    if (p.age >= 38 || (p.age >= 35 && p.r < 62)) {
      if (p.club === G.club) addInbox('👋', p.n + ' has retired from football.', 'retire');
      delete PLAYERS[p.id];
    }
  });
}

/* fill any club back up to the squad template with academy graduates */
function topUpSquads() {
  CLUBS.forEach(c => {
    const squad = squadOf(c.key);
    Object.keys(SQUAD_TEMPLATE).forEach(pos => {
      const have = squad.filter(p => p.p === pos).length;
      for (let i = have; i < SQUAD_TEMPLATE[pos]; i++) {
        const age = rnd(17, 21);
        const r = clamp(c.str - rnd(8, 16), 50, 90);
        const np = mkPlayer(pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES), pos, r, age, c.key);
        np.num = rnd(30, 79);
        PLAYERS[np.id] = np;
        if (c.key === G.club) addInbox('🎓', np.n + ' (' + np.p + ', ' + np.age + ') promoted from the academy.', 'youth');
      }
    });
  });
}

function prizeMoneyFor(pos) {
  return Math.max(5, Math.round(46 - (pos - 1) * 2.2));
}

/* Process end of season: returns a summary object for the UI. */
function processSeasonEnd() {
  const finalTable = tableSorted();
  const pos = leaguePos();
  const awards = seasonAwards();
  const summary = {
    pos: pos, table: finalTable, awards: awards, season: G.season,
    trophies: [], prize: prizeMoneyFor(pos), boardVerdict: '', newEuro: null
  };
  if (pos === 1) { summary.trophies.push('Premier League'); G.trophies.push('S' + G.season + ' Premier League'); }
  if (G.fa.won) { summary.trophies.push('FA Cup'); G.trophies.push('S' + G.season + ' FA Cup'); }
  if (G.lc.won) { summary.trophies.push('Carabao Cup'); G.trophies.push('S' + G.season + ' Carabao Cup'); }
  if (G.euro && G.euro.phase === 'won') { summary.trophies.push(EURO_CFG[G.euro.comp].label); G.trophies.push('S' + G.season + ' ' + EURO_CFG[G.euro.comp].label); }
  // board verdict
  const tgt = boardTargetPos();
  const met = pos <= tgt || summary.trophies.length > 0;
  summary.met = met;
  if (met) { G.boardConf = clamp(G.boardConf + 15, 0, 100); summary.boardVerdict = 'The board is delighted. Objectives achieved.'; }
  else if (pos <= tgt + 3) { G.boardConf = clamp(G.boardConf - 5, 0, 100); summary.boardVerdict = 'The board expected better, but you keep your job — for now.'; }
  else { G.boardConf = clamp(G.boardConf - 25, 0, 100); summary.boardVerdict = 'A very poor season. The board is furious.'; if (G.boardConf <= 5) G.sacked = true; }
  // prize money + euro qualification for next season
  let prize = summary.prize;
  if (summary.trophies.length) prize += summary.trophies.length * 10;
  G.budget = Math.round(G.budget * 0.25 + prize * 0.6 + userClub().bud);
  summary.newBudget = G.budget;
  const newEuro = pos <= 5 ? 'UCL' : pos <= 7 ? 'UEL' : pos === 8 ? 'UECL' : null;
  summary.newEuro = newEuro;
  return { summary: summary, newEuro: newEuro };
}

/* Start the next season, keeping squads/budget/trophies. */
function startNewSeason(newEuro) {
  developSquads();
  G.season++; G.ci = 0; G.lastDay = -3;
  G.rounds = buildRounds();
  CLUBS.forEach(c => { G.table[c.key] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  G.results = []; G.userResults = []; G.form = [];
  G.plW = 0; G.plD = 0; G.plL = 0; G.plGF = 0; G.plGA = 0; G.pts = 0;
  G.fa = { round: 'R3', elim: false, won: false, res: {}, next: null };
  G.lc = { round: 'R2', elim: false, won: false, res: {}, next: null };
  G.euro = buildEuro(newEuro);
  G.calendar = buildCalendar(G.euro ? EURO_CFG[G.euro.comp].mds : 0);
  G.aiWindowDone = false; G.pendingOffer = null; G.curFix = null;
  G.morale = clamp(G.morale, 55, 80);
  addInbox('📅', 'Season ' + G.season + ' begins! Board expectation: ' + userClub().exp + '.', 'board');
  if (G.euro) addInbox(EURO_CFG[G.euro.comp].icon, 'We are in the ' + EURO_CFG[G.euro.comp].label + ' this season.', 'comp');
  else addInbox('📋', 'No European football this season. Focus on the league.', 'comp');
  // expired contracts leave on a free, then squads are refilled from the academy
  userSquad().filter(p => p.contract <= 0).forEach(p => {
    addInbox('👋', p.n + '\'s contract expired — he leaves on a free transfer.', 'contract');
    p.club = null; p.free = true; p.clubName = 'Free Agent'; p.val = 0;
  });
  userSquad().filter(p => p.contract === 1).forEach(p => addInbox('📝', p.n + ' is in the final year of his contract. Renew or risk losing him.', 'contract'));
  topUpSquads();
  autoPickXI();
}
