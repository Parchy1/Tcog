/* ── match.js — user match engine (DOM-free; UI hooks consume events) ── */
'use strict';

var M = null; // live match state

function buildOppXI(fix) {
  const slots = FORM_SLOTS['433'];
  if (fix.oppKey) {
    const squad = squadOf(fix.oppKey);
    const used = {}, xi = [];
    slots.forEach(slot => {
      const ok = POS_OK[slot] || [slot];
      let best = null, score = -1;
      squad.forEach(p => {
        if (used[p.id]) return;
        const fi = ok.indexOf(p.p);
        if (fi < 0) return;
        const s = p.r * (1 - fi * 0.06);
        if (s > score) { score = s; best = p; }
      });
      if (best) { used[best.id] = true; xi.push({ pid: best.id, n: best.n, p: slot, r: best.r, sho: best.sho }); }
      else xi.push({ n: pick(LAST_NAMES), p: slot, r: fix.str - rnd(2, 8), sho: fix.str - rnd(5, 15) });
    });
    return xi;
  }
  // generated XI for European / lower-league opponents
  return slots.map(slot => {
    const r = clamp(fix.str + rnd(-6, 5), 40, 97);
    return { n: pick(LAST_NAMES), p: slot, r: r, sho: slot === 'ST' ? r + 2 : ['LW', 'RW', 'AM'].indexOf(slot) >= 0 ? r - 2 : r - 20 };
  });
}

function xiAvg(xi) { return xi.reduce((s, p) => s + p.r, 0) / Math.max(1, xi.length); }
function oppAtk(xi) {
  const f = xi.filter(p => ['ST', 'LW', 'RW', 'AM', 'CM', 'RM', 'LM'].indexOf(p.p) >= 0);
  return f.length ? f.reduce((s, p) => s + p.r, 0) / f.length : 75;
}
function oppDef(xi) {
  const d = xi.filter(p => ['GK', 'CB', 'RB', 'LB', 'WB', 'DM'].indexOf(p.p) >= 0);
  return d.length ? d.reduce((s, p) => s + p.r, 0) / d.length : 75;
}

function calcUserAtk() {
  const pls = M.playing.map(playerById).filter(Boolean);
  if (!pls.length) return 70;
  let sum = 0;
  pls.forEach(p => {
    const f = M.fit[p.id] !== undefined ? M.fit[p.id] : p.fit;
    sum += p.r * (0.62 + 0.38 * f / 100);
  });
  let avg = sum / pls.length;
  const mm = { att: 1.08, def: 0.92, ctr: 0.96, pos: 1.02, bal: 1 }[G.mentality] || 1;
  const sm = { press: 1.05, long: 0.96, wing: 1.03, tiki: 1.02, direct: 1 }[G.style] || 1;
  const morale = G.morale >= 75 ? 1.05 : G.morale <= 40 ? 0.92 : 1;
  return avg * mm * sm * morale * (1 + (G.pressing - 5) * 0.012) * (1 + (G.width - 5) * 0.004)
    * (1 + G.instrs.length * 0.008) * (1 - (11 - pls.length) * 0.05);
}
function calcUserDef() {
  const defs = M.playing.map(playerById).filter(p => p && ['CB', 'GK', 'LB', 'RB', 'DM'].indexOf(p.p) >= 0);
  if (!defs.length) return 65;
  let sum = 0;
  defs.forEach(p => {
    const f = M.fit[p.id] !== undefined ? M.fit[p.id] : p.fit;
    sum += p.def * (0.62 + 0.38 * f / 100);
  });
  const mm = G.mentality === 'def' ? 1.08 : G.mentality === 'att' ? 0.93 : 1;
  return (sum / defs.length) * mm * (1 + (G.defLine - 5) * 0.008);
}

function startMatchState(fix) {
  const oppXI = buildOppXI(fix);
  M = {
    fix: fix, min: 0, score: [0, 0], scorers: [], shots: [0, 0], xg: [0, 0], poss: 50,
    yel: [0, 0], red: [0, 0], subsUsed: 0, shoutEffect: 0,
    playing: G.xi.slice(), benchIds: G.bench.slice(), fit: {}, ratings: {},
    oppXI: oppXI, oppAtk: oppAtk(oppXI), oppDef: oppDef(oppXI),
    participated: {}, injuredOff: [], finished: false, log: []
  };
  M.playing.forEach(id => {
    const p = playerById(id);
    if (p) { M.fit[id] = p.fit; M.ratings[id] = 6.4 + rndf(0, 0.3); M.participated[id] = true; }
  });
  return M;
}

