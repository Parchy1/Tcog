/* ── ui.js — all rendering, navigation and player interaction ── */
'use strict';

function gid(id) { return document.getElementById(id); }

let _toastT = null;
function toast(msg, dur) {
  const t = gid('toast');
  t.textContent = msg; t.className = 'toast on';
  clearTimeout(_toastT);
  _toastT = setTimeout(() => { t.className = 'toast'; }, dur || 2600);
}

var UI = {
  page: 'hub', sqTabSel: 'players', trTabSel: 'buy', tblTabSel: 'pl',
  setupClub: null, pickerTarget: null,
  speed: 1, paused: false, raf: null, minTimer: 0, htShown: false,
  neg: null,

  /* ═════════ SETUP ═════════ */
  renderSetup() {
    const grid = gid('su-clubs');
    grid.innerHTML = CLUBS.map(c => {
      const stars = '★'.repeat(Math.round((c.str - 60) / 7)) || '★';
      const euro = c.euro ? '<span style="color:var(--gold)">' + EURO_CFG[c.euro].icon + ' ' + EURO_CFG[c.euro].label + '</span><br>' : '';
      return '<div class="club-card" id="cc-' + c.key + '" onclick="UI.pickClub(\'' + c.key + '\')">' +
        '<div class="cc-bar" style="background:linear-gradient(90deg,' + c.col1 + ',' + c.col2 + ')"></div>' +
        '<div class="cc-name">' + c.name + '</div>' +
        '<div class="cc-str">' + stars + ' <span style="color:var(--text2);font-weight:400">' + c.str + '</span></div>' +
        '<div class="cc-sub">' + euro + 'Budget: ' + money(c.bud) + '<br>Board: ' + c.exp + '</div></div>';
    }).join('');
    gid('su-resume').style.display = hasSave() ? 'inline-flex' : 'none';
  },
  pickClub(key) {
    this.setupClub = key;
    document.querySelectorAll('.club-card').forEach(el => el.classList.remove('sel'));
    gid('cc-' + key).classList.add('sel');
    gid('su-continue').disabled = false;
  },
  confirmNewGame() {
    if (!this.setupClub) return;
    newGame(this.setupClub, gid('su-name').value.trim() || 'The Gaffer');
    advanceWorld();
    this.enterGame();
  },
  resumeGame() {
    if (!loadGame()) { toast('Could not load save.'); return; }
    this.enterGame();
  },
  applyClubTheme() {
    const c = userClub();
    document.documentElement.style.setProperty('--club', c.col1);
    document.documentElement.style.setProperty('--club2', this.darken(c.col1));
    gid('tb-logo').textContent = c.name.split(/[\s']/).map(w => w[0]).join('').substring(0, 3).toUpperCase();
    gid('tb-logo').style.background = 'linear-gradient(135deg,' + c.col1 + ',' + c.col2 + ')';
    gid('tb-club-name').textContent = c.full;
  },
  enterGame() {
    gid('pg-setup').style.display = 'none';
    gid('app').style.display = 'grid';
    this.applyClubTheme();
    if (G.sacked) { this.nav('sacked'); return; }
    if (!G.curFix && !G.endProcessed) { if (advanceWorld()) autoPickXI(); }
    this.nav(G.curFix ? 'hub' : 'end');
  },
  darken(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * 0.45) + ',' + Math.round(g * 0.45) + ',' + Math.round(b * 0.45) + ')';
  },
  quitToMenu() {
    saveGame();
    gid('app').style.display = 'none';
    gid('pg-setup').style.display = 'block';
    this.renderSetup();
    toast('Game saved.');
  },
  backToMenu() {
    deleteSave();
    gid('app').style.display = 'none';
    gid('pg-setup').style.display = 'block';
    this.renderSetup();
  },

  /* ═════════ NAVIGATION ═════════ */
  nav(page) {
    this.page = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('on'));
    const el = gid('pg-' + page);
    if (el) el.classList.add('on');
    const sb = gid('sb-' + page);
    if (sb) sb.classList.add('on');
    this.topbar();
    const r = {
      hub: () => this.renderHub(), squad: () => this.renderSquad(), lineup: () => this.renderLineup(),
      tactics: () => this.renderTactics(), training: () => this.renderTraining(), transfers: () => this.renderTransfers(),
      fixtures: () => this.renderFixtures(), table: () => this.renderTable(), europe: () => this.renderEurope(),
      cups: () => this.renderCups(), inbox: () => this.renderInbox(), subs: () => this.renderSubs(),
      end: () => this.renderSeasonEnd(), sacked: () => this.renderSacked()
    };
    if (r[page]) r[page]();
  },
  topbar() {
    if (!G) return;
    gid('tb-date').textContent = fmtDate(curDate());
    const played = G.plW + G.plD + G.plL;
    gid('tb-pos').textContent = played > 0 ? ordinal(leaguePos()) : '—';
    gid('tb-pts').textContent = G.pts;
    gid('tb-bud').textContent = money(G.budget);
    const gd = G.plGF - G.plGA;
    gid('tb-gd').textContent = (gd >= 0 ? '+' : '') + gd;
    gid('tb-morale').textContent = moraleEmoji(G.morale);
    if (G.euro) {
      const names = { league: 'MD ' + G.euro.md + '/' + EURO_CFG[G.euro.comp].mds, po: 'Play-off', r16: 'Last 16', qf: 'Quarters', sf: 'Semis', f: 'FINAL', won: 'CHAMPIONS!', out: 'Out' };
      gid('tb-euro').textContent = G.euro.comp + ': ' + (names[G.euro.phase] || G.euro.phase);
    } else gid('tb-euro').textContent = '—';
    const wn = winName();
    gid('tb-window').innerHTML = wn ? '<div class="tb-window">' + wn + '</div>' : '';
    const ub = gid('tb-unread'), sb = gid('sb-badge');
    if (G.unread > 0) { ub.textContent = G.unread; ub.style.display = 'flex'; sb.textContent = G.unread; sb.style.display = 'inline'; }
    else { ub.style.display = 'none'; sb.style.display = 'none'; }
    gid('sb-form').innerHTML = G.form.slice(-8).map(r => '<span class="fdot fdot-' + r + '">' + r + '</span>').join('');
  },

  /* ═════════ HUB ═════════ */
  renderHub() {
    // If a match was finalized but the user left the result screen via the
    // sidebar, the world hasn't advanced yet — do it here so the hub never
    // mistakes "between fixtures" for "season over".
    if (!G.curFix && (!M || M.finished) && !G.endProcessed && !G.sacked) {
      M = null;
      if (advanceWorld()) autoPickXI();
    }
    gid('hub-sub').textContent = 'Season ' + G.season + ' · ' + G.manager + ' · ' + userClub().full;
    gid('h-pts').textContent = G.pts;
    const played = G.plW + G.plD + G.plL;
    gid('h-pos').textContent = played > 0 ? ordinal(leaguePos()) : '—';
    gid('h-wdl').textContent = G.plW + '-' + G.plD + '-' + G.plL;
    gid('h-bud').textContent = money(G.budget);
    gid('h-conf').textContent = G.boardConf;
    gid('h-target').textContent = userClub().exp;
    gid('h-board-fill').style.width = G.boardConf + '%';
    gid('h-board-mood').textContent = G.boardConf > 70 ? '😊 Delighted' : G.boardConf > 40 ? '😐 Watching closely' : '😰 Job at risk';
    gid('h-board-note').textContent = G.boardConf > 70 ? 'The board is happy with your progress.' : G.boardConf > 40 ? 'Results must improve soon.' : 'Warning: confidence is critically low.';
    // next fixture
    const fix = G.curFix;
    if (fix) {
      gid('h-comp').textContent = this.compLabel(fix) + (isDerby(fix) ? ' · 🔥 DERBY' : '');
      gid('h-matchline').innerHTML = fix.home ? userClub().name + ' <span style="color:var(--text2)">vs</span> ' + esc(fix.opp)
        : esc(fix.opp) + ' <span style="color:var(--text2)">vs</span> ' + userClub().name;
      gid('h-venue').textContent = fix.neutral ? 'Wembley Stadium (neutral)' : fix.home ? userClub().stadium : 'Away';
      gid('h-matchdate').textContent = fmtDate(dateOf(fix.day));
      const appr = predictApproach(fix);
      gid('h-oppform').textContent = 'Strength ' + fix.str + ' · Scouts: ' +
        (appr === 'bus' ? 'they will sit deep and defend in numbers.' : appr === 'attack' ? 'they will come at us — expect an open game.' : 'an even contest, fine margins.');
      gid('hub-play-btn').disabled = false;
      gid('hub-continue').textContent = 'Continue ▶';
    } else {
      gid('h-comp').textContent = '';
      gid('h-matchline').textContent = 'Season complete';
      gid('h-venue').textContent = ''; gid('h-matchdate').textContent = ''; gid('h-oppform').textContent = '';
      gid('hub-play-btn').disabled = true;
      gid('hub-continue').textContent = 'Season Review ▶';
    }
    // competitions card
    let comps = '';
    if (G.euro) {
      const cfg = EURO_CFG[G.euro.comp];
      const names = { league: 'League phase — MD ' + G.euro.md + '/' + cfg.mds, po: 'Knockout play-off', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', f: 'THE FINAL', won: '🏆 WINNERS!', out: 'Eliminated' };
      comps += '<div style="font-size:12px;color:var(--gold)">' + cfg.icon + ' ' + cfg.label + ': ' + names[G.euro.phase] + '</div>';
    }
    comps += '<div style="font-size:12px;color:var(--red);margin-top:4px">🏆 FA Cup: ' + (G.fa.won ? 'WINNERS!' : G.fa.elim ? 'Eliminated' : G.fa.round) + '</div>';
    comps += '<div style="font-size:12px;color:var(--green);margin-top:4px">🏆 Carabao Cup: ' + (G.lc.won ? 'WINNERS!' : G.lc.elim ? 'Eliminated' : G.lc.round) + '</div>';
    gid('hub-comps').innerHTML = '<div class="card"><div class="card-title">Competitions</div>' + comps + '</div>';
    // injuries & suspensions
    const probs = userSquad().filter(p => p.injured || p.susp > 0);
    gid('hub-injuries').innerHTML = probs.length ? probs.map(p =>
      '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border)"><span>' + esc(p.n) + '</span>' +
      (p.injured ? '<span class="inj-badge">' + esc(p.injT) + ' — ' + Math.ceil(p.injD / 7) + 'w</span>' : '<span class="susp-badge">Suspended ' + p.susp + '</span>') + '</div>'
    ).join('') : '<div style="font-size:12px;color:var(--green)">✅ Everyone available</div>';
    // recent results
    const recent = G.userResults.slice(-5).reverse();
    gid('hub-results').innerHTML = recent.length ? recent.map(r =>
      '<div style="display:flex;justify-content:space-between;gap:6px;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);flex:1">' + (r.home ? 'vs' : '@') + ' ' + esc(r.opp) + ' <span style="font-size:10px">(' + r.comp + ')</span></span>' +
      '<span style="font-weight:700">' + r.hg + '-' + r.ag + '</span><span class="rb rb-' + r.out + '">' + r.out + '</span></div>'
    ).join('') : '<div style="font-size:12px;color:var(--text2)">No matches played yet.</div>';
    // news
    gid('hub-news').innerHTML = G.inbox.slice(0, 5).map(m =>
      '<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px"><span style="font-size:14px">' + m.icon + '</span><span>' + esc(m.msg) + '</span></div>'
    ).join('') || '<div style="font-size:12px;color:var(--text2)">No news.</div>';
    // pending offer
    const ofEl = gid('hub-offer-card');
    if (G.pendingOffer) {
      const p = playerById(G.pendingOffer.pid);
      ofEl.innerHTML = p ? '<div class="card gold"><div class="card-title" style="color:var(--gold)">Transfer Bid!</div>' +
        '<div style="font-size:12px;margin-bottom:10px"><strong>' + esc(G.pendingOffer.club) + '</strong> bid <strong>' + money(G.pendingOffer.amt) + '</strong> for <strong>' + esc(p.n) + '</strong> (value ' + money(p.val) + ')</div>' +
        '<div class="g2"><button class="btn dan sm" onclick="UI.rejectOffer()">Reject</button><button class="btn suc sm" onclick="UI.acceptOffer()">Accept</button></div></div>' : '';
    } else ofEl.innerHTML = '';
  },
  compLabel(fix) {
    if (fix.comp === 'PL') return 'Premier League — Round ' + fix.round;
    if (fix.comp === 'FA') return 'FA Cup — ' + fix.round;
    if (fix.comp === 'LC') return 'Carabao Cup — ' + fix.round;
    const cfg = EURO_CFG[fix.comp];
    const ph = { league: 'Matchday ' + fix.md, po: 'Knockout Play-off', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', f: 'FINAL' };
    return cfg.label + ' — ' + (ph[fix.phase] || '');
  },
  continueToMatch() {
    if (M && !M.finished) { this.nav('match'); return; }
    if (!G.curFix) {
      M = null;
      if (advanceWorld()) { autoPickXI(); this.nav('hub'); return; }
      this.nav('end'); return;
    }
    this.nav('lineup');
  },

  /* ═════════ LINEUP ═════════ */
  renderLineup() {
    gid('lu-fm').value = G.tactic;
    if (G.xi.every(x => x === null)) autoPickXI();
    this.drawPitchNodes();
    this.renderBench();
  },
  drawPitchNodes() {
    const con = gid('pitch-container');
    con.innerHTML = '';
    const xy = FORM_XY[G.tactic], slots = FORM_SLOTS[G.tactic];
    xy.forEach((pos, i) => {
      const pid = G.xi[i], pl = pid ? playerById(pid) : null;
      const oop = pl && posFitMult(slots[i], pl) < 0.9;
      const d = document.createElement('div');
      let cls = 'pnode';
      if (!pl) cls += ' empty';
      else if (pl.injured) cls += ' injd';
      else if (pl.fit < 45) cls += ' low';
      else if (pl.fit < 70) cls += ' tired';
      if (oop) cls += ' oop';
      d.className = cls;
      d.style.left = pos[0] + '%'; d.style.top = pos[1] + '%';
      d.textContent = pl ? pl.n.split(' ').pop().substring(0, 8) : (slots[i] || '?');
      d.title = pl ? pl.n + ' · ' + pl.p + ' · Fit ' + pl.fit + '%' + (oop ? ' · OUT OF POSITION at ' + slots[i] : '') : slots[i];
      d.onclick = () => this.openPicker(i);
      con.appendChild(d);
    });
  },
  renderBench() {
    const bl = gid('bench-list');
    bl.innerHTML = '';
    G.bench.forEach((pid, i) => {
      const pl = playerById(pid);
      if (!pl) return;
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = '<span class="tag tag-' + pl.p + '">' + pl.p + '</span><span style="flex:1;font-weight:500">' + esc(pl.n) + '</span>' +
        (pl.injured ? '<span class="inj-badge">INJ</span>' : '<span style="font-size:11px;color:' + fitCol(pl.fit) + '">' + pl.fit + '%</span>') +
        '<span class="rat" style="margin:0 6px">' + pl.r + '</span>';
      const btn = document.createElement('button');
      btn.className = 'btn sm dan'; btn.textContent = '✕';
      btn.onclick = () => { G.bench.splice(i, 1); this.renderBench(); };
      row.appendChild(btn);
      bl.appendChild(row);
    });
    const ba = gid('bench-add');
    ba.innerHTML = '';
    if (G.bench.length < 9) {
      const ab = document.createElement('button');
      ab.className = 'btn suc full'; ab.style.marginTop = '8px'; ab.textContent = '+ Add Bench Player';
      ab.onclick = () => this.openPicker('bench');
      ba.appendChild(ab);
    }
  },
  openPicker(target) {
    this.pickerTarget = target;
    const slot = target === 'bench' ? null : FORM_SLOTS[G.tactic][target];
    gid('pk-lbl').textContent = slot ? 'Pick ' + slot + ' — anyone can play here, best fits first' : 'Pick bench player';
    const inUse = {};
    G.xi.forEach((id, i) => { if (id && i !== target) inUse[id] = true; });
    G.bench.forEach(id => { inUse[id] = true; });
    const avail = userSquad()
      .filter(p => !inUse[p.id] && p.susp <= 0)
      .sort((a, b) => {
        const fa = slot ? posFitMult(slot, a) : 1, fb = slot ? posFitMult(slot, b) : 1;
        return fb - fa || b.r - a.r;
      });
    const list = gid('pk-list');
    list.innerHTML = '';
    avail.forEach(pl => {
      const fitM = slot ? posFitMult(slot, pl) : 1;
      const oop = fitM < 0.9;
      const row = document.createElement('div');
      row.className = 'list-row'; row.style.cursor = 'pointer';
      if (oop) row.style.opacity = '.75';
      row.innerHTML = '<span class="tag tag-' + pl.p + '">' + pl.p + '</span><span style="flex:1;font-weight:500">' + esc(pl.n) +
        (oop ? ' <span class="susp-badge" title="Out of position — will play below his rating">OOP</span>' : '') + '</span>' +
        (pl.injured ? '<span class="inj-badge">INJ</span>' : '<span style="font-size:11px;color:' + fitCol(pl.fit) + '">' + pl.fit + '%</span>') +
        '<span class="rat" style="margin-left:6px">' + (oop ? Math.round(pl.r * fitM) + '<span style="color:var(--text2);font-weight:400">/' + pl.r + '</span>' : pl.r) + '</span>';
      row.onclick = () => {
        if (pl.injured) { toast(pl.n + ' is injured.'); return; }
        if (this.pickerTarget === 'bench') G.bench.push(pl.id);
        else {
          G.xi[this.pickerTarget] = pl.id;
          if (oop) toast(pl.n + ' will play out of position at ' + slot + ' (effective ~' + Math.round(pl.r * fitM) + ').');
        }
        this.closePicker(); this.drawPitchNodes(); this.renderBench();
      };
      list.appendChild(row);
    });
    gid('pk-panel').style.display = 'block';
    gid('bench-panel').style.display = 'none';
  },
  closePicker() {
    gid('pk-panel').style.display = 'none';
    gid('bench-panel').style.display = 'block';
  },
  changeFormation() {
    G.tactic = gid('lu-fm').value;
    autoPickXI();
    this.drawPitchNodes(); this.renderBench();
  },
  autoFill() { autoPickXI(); this.drawPitchNodes(); this.renderBench(); },

  /* ═════════ PRESS ═════════ */
  pressAnswered: 0, pressTotal: 0,
  buildPress(containerId, qs, doneBtnId) {
    const container = gid(containerId), doneBtn = gid(doneBtnId);
    container.innerHTML = '';
    this.pressAnswered = 0; this.pressTotal = qs.length;
    doneBtn.style.display = 'none';
    qs.forEach(q => {
      const div = document.createElement('div');
      div.className = 'card'; div.innerHTML = '<div class="press-q">📰 ' + esc(q.q) + '</div>';
      q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'press-opt'; btn.textContent = '▸ ' + opt.t;
        btn.onclick = () => {
          let m = opt.m || 0, b = opt.b || 0;
          if (opt.risk && Math.random() < 0.3) { m = -3; b = -1; toast('The media twist your words — squad unimpressed.'); }
          G.morale = clamp(G.morale + m, 5, 100);
          G.boardConf = clamp(G.boardConf + b, 0, 100);
          div.querySelectorAll('.press-opt').forEach(s => { s.disabled = true; s.style.opacity = '.5'; });
          btn.style.opacity = '1'; btn.style.borderColor = 'var(--green)'; btn.style.background = 'rgba(39,174,96,.08)';
          this.pressAnswered++;
          if (this.pressAnswered >= this.pressTotal) doneBtn.style.display = 'inline-flex';
        };
        div.appendChild(btn);
      });
      container.appendChild(div);
    });
  },
  preMatch() {
    if (M && !M.finished) { this.nav('match'); return; }
    if (!G.curFix) { this.nav('hub'); return; }
    for (let i = 0; i < 11; i++) {
      if (G.xi[i] === null) { toast('Fill all 11 positions!'); return; }
      const p = playerById(G.xi[i]);
      if (p && (p.injured || p.susp > 0)) { toast(p.n + ' is unavailable — replace him!'); return; }
    }
    const fix = G.curFix;
    gid('pp-fixture').textContent = this.compLabel(fix) + ' — vs ' + fix.opp + ' · ' + fmtDate(dateOf(fix.day));
    const qs = shuffle(PRESS_QS.pre).slice(0, 2);
    this.buildPress('pp-questions', qs, 'pp-done');
    this.nav('prepress');
  },
  skipPress() { this.startMatch(); },

  /* ═════════ MATCH ═════════ */
  TPM: 70, // visual ticks per match minute
  startMatch() {
    const fix = G.curFix;
    startMatchState(fix);
    this.speed = 1; this.paused = false; this.minTimer = 0; this.htShown = false;
    const me = userClub();
    gid('m-home').textContent = fix.home || fix.neutral ? me.name : fix.opp;
    gid('m-away').textContent = fix.home || fix.neutral ? fix.opp : me.name;
    gid('m-comp').textContent = this.compLabel(fix);
    gid('m-venue').textContent = fix.neutral ? 'Wembley Stadium' : fix.home ? me.stadium : 'Away — ' + fix.opp;
    gid('m-score').textContent = '0 — 0';
    gid('m-min').textContent = "0'";
    gid('m-scorers-inline').textContent = '';
    gid('m-shots').textContent = '0-0'; gid('m-xg').textContent = '0.0-0.0';
    gid('m-poss').textContent = '50%'; gid('m-cards').textContent = '0Y 0R'; gid('m-subs').textContent = '0/5';
    gid('mlog').innerHTML = '';
    gid('btn-ft').disabled = true;
    gid('btn-pause').disabled = false; gid('btn-pause').textContent = '⏸ Pause';
    gid('highlight-banner').className = 'highlight-banner';
    gid('highlight-banner').textContent = 'Kick off! ' + me.name + ' vs ' + fix.opp;
    this.logMatch('ml-ev', "0' Kick off! " + this.compLabel(fix));
    this.setSpeed(1);
    this.nav('match');
    setTimeout(() => {
      const oppCols = fix.oppKey ? [CLUB_BY_KEY[fix.oppKey].col1, CLUB_BY_KEY[fix.oppKey].col2] : ['#888888', '#cc1010'];
      PITCH.init(gid('pitch-canvas'), G.tactic,
        M.playing.map(id => { const p = playerById(id); return p ? p.n : '?'; }),
        M.oppXI.map(p => p.n), [me.col1, me.col2], oppCols);
      this.runLoop();
    }, 100);
  },
  runLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = () => {
      if (!M || M.finished) { this.raf = null; return; }
      this.raf = requestAnimationFrame(loop);
      if (this.paused) { PITCH.draw(); return; }
      for (let s = 0; s < this.speed; s++) {
        PITCH.update();
        this.minTimer++;
        if (this.minTimer >= this.TPM) {
          this.minTimer = 0;
          if (M.min < M.endMin) {
            const evs = matchMinute();
            this.processEvents(evs);
            gid('m-min').textContent = fmtMin(M.min);
            this.updateMatchStats();
            if (M.min === 45 && !this.htShown) {
              this.htShown = true;
              cancelAnimationFrame(this.raf); this.raf = null;
              this.showHalfTime();
              return;
            }
            if (M.min === 90 && M.endMin > 90) {
              this.banner('', '⏱ ' + (M.endMin - 90) + ' minutes of added time.');
              this.logMatch('ml-ev', "90' Fourth official signals " + (M.endMin - 90) + ' added minutes.');
            }
            if (M.min >= M.endMin) {
              cancelAnimationFrame(this.raf); this.raf = null;
              gid('btn-ft').disabled = false;
              gid('btn-pause').disabled = true;
              this.banner('', '⏱ Full time! ' + M.score[0] + ' — ' + M.score[1]);
              setTimeout(() => this.fullTime(), 900);
              return;
            }
          }
        }
      }
      PITCH.draw();
    };
    this.raf = requestAnimationFrame(loop);
  },
  processEvents(evs) {
    evs.forEach(e => {
      const minPrefix = fmtMin(M.min) + ' ';
      if (e.type === 'var') { this.banner('yellow', e.text); this.logMatch('ml-yel', minPrefix + e.text); return; }
      if (e.type === 'goal') {
        PITCH.goalFlash();
        this.banner('goal', e.text);
        this.logMatch('ml-goal', minPrefix + e.text);
        gid('m-score').textContent = M.score[0] + ' — ' + M.score[1];
        gid('m-scorers-inline').textContent = M.scorers.filter(s => s.side === 0).map(s => s.n + ' ' + s.min + "'").join(' · ');
      } else if (e.type === 'oppgoal') {
        PITCH.concededFlash();
        this.banner('danger', e.text);
        this.logMatch('ml-opp', minPrefix + e.text);
        gid('m-score').textContent = M.score[0] + ' — ' + M.score[1];
      } else if (e.type === 'chance') { this.banner('', e.text); this.logMatch('ml-ev', minPrefix + e.text); }
      else if (e.type === 'oppchance') { this.banner('danger', e.text); this.logMatch('ml-ev', minPrefix + e.text); }
      else if (e.type === 'yellow') { this.banner('yellow', e.text); this.logMatch('ml-yel', minPrefix + e.text); }
      else if (e.type === 'red') { this.banner('danger', e.text); this.logMatch('ml-red', minPrefix + e.text); }
      else if (e.type === 'susp') { this.logMatch('ml-yel', minPrefix + e.text); }
      else if (e.type === 'injury') { this.banner('yellow', e.text); this.logMatch('ml-inj', minPrefix + e.text); }
      else if (e.type === 'flavour') { this.logMatch('ml-ev', minPrefix + e.text); }
    });
  },
  updateMatchStats() {
    gid('m-shots').textContent = M.shots[0] + '-' + M.shots[1];
    gid('m-xg').textContent = M.xg[0].toFixed(1) + '-' + M.xg[1].toFixed(1);
    gid('m-poss').textContent = M.poss + '%';
    gid('m-cards').textContent = M.yel[0] + 'Y ' + M.red[0] + 'R';
    gid('m-subs').textContent = M.subsUsed + '/5';
  },
  bannerT: null,
  banner(type, text) {
    const el = gid('highlight-banner');
    el.textContent = text;
    el.className = 'highlight-banner' + (type ? ' ' + type : '');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => { el.textContent = 'Match in progress...'; el.className = 'highlight-banner'; }, 4000);
  },
  logMatch(cls, text) {
    const log = gid('mlog');
    const p = document.createElement('p');
    p.className = cls; p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  },
  setSpeed(s) {
    this.speed = s;
    [1, 2, 4, 8].forEach(v => { const b = gid('btn-spd' + v); if (b) b.className = 'spd-btn' + (v === s ? ' on' : ''); });
  },
  togglePause() {
    this.paused = !this.paused;
    gid('btn-pause').textContent = this.paused ? '▶ Resume' : '⏸ Pause';
  },
  shout(type) {
    if (!M || M.finished) return;
    const s = applyShout(type);
    if (!s) return;
    this.banner(s.eff > 0 ? 'goal' : 'yellow', s.msg);
    const btn = document.querySelector('.shout-btn[onclick="UI.shout(\'' + type + '\')"]');
    if (btn) { btn.disabled = true; btn.style.opacity = '.4'; setTimeout(() => { btn.disabled = false; btn.style.opacity = '1'; }, 15000); }
  },

  /* ═════════ HALF TIME ═════════ */
  showHalfTime() {
    gid('ht-score').textContent = M.score[0] + ' — ' + M.score[1];
    gid('ht-scorers').textContent = M.scorers.length ? M.scorers.map(s => (s.side === 1 ? '(' + s.n + ')' : s.n) + ' ' + s.min + "'").join(' · ') : 'No goals';
    const talks = [
      { t: '🔥 Demand More', m: 6, eff: 0.04 },
      { t: '👏 Keep It Up', m: 8, eff: 0.02 },
      { t: '🧊 Stay Focused', m: 4, eff: 0.01 },
      { t: '🌟 Express Yourself', m: 5, eff: 0.03 },
      { t: '😡 The Hairdryer', m: M.score[0] < M.score[1] ? 10 : -6, eff: 0.05 }
    ];
    const c = gid('ht-talks');
    c.innerHTML = '';
    talks.forEach(talk => {
      const btn = document.createElement('button');
      btn.className = 'btn full'; btn.style.marginBottom = '6px'; btn.textContent = talk.t;
      btn.onclick = () => {
        G.morale = clamp(G.morale + talk.m, 5, 100);
        M.shoutEffect = Math.max(M.shoutEffect, talk.eff);
        toast('Team talk delivered.' + (talk.m > 0 ? ' Morale +' + talk.m : ' The squad bristles...'));
        c.querySelectorAll('button').forEach(b => { b.disabled = true; });
      };
      c.appendChild(btn);
    });
    this.nav('halftime');
  },
  resumeSecondHalf() {
    this.nav('match');
    this.paused = false;
    gid('btn-pause').textContent = '⏸ Pause';
    this.runLoop();
  },

  /* ═════════ SUBS ═════════ */
  subOff: null,
  renderSubs() {
    if (!M || M.finished) { this.nav('hub'); return; }
    gid('sub-left').textContent = (5 - M.subsUsed) + ' left';
    const offEl = gid('sub-off'), onEl = gid('sub-on');
    offEl.innerHTML = ''; onEl.innerHTML = '';
    if (M.subsUsed >= 5) { offEl.innerHTML = '<p style="color:var(--text2);font-size:12px">All 5 subs used.</p>'; return; }
    M.playing.forEach((pid, i) => {
      if (!pid) return;
      const pl = playerById(pid);
      if (!pl) return;
      const f = M.fit[pid] !== undefined ? M.fit[pid] : pl.fit;
      const row = document.createElement('div');
      row.className = 'list-row'; row.style.cursor = 'pointer';
      if (this.subOff === i) row.style.background = 'rgba(41,128,185,.15)';
      const rating = (M.ratings[pid] || 6.5).toFixed(1);
      row.innerHTML = '<span class="tag tag-' + pl.p + '">' + pl.p + '</span><span style="flex:1;font-weight:500">' + esc(pl.n) + '</span>' +
        '<span style="font-size:11px;color:' + ratCol(Number(rating)) + '">' + rating + '</span>' +
        '<span style="font-size:11px;color:' + fitCol(f) + ';margin-left:8px">' + fitLbl(f) + '</span>';
      row.onclick = () => { this.subOff = i; this.renderSubs(); };
      offEl.appendChild(row);
    });
    gid('sub-on-sec').style.opacity = this.subOff === null ? '.5' : '1';
    M.benchIds.forEach(bid => {
      const bp = playerById(bid);
      if (!bp || bp.injured) return;
      const row = document.createElement('div');
      row.className = 'list-row';
      row.style.cursor = this.subOff === null ? 'default' : 'pointer';
      row.style.opacity = this.subOff === null ? '.5' : '1';
      row.innerHTML = '<span class="tag tag-' + bp.p + '">' + bp.p + '</span><span style="flex:1;font-weight:500">' + esc(bp.n) + '</span>' +
        '<span style="font-size:11px;color:' + fitCol(bp.fit) + '">' + bp.fit + '%</span><span class="rat" style="margin-left:6px">' + bp.r + '</span>';
      row.onclick = () => {
        if (this.subOff === null) { toast('Tap who comes OFF first'); return; }
        const outP = playerById(M.playing[this.subOff]);
        if (makeSub(this.subOff, bid)) {
          this.logMatch('ml-sub', M.min + "' SUB: " + bp.n + ' on for ' + (outP ? outP.n : 'player') + '.');
          PITCH.setName(this.subOff, bp.n);
          toast(bp.n + ' is on!');
          this.subOff = null;
          gid('m-subs').textContent = M.subsUsed + '/5';
          if (this.htShown && M.min === 45) this.nav('halftime');
          else { this.nav('match'); if (!this.raf) this.runLoop(); }
        }
      };
      onEl.appendChild(row);
    });
  },

  /* ═════════ RESULT ═════════ */
  fullTime() {
    if (!M) return;
    if (!M.finished) {
      const res = finalizeMatch();
      saveGame();
      this.showResult(res);
    } else this.nav('result');
  },
  showResult() {
    const fix = M.fix;
    gid('r-comp').textContent = this.compLabel(fix);
    gid('r-line').textContent = (fix.home || fix.neutral ? userClub().name + ' vs ' + fix.opp : fix.opp + ' vs ' + userClub().name);
    gid('r-score').textContent = M.score[0] + ' — ' + M.score[1];
    gid('r-note').textContent = M.decidedBy ? (M.out === 'W' ? 'Won ' : 'Lost ') + M.decidedBy + '!' : '';
    gid('r-scorers').textContent = M.scorers.length ? M.scorers.map(s => (s.side === 1 ? '(' + s.n + ')' : s.n) + ' ' + s.min + "'").join(' · ') : 'No goals.';
    gid('r-shots').textContent = M.shots[0] + '-' + M.shots[1];
    gid('r-poss').textContent = M.poss;
    gid('r-xg').textContent = M.xg[0].toFixed(1) + '—' + M.xg[1].toFixed(1);
    // ratings
    const ids = Object.keys(M.participated).map(Number);
    ids.sort((a, b) => (M.ratings[b] || 0) - (M.ratings[a] || 0));
    gid('r-ratings').innerHTML = ids.map(id => {
      const p = playerById(id);
      if (!p) return '';
      const rt = (M.ratings[id] || 6).toFixed(1);
      const motm = M.motm && M.motm.id === id ? ' ⭐' : '';
      return '<div class="list-row"><span class="tag tag-' + p.p + '">' + p.p + '</span><span style="flex:1">' + esc(p.n) + motm + '</span>' +
        '<span style="font-weight:700;color:' + ratCol(Number(rt)) + '">' + rt + '</span></div>';
    }).join('');
    // post press setup
    gid('post-result-label').textContent = (M.out === 'W' ? 'Win' : M.out === 'D' ? 'Draw' : 'Loss') + ' vs ' + fix.opp + ' (' + M.score[0] + '-' + M.score[1] + ') · ' + this.compLabel(fix);
    const key = M.out === 'W' ? 'post_win' : M.out === 'D' ? 'post_draw' : 'post_loss';
    this.buildPress('post-questions', shuffle(PRESS_QS[key]).slice(0, 2), 'post-done');
    this.nav('result');
  },
  postPress() { this.nav('postpress'); },
  afterMatch() {
    M = null;
    if (G.sacked) { saveGame(); this.nav('sacked'); return; }
    if (!G.curFix) {
      if (!advanceWorld()) { this.nav('end'); return; }
      autoPickXI();
    }
    this.nav('hub');
  },

  /* ═════════ SQUAD ═════════ */
  sqTab(t) {
    this.sqTabSel = t;
    ['players', 'stats', 'injuries', 'contracts'].forEach(k => { gid('sq-t-' + k).className = 'tab' + (k === t ? ' on' : ''); });
    this.renderSquad();
  },
  renderSquad() {
    ['players', 'stats', 'injuries', 'contracts'].forEach(k => { gid('sq-t-' + k).className = 'tab' + (k === this.sqTabSel ? ' on' : ''); });
    const el = gid('sq-content');
    const t = this.sqTabSel;
    if (t === 'players') {
      const order = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];
      const lbls = { GK: 'Goalkeepers', RB: 'Right Backs', CB: 'Centre Backs', LB: 'Left Backs', DM: 'Defensive Midfielders', CM: 'Midfielders', AM: 'Attacking Midfielders', RW: 'Right Wingers', LW: 'Left Wingers', ST: 'Strikers' };
      el.innerHTML = order.map(pos => {
        const grp = userSquad().filter(p => p.p === pos);
        if (!grp.length) return '';
        return '<div class="card-title" style="margin-top:12px">' + lbls[pos] + '</div><div class="card" style="padding:8px 12px">' +
          grp.map(pl => this.playerRow(pl)).join('') + '</div>';
      }).join('');
    } else if (t === 'stats') {
      const played = userSquad().filter(p => p.apps > 0).sort((a, b) => (b.g + b.a) - (a.g + a.a));
      el.innerHTML = '<div class="card"><table class="data-table"><tr><th></th><th>Player</th><th>Apps</th><th>Goals</th><th>Assists</th><th>Avg Rating</th></tr>' +
        played.map((p, i) => {
          const avg = (p.rsum / p.apps).toFixed(2);
          return '<tr><td>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1) + '</td>' +
            '<td style="cursor:pointer;color:#5aabdd" onclick="UI.playerModal(' + p.id + ')">' + esc(p.n) + '</td>' +
            '<td>' + p.apps + '</td><td style="color:var(--green);font-weight:700">' + p.g + '</td>' +
            '<td style="color:#5aabdd;font-weight:700">' + p.a + '</td>' +
            '<td style="color:' + ratCol(Number(avg)) + ';font-weight:700">' + avg + '</td></tr>';
        }).join('') + '</table>' + (played.length ? '' : '<p style="color:var(--text2);font-size:12px">No appearances yet.</p>') + '</div>';
    } else if (t === 'injuries') {
      const probs = userSquad().filter(p => p.injured || p.susp > 0);
      el.innerHTML = probs.length ? '<div class="card">' + probs.map(p =>
        '<div class="list-row"><span class="tag tag-' + p.p + '">' + p.p + '</span><span style="flex:1">' + esc(p.n) + '</span>' +
        (p.injured ? '<span class="inj-badge">' + esc(p.injT) + ' — ' + Math.ceil(p.injD / 7) + 'w</span>' : '') +
        (p.susp > 0 ? '<span class="susp-badge">Banned ' + p.susp + ' match' + (p.susp > 1 ? 'es' : '') + '</span>' : '') + '</div>').join('') + '</div>'
        : '<div class="card"><div style="text-align:center;padding:20px;color:var(--green);font-size:14px">✅ Full squad available!</div></div>';
    } else {
      const sorted = userSquad().slice().sort((a, b) => a.contract - b.contract);
      el.innerHTML = '<div class="card">' + sorted.map(pl => {
        const cls = pl.contract >= 3 ? 'contract-ok' : pl.contract === 2 ? 'contract-warn' : 'contract-danger';
        const renewCost = Math.max(1, Math.round(pl.val * 0.06));
        return '<div class="list-row"><span class="tag tag-' + pl.p + '">' + pl.p + '</span>' +
          '<span style="flex:1;font-weight:500">' + esc(pl.n) + '</span>' +
          '<span style="color:var(--text2);font-size:11px">£' + pl.wage + 'k/wk</span>' +
          '<span class="' + cls + '" style="margin:0 8px">' + pl.contract + 'yr</span>' +
          (pl.contract <= 2 ? '<button class="btn suc sm" onclick="UI.renew(' + pl.id + ')">Renew (' + money(renewCost) + ')</button>' : '') + '</div>';
      }).join('') + '</div><p style="font-size:11px;color:var(--text2);margin-top:8px">Renewing costs ~6% of value and adds 3 years. Players leave free when contracts expire.</p>';
    }
  },
  playerRow(pl) {
    const avg = pl.apps > 0 ? (pl.rsum / pl.apps).toFixed(1) : '—';
    return '<div class="list-row"><span style="color:var(--text2);font-size:11px;width:22px">' + pl.num + '</span>' +
      '<span class="tag tag-' + pl.p + '">' + pl.p + '</span>' +
      '<span style="flex:1;font-weight:500;cursor:pointer;color:#5aabdd" onclick="UI.playerModal(' + pl.id + ')">' + esc(pl.n) + '</span>' +
      '<span style="font-size:10px;color:var(--text2);width:24px">' + pl.age + 'y</span>' +
      (pl.loan ? '<span class="susp-badge">LOAN</span>' : pl.injured ? '<span class="inj-badge">INJ ' + Math.ceil(pl.injD / 7) + 'w</span>' : pl.susp > 0 ? '<span class="susp-badge">BAN</span>' : '<span style="font-size:11px;color:' + fitCol(pl.fit) + '">' + pl.fit + '%</span>') +
      '<span style="font-size:12px;margin:0 6px">' + moraleEmoji(pl.morale) + '</span>' +
      '<span style="font-size:11px;color:var(--text2);margin-right:6px">' + pl.g + 'G ' + pl.a + 'A · ' + avg + '</span>' +
      '<span class="rat">' + pl.r + '</span></div>';
  },
  renew(pid) {
    const p = playerById(pid);
    if (!p) return;
    const cost = Math.max(1, Math.round(p.val * 0.06));
    if (G.budget < cost) { toast('Not enough budget.'); return; }
    G.budget -= cost;
    p.contract = Math.min(5, p.contract + 3);
    p.morale = clamp(p.morale + 12, 5, 99);
    p.wage = Math.round(p.wage * 1.15);
    toast(p.n + ' signs until ' + (2025 + G.season + p.contract) + '!');
    saveGame();
    this.renderSquad();
    this.topbar();
  },

  /* ═════════ PLAYER MODAL ═════════ */
  playerModal(pid) {
    const p = playerById(pid);
    if (!p) return;
    const mine = p.club === G.club;
    const clubName = mine ? userClub().name : p.club ? CLUB_BY_KEY[p.club].name : (p.clubName || 'Free Agent');
    gid('mod-pl-name').textContent = p.n + ' · ' + p.p;
    gid('mod-pl-info').textContent = clubName + ' · Age ' + p.age + ' · Rating ' + p.r + (mine || p.scouted ? ' · Potential ' + p.pot : '') + ' · Value ' + (p.free ? 'Free' : money(p.val));
    const attrs = [['Pace', p.pac], ['Shooting', p.sho], ['Passing', p.pas], ['Dribbling', p.dri], ['Defending', p.def], ['Physical', p.phy]];
    const hidden = !mine && !p.scouted;
    gid('mod-pl-attrs').innerHTML = attrs.map(a => {
      const v = a[1];
      const col = v >= 85 ? '#27ae60' : v >= 75 ? '#5aabdd' : v >= 65 ? '#d35400' : '#c0392b';
      const label = hidden ? Math.max(1, v - 4) + '–' + Math.min(99, v + 4) : v;
      const w = hidden ? v : v;
      return '<div style="display:flex;align-items:center;gap:8px;font-size:11px"><span style="width:70px;color:var(--text2)">' + a[0] + '</span>' +
        '<div class="abar" style="flex:1"><div class="afill" style="width:' + w + '%;background:' + col + (hidden ? ';opacity:.4' : '') + '"></div></div>' +
        '<span style="width:42px;text-align:right;font-weight:700">' + label + '</span></div>';
    }).join('');
    let extra = '<div style="font-size:11px;color:var(--text2);margin-bottom:10px">' +
      'Season: ' + p.apps + ' apps · ' + p.g + 'G ' + p.a + 'A' + (p.apps ? ' · avg ' + (p.rsum / p.apps).toFixed(2) : '') +
      ' · Contract: ' + p.contract + 'yr · Wage: £' + p.wage + 'k/wk · Morale: ' + moraleEmoji(p.morale) + '</div>';
    if (mine) {
      extra += '<div class="btn-row">' +
        '<button class="btn sm suc" onclick="UI.praise(' + p.id + ')">👏 Praise</button>' +
        '<button class="btn sm warn" onclick="UI.criticize(' + p.id + ')">😠 Criticise</button>' +
        '<button class="btn sm" onclick="UI.toggleList(' + p.id + ')">' + (p.listed ? '✕ Unlist' : '📋 Transfer-list') + '</button>' +
        (!p.loan && p.age <= 23 ? '<button class="btn sm" onclick="UI.loanOut(' + p.id + ')">↗ Loan out</button>' : '') +
        '</div>';
    } else if (p.free) {
      extra += '<button class="btn suc full" onclick="UI.signFree(' + p.id + ')">✍️ Sign Free Agent (wage £' + p.wage + 'k/wk)</button>';
    } else {
      extra += '<div class="btn-row">' +
        (!p.scouted ? '<button class="btn sm" onclick="UI.scout(' + p.id + ')">🔍 Scout</button>' : '<span style="font-size:10px;color:var(--green);align-self:center">✓ Scouted</span>') +
        '<button class="btn sm pri" onclick="UI.openNegotiation(' + p.id + ')">💰 Make Bid</button></div>';
    }
    gid('mod-pl-extra').innerHTML = extra;
    gid('mod-player').classList.add('on');
  },
  praise(pid) {
    const p = playerById(pid);
    if (!p) return;
    if (Math.random() < 0.8) { p.morale = clamp(p.morale + 8, 5, 99); toast(p.n + ' appreciates your praise.'); }
    else { toast(p.n + ' thinks you are being insincere.'); p.morale = clamp(p.morale - 3, 5, 99); }
    this.playerModal(pid);
  },
  criticize(pid) {
    const p = playerById(pid);
    if (!p) return;
    if (Math.random() < 0.5) { p.morale = clamp(p.morale + 5, 5, 99); toast(p.n + ' responds to the challenge!'); }
    else { p.morale = clamp(p.morale - 8, 5, 99); toast(p.n + ' is upset by your criticism.'); }
    this.playerModal(pid);
  },
  toggleList(pid) {
    const p = playerById(pid);
    if (!p) return;
    p.listed = !p.listed;
    if (p.listed) { p.morale = clamp(p.morale - 6, 5, 99); toast(p.n + ' placed on the transfer list.'); }
    else toast(p.n + ' removed from the transfer list.');
    this.playerModal(pid);
  },
  loanOut(pid) {
    const p = playerById(pid);
    if (!p) return;
    p.loan = true;
    G.xi = G.xi.map(id => id === pid ? null : id);
    G.bench = G.bench.filter(id => id !== pid);
    toast(p.n + ' joins a Championship club on loan until the end of the season.');
    this.closeModal('mod-player');
    saveGame();
    if (this.page === 'squad') this.renderSquad();
  },
  scout(pid) {
    const p = playerById(pid);
    if (!p) return;
    p.scouted = true;
    const verdict = p.pot >= 90 ? 'a generational talent' : p.pot >= 86 ? 'an elite prospect' : p.pot - p.r >= 6 ? 'a player with real growth ahead' : p.r >= 85 ? 'ready-made quality' : 'a solid squad option';
    addInbox('🔍', 'Scout report: ' + p.n + ' (' + p.p + ', ' + p.age + ') — ' + verdict + '. Potential: ' + p.pot + '.', 'scout');
    toast('Scout report filed on ' + p.n + '.');
    this.playerModal(pid);
  },

  /* ═════════ TRANSFERS ═════════ */
  trTab(t) {
    this.trTabSel = t;
    ['buy', 'free', 'sell'].forEach(k => { gid('tr-t-' + k).className = 'tab' + (k === t ? ' on' : ''); });
    this.renderTransfers();
  },
  trSearch: '', trPos: 'ALL',
  renderTransfers() {
    ['buy', 'free', 'sell'].forEach(k => { gid('tr-t-' + k).className = 'tab' + (k === this.trTabSel ? ' on' : ''); });
    const wn = winName();
    gid('tr-status').innerHTML = (wn ? '<span style="color:var(--green);font-weight:700">' + wn + ' is OPEN</span>' : '<span style="color:var(--red)">Transfer window closed — you can scout and plan, free agents can still be signed</span>') +
      ' · Budget: <strong style="color:#5aabdd">' + money(G.budget) + '</strong>' +
      ' · Wages: <strong style="color:' + (wageBill() > G.wageCap * 0.92 ? 'var(--amber)' : 'var(--text)') + '">£' + wageBill() + 'k</strong>/£' + G.wageCap + 'k per week';
    const el = gid('tr-content');
    if (this.trTabSel === 'buy') {
      const posOpts = ['ALL', 'GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];
      let html = '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
        '<input type="text" id="tr-search" placeholder="Search player or club..." value="' + esc(this.trSearch) + '" oninput="UI.trSearch=this.value;UI.renderTransfers()" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:7px 12px;color:var(--text);font-family:inherit;width:220px">' +
        '<select style="width:110px;margin:0" onchange="UI.trPos=this.value;UI.renderTransfers()">' +
        posOpts.map(o => '<option' + (this.trPos === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
      const q = this.trSearch.toLowerCase();
      let list = Object.values(PLAYERS).filter(p => !p.free && (p.foreign || (p.club && p.club !== G.club)));
      if (this.trPos !== 'ALL') list = list.filter(p => p.p === this.trPos);
      if (q) list = list.filter(p => p.n.toLowerCase().indexOf(q) >= 0 || (p.club ? CLUB_BY_KEY[p.club].name : p.clubName || '').toLowerCase().indexOf(q) >= 0);
      list.sort((a, b) => b.r - a.r);
      html += '<div class="card" style="padding:8px 12px">' + list.slice(0, 50).map(p => {
        const clubName = p.club ? CLUB_BY_KEY[p.club].name : p.clubName;
        return '<div class="list-row"><span class="tag tag-' + p.p + '">' + p.p + '</span>' +
          '<span style="font-weight:500;cursor:pointer;color:#5aabdd;width:150px" onclick="UI.playerModal(' + p.id + ')">' + esc(p.n) + '</span>' +
          '<span style="flex:1;font-size:11px;color:var(--text2)">' + esc(clubName) + '</span>' +
          '<span style="font-size:10px;color:var(--text2);width:26px">' + p.age + 'y</span>' +
          '<span class="rat" style="margin:0 6px">' + p.r + '</span>' +
          '<span style="font-size:11px;width:56px;text-align:right">' + money(p.val) + '</span>' +
          '<button class="btn sm pri" style="margin-left:8px" onclick="UI.openNegotiation(' + p.id + ')">Bid</button></div>';
      }).join('') + (list.length > 50 ? '<p style="font-size:11px;color:var(--text2);padding:6px 0">…' + (list.length - 50) + ' more — refine your search.</p>' : '') + '</div>';
      el.innerHTML = html;
    } else if (this.trTabSel === 'free') {
      const frees = Object.values(PLAYERS).filter(p => p.free).sort((a, b) => b.r - a.r);
      el.innerHTML = '<div class="card" style="padding:8px 12px">' + (frees.length ? frees.map(p =>
        '<div class="list-row"><span class="tag tag-' + p.p + '">' + p.p + '</span>' +
        '<span style="flex:1;font-weight:500;cursor:pointer;color:#5aabdd" onclick="UI.playerModal(' + p.id + ')">' + esc(p.n) + '</span>' +
        '<span style="font-size:10px;color:var(--text2)">' + p.age + 'y</span>' +
        '<span class="rat" style="margin:0 8px">' + p.r + '</span>' +
        '<span style="font-size:11px;color:var(--text2)">£' + p.wage + 'k/wk</span>' +
        '<button class="btn sm suc" style="margin-left:8px" onclick="UI.signFree(' + p.id + ')">Sign</button></div>').join('')
        : '<p style="font-size:12px;color:var(--text2)">No free agents available.</p>') + '</div>';
    } else {
      const mine = Object.values(PLAYERS).filter(p => p.club === G.club).sort((a, b) => b.val - a.val);
      el.innerHTML = '<div class="card" style="padding:8px 12px">' + mine.map(p =>
        '<div class="list-row"><span class="tag tag-' + p.p + '">' + p.p + '</span>' +
        '<span style="flex:1;font-weight:500;cursor:pointer;color:#5aabdd" onclick="UI.playerModal(' + p.id + ')">' + esc(p.n) + (p.loan ? ' <span class="susp-badge">ON LOAN</span>' : '') + (p.listed ? ' <span class="susp-badge">LISTED</span>' : '') + (p.wantsOut ? ' <span class="inj-badge">WANTS OUT</span>' : '') + '</span>' +
        '<span class="rat" style="margin:0 8px">' + p.r + '</span>' +
        '<span style="font-size:11px;width:56px;text-align:right">' + money(p.val) + '</span>' +
        '<button class="btn sm" style="margin-left:8px" onclick="UI.toggleListRow(' + p.id + ')">' + (p.listed ? 'Unlist' : 'List') + '</button></div>').join('') + '</div>' +
        '<p style="font-size:11px;color:var(--text2)">Transfer-listed players attract bids during windows. Review bids from the Hub.</p>';
    }
  },
  toggleListRow(pid) {
    const p = playerById(pid);
    if (p) { p.listed = !p.listed; this.renderTransfers(); }
  },
  signFree(pid) {
    const p = playerById(pid);
    if (!p || !p.free) return;
    if (wageBill() + p.wage > G.wageCap) { toast('His £' + p.wage + 'k/wk wages break the cap (£' + wageBill() + 'k/£' + G.wageCap + 'k).'); return; }
    p.club = G.club; p.free = false; p.foreign = false; p.clubName = null;
    p.contract = p.age >= 31 ? 1 : 2;
    p.val = valueOf(p.r, p.age, p.pot);
    p.fit = rnd(70, 85);
    const nums = {}; userSquad().forEach(x => { nums[x.num] = true; });
    let n = 1; while (nums[n]) n++; p.num = n;
    addInbox('✍️', p.n + ' signs on a free transfer!', 'transfer');
    toast(p.n + ' joins the club!');
    this.closeModal('mod-player');
    saveGame();
    this.renderTransfers();
  },
  openNegotiation(pid) {
    const p = playerById(pid);
    if (!p) return;
    if (!inWindow()) { toast('The transfer window is closed.'); return; }
    this.closeModal('mod-player');
    gid('neg-name').textContent = 'Negotiate: ' + p.n + ' (' + p.p + ', ' + p.age + ')';
    gid('neg-info').textContent = (p.club ? CLUB_BY_KEY[p.club].name : p.clubName) + ' · Rating ' + p.r + ' · Value ' + money(p.val);
    // key players are protected — and sometimes simply not for sale
    const sellerSq = p.club ? squadOf(p.club) : null;
    const isKey = !p.listed && !p.wantsOut && (p.r >= 89 ||
      (sellerSq && sellerSq.length > 5 && sellerSq.slice().sort((a, b) => b.r - a.r).slice(0, 2).some(x => x.id === p.id)));
    const stamp = G.season + '-' + (winName() || '');
    if (!p._nfs || p._nfs.w !== stamp) p._nfs = { w: stamp, refuse: isKey && p.r >= 88 && Math.random() < 0.4 };
    if (p._nfs.refuse) {
      this.neg = null;
      p._hot = true;
      gid('neg-body').innerHTML = '<p style="font-size:12px;margin-bottom:6px">"' + esc(p.n) + ' is not for sale at any price this window." The club refuse to even open talks.</p>';
      gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>';
      gid('mod-neg').classList.add('on');
      return;
    }
    const mult = (p.listed || p.wantsOut) ? 0.95 : isKey ? 1.55 + (p.id % 20) / 100 : 1.15 + (p.id % 30) / 100;
    const ask = Math.max(1, Math.round(p.val * mult));
    this.neg = { pid: pid, ask: ask, attempts: 0, stage: 'fee', isKey: isKey };
    this.renderNegBody((isKey ? p.n + ' is one of their key players — it will take a premium. ' : '') +
      'The club wants around ' + money(ask) + '. Your budget: ' + money(G.budget) + '.');
    gid('mod-neg').classList.add('on');
  },
  renderNegBody(msg) {
    const n = this.neg;
    gid('neg-body').innerHTML = '<p style="font-size:12px;margin-bottom:10px">' + esc(msg) + '</p>' +
      '<div class="field-label">Your offer (£m)</div>' +
      '<input type="number" id="neg-offer" min="0" max="999" value="' + Math.min(G.budget, n.ask) + '" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);width:120px;font-family:inherit;font-size:14px">';
    gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>' +
      '<button class="btn pri" onclick="UI.submitOffer()">Submit Offer</button>';
  },
  submitOffer() {
    const n = this.neg;
    if (!n) return;
    const p = playerById(n.pid);
    const offer = Math.round(Number(gid('neg-offer').value) || 0);
    if (offer > G.budget) { toast('You only have ' + money(G.budget) + '!'); return; }
    n.attempts++;
    if (offer >= n.ask * 0.97) { n.fee = offer; this.personalTerms(p); }
    else if (offer >= n.ask * 0.82 && n.attempts <= 3) {
      n.ask = Math.round((n.ask + Math.max(offer, n.ask * 0.9)) / 2);
      this.renderNegBody('"Not quite enough." They counter at ' + money(n.ask) + '.');
    } else if (n.attempts >= 3) {
      p._hot = true;
      toast('Negotiations have broken down.');
      this.closeModal('mod-neg');
    } else {
      this.renderNegBody('"That is well below our valuation." They remain firm at ' + money(n.ask) + '.');
    }
  },
  /* fee agreed — now the player decides if he fancies the move */
  personalTerms(p) {
    const n = this.neg;
    const interest = moveInterest(p);
    if (interest < -12) {
      p._hot = true;
      this.neg = null;
      gid('neg-body').innerHTML = '<p style="font-size:12px;margin-bottom:6px">Fee agreed with the club — but ' + esc(p.n) + ' has no interest in joining us. "It\'s not the right move for my career." His agent ends the call.</p>';
      gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>';
      return;
    }
    n.stage = 'terms';
    n.wage = Math.max(p.wage + 5, Math.round(p.wage * (1.15 + Math.max(0, -interest) * 0.05)));
    const reluctant = interest < -4;
    const bill = wageBill();
    gid('neg-body').innerHTML = '<p style="font-size:12px;margin-bottom:8px">Fee of <strong>' + money(n.fee) + '</strong> agreed. ' +
      (reluctant ? esc(p.n) + ' has doubts about the move and wants convincing wages. ' : esc(p.n) + ' is keen on the move. ') +
      'He demands <strong>£' + n.wage + 'k/wk</strong> (currently £' + p.wage + 'k).</p>' +
      '<p style="font-size:11px;color:var(--text2)">Wage bill: £' + bill + 'k of £' + G.wageCap + 'k/wk cap' +
      (bill + n.wage > G.wageCap ? ' — <span style="color:var(--red)">this deal breaks the cap!</span>' : '') + '</p>';
    gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>' +
      '<button class="btn warn" onclick="UI.haggleWage()">Offer 10% less</button>' +
      '<button class="btn suc" onclick="UI.agreeTerms()">Agree Terms ✓</button>';
  },
  haggleWage() {
    const n = this.neg;
    if (!n) return;
    const p = playerById(n.pid);
    if (Math.random() < 0.5) {
      n.wage = Math.max(p.wage, Math.round(n.wage * 0.9));
      gid('neg-body').innerHTML = '<p style="font-size:12px">His agent grumbles but accepts <strong>£' + n.wage + 'k/wk</strong>. Wage bill: £' + wageBill() + 'k of £' + G.wageCap + 'k cap.</p>';
      gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>' +
        '<button class="btn suc" onclick="UI.agreeTerms()">Agree Terms ✓</button>';
    } else {
      p._hot = true;
      this.neg = null;
      gid('neg-body').innerHTML = '<p style="font-size:12px">The agent takes the lowball personally. "We\'re done here." Talks collapse.</p>';
      gid('neg-footer').innerHTML = '<button class="btn" onclick="UI.closeModal(\'mod-neg\')">Walk Away</button>';
    }
  },
  agreeTerms() {
    const n = this.neg;
    if (!n) return;
    const p = playerById(n.pid);
    if (n.fee > G.budget) { toast('You only have ' + money(G.budget) + '!'); return; }
    if (wageBill() + n.wage > G.wageCap) { toast('Breaks the £' + G.wageCap + 'k/wk wage cap — sell or offload first.'); return; }
    this.completeSigning(p, n.fee, n.wage);
  },
  completeSigning(p, fee, wage) {
    G.budget -= fee;
    p.club = G.club; p.foreign = false; p.free = false; p.clubName = null; p.listed = false;
    p.wantsOut = false; p._hot = false;
    if (wage) p.wage = wage;
    p.contract = p.age <= 27 ? 4 : p.age <= 31 ? 3 : 2;
    p.scouted = true; p.fit = rnd(75, 90); p.morale = rnd(75, 90);
    const nums = {}; userSquad().forEach(x => { nums[x.num] = true; });
    let num = 1; while (nums[num]) num++; p.num = num;
    addInbox('✍️', p.n + ' signs for ' + money(fee) + '! The fans are excited.', 'transfer');
    // squad reaction: direct rivals for the shirt aren't thrilled
    userSquad().forEach(x => {
      if (x.id !== p.id && x.p === p.p && x.r <= p.r + 2) x.morale = clamp(x.morale - 5, 5, 99);
    });
    toast('⚽ ' + p.n + ' SIGNS for ' + money(fee) + '!');
    this.closeModal('mod-neg');
    saveGame();
    this.topbar();
    if (this.page === 'transfers') this.renderTransfers();
  },
  rejectOffer() {
    if (!G.pendingOffer) return;
    const p = playerById(G.pendingOffer.pid);
    if (p) { p.morale = clamp(p.morale - (p.listed ? 8 : 3), 5, 99); }
    toast(G.pendingOffer.club + ' bid rejected.');
    G.pendingOffer = null;
    this.closeModal('mod-offer');
    saveGame();
    if (this.page === 'hub') this.renderHub();
  },
  acceptOffer() {
    const of = G.pendingOffer;
    if (!of) return;
    const p = playerById(of.pid);
    if (!p) { G.pendingOffer = null; return; }
    G.budget += of.amt;
    const buyer = CLUBS.find(c => c.name === of.club);
    if (buyer) p.club = buyer.key;
    else { p.club = null; p.foreign = true; p.clubName = of.club; }
    p.listed = false;
    G.xi = G.xi.map(id => id === p.id ? null : id);
    G.bench = G.bench.filter(id => id !== p.id);
    addInbox('💸', p.n + ' sold to ' + of.club + ' for ' + money(of.amt) + '.', 'transfer');
    toast(p.n + ' sold for ' + money(of.amt) + '!');
    G.pendingOffer = null;
    this.closeModal('mod-offer');
    saveGame();
    this.topbar();
    if (this.page === 'hub') this.renderHub();
  },

  /* ═════════ TACTICS ═════════ */
  renderTactics() {
    gid('t-men').value = G.mentality;
    gid('t-style').value = G.style;
    gid('t-press').value = G.pressing; gid('t-pv').textContent = G.pressing;
    gid('t-line').value = G.defLine; gid('t-lv').textContent = G.defLine;
    gid('t-width').value = G.width; gid('t-wv').textContent = G.width;
    const c = gid('t-instrs');
    c.innerHTML = INSTRS.map(ins => {
      const on = G.instrs.indexOf(ins) >= 0;
      return '<div class="train-opt' + (on ? ' sel' : '') + '" onclick="UI.toggleInstr(this.dataset.i)" data-i="' + esc(ins) + '">' +
        '<span>' + (on ? '✅' : '◻️') + '</span><span style="font-size:12px">' + esc(ins) + '</span></div>';
    }).join('') + (M && !M.finished ? '<button class="btn full" style="margin-top:8px" onclick="UI.nav(\'halftime\')">← Back to Half-Time</button>' : '');
  },
  toggleInstr(ins) {
    const i = G.instrs.indexOf(ins);
    if (i >= 0) G.instrs.splice(i, 1);
    else if (G.instrs.length < 3) G.instrs.push(ins);
    else { toast('Max 3 instructions.'); return; }
    this.renderTactics();
  },
  saveTactics() {
    G.mentality = gid('t-men').value;
    G.style = gid('t-style').value;
    G.pressing = Number(gid('t-press').value);
    G.defLine = Number(gid('t-line').value);
    G.width = Number(gid('t-width').value);
    saveGame();
    toast('Tactics saved ✓');
  },

  /* ═════════ TRAINING ═════════ */
  renderTraining() {
    gid('training-opts').innerHTML = TRAIN_OPTS.map(t =>
      '<div class="train-opt' + (G.training === t.id ? ' sel' : '') + '" onclick="UI.setTraining(\'' + t.id + '\')">' +
      '<span style="font-size:18px">' + t.icon + '</span><div><div style="font-weight:600;font-size:12px">' + t.label + '</div>' +
      '<div style="font-size:10px;color:var(--text2)">' + t.desc + '</div></div></div>').join('');
    const young = userSquad().filter(p => p.pot > p.r && p.age <= 24).sort((a, b) => (b.pot - b.r) - (a.pot - a.r));
    gid('training-individual').innerHTML = young.slice(0, 12).map(p => {
      const on = G.trainFocus.indexOf(p.id) >= 0;
      return '<div class="train-opt' + (on ? ' sel' : '') + '" onclick="UI.toggleFocus(' + p.id + ')">' +
        '<span>' + (on ? '✅' : '◻️') + '</span><span class="tag tag-' + p.p + '">' + p.p + '</span>' +
        '<span style="flex:1;font-size:12px;font-weight:500">' + esc(p.n) + ' <span style="color:var(--text2)">(' + p.age + ')</span></span>' +
        '<span style="font-size:11px;color:var(--text2)">' + p.r + ' → <span style="color:var(--gold)">' + p.pot + '</span></span></div>';
    }).join('') || '<p style="font-size:12px;color:var(--text2)">No development prospects in the squad.</p>';
  },
  setTraining(id) { G.training = id; saveGame(); this.renderTraining(); },
  toggleFocus(pid) {
    const i = G.trainFocus.indexOf(pid);
    if (i >= 0) G.trainFocus.splice(i, 1);
    else if (G.trainFocus.length < 3) G.trainFocus.push(pid);
    else { toast('Max 3 focus players.'); return; }
    saveGame();
    this.renderTraining();
  },

  /* ═════════ FIXTURES ═════════ */
  renderFixtures() {
    const el = gid('fixtures-list');
    let html = '';
    if (G.userResults.length) {
      html += '<div class="card-title">Results</div><div class="card" style="padding:8px 12px">' +
        G.userResults.map(r =>
          '<div class="list-row"><span style="width:70px;font-size:10px;color:var(--text2)">' + fmtShort(dateOf(r.day)) + '</span>' +
          '<span class="tag" style="background:var(--bg);color:var(--text2);width:42px;text-align:center">' + r.comp + '</span>' +
          '<span style="flex:1">' + (r.home ? 'vs' : '@') + ' ' + esc(r.opp) + '</span>' +
          '<span style="font-weight:700">' + r.hg + '-' + r.ag + '</span>' +
          '<span class="rb rb-' + r.out + '" style="margin-left:8px">' + r.out + '</span></div>').join('') + '</div>';
    }
    const upcoming = [];
    for (let i = G.ci; i < G.calendar.length && upcoming.length < 12; i++) {
      const e = G.calendar[i];
      if (e.t === 'PL') {
        const m = G.rounds[e.round - 1].find(x => x.h === G.club || x.a === G.club);
        const home = m.h === G.club;
        upcoming.push({ day: e.day, comp: 'PL', txt: (home ? 'vs ' : '@ ') + CLUB_BY_KEY[home ? m.a : m.h].name });
      } else if (e.t === 'EU' && G.euro && G.euro.phase === 'league' && e.md > G.euro.md) {
        const s = G.euro.schedule[e.md - 1];
        upcoming.push({ day: e.day, comp: G.euro.comp, txt: (s.home ? 'vs ' : '@ ') + s.opp });
      } else if (e.t === 'EUKO' && G.euro && ['po', 'r16', 'qf', 'sf', 'f'].indexOf(G.euro.phase) >= 0) {
        upcoming.push({ day: e.day, comp: G.euro.comp, txt: 'Knockout: ' + e.phase.toUpperCase() + (G.euro.ko[e.phase] ? ' vs ' + G.euro.ko[e.phase].opp : ' — draw TBD') });
      } else if (e.t === 'FA' && !G.fa.elim && !G.fa.won) {
        upcoming.push({ day: e.day, comp: 'FA', txt: 'FA Cup ' + e.round + (G.fa.next && G.fa.round === e.round ? ' vs ' + G.fa.next.opp : ' — draw TBD') });
      } else if (e.t === 'LC' && !G.lc.elim && !G.lc.won) {
        upcoming.push({ day: e.day, comp: 'LC', txt: 'Carabao Cup ' + e.round + (G.lc.next && G.lc.round === e.round ? ' vs ' + G.lc.next.opp : ' — draw TBD') });
      }
    }
    html += '<div class="card-title" style="margin-top:14px">Upcoming</div><div class="card" style="padding:8px 12px">' +
      (upcoming.map(u =>
        '<div class="list-row"><span style="width:70px;font-size:10px;color:var(--text2)">' + fmtShort(dateOf(u.day)) + '</span>' +
        '<span class="tag" style="background:var(--bg);color:var(--text2);width:42px;text-align:center">' + u.comp + '</span>' +
        '<span style="flex:1">' + esc(u.txt) + '</span></div>').join('') || '<p style="font-size:12px;color:var(--text2)">Season complete.</p>') + '</div>';
    el.innerHTML = html;
  },

  /* ═════════ TABLE ═════════ */
  tblTab(t) {
    this.tblTabSel = t;
    this.renderTable();
  },
  renderTable() {
    ['pl', 'scorers', 'results'].forEach(k => { gid('tbl-t-' + k).className = 'tab' + (k === this.tblTabSel ? ' on' : ''); });
    const el = gid('table-content');
    if (this.tblTabSel === 'pl') {
      const rows = tableSorted();
      el.innerHTML = '<div class="card"><table class="data-table"><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>' +
        rows.map((r, i) => {
          const cls = (r.key === G.club ? 'me ' : '') + (i < 5 ? 'ucl' : i < 7 ? 'uel' : i >= 17 ? 'rel' : '');
          return '<tr class="' + cls + '"><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + r.gf + '</td><td>' + r.ga + '</td><td>' + (r.gf - r.ga) + '</td><td style="font-weight:700">' + r.pts + '</td></tr>';
        }).join('') + '</table></div>' +
        '<p style="font-size:10px;color:var(--text2)">🟡 Champions League · 🔵 Europa League · 🔴 Relegation</p>';
    } else if (this.tblTabSel === 'scorers') {
      const scorers = Object.values(PLAYERS).filter(p => p.club && p.plG > 0).sort((a, b) => b.plG - a.plG).slice(0, 20);
      el.innerHTML = '<div class="card"><table class="data-table"><tr><th>#</th><th>Player</th><th>Club</th><th>PL Goals</th></tr>' +
        scorers.map((p, i) => '<tr' + (p.club === G.club ? ' class="me"' : '') + '><td>' + (i === 0 ? '👑' : i + 1) + '</td><td>' + esc(p.n) + '</td><td>' + esc(CLUB_BY_KEY[p.club].name) + '</td><td style="font-weight:700;color:var(--green)">' + p.plG + '</td></tr>').join('') +
        '</table>' + (scorers.length ? '' : '<p style="font-size:12px;color:var(--text2);padding:8px 0">No goals scored yet.</p>') + '</div>';
    } else {
      const recent = G.results.slice(-20).reverse();
      el.innerHTML = '<div class="card" style="padding:8px 12px">' + (recent.map(r =>
        '<div class="list-row"><span style="font-size:10px;color:var(--text2);width:30px">R' + r.round + '</span>' +
        '<span style="flex:1;text-align:right">' + esc(CLUB_BY_KEY[r.h].name) + '</span>' +
        '<span style="font-weight:700;margin:0 10px">' + r.hg + ' - ' + r.ag + '</span>' +
        '<span style="flex:1">' + esc(CLUB_BY_KEY[r.a].name) + '</span></div>').join('') ||
        '<p style="font-size:12px;color:var(--text2)">No results yet.</p>') + '</div>';
    }
  },

  /* ═════════ EUROPE ═════════ */
  renderEurope() {
    const el = gid('europe-content');
    if (!G.euro) {
      gid('eu-title').textContent = 'European Football';
      el.innerHTML = '<div class="card"><p style="font-size:13px;color:var(--text2);padding:10px 0">No European football this season. Finish top 8 in the league to qualify.</p></div>';
      return;
    }
    const cfg = EURO_CFG[G.euro.comp];
    gid('eu-title').textContent = cfg.icon + ' ' + cfg.label;
    let html = '';
    const names = { league: 'League Phase', po: 'Knockout Play-off', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', f: 'THE FINAL', won: '🏆 CHAMPIONS!', out: 'Eliminated' };
    html += '<div class="card gold"><div class="card-title">Status</div><div style="font-size:14px;font-weight:700">' + names[G.euro.phase] + '</div></div>';
    // user results
    if (G.euro.results.length || Object.keys(G.euro.ko).length) {
      html += '<div class="card"><div class="card-title">Our Campaign</div>' +
        G.euro.results.map(r => '<div class="list-row"><span style="flex:1">' + (r.home ? 'vs' : '@') + ' ' + esc(r.opp) + '</span><span style="font-weight:700">' + r.sc + '</span><span class="rb rb-' + r.out + '" style="margin-left:8px">' + r.out + '</span></div>').join('') +
        Object.keys(G.euro.ko).map(ph => {
          const k = G.euro.ko[ph];
          return '<div class="list-row"><span style="flex:1">' + names[ph === 'f' ? 'f' : ph] + ' vs ' + esc(k.opp) + '</span>' +
            (k.res ? '<span style="font-weight:700">' + k.res.sc + '</span><span class="rb rb-' + k.res.out + '" style="margin-left:8px">' + k.res.out + '</span>' : '<span style="color:var(--text2);font-size:11px">upcoming</span>') + '</div>';
        }).join('') + '</div>';
    }
    // table
    const t = G.euro.table, me = userClub().name;
    const sorted = Object.keys(t).sort((a, b) => t[b].pts - t[a].pts || (t[b].gf - t[b].ga) - (t[a].gf - t[a].ga));
    html += '<div class="card"><div class="card-title">League Phase Table</div><table class="data-table"><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>' +
      sorted.map((nm, i) => {
        const r = t[nm];
        const cls = (nm === me ? 'me ' : '') + (i < 8 ? 'ucl' : i < 24 ? 'uel' : '');
        return '<tr class="' + cls + '"><td>' + (i + 1) + '</td><td>' + esc(nm) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + (r.gf - r.ga) + '</td><td style="font-weight:700">' + r.pts + '</td></tr>';
      }).join('') + '</table><p style="font-size:10px;color:var(--text2);margin-top:6px">Top 8 → Round of 16 · 9-24 → Play-off</p></div>';
    el.innerHTML = html;
  },

  /* ═════════ CUPS ═════════ */
  renderCups() {
    const el = gid('cups-content');
    const cupCard = (label, cup, rounds, color) => {
      let html = '<div class="card"><div class="card-title" style="color:' + color + '">' + label + '</div>';
      html += '<div style="font-size:13px;font-weight:700;margin-bottom:8px">' + (cup.won ? '🏆 WINNERS!' : cup.elim ? 'Eliminated' : 'In the ' + cup.round) + '</div>';
      rounds.forEach(rd => {
        const res = cup.res[rd];
        if (res) html += '<div class="list-row"><span style="width:30px;color:var(--text2);font-size:11px">' + rd + '</span><span style="flex:1">vs ' + esc(res.opp) + '</span><span style="font-weight:700">' + res.sc + '</span><span class="rb rb-' + res.out + '" style="margin-left:8px">' + res.out + '</span></div>';
        else if (!cup.elim && !cup.won && rd === cup.round) html += '<div class="list-row"><span style="width:30px;color:var(--text2);font-size:11px">' + rd + '</span><span style="flex:1;color:var(--gold)">' + (cup.next ? 'vs ' + esc(cup.next.opp) + (cup.next.neutral ? ' (Wembley)' : cup.next.home ? ' (H)' : ' (A)') : 'Draw TBD') + '</span></div>';
        else if (!cup.elim && !cup.won) html += '<div class="list-row"><span style="width:30px;color:var(--text2);font-size:11px">' + rd + '</span><span style="flex:1;color:var(--text2);font-size:11px">—</span></div>';
      });
      return html + '</div>';
    };
    el.innerHTML = cupCard('FA Cup', G.fa, FA_ROUNDS, 'var(--red)') + cupCard('Carabao Cup', G.lc, LC_ROUNDS, 'var(--green)');
  },

  /* ═════════ INBOX ═════════ */
  renderInbox() {
    G.unread = 0;
    this.topbar();
    gid('inbox-content').innerHTML = G.inbox.length ? '<div class="card" style="padding:8px 14px">' + G.inbox.map(m =>
      '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">' +
      '<span style="font-size:16px">' + m.icon + '</span><div style="flex:1">' + esc(m.msg) +
      '<div style="font-size:10px;color:var(--text2);margin-top:2px">' + esc(m.date) + '</div></div></div>').join('') + '</div>'
      : '<div class="card"><p style="font-size:12px;color:var(--text2)">No messages.</p></div>';
  },

  /* ═════════ SEASON END ═════════ */
  renderSeasonEnd() {
    if (!G.endProcessed) {
      const end = processSeasonEnd();
      G.endSummary = end.summary;
      G.endEuro = end.newEuro;
      G.endProcessed = true;
      saveGame();
    }
    const s = G.endSummary;
    if (G.sacked) { this.nav('sacked'); return; }
    let html = '<div class="card gold"><div class="card-title">Season ' + s.season + ' Final Position</div>' +
      '<div style="font-size:36px;font-weight:800;color:var(--gold)">' + ordinal(s.pos) + '</div>' +
      '<div style="font-size:12px;color:var(--text2);margin-top:4px">' + esc(s.boardVerdict) + '</div></div>';
    if (s.trophies.length) html += '<div class="card green"><div class="card-title">🏆 Trophies Won</div><div style="font-size:16px;font-weight:700">' + s.trophies.join(' · ') + '</div></div>';
    html += '<div class="g3">';
    if (s.awards.goldenBoot) html += '<div class="card"><div class="card-title">👑 Golden Boot</div><div style="font-size:13px;font-weight:700">' + esc(s.awards.goldenBoot.n) + '</div><div style="font-size:11px;color:var(--text2)">' + s.awards.goldenBoot.plG + ' league goals</div></div>';
    if (s.awards.clubPOTY) html += '<div class="card"><div class="card-title">⭐ Our Player of the Season</div><div style="font-size:13px;font-weight:700">' + esc(s.awards.clubPOTY.n) + '</div><div style="font-size:11px;color:var(--text2)">avg rating ' + (s.awards.clubPOTY.rsum / Math.max(1, s.awards.clubPOTY.apps)).toFixed(2) + '</div></div>';
    if (s.awards.clubTopScorer) html += '<div class="card"><div class="card-title">⚽ Our Top Scorer</div><div style="font-size:13px;font-weight:700">' + esc(s.awards.clubTopScorer.n) + '</div><div style="font-size:11px;color:var(--text2)">' + s.awards.clubTopScorer.g + ' goals all comps</div></div>';
    html += '</div>';
    if (s.relegated && s.relegated.length) {
      html += '<div class="card red"><div class="card-title">⬇️ Relegated</div><div style="font-size:12px">' +
        s.relegated.map(k => esc(CLUB_BY_KEY[k].name)).join(' · ') + ' go down. Three Championship sides come up.</div></div>';
    }
    if (s.jobOffer && !G.pendingJob) {
      const jc = CLUB_BY_KEY[s.jobOffer];
      html += '<div class="card gold"><div class="card-title">📞 Job Offer</div>' +
        '<div style="font-size:13px;margin-bottom:10px"><strong>' + esc(jc.full) + '</strong> want you as their new manager.<br>' +
        '<span style="font-size:11px;color:var(--text2)">Board expectation: ' + jc.exp + ' · Transfer budget: ' + money(jc.bud) + '</span></div>' +
        '<div class="g2"><button class="btn" onclick="UI.declineJob()">Stay Loyal</button>' +
        '<button class="btn pri" onclick="UI.acceptJob(\'' + s.jobOffer + '\')">Accept the Job ▶</button></div></div>';
    }
    if (G.pendingJob) {
      html += '<div class="card green"><div class="card-title">📞 New Job Agreed</div><div style="font-size:12px">You will take charge of <strong>' + esc(CLUB_BY_KEY[G.pendingJob].full) + '</strong> when the new season starts.</div></div>';
    }
    html += '<div class="card"><div class="card-title">The Board</div><div style="font-size:12px;line-height:1.9">' +
      'Prize money &amp; new investment: budget now <strong style="color:#5aabdd">' + money(s.newBudget) + '</strong><br>' +
      (s.newEuro ? 'Qualified for the <strong style="color:var(--gold)">' + EURO_CFG[s.newEuro].label + '</strong> next season!' : 'No European qualification next season.') +
      '<br>Squad will age and develop over the summer. Expiring contracts will leave.</div></div>';
    gid('end-content').innerHTML = html;
  },
  acceptJob(key) {
    G.pendingJob = key;
    saveGame();
    toast('Agreed — you join ' + CLUB_BY_KEY[key].name + ' in the summer.');
    this.renderSeasonEnd();
  },
  declineJob() {
    if (G.endSummary) G.endSummary.jobOffer = null;
    G.boardConf = clamp(G.boardConf + 5, 0, 100);
    saveGame();
    toast('The board appreciates your loyalty.');
    this.renderSeasonEnd();
  },
  newSeason() {
    let newEuro = G.endEuro || null;
    // switching clubs: you inherit the NEW club's European qualification
    if (G.pendingJob && G.endSummary && G.endSummary.table) {
      const idx = G.endSummary.table.findIndex(r => r.key === G.pendingJob);
      const pos = idx + 1;
      newEuro = idx < 0 ? null : pos <= 5 ? 'UCL' : pos <= 7 ? 'UEL' : pos === 8 ? 'UECL' : null;
    }
    startNewSeason(newEuro);
    G.endProcessed = false; G.endSummary = null;
    advanceWorld();
    this.applyClubTheme();
    this.nav('hub');
  },
  renderSacked() {
    const tr = G.trophies.length ? 'Trophies: ' + G.trophies.join(', ') : 'No trophies won.';
    let html = esc(userClub().full) + ' have relieved ' + esc(G.manager) + ' of managerial duties.<br>' +
      'Seasons in charge: ' + G.season + '<br>' + esc(tr) + '<br><br>Football is a results business.';
    // your reputation earns you another chance lower down the ladder
    const myStr = userClub().str;
    const suitors = shuffle(CLUBS.filter(c => c.key !== G.club && c.str <= myStr + 2 &&
      (!G.lastRelegated || G.lastRelegated.indexOf(c.key) < 0))).slice(0, 2);
    if (suitors.length) {
      html += '<br><br><strong style="color:var(--gold)">Your phone rings — clubs are interested:</strong><br>';
      html += suitors.map(c =>
        '<button class="btn gold-b" style="margin:8px 4px 0" onclick="UI.takeJob(\'' + c.key + '\')">Take over at ' + esc(c.name) + ' (' + c.exp + ')</button>'
      ).join('');
    }
    gid('sacked-content').innerHTML = html;
  },
  takeJob(key) {
    takeJobMidSeason(key);
    this.applyClubTheme();
    if (G.endProcessed) {
      // season already over — inherit the new club's European qualification
      if (G.endSummary && G.endSummary.table) {
        const idx = G.endSummary.table.findIndex(r => r.key === key);
        const pos = idx + 1;
        G.endEuro = idx < 0 ? null : pos <= 5 ? 'UCL' : pos <= 7 ? 'UEL' : pos === 8 ? 'UECL' : null;
      }
      this.nav('end'); return;
    }
    if (!advanceWorld()) { this.nav('end'); return; }
    this.nav('hub');
    toast('Welcome to ' + userClub().name + ', ' + G.manager + '.');
  },

  closeModal(id) { gid(id).classList.remove('on'); }
};
