/* ── core.js — game state, player/squad generation, calendar, save/load ── */
'use strict';

var G = null;        // serializable game state
var PLAYERS = {};    // id -> player object
var NEXT_ID = 1;

function playerById(id) { return PLAYERS[id] || null; }
function userClub() { return CLUB_BY_KEY[G.club]; }
function squadOf(key) { return Object.values(PLAYERS).filter(p => p.club === key && !p.loan); }
function userSquad() { return squadOf(G.club); }

/* ── player generation ───────────────────────────────────────── */
const ARCHETYPES = {
  GK: { pac: -30, sho: -70, pas: -20, dri: -25, def: 2,  phy: -8 },
  RB: { pac: 4,   sho: -20, pas: -6,  dri: -4,  def: -2, phy: -6 },
  LB: { pac: 4,   sho: -20, pas: -6,  dri: -4,  def: -2, phy: -6 },
  CB: { pac: -12, sho: -30, pas: -12, dri: -18, def: 3,  phy: 2 },
  DM: { pac: -10, sho: -15, pas: -1,  dri: -8,  def: 1,  phy: 1 },
  CM: { pac: -6,  sho: -8,  pas: 1,   dri: -3,  def: -8, phy: -3 },
  AM: { pac: -3,  sho: -4,  pas: 1,   dri: 2,   def: -25, phy: -12 },
  RW: { pac: 5,   sho: -6,  pas: -7,  dri: 3,   def: -28, phy: -12 },
  LW: { pac: 5,   sho: -6,  pas: -7,  dri: 3,   def: -28, phy: -12 },
  ST: { pac: -1,  sho: 3,   pas: -12, dri: -5,  def: -35, phy: 0 }
};
function valueOf(r, age, pot) {
  let v = Math.pow(Math.max(1, (r - 50)) / 10, 3.1);
  const af = age <= 21 ? 1.5 : age <= 24 ? 1.3 : age <= 27 ? 1.1 : age <= 30 ? 0.85 : age <= 32 ? 0.55 : 0.3;
  v *= af;
  if (pot - r >= 8 && age <= 22) v *= 1.35;
  return Math.max(0.5, Math.round(v));
}
function wageOf(val, r) { return Math.max(5, Math.round(val * 0.9 + r * 0.6 - 30)); }

function normPos(p) { return p === 'LM' ? 'LW' : p === 'RM' ? 'RW' : p === 'CF' ? 'ST' : p; }

function mkPlayer(name, pos, r, age, clubKey, extra) {
  pos = normPos(pos);
  const arch = ARCHETYPES[pos] || ARCHETYPES.CM;
  const pot = extra && extra.pot !== undefined ? extra.pot
    : age <= 20 ? Math.min(99, r + rnd(6, 16)) : age <= 23 ? Math.min(99, r + rnd(2, 9)) : age <= 27 ? Math.min(99, r + rnd(0, 3)) : r;
  const p = {
    id: NEXT_ID++, n: name, p: pos, r: r, pot: pot, age: age, club: clubKey,
    pac: clamp(r + arch.pac + rnd(-3, 3), 1, 99), sho: pos === 'GK' ? rnd(10, 18) : clamp(r + arch.sho + rnd(-3, 3), 1, 99),
    pas: clamp(r + arch.pas + rnd(-3, 3), 1, 99), dri: clamp(r + arch.dri + rnd(-3, 3), 1, 99),
    def: clamp(r + arch.def + rnd(-3, 3), 1, 99), phy: clamp(r + arch.phy + rnd(-3, 3), 1, 99),
    fit: 100, morale: rnd(65, 82), num: 0,
    val: 0, wage: 0, contract: rnd(1, 4),
    g: 0, a: 0, plG: 0, apps: 0, rsum: 0, yel: 0, susp: 0,
    injured: false, injD: 0, injT: null, listed: false, loan: false, foreign: false, scouted: false
  };
  if (extra) Object.assign(p, extra);
  if (!p.val) p.val = valueOf(p.r, p.age, p.pot);
  if (!p.wage) p.wage = wageOf(p.val, p.r);
  return p;
}