const TRAIN_FX = {};
TRAIN_OPTS.forEach(t => { TRAIN_FX[t.id] = t; });

/* simulate one minute; returns an array of event objects for the UI */
function matchMinute() {
  const fix = M.fix, ev = [];
  M.min++;
  const atk = calcUserAtk(), def = calcUserDef();
  const homeAdv = fix.neutral ? 1.0 : fix.home ? 1.08 : 0.93;
  const train = TRAIN_FX[G.training] || TRAIN_FX.balanced;
  const shoutMod = 1 + M.shoutEffect;
  if (M.shoutEffect > 0) M.shoutEffect = Math.max(0, M.shoutEffect - 0.001);

  let gp = 0.0165 * Math.pow(atk / Math.max(50, M.oppDef), 1.65) * homeAdv * shoutMod * (1 + (train.atkBonus || 0));
  let cp = 0.0165 * Math.pow(M.oppAtk / Math.max(50, def), 1.65) * (2 - homeAdv) * (1 - (train.defBonus || 0));
  gp = clamp(gp, 0.004, 0.10); cp = clamp(cp, 0.004, 0.10);

  const attackers = M.playing.map(playerById).filter(p => p && ['ST', 'LW', 'RW', 'AM', 'CM'].indexOf(p.p) >= 0);
  const r = Math.random();

  if (r < gp && attackers.length) {
    // ── user goal
    const weights = attackers.map(p => Math.pow(Math.max(20, p.sho), 2));
    const total = weights.reduce((s, w) => s + w, 0);
    let rr = Math.random() * total, scorer = attackers[0];
    for (let i = 0; i < attackers.length; i++) { rr -= weights[i]; if (rr <= 0) { scorer = attackers[i]; break; } }
    M.score[0]++; M.shots[0]++; M.xg[0] += rndf(0.3, 0.7);
    scorer.g++; if (fix.comp === 'PL') scorer.plG++;
    M.ratings[scorer.id] = Math.min(10, (M.ratings[scorer.id] || 6.5) + 1.0);
    let assistName = '';
    if (Math.random() < 0.72 && attackers.length > 1) {
      const others = attackers.filter(p => p.id !== scorer.id);
      const ast = pick(others);
      ast.a++; assistName = ast.n;
      M.ratings[ast.id] = Math.min(10, (M.ratings[ast.id] || 6.5) + 0.6);
    }
    M.scorers.push({ side: 0, n: scorer.n, min: M.min, assist: assistName });
    G.morale = clamp(G.morale + 2, 5, 100);
    ev.push({ type: 'goal', side: 0, text: '⚽ GOAL! ' + scorer.n + ' scores' + (assistName ? ' (' + assistName + ')' : '') + '! ' + M.score[0] + '-' + M.score[1] });
  } else if (r < gp + cp) {
    // ── opponent goal
    const oppF = M.oppXI.filter(p => ['ST', 'LW', 'RW', 'AM'].indexOf(p.p) >= 0);
    const sc = oppF.length ? pick(oppF) : M.oppXI[10];
    M.score[1]++; M.shots[1]++; M.xg[1] += rndf(0.3, 0.7);
    if (sc.pid && PLAYERS[sc.pid]) { PLAYERS[sc.pid].g++; if (fix.comp === 'PL') PLAYERS[sc.pid].plG++; }
    M.scorers.push({ side: 1, n: sc.n, min: M.min });
    M.playing.map(playerById).filter(p => p && ['GK', 'CB', 'RB', 'LB', 'DM'].indexOf(p.p) >= 0)
      .forEach(p => { M.ratings[p.id] = Math.max(4, (M.ratings[p.id] || 6.5) - 0.25); });
    G.morale = clamp(G.morale - 2, 5, 100);
    ev.push({ type: 'oppgoal', side: 1, text: '🥅 ' + fix.opp + ' score — ' + sc.n + '. ' + M.score[0] + '-' + M.score[1] });
  } else if (r < gp + cp + 0.035) {
    // ── user chance missed
    M.shots[0]++; M.xg[0] += rndf(0.04, 0.18);
    const p = attackers.length ? pick(attackers) : null;
    ev.push({ type: 'chance', side: 0, text: '⚡ ' + (p ? p.n : 'Shot') + pick([' fires wide!', ' denied by the keeper!', ' hits the post!', ' blazes over!']) });
  } else if (r < gp + cp + 0.06) {
    // ── opponent chance
    M.shots[1]++; M.xg[1] += rndf(0.04, 0.18);
    const gk = M.playing.map(playerById).find(p => p && p.p === 'GK');
    if (gk && Math.random() < 0.5) M.ratings[gk.id] = Math.min(10, (M.ratings[gk.id] || 6.5) + 0.15);
    ev.push({ type: 'oppchance', side: 1, text: '⚠️ ' + fix.opp + ' threaten' + (gk ? ' — great save by ' + gk.n + '!' : '!') });
  } else if (r < gp + cp + 0.068) {
    // ── booking
    const cand = M.playing.map(playerById).filter(Boolean);
    if (cand.length) {
      const yp = pick(cand);
      M.yel[0]++; yp.yel++;
      M.ratings[yp.id] = Math.max(4, (M.ratings[yp.id] || 6.5) - 0.2);
      ev.push({ type: 'yellow', text: '🟨 Yellow card: ' + yp.n });
      if (yp._matchYel) {
        // second yellow → red
        M.red[0]++;
        yp.susp = Math.max(yp.susp, 2);
        const idx = M.playing.indexOf(yp.id);
        if (idx >= 0) M.playing[idx] = null;
        M.ratings[yp.id] = Math.max(3, M.ratings[yp.id] - 1.5);
        ev.push({ type: 'red', text: '🟥 RED CARD! Second yellow — ' + yp.n + ' is off!' });
      } else {
        yp._matchYel = true;
        if (yp.yel > 0 && yp.yel % 5 === 0) {
          yp.susp = Math.max(yp.susp, 1);
          ev.push({ type: 'susp', text: '📋 ' + yp.n + ' reaches ' + yp.yel + ' bookings — suspended next match.' });
        }
      }
    }
  } else if (r < gp + cp + 0.073) {
    // ── knock / possible injury
    const cand = M.playing.map(playerById).filter(Boolean);
    if (cand.length) {
      const ip = pick(cand);
      M.fit[ip.id] = Math.max(20, (M.fit[ip.id] || ip.fit) - rnd(15, 30));
      if (Math.random() < 0.30) M.injuredOff.push(ip.id);
      ev.push({ type: 'injury', text: '🚑 ' + ip.n + ' goes down — may need to come off.' });
    }
  } else if (r < gp + cp + 0.10) {
    const flavour = [fix.opp + ' building pressure.', 'Possession traded in midfield.', 'Corner — headed clear.', 'Free kick wasted.', 'Good pressing high up the pitch.', 'Slick passing move breaks down.'];
    ev.push({ type: 'flavour', text: pick(flavour) });
  }

  // fatigue
  M.playing.forEach(id => {
    if (!id) return;
    const p = playerById(id);
    if (!p) return;
    const posI = ['ST', 'LW', 'RW', 'CM', 'DM'].indexOf(p.p) >= 0 ? 1.05 : 0.8;
    const phyM = Math.max(0.6, 1 - ((p.phy - 75) * 0.005));
    if (Math.random() < 0.105 * posI * phyM * (M.min > 65 ? 1.18 : 1)) {
      M.fit[id] = Math.max(30, (M.fit[id] || p.fit) - 1);
    }
  });
  // possession drifts toward strength balance
  const target = atk / (atk + M.oppAtk) * 100;
  M.poss = clamp(Math.round(M.poss + (target - M.poss) * 0.04), 25, 75);
  // ratings drift with score
  if (M.min % 10 === 0) {
    const diff = M.score[0] - M.score[1];
    M.playing.forEach(id => {
      if (!id) return;
      M.ratings[id] = clamp((M.ratings[id] || 6.5) + (diff > 0 ? 0.05 : diff < 0 ? -0.05 : 0) + rndf(-0.05, 0.08), 4, 10);
    });
  }
  return ev;
}

