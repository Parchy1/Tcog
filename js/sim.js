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

/* credit goals to plausible scorers in an AI club's squad (for Golden Boot).
   Returns a hat-trick scorer's name if one happened. */
function creditAIScorers(key, goals) {
  if (!goals) return null;
  const atk = squadOf(key).filter(p => ['ST', 'LW', 'RW', 'AM', 'CM'].indexOf(p.p) >= 0 && !p.injured);
  if (!atk.length) return null;
  const weights = atk.map(p => Math.pow(Math.max(20, p.sho), 2.4));
  const total = weights.reduce((s, w) => s + w, 0);
  const counts = {};
  for (let g = 0; g < goals; g++) {
    let r = Math.random() * total;
    for (let i = 0; i < atk.length; i++) {
      r -= weights[i];
      if (r <= 0) { atk[i].g++; atk[i].plG++; counts[atk[i].n] = (counts[atk[i].n] || 0) + 1; break; }
    }
  }
  for (const n in counts) if (counts[n] >= 3) return n;
  return null;
}

/* simulate every match of a PL round except the user's */
function simPLRound(round, userResult) {
  const matches = G.rounds[round - 1];
  let newsBudget = 2;
  matches.forEach(m => {
    if (m.h === G.club || m.a === G.club) {
      if (userResult) {
        // userResult is always [our goals, their goals], whatever the venue
        const ug = userResult[0], og = userResult[1];
        applyTable(G.table, m.h, m.a, m.h === G.club ? ug : og, m.h === G.club ? og : ug);
        const oppKey = m.h === G.club ? m.a : m.h;
        pushForm(G.club, ug > og ? 'W' : ug === og ? 'D' : 'L');
        pushForm(oppKey, og > ug ? 'W' : og === ug ? 'D' : 'L');
      }
      return;
    }
    const hs = clubEffStr(m.h), as = clubEffStr(m.a);
    const sc = simScore(hs, as);
    applyTable(G.table, m.h, m.a, sc[0], sc[1]);
    pushForm(m.h, sc[0] > sc[1] ? 'W' : sc[0] === sc[1] ? 'D' : 'L');
    pushForm(m.a, sc[1] > sc[0] ? 'W' : sc[0] === sc[1] ? 'D' : 'L');
    const ht = creditAIScorers(m.h, sc[0]), at = creditAIScorers(m.a, sc[1]);
    G.results.push({ round: round, h: m.h, a: m.a, hg: sc[0], ag: sc[1] });
    // newsworthy events around the league
    if (newsBudget > 0) {
      const upset = (sc[0] > sc[1] && as - hs >= 8) || (sc[1] > sc[0] && hs - as >= 8);
      if (upset && Math.random() < 0.45) {
        const w = sc[0] > sc[1] ? m.h : m.a, l = sc[0] > sc[1] ? m.a : m.h;
        addInbox('📰', 'Shock result: ' + CLUB_BY_KEY[w].name + ' beat ' + CLUB_BY_KEY[l].name + ' ' + Math.max(sc[0], sc[1]) + '-' + Math.min(sc[0], sc[1]) + '!', 'news');
        newsBudget--;
      } else if ((ht || at) && Math.random() < 0.55) {
        addInbox('📰', (ht || at) + ' nets a hat-trick in ' + CLUB_BY_KEY[m.h].name + ' ' + sc[0] + '-' + sc[1] + ' ' + CLUB_BY_KEY[m.a].name + '.', 'news');
        newsBudget--;
      }
    }
  });
  // league-wide stories
  if (round === 19 || round === 30 || round === 36) {
    const t = tableSorted();
    addInbox('📰', 'State of the league: ' + t[0].name + ' top on ' + t[0].pts + 'pts (' + (t[0].pts - t[1].pts) + ' clear of ' + t[1].name + '). In the drop zone: ' + t.slice(17).map(x => x.name).join(', ') + '.', 'news');
  }
  if (round >= 10 && Math.random() < 0.06) {
    const strugglers = tableSorted().slice(15).filter(r => r.key !== G.club && !G.sackedMgrs[r.key]);
    if (strugglers.length) {
      const v = pick(strugglers);
      G.sackedMgrs[v.key] = true;
      addInbox('📰', v.name + ' have sacked their manager after a poor run of results.', 'news');
    }
  }
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
  // fringe stars get restless without minutes
  const seasonMatches = G.userResults.length;
  if (seasonMatches >= 6) {
    userSquad().filter(p => !p.injured && !p.loan).sort((a, b) => b.r - a.r).slice(0, 13).forEach(p => {
      if (p.apps < seasonMatches * 0.3) {
        p.morale = clamp(p.morale - 2, 5, 99);
        if (p.morale < 45 && !p.wantsOut && Math.random() < 0.10) {
          p.wantsOut = true;
          addInbox('😡', p.n + ' is unhappy with his lack of minutes and has requested a transfer.', 'squad');
        }
      } else if (p.wantsOut && p.apps >= seasonMatches * 0.5 && p.morale > 65) {
        p.wantsOut = false;
        addInbox('🤝', p.n + ' is enjoying his football again and withdraws his transfer request.', 'squad');
      }
    });
  }
  // reports from players out on loan
  Object.values(PLAYERS).filter(p => p.club === G.club && p.loan).forEach(p => {
    if (Math.random() < 0.12) {
      addInbox('📨', 'Loan report: ' + p.n + pick([' scored at the weekend', ' impressed with an assist', ' is getting regular minutes', ' had a quiet game', ' was named man of the match']) + '.', 'loan');
      if (Math.random() < 0.25 && p.r < p.pot) { p.r++; p.val = valueOf(p.r, p.age, p.pot); }
    }
  });
}