const SQUAD_TEMPLATE = { GK: 2, RB: 2, CB: 4, LB: 2, DM: 2, CM: 4, AM: 2, RW: 2, LW: 2, ST: 3 };

function genSquadFor(club, skipStars) {
  const squad = [];
  if (club.key === 'NEW' && !skipStars) {
    NUFC_SQUAD.forEach(t => {
      squad.push(mkPlayer(t.n, t.p, t.r, t.age, 'NEW', {
        pac: t.pac, sho: t.sho, pas: t.pas, dri: t.dri, def: t.def, phy: t.phy,
        num: t.num, val: t.val, contract: t.contract, pot: t.pot
      }));
    });
  } else if (!skipStars) {
    (STARS[club.key] || []).forEach(s => squad.push(mkPlayer(s[0], s[1], s[2], s[3], club.key, { contract: rnd(2, 4) })));
  }
  Object.keys(SQUAD_TEMPLATE).forEach(pos => {
    const have = squad.filter(p => p.p === pos).length;
    for (let i = have; i < SQUAD_TEMPLATE[pos]; i++) {
      const young = Math.random() < 0.35;
      const age = young ? rnd(17, 21) : rnd(22, 33);
      const r = clamp(club.str - rnd(young ? 8 : 4, young ? 18 : 14), 52, 95);
      squad.push(mkPlayer(pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES), pos, r, age, club.key));
    }
  });
  // shirt numbers for generated players
  let num = 1;
  const taken = {}; squad.forEach(p => { if (p.num) taken[p.num] = true; });
  squad.forEach(p => { if (!p.num) { while (taken[num]) num++; p.num = num; taken[num] = true; } });
  squad.forEach(p => { PLAYERS[p.id] = p; });
}

function genSquads() {
  PLAYERS = {}; NEXT_ID = 1;
  CLUBS.forEach(club => genSquadFor(club, false));
  // notable players across the top leagues (transfer targets)
  FOREIGN_PLAYERS.forEach(s => {
    const extra = { foreign: true, contract: rnd(2, 4) };
    if (s[5] !== undefined) extra.pot = s[5];
    const p = mkPlayer(s[0], s[1], s[2], s[3], null, extra);
    p.clubName = s[4];
    p.league = FOREIGN_CLUB_LEAGUE[s[4]] || 'Other';
    PLAYERS[p.id] = p;
  });
  FREE_AGENTS.forEach(s => {
    const p = mkPlayer(s[0], s[1], s[2], s[3], null, { contract: 0 });
    p.clubName = 'Free Agent'; p.val = 0; p.foreign = false; p.free = true;
    PLAYERS[p.id] = p;
  });
}

/* ── fixtures: double round-robin (circle method) ────────────── */
function buildRounds() {
  const keys = shuffle(CLUBS.map(c => c.key));
  const n = keys.length, half = [];
  const arr = keys.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    const ring = [keys[0]].concat(arr);
    for (let i = 0; i < n / 2; i++) {
      const h = ring[i], a = ring[n - 1 - i];
      round.push(r % 2 === 0 ? { h: h, a: a } : { h: a, a: h });
    }
    half.push(round);
    arr.unshift(arr.pop());
  }
  const second = half.map(rd => rd.map(m => ({ h: m.a, a: m.h })));
  return half.concat(shuffle(second));
}