function makeSub(outIdx, inId) {
  if (M.subsUsed >= 5) return false;
  const outId = M.playing[outIdx];
  const inP = playerById(inId);
  if (!inP) return false;
  M.fit[inId] = inP.fit;
  M.ratings[inId] = 6.5;
  M.participated[inId] = true;
  M.playing[outIdx] = inId;
  const bi = M.benchIds.indexOf(inId);
  if (bi >= 0) { if (outId) M.benchIds[bi] = outId; else M.benchIds.splice(bi, 1); }
  M.subsUsed++;
  return true;
}

function applyShout(type) {
  const s = SHOUT_EFFECTS[type];
  if (!s) return null;
  G.morale = clamp(G.morale + s.morale, 5, 100);
  M.shoutEffect = Math.max(M.shoutEffect, s.eff);
  return s;
}

/* ── finalize: apply the result to the game world ────────────── */
function finalizeMatch() {
  const fix = M.fix;
  const ug = M.score[0], og = M.score[1];
  let out = ug > og ? 'W' : ug === og ? 'D' : 'L';
  let decidedBy = null;

  // knockout ties can't end level — extra time / penalties
  const isKO = fix.comp === 'FA' || fix.comp === 'LC' || (fix.phase && fix.phase !== 'league');
  if (isKO && out === 'D') {
    const winChance = clamp(0.5 + (calcUserAtk() - fix.str) * 0.012, 0.25, 0.75);
    out = Math.random() < winChance ? 'W' : 'L';
    decidedBy = Math.random() < 0.5 ? 'after extra time' : 'on penalties';
  }

  // player stats
  Object.keys(M.participated).forEach(id => {
    const p = playerById(Number(id));
    if (!p) return;
    p.apps++;
    let rat = M.ratings[id] || 6.0;
    if (out === 'W') rat += 0.2; else if (out === 'L') rat -= 0.2;
    if (og === 0 && ['GK', 'CB', 'RB', 'LB', 'DM'].indexOf(p.p) >= 0) rat += 0.4;
    rat = clamp(rat, 3, 10);
    M.ratings[id] = rat;
    p.rsum += rat;
    delete p._matchYel;
    // write back fatigue
    const f = M.fit[p.id] !== undefined ? M.fit[p.id] : p.fit;
    p.fit = Math.max(20, Math.round(f * (M.playing.indexOf(p.id) >= 0 ? 0.93 : 0.97)));
    p.morale = clamp(p.morale + (out === 'W' ? 4 : out === 'D' ? 0 : -4), 5, 99);
  });
  // post-match injuries for players forced off
  M.injuredOff.forEach(id => { const p = playerById(id); if (p && !p.injured && Math.random() < 0.6) injurePlayer(p, 'during the match'); });
  // suspended players who sat out serve a match
  userSquad().forEach(p => { if (p.susp > 0 && !M.participated[p.id]) p.susp--; });

  // competition bookkeeping
  if (fix.comp === 'PL') {
    G.pts += out === 'W' ? 3 : out === 'D' ? 1 : 0;
    if (out === 'W') G.plW++; else if (out === 'D') G.plD++; else G.plL++;
    G.plGF += ug; G.plGA += og;
    simPLRound(fix.round, [ug, og]);
    G.morale = clamp(G.morale + (out === 'W' ? 8 : out === 'D' ? 0 : -8), 5, 100);
  } else if (fix.comp === 'FA' || fix.comp === 'LC') {
    const cup = fix.comp === 'FA' ? G.fa : G.lc;
    const rounds = fix.comp === 'FA' ? FA_ROUNDS : LC_ROUNDS;
    cup.res[fix.round] = { opp: fix.opp, sc: ug + '-' + og, out: out, note: decidedBy };
    cup.next = null;
    if (out === 'W') {
      const ni = rounds.indexOf(fix.round) + 1;
      if (ni < rounds.length) {
        cup.round = rounds[ni];
        addInbox('🎟️', (fix.comp === 'FA' ? 'FA Cup' : 'Carabao Cup') + ': through to the ' + cup.round + '!', 'cup');
      } else {
        cup.won = true;
        G.budget += 15;
        addInbox('🏆', 'WE\'VE WON THE ' + (fix.comp === 'FA' ? 'FA CUP' : 'CARABAO CUP') + '! The board adds £15m to the budget.', 'cup');
        G.boardConf = clamp(G.boardConf + 12, 0, 100);
      }
    } else {
      cup.elim = true;
      addInbox('❌', 'Knocked out of the ' + (fix.comp === 'FA' ? 'FA Cup' : 'Carabao Cup') + ' by ' + fix.opp + '.', 'cup');
    }
    G.morale = clamp(G.morale + (out === 'W' ? 6 : -6), 5, 100);
  } else {
    // European
    const cfg = EURO_CFG[G.euro.comp];
    if (fix.phase === 'league') {
      simEuroMD(true, [ug, og], fix.opp, fix.home);
      G.euro.md++;
      G.euro.results.push({ opp: fix.opp, home: fix.home, sc: ug + '-' + og, out: out });
      if (G.euro.md >= cfg.mds) {
        const rank = euroRank();
        G.euro.phase = rank <= 8 ? 'r16' : rank <= 24 ? 'po' : 'out';
        if (G.euro.phase === 'out') addInbox('❌', cfg.label + ': eliminated at the league phase (' + ordinal(rank) + ').', 'comp');
        else addInbox(cfg.icon, cfg.label + ': finished ' + ordinal(rank) + ' — ' + (rank <= 8 ? 'straight to the Round of 16!' : 'into the knockout play-off.'), 'comp');
        G.budget += cfg.prize[5];
      }
    } else {
      G.euro.ko[fix.phase].res = { sc: ug + '-' + og, out: out, note: decidedBy };
      if (out === 'W') {
        const order = ['po', 'r16', 'qf', 'sf', 'f'];
        const ni = order.indexOf(fix.phase) + 1;
        if (ni < order.length) {
          G.euro.phase = order[ni];
          const names = { r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', f: 'Final' };
          addInbox(cfg.icon, cfg.label + ': into the ' + names[G.euro.phase] + '!', 'comp');
          G.budget += cfg.prize[4 - ni] || 5;
        } else {
          G.euro.phase = 'won';
          G.budget += cfg.prize[0];
          addInbox('🏆', 'WE ARE CHAMPIONS OF EUROPE! ' + cfg.label + ' winners — ' + money(cfg.prize[0]) + ' prize money!', 'cup');
          G.boardConf = clamp(G.boardConf + 20, 0, 100);
        }
      } else {
        G.euro.phase = 'out';
        addInbox('❌', cfg.label + ': knocked out by ' + fix.opp + '.', 'comp');
      }
    }
    G.morale = clamp(G.morale + (out === 'W' ? 8 : out === 'D' ? 0 : -8), 5, 100);
  }

  updateBoardAfterMatch(fix.comp, out);
  G.form.push(out);
  if (G.form.length > 10) G.form.shift();
  G.userResults.push({ comp: fix.comp, round: fix.round || fix.phase, opp: fix.opp, home: fix.home, hg: ug, ag: og, out: out, day: fix.day });
  G.lastLineup = Object.keys(M.participated).map(Number);
  G.lastDay = fix.day;
  G.ci = fix.ei + 1;
  G.curFix = null;

  // man of the match
  let motm = null, best = 0;
  Object.keys(M.participated).forEach(id => {
    const rt = M.ratings[id] || 0;
    if (rt > best) { best = rt; motm = playerById(Number(id)); }
  });
  if (motm) motm.morale = clamp(motm.morale + 5, 5, 99);

  M.finished = true;
  M.out = out; M.decidedBy = decidedBy; M.motm = motm;
  return { out: out, motm: motm, decidedBy: decidedBy };
}

/* Advance world to the next user fixture. Returns fixture or null (season done). */
function advanceWorld() {
  if (inWindow()) runAITransfers(); else G.aiWindowDone = false;
  const fix = nextUserFixture();
  if (fix) {
    const days = Math.max(2, fix.day - (G.lastDay === undefined ? 0 : G.lastDay));
    weeklyTick(Math.min(days, 14));
    G.curFix = fix;
  }
  saveGame();
  return fix;
}

/* Fully headless match (used for tests / instant result) */
function simulateFullMatch(fix) {
  startMatchState(fix);
  for (let m = 0; m < 90; m++) matchMinute();
  return finalizeMatch();
}