/* the rest of the league lives too: AI injuries heal and happen */
function aiWeeklyTick(days) {
  CLUBS.forEach(c => {
    if (c.key === G.club) return;
    const sq = squadOf(c.key);
    sq.forEach(p => {
      if (p.injured) { p.injD -= days; if (p.injD <= 0) { p.injured = false; p.injT = null; } }
    });
    if (sq.filter(p => p.injured).length < 4 && Math.random() < 0.10 * days / 7) {
      const fit = sq.filter(p => !p.injured);
      if (fit.length) {
        const p = pick(fit), t = pick(INJ_TYPES);
        p.injured = true; p.injT = t.n; p.injD = rnd(t.min, t.max) * 7;
        if (p.r >= 87 && Math.random() < 0.7) addInbox('🏥', 'Blow for ' + c.name + ': ' + p.n + ' is out for ' + Math.ceil(p.injD / 7) + ' weeks (' + t.n.toLowerCase() + ').', 'news');
      }
    }
  });
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
  if (!inWindow()) return;
  if (!G.aiWindowDone) {
    G.aiWindowDone = true;
    // foreign stars move between big clubs
    const stars = Object.values(PLAYERS).filter(p => p.foreign && !p._moved);
    shuffle(stars).slice(0, rnd(1, 3)).forEach(p => {
      const buyers = ['Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Inter Milan', 'Juventus'].filter(c => c !== p.clubName);
      p._moved = true; const to = pick(buyers);
      addInbox('💰', to + ' sign ' + p.n + ' from ' + p.clubName + ' for ' + money(Math.round(p.val * rndf(0.9, 1.3))) + '.', 'transfer');
      p.clubName = to;
      p.league = FOREIGN_CLUB_LEAGUE[to] || p.league || 'Other';
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
  }
  // incoming bids can arrive any week while the window is open;
  // transfer-listed players (or those agitating for a move) attract attention faster
  if (!G.pendingOffer) {
    const hasListed = userSquad().some(p => (p.listed || p.wantsOut) && !p.injured);
    if (Math.random() < (hasListed ? 0.6 : 0.25)) generateIncomingBid();
  }
  // targets you walked away from can be snapped up by rivals
  Object.values(PLAYERS).forEach(p => {
    if (p._hot && p.club !== G.club && Math.random() < 0.25) {
      p._hot = false;
      const to = pick(['Real Madrid', 'Barcelona', 'PSG', 'Bayern Munich', 'Atletico Madrid', 'Inter Milan'].filter(c => c !== p.clubName));
      addInbox('📰', p.n + ' joins ' + to + ' for ' + money(Math.round(p.val * rndf(1.0, 1.35))) + ' — you missed out.', 'transfer');
      if (p.club) p.club = null;
      p.foreign = true; p.clubName = to;
      p.league = FOREIGN_CLUB_LEAGUE[to] || 'Other';
    }
  });
}

/* ── wages ───────────────────────────────────────────────────── */
function wageBill() { return userSquad().reduce((s, p) => s + p.wage, 0); }

/* how keen a player is to join you (negative = reluctant) */
function moveInterest(p) {
  const me = userClub();
  const fromStr = p.club ? CLUB_BY_KEY[p.club].str : (p.clubName ? euroStr(p.clubName) : 80);
  let s = me.str - fromStr;
  if (G.euro && ['league', 'po', 'r16', 'qf', 'sf', 'f'].indexOf(G.euro.phase) >= 0) s += 4;
  if (G.plW + G.plD + G.plL >= 6 && leaguePos() <= 6) s += 3;
  if (G.trophies.length) s += 2;
  if (p.age <= 22) s += 5;
  if (p.listed || p.wantsOut) s += 10;
  return s;
}

/* ── youth intake day ────────────────────────────────────────── */
function youthIntake() {
  const c = userClub();
  const n = rnd(2, 3);
  for (let i = 0; i < n; i++) {
    const age = rnd(16, 18);
    const r = clamp(c.str - rnd(16, 26), 48, 70);
    const pot = Math.min(96, r + rnd(8, Math.max(12, 22 + Math.round((c.str - 70) / 2))));
    const p = mkPlayer(pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES), pick(['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST']), r, age, G.club, { pot: pot });
    const nums = {}; userSquad().forEach(x => { nums[x.num] = true; });
    let num = 40; while (nums[num]) num++; p.num = num;
    PLAYERS[p.id] = p;
    addInbox('🎓', 'Youth intake: ' + p.n + ' (' + p.p + ', ' + age + ') signs scholarship terms. Coaches rate his potential as ' + (pot >= 88 ? 'exceptional' : pot >= 80 ? 'high' : 'decent') + '.', 'youth');
  }
}

function generateIncomingBid() {
  const targets = userSquad().filter(p => !p.injured && (p.listed || p.wantsOut || p.val >= 10));
  if (!targets.length) return;
  const weights = targets.map(p => ((p.listed || p.wantsOut) ? 10 : 1) * (p.contract <= 1 ? 2 : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total, target = targets[0];
  for (let i = 0; i < targets.length; i++) { r -= weights[i]; if (r <= 0) { target = targets[i]; break; } }
  const richClubs = ['Real Madrid', 'Barcelona', 'PSG', 'Bayern Munich', 'Al-Hilal', 'Al-Nassr'].concat(
    CLUBS.filter(c => c.key !== G.club && c.bud >= 90).map(c => c.name));
  const mult = (target.listed || target.wantsOut) ? rndf(0.95, 1.2) : rndf(1.0, 1.45);
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

/* fill a club back up to the squad template with academy graduates */
function topUpClub(c) {
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
}
function topUpSquads() { CLUBS.forEach(topUpClub); }

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
  // relegation: the bottom three go down (and take their manager with them)
  summary.relegated = finalTable.slice(17).map(r => r.key);
  G.lastRelegated = summary.relegated;
  // board verdict
  const tgt = boardTargetPos();
  const met = pos <= tgt || summary.trophies.length > 0;
  summary.met = met;
  if (pos >= 18) {
    G.sacked = true;
    summary.boardVerdict = 'Relegated. The board terminate your contract with immediate effect.';
  } else if (met) { G.boardConf = clamp(G.boardConf + 15, 0, 100); summary.boardVerdict = 'The board is delighted. Objectives achieved.'; }
  else if (pos <= tgt + 3) { G.boardConf = clamp(G.boardConf - 5, 0, 100); summary.boardVerdict = 'The board expected better, but you keep your job — for now.'; }
  else { G.boardConf = clamp(G.boardConf - 25, 0, 100); summary.boardVerdict = 'A very poor season. The board is furious.'; if (G.boardConf <= 5) G.sacked = true; }
  // a strong season attracts attention from bigger clubs
  if (!G.sacked && met && (pos <= tgt - 2 || summary.trophies.length) && Math.random() < 0.5) {
    const suitors = CLUBS.filter(c => c.key !== G.club && c.str >= userClub().str + 2);
    if (suitors.length) summary.jobOffer = pick(suitors).key;
  }
  // prize money + euro qualification for next season
  let prize = summary.prize;
  if (summary.trophies.length) prize += summary.trophies.length * 10;
  G.budget = Math.round(G.budget * 0.25 + prize * 0.6 + userClub().bud);
  summary.newBudget = G.budget;
  if (summary.trophies.length) G.wageCap = Math.round(G.wageCap * 1.08);
  const newEuro = pos <= 5 ? 'UCL' : pos <= 7 ? 'UEL' : pos === 8 ? 'UECL' : null;
  summary.newEuro = newEuro;
  return { summary: summary, newEuro: newEuro };
}

/* a relegated AI club is replaced by a promoted Championship side */
function promoteReplacement(key) {
  const usedNames = CLUBS.map(c => c.name);
  const cands = CHAMPIONSHIP.filter(t => usedNames.indexOf(t.name) < 0);
  if (!cands.length) return;
  const t = pick(cands);
  const old = CLUB_BY_KEY[key];
  addInbox('⬇️', old.name + ' are relegated to the Championship. ' + t.name + ' come up in their place.', 'news');
  G.clubOverrides[key] = { name: t.name, full: t.full, stadium: t.stadium, col1: t.col1, col2: t.col2, str: t.str, bud: t.bud, exp: t.exp, euro: null };
  applyClubOverrides();
  // the old squad goes down with the club; the promoted side brings its
  // real players from the world database where we have them
  Object.values(PLAYERS).forEach(p => { if (p.club === key) delete PLAYERS[p.id]; });
  const tn = t.name.toLowerCase(), tf = t.full.toLowerCase();
  let num = 1;
  Object.values(PLAYERS).forEach(p => {
    if (!p.foreign || !p.clubName) return;
    const cn = p.clubName.toLowerCase();
    if (cn === tn || cn === tf || cn.indexOf(tn) === 0 || tf.indexOf(cn) === 0) {
      p.club = key; p.foreign = false; p.clubName = null; p.league = null;
      p.num = num++;
    }
  });
  topUpClub(CLUB_BY_KEY[key]);
  G.aiForm[key] = [];
}

/* take over a new club mid-season after being sacked */
function takeJobMidSeason(key) {
  const nc = CLUB_BY_KEY[key];
  G.club = key; G.sacked = false;
  G.boardConf = 50; G.morale = 60;
  G.budget = Math.round(nc.bud * 0.4);
  const t = G.table[key];
  G.plW = t.w; G.plD = t.d; G.plL = t.l; G.plGF = t.gf; G.plGA = t.ga; G.pts = t.pts;
  G.form = (G.aiForm[key] || []).slice();
  G.trainFocus = []; G.instrs = [];
  G.euro = null; G.pendingOffer = null; G.curFix = null;
  autoPickXI();
  G.wageCap = Math.max(Math.round(wageBill() * 1.2), wageBill() + 100);
  addInbox('👔', 'You take over at ' + nc.full + ' mid-season. Board expectation: ' + nc.exp + '. Emergency transfer kitty: ' + money(G.budget) + '.', 'board');
  saveGame();
}

/* Start the next season, keeping squads/budget/trophies. */
function startNewSeason(newEuro) {
  developSquads();
  // promotion & relegation
  (G.lastRelegated || []).forEach(key => { if (key !== G.club) promoteReplacement(key); });
  G.lastRelegated = null;
  // moving to a new club over the summer
  if (G.pendingJob) {
    const nc = CLUB_BY_KEY[G.pendingJob];
    G.club = G.pendingJob; G.pendingJob = null;
    G.boardConf = 60; G.trainFocus = []; G.instrs = [];
    G.budget = nc.bud; G.wageCap = 0;
    addInbox('👔', 'A new chapter: you are the manager of ' + nc.full + '! The board expects: ' + nc.exp + '.', 'board');
  }
  G.season++; G.ci = 0; G.lastDay = -3;
  G.aiForm = {}; G.sackedMgrs = {};
  G.rounds = buildRounds();
  CLUBS.forEach(c => { G.table[c.key] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  G.results = []; G.userResults = []; G.form = [];
  G.plW = 0; G.plD = 0; G.plL = 0; G.plGF = 0; G.plGA = 0; G.pts = 0;
  G.fa = { round: 'R3', elim: false, won: false, res: {}, next: null, pot: null };
  G.lc = { round: 'R2', elim: false, won: false, res: {}, next: null, pot: null };
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
  userSquad().forEach(p => { p.wantsOut = false; });
  topUpSquads();
  autoPickXI();
  G.wageCap = Math.max(G.wageCap || 0, Math.round(wageBill() * 1.15), wageBill() + 120);
  addInbox('🏦', 'Wage budget for the season: £' + G.wageCap + 'k/week (current bill £' + wageBill() + 'k).', 'board');
}