/* ── calendar ────────────────────────────────────────────────── */
function buildCalendar(euroMds) {
  const cal = [];
  const euroAfter = [4, 6, 8, 10, 12, 14, 16, 18].slice(0, euroMds);
  const lcAfter = { 3: 'R2', 7: 'R3', 12: 'R4', 17: 'QF', 22: 'SF', 27: 'F' };
  const faAfter = { 20: 'R3', 23: 'R4', 26: 'R5', 30: 'QF', 33: 'SF' };
  const koAfter = { 24: 'po', 27: 'r16', 31: 'qf', 34: 'sf' };
  let md = 0;
  for (let r = 1; r <= 38; r++) {
    const base = (r - 1) * 7;
    cal.push({ t: 'PL', round: r, day: base });
    let off = 3;
    if (euroAfter.indexOf(r) >= 0) { md++; cal.push({ t: 'EU', md: md, day: base + off++ }); }
    if (lcAfter[r]) cal.push({ t: 'LC', round: lcAfter[r], day: base + off++ });
    if (faAfter[r]) cal.push({ t: 'FA', round: faAfter[r], day: base + off++ });
    if (koAfter[r]) cal.push({ t: 'EUKO', phase: koAfter[r], day: base + off++ });
    if (r === 28) cal.push({ t: 'YOUTH', day: base + off++ });
  }
  const endBase = 37 * 7;
  cal.push({ t: 'FA', round: 'F', day: endBase + 6 });
  cal.push({ t: 'EUKO', phase: 'f', day: endBase + 13 });
  return cal;
}
function dateOf(day) {
  const d = new Date(2025, 7, 15);
  d.setDate(d.getDate() + day + (G.season - 1) * 364);
  return d;
}
function curDate() { return dateOf(G.lastDay || 0); }
function inWindow() {
  const m = curDate().getMonth();
  return m === 7 || m === 0; // August or January
}
function winName() { const m = curDate().getMonth(); return m === 7 ? 'Summer Window' : m === 0 ? 'January Window' : null; }

/* ── European competition setup ──────────────────────────────── */
function buildEuro(comp) {
  if (!comp) return null;
  const cfg = EURO_CFG[comp];
  const plMates = CLUBS.filter(c => c.euro === comp && c.key !== G.club).map(c => c.name);
  const names = Object.keys(cfg.pool).concat(plMates);
  const me = userClub().name;
  const table = {}; table[me] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  names.forEach(nm => { table[nm] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  const opps = shuffle(names).slice(0, cfg.mds);
  const schedule = opps.map((o, i) => ({ opp: o, home: i % 2 === 0 }));
  return { comp: comp, md: 0, phase: 'league', table: table, schedule: schedule, ko: {}, results: [] };
}
function euroStr(name) {
  const c = CLUBS.find(cl => cl.name === name);
  if (c) return clubEffStr(c.key);
  for (const k in EURO_CFG) { if (EURO_CFG[k].pool[name]) return EURO_CFG[k].pool[name]; }
  if (FOREIGN_CLUB_STR[name]) return FOREIGN_CLUB_STR[name];
  return 75;
}
function clubEffStr(key) {
  const sq = squadOf(key).filter(p => !p.injured).sort((a, b) => b.r - a.r).slice(0, 14);
  if (!sq.length) return CLUB_BY_KEY[key].str;
  const avg = sq.reduce((s, p) => s + p.r, 0) / sq.length;
  let s = CLUB_BY_KEY[key].str * 0.45 + avg * 0.55;
  // momentum: recent results swing effective strength by up to ~±5%
  const f = (G && G.aiForm && G.aiForm[key]) || [];
  if (f.length >= 3) {
    const pts = f.reduce((x, r) => x + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
    s *= 1 + (pts / (f.length * 3) - 0.45) * 0.10;
  }
  return Math.round(s);
}
function pushForm(key, out) {
  if (!G.aiForm) G.aiForm = {};
  const f = G.aiForm[key] = G.aiForm[key] || [];
  f.push(out);
  if (f.length > 5) f.shift();
}

/* ── cup draws: a real pot of remaining teams, halved each round ── */
function buildCupPot() {
  const plNames = CLUBS.map(c => c.name);
  const others = CLUBS.filter(c => c.key !== G.club).map(c => ({ n: c.name, s: clubEffStr(c.key) }));
  const lower = Object.keys(LOWER_LEAGUE).filter(n => plNames.indexOf(n) < 0).map(n => ({ n: n, s: LOWER_LEAGUE[n] }));
  return shuffle(others.concat(lower));
}
function drawCupOpp(cupT, round) {
  const cup = cupT === 'FA' ? G.fa : G.lc;
  if (!cup.pot || !cup.pot.length) cup.pot = buildCupPot();
  const late = round === 'SF' || round === 'F';
  const early = round === 'R2' || round === 'R3';
  let pool = cup.pot;
  if (early) {
    // early rounds usually pair you with the weaker half of the field
    const sorted = cup.pot.slice().sort((a, b) => a.s - b.s);
    pool = sorted.slice(0, Math.max(3, Math.ceil(sorted.length * (cupT === 'LC' ? 0.45 : 0.6))));
  }
  const t = pick(pool);
  cup.pot = cup.pot.filter(x => x.n !== t.n);
  return { opp: t.n, str: t.s, home: late ? false : Math.random() < 0.5, neutral: late };
}
/* the rest of the field plays its ties too — survivors advance, upsets happen */
function shrinkCupPot(cupT, label) {
  const cup = cupT === 'FA' ? G.fa : G.lc;
  if (!cup.pot || cup.pot.length <= 1) return;
  const keep = Math.ceil(cup.pot.length * 0.55);
  const ranked = cup.pot.slice().sort((a, b) => (b.s + rnd(-12, 12)) - (a.s + rnd(-12, 12)));
  const survivors = ranked.slice(0, keep);
  const out = ranked.slice(keep);
  cup.pot = shuffle(survivors);
  const big = out.filter(x => x.s >= 84);
  if (big.length && Math.random() < 0.7) addInbox('📰', big[0].n + ' have been dumped out of the ' + label + '!', 'news');
}

/* ── new game ────────────────────────────────────────────────── */
function applyClubOverrides() {
  if (!G || !G.clubOverrides) return;
  Object.keys(G.clubOverrides).forEach(k => Object.assign(CLUB_BY_KEY[k], G.clubOverrides[k]));
}
function resetClubsToBase() {
  CLUBS.forEach((c, i) => Object.assign(c, CLUBS_BASE[i]));
}
function newGame(clubKey, managerName) {
  resetClubsToBase();
  genSquads();
  const club = CLUB_BY_KEY[clubKey];
  G = {
    club: clubKey, manager: managerName || 'The Gaffer', season: 1, ci: 0, lastDay: -3,
    rounds: buildRounds(), calendar: null,
    table: {}, results: [], userResults: [],
    budget: club.bud, morale: 70, boardConf: 65,
    tactic: '433', mentality: 'bal', style: 'direct', pressing: 7, defLine: 6, width: 6,
    instrs: [], training: 'balanced', trainFocus: [],
    euro: null, fa: { round: 'R3', elim: false, won: false, res: {}, next: null, pot: null },
    lc: { round: 'R2', elim: false, won: false, res: {}, next: null, pot: null },
    inbox: [], unread: 0, pendingOffer: null, aiWindowDone: false,
    xi: new Array(11).fill(null), bench: [],
    plW: 0, plD: 0, plL: 0, plGF: 0, plGA: 0, pts: 0, form: [],
    curFix: null, hist: [], sacked: false, trophies: [],
    aiForm: {}, clubOverrides: {}, sackedMgrs: {}, wageCap: 0,
    pendingJob: null, lastRelegated: null
  };
  CLUBS.forEach(c => { G.table[c.key] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  G.euro = buildEuro(club.euro);
  G.calendar = buildCalendar(G.euro ? EURO_CFG[G.euro.comp].mds : 0);
  addInbox('👔', 'Welcome to ' + club.full + ', ' + G.manager + '! The board expects: ' + club.exp + '.', 'board');
  addInbox('💰', 'Transfer budget set at ' + money(G.budget) + '. The ' + (winName() || 'transfer window') + ' is open.', 'board');
  if (G.euro) addInbox(EURO_CFG[G.euro.comp].icon, 'We have qualified for the ' + EURO_CFG[G.euro.comp].label + ' league phase.', 'comp');
  autoPickXI();
  G.wageCap = Math.max(Math.round(wageBill() * 1.25), wageBill() + 150);
  addInbox('🏦', 'The board set the wage budget at £' + G.wageCap + 'k/week (current bill £' + wageBill() + 'k).', 'board');
}

function addInbox(icon, msg, type) {
  G.inbox.unshift({ icon: icon, msg: msg, type: type || 'general', date: fmtShort(curDate()), read: false });
  if (G.inbox.length > 60) G.inbox.pop();
  G.unread++;
}

/* ── XI helpers ──────────────────────────────────────────────── */
function availableForSelection(p) { return !p.injured && p.susp <= 0 && !p.loan; }
/* how well a player fits a lineup slot: 1 = natural, <1 = out of position */
function posFitMult(slot, p) {
  if (!slot || p.p === slot) return 1;
  const ok = POS_OK[slot] || [slot];
  const fi = ok.indexOf(p.p);
  if (fi >= 0) return 1 - fi * 0.04;          // familiar secondary position
  if (slot === 'GK' || p.p === 'GK') return 0.5; // outfielder in goal (or keeper outfield)
  return 0.82;                                 // makeshift role
}
function autoPickXI() {
  const slots = FORM_SLOTS[G.tactic];
  G.xi = new Array(11).fill(null); G.bench = [];
  const used = {};
  slots.forEach((slot, i) => {
    const ok = POS_OK[slot] || [slot];
    let best = null, bestScore = -1;
    userSquad().forEach(p => {
      if (used[p.id] || !availableForSelection(p)) return;
      const fi = ok.indexOf(p.p);
      if (fi < 0) return;
      const score = p.r * (p.fit / 100) * (1 - fi * 0.06);
      if (score > bestScore) { bestScore = score; best = p; }
    });
    if (best) { G.xi[i] = best.id; used[best.id] = true; }
  });
  // fallback: fill any empty slot with the best remaining body, out of position
  G.xi.forEach((id, i) => {
    if (id !== null) return;
    const isGK = slots[i] === 'GK';
    let cands = userSquad().filter(p => !used[p.id] && availableForSelection(p) && (isGK ? p.p === 'GK' : p.p !== 'GK'));
    if (!cands.length) cands = userSquad().filter(p => !used[p.id] && !p.loan && p.susp <= 0 && (isGK ? p.p === 'GK' : p.p !== 'GK'));
    if (!cands.length) cands = userSquad().filter(p => !used[p.id] && !p.loan && (isGK ? p.p === 'GK' : true));
    if (!cands.length) cands = userSquad().filter(p => !used[p.id] && !p.loan); // emergency: anyone, even outfield in goal
    if (cands.length) {
      const best = cands.sort((a, b) => b.r - a.r)[0];
      G.xi[i] = best.id; used[best.id] = true;
    }
  });
  userSquad()
    .filter(p => !used[p.id] && availableForSelection(p))
    .sort((a, b) => b.r - a.r).slice(0, 9)
    .forEach(p => G.bench.push(p.id));
}

/* ── fixture resolution ──────────────────────────────────────── */
function fixtureForEntry(e) {
  const me = userClub();
  if (e.t === 'PL') {
    const m = G.rounds[e.round - 1].find(x => x.h === G.club || x.a === G.club);
    const home = m.h === G.club;
    const oppKey = home ? m.a : m.h;
    return { comp: 'PL', round: e.round, opp: CLUB_BY_KEY[oppKey].name, oppKey: oppKey, home: home, neutral: false, str: clubEffStr(oppKey), entry: e };
  }
  if (e.t === 'EU') {
    const s = G.euro.schedule[e.md - 1];
    return { comp: G.euro.comp, phase: 'league', md: e.md, opp: s.opp, home: s.home, neutral: false, str: euroStr(s.opp), entry: e };
  }
  if (e.t === 'EUKO') {
    const ko = G.euro.ko[e.phase];
    return { comp: G.euro.comp, phase: e.phase, opp: ko.opp, home: ko.home, neutral: e.phase === 'f', str: euroStr(ko.opp), entry: e };
  }
  // FA / LC
  const cup = e.t === 'FA' ? G.fa : G.lc;
  if (!cup.next) cup.next = drawCupOpp(e.t, e.round);
  return { comp: e.t, round: e.round, opp: cup.next.opp, home: cup.next.home, neutral: cup.next.neutral, str: cup.next.str, entry: e };
}

/* Scan the calendar from G.ci, simulating entries that don't involve the
   user, and return the next user fixture (or null = season over). */
function withIdx(f) { f.ei = G.ci; f.day = G.calendar[G.ci].day; delete f.entry; return f; }
function nextUserFixture() {
  while (G.ci < G.calendar.length) {
    const e = G.calendar[G.ci];
    if (e.t === 'PL') return withIdx(fixtureForEntry(e));
    if (e.t === 'EU') {
      if (G.euro && G.euro.phase === 'league') return withIdx(fixtureForEntry(e));
      if (G.euro) simEuroMD(false);
      G.ci++; continue;
    }
    if (e.t === 'EUKO') {
      if (G.euro && G.euro.phase === e.phase) {
        if (!G.euro.ko[e.phase]) drawEuroKO(e.phase);
        return withIdx(fixtureForEntry(e));
      }
      G.ci++; continue;
    }
    if (e.t === 'FA') {
      if (!G.fa.elim && !G.fa.won && G.fa.round === e.round) return withIdx(fixtureForEntry(e));
      G.ci++; continue;
    }
    if (e.t === 'LC') {
      if (!G.lc.elim && !G.lc.won && G.lc.round === e.round) return withIdx(fixtureForEntry(e));
      G.ci++; continue;
    }
    if (e.t === 'YOUTH') { youthIntake(); G.ci++; continue; }
    G.ci++;
  }
  return null;
}

function euroRank() {
  const t = G.euro.table, me = userClub().name;
  const sorted = Object.keys(t).sort((a, b) => t[b].pts - t[a].pts || (t[b].gf - t[b].ga) - (t[a].gf - t[a].ga) || t[b].gf - t[a].gf);
  return sorted.indexOf(me) + 1;
}
function drawEuroKO(phase) {
  const t = G.euro.table, me = userClub().name;
  const sorted = Object.keys(t).filter(n => n !== me).sort((a, b) => t[b].pts - t[a].pts);
  let opp;
  if (phase === 'po') opp = pick(sorted.slice(8, 24));
  else if (phase === 'r16') opp = pick(sorted.slice(4, 16));
  else if (phase === 'qf') opp = pick(sorted.slice(0, 10));
  else if (phase === 'sf') opp = pick(sorted.slice(0, 6));
  else opp = pick(sorted.slice(0, 4));
  G.euro.ko[phase] = { opp: opp, home: phase === 'f' ? false : Math.random() < 0.5, res: null };
}

/* ── save / load ─────────────────────────────────────────────── */
const SAVE_KEY = 'fm2526_save';
function saveGame() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ G: G, PLAYERS: PLAYERS, NEXT_ID: NEXT_ID, v: 1 })); } catch (e) { /* storage full / disabled */ }
}
function loadGame() {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || !s.G || !s.PLAYERS) return false;
    G = s.G; PLAYERS = s.PLAYERS; NEXT_ID = s.NEXT_ID;
    // migrate older saves
    G.aiForm = G.aiForm || {};
    G.clubOverrides = G.clubOverrides || {};
    G.sackedMgrs = G.sackedMgrs || {};
    if (!G.wageCap) G.wageCap = Math.max(Math.round(wageBill() * 1.25), wageBill() + 150);
    resetClubsToBase();
    applyClubOverrides();
    return true;
  } catch (e) { return false; }
}
function hasSave() {
  if (typeof localStorage === 'undefined') return false;
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function deleteSave() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
