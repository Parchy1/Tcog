/* ── pitch.js — 2D canvas match visualisation ─────────────────────
   Two layers:
   1. Ambient play — players drift in formation zones and trade safe
      possession. It NEVER shows shots or goals on its own.
   2. Highlight scenes — every real chance/goal from the match engine
      is choreographed here (build-up passes → shot → outcome) while
      the UI pauses the match clock. PITCH.busy() tells the UI a scene
      is still playing. */
'use strict';

const PITCH = (function () {
  let canvas = null, ctx = null;
  let players = [], ball = null;
  let phase = 'kickoff', phaseTeam = 0, phaseTimer = 60, tick = 0, flash = 0;
  let cols = { home1: '#1a1f8a', home2: '#2a3fff', away1: '#888888', away2: '#cc1010' };
  let teamNames = ['HOME', 'AWAY'];
  let scene = null;          // active highlight scene
  let cardPop = null;        // transient card popup {col, name, t}
  let caption = null;        // {text, col, t, big}


  function lerp(a, b, t) { return a + (b - a) * t; }
  function lastName(n) { return String(n || '').split(' ').pop().substring(0, 9); }

  function init(canvasEl, formation, userPl, oppPl, userCols, oppCols, names) {
    canvas = canvasEl;
    const w = canvas.parentElement.clientWidth || 480;
    canvas.width = w; canvas.height = Math.round(w * 0.62);
    ctx = canvas.getContext('2d');
    cols = { home1: userCols[0], home2: userCols[1], away1: oppCols[0], away2: oppCols[1] };
    teamNames = [names && names.user || 'US', names && names.opp || 'THEM'];
    players = [];
    const slots = FORM_SLOTS[formation];
    const xy = FORM_XY[formation];
    const cw = canvas.width, ch = canvas.height;
    slots.forEach((slot, i) => {
      // each player owns his true formation spot — no shared anchors
      const fx = xy[i][0] / 100, fy = xy[i][1] / 100;
      players.push({ team: 0, idx: i, slot: slot, fx: fx, fy: fy, x: fx * cw, y: fy * ch, tx: fx * cw, ty: fy * ch, hasBall: false,
        name: lastName(userPl[i] && userPl[i].n || slot), num: userPl[i] && userPl[i].num || i + 1 });
    });
    const oppSlots = FORM_SLOTS['433'];
    const oppXy = FORM_XY['433'];
    oppSlots.forEach((slot, i) => {
      const fx = 1 - oppXy[i][0] / 100, fy = 1 - oppXy[i][1] / 100;
      players.push({ team: 1, idx: i, slot: slot, fx: fx, fy: fy, x: fx * cw, y: fy * ch, tx: fx * cw, ty: fy * ch, hasBall: false,
        name: lastName(oppPl[i] && oppPl[i].n || slot), num: i + 1 });
    });
    ball = { x: cw * 0.5, y: ch * 0.5, fromX: 0, fromY: 0, toX: 0, toY: 0, travelling: false, travelT: 0, travelDur: 0, owner: players[10] };
    players[10].hasBall = true;
    phase = 'kickoff'; phaseTeam = 0; phaseTimer = 60; tick = 0; flash = 0;
    scene = null; cardPop = null; caption = null; pressers = [];
    draw();
  }

  function setName(idx, name) { if (players[idx]) players[idx].name = lastName(name); }
  function busy() { return !!scene; }

  /* ── ball helpers ─────────────────────────────────────────────── */
  function ballTo(pl) {
    if (!pl) return;
    if (ball.owner) ball.owner.hasBall = false;
    ball.owner = pl; pl.hasBall = true;
  }
  function passTo(toP, instantOwner) {
    if (!toP) return;
    if (ball.owner) ball.owner.hasBall = false;
    ball.owner = toP;
    ball.fromX = ball.x; ball.fromY = ball.y;
    ball.toX = toP.x + rnd(-8, 8); ball.toY = toP.y + rnd(-8, 8);
    ball.travelT = 0;
    ball.travelDur = Math.max(8, Math.min(26, Math.hypot(ball.toX - ball.fromX, ball.toY - ball.fromY) / 7));
    ball.travelling = true;
    toP.hasBall = true;
  }
  function shootTo(x, y, dur) {
    if (ball.owner) ball.owner.hasBall = false;
    ball.owner = null;
    ball.fromX = ball.x; ball.fromY = ball.y;
    ball.toX = x; ball.toY = y;
    ball.travelT = 0; ball.travelDur = dur || 10;
    ball.travelling = true;
  }
  function setPhase(p, team, dur) { phase = p; phaseTeam = team; phaseTimer = Math.max(1, dur); }

  /* ── ambient possession (no shots — those come from real events) ── */
  function tickPhase() {
    phaseTimer--; if (phaseTimer > 0) return;
    const us = players.filter(p => p.team === 0);
    const them = players.filter(p => p.team === 1);
    if (phase === 'kickoff') { setPhase('buildup', phaseTeam, 40); ballTo(phaseTeam === 0 ? us[6] : them[6]); }
    else if (phase === 'buildup') {
      const t = phaseTeam === 0 ? us : them;
      if (Math.random() < 0.65) setPhase('midfield', phaseTeam, 35 + rnd(0, 20));
      else setPhase('buildup', 1 - phaseTeam, 30 + rnd(0, 15));
      passTo(t[rnd(3, Math.min(8, t.length - 1))]);
    }
    else if (phase === 'midfield') {
      const r = Math.random();
      if (r < 0.5) setPhase(phaseTeam === 0 ? 'attack' : 'opp_attack', phaseTeam, 30 + rnd(0, 15));
      else if (r < 0.78) setPhase('midfield', 1 - phaseTeam, 25 + rnd(0, 15));
      else setPhase('midfield', phaseTeam, 20);
      const t = phaseTeam === 0 ? us : them;
      const fwd = t.filter(p => ['RW', 'LW', 'AM', 'ST', 'CF', 'RM', 'LM', 'CM'].indexOf(p.slot) >= 0);
      if (fwd.length) passTo(pick(fwd));
    }
    else if (phase === 'attack' || phase === 'opp_attack') {
      // attacks fizzle out in ambient play — real shots arrive as scenes
      setPhase('buildup', 1 - phaseTeam, 30 + rnd(0, 20));
      const t = phaseTeam === 0 ? them : us;
      ballTo(t[rnd(1, 4)]); // their defence mops it up
    }
    else { setPhase('midfield', phaseTeam, 25); }
  }

  /* ── highlight scenes ─────────────────────────────────────────── */
  /* cfg: { side, outcome: goal|og|save|wide|post|over|var, actor, assist, pen, label } */
  function playScene(cfg, onDone) {
    if (!canvas) { if (onDone) onDone(); return; }
    const cw = canvas.width, ch = canvas.height;
    const atkSide = cfg.side;                     // team attacking in this scene
    const goalY = atkSide === 0 ? ch * 0.045 : ch * 0.955;  // team 0 attacks the top goal
    const mine = players.filter(p => p.team === atkSide);
    const theirs = players.filter(p => p.team !== atkSide);
    const gk = theirs[0];
    const fwd = mine.filter(p => ['ST', 'CF', 'AM', 'RW', 'LW', 'RM', 'LM'].indexOf(p.slot) >= 0);
    const mids = mine.filter(p => ['CM', 'DM', 'WB'].indexOf(p.slot) >= 0);
    // the shooter is the named actor when he's on this team (own goals name an opponent)
    let shooter = cfg.outcome !== 'og' && cfg.actor ? mine.find(p => p.name.toLowerCase() === lastName(cfg.actor).toLowerCase()) : null;
    if (!shooter) shooter = fwd.length ? pick(fwd) : mine[mine.length - 1];
    let passer = cfg.assist ? mine.find(p => p.name.toLowerCase() === lastName(cfg.assist).toLowerCase()) : null;
    if (!passer || passer === shooter) passer = pick(mids.length ? mids : mine.filter(p => p !== shooter));
    const starter = pick(mine.filter(p => p !== shooter && p !== passer && p.slot !== 'GK')) || passer;

    const steps = [];
    const shotX = cw * lerp(0.40, 0.60, Math.random());
    if (cfg.pen) {
      // penalty: ball on the spot, everyone waits, shooter strikes
      const spotY = atkSide === 0 ? ch * 0.135 : ch * 0.865;
      steps.push({ dur: 30, init() {
        ball.travelling = false; ball.owner = null;
        ball.x = cw * 0.5; ball.y = spotY;
        shooter.tx = cw * 0.5 + (atkSide === 0 ? 14 : -14); shooter.ty = spotY + (atkSide === 0 ? 26 : -26);
        gk.tx = cw * 0.5; gk.ty = goalY;
        mine.concat(theirs).forEach(p => { if (p !== shooter && p !== gk) { p.tx = p.x + rnd(-10, 10); p.ty = atkSide === 0 ? Math.max(p.y, ch * 0.30) : Math.min(p.y, ch * 0.70); } });
      } });
      steps.push({ dur: 14, init() { shootTo(shotX, goalY, 9); } });
    } else {
      // open play: pass → pass → carry → shot
      steps.push({ dur: 16, init() {
        ballTo(starter);
        passer.tx = lerp(cw * 0.25, cw * 0.75, Math.random());
        passer.ty = atkSide === 0 ? ch * lerp(0.34, 0.46, Math.random()) : ch * lerp(0.54, 0.66, Math.random());
        shooter.tx = lerp(cw * 0.3, cw * 0.7, Math.random());
        shooter.ty = atkSide === 0 ? ch * lerp(0.12, 0.22, Math.random()) : ch * lerp(0.78, 0.88, Math.random());
        fwd.forEach(p => { p.ty = atkSide === 0 ? Math.min(p.ty, ch * 0.30) : Math.max(p.ty, ch * 0.70); });
      } });
      steps.push({ dur: 18, init() { passTo(passer); } });
      steps.push({ dur: 18, init() { passTo(shooter); } });
      steps.push({ dur: 10, init() { shooter.tx = shooter.x + (shotX > shooter.x ? 10 : -10); shooter.ty = shooter.y + (atkSide === 0 ? -12 : 12); } });
      steps.push({ dur: 12, init() { shootTo(shotX, goalY, 10); } });
    }
    // outcome
    const oc = cfg.outcome;
    if (oc === 'goal' || oc === 'og') {
      steps.push({ dur: 55, init() {
        flash = 0.5;
        caption = { text: oc === 'og' ? 'OWN GOAL!' : 'GOAL!  ' + shooter.name.toUpperCase(), col: atkSide === 0 ? '#27ae60' : '#c0392b', t: 55, big: true };
        ball.x = shotX; ball.y = goalY; ball.travelling = false;
        // celebration huddle
        mine.filter(p => p !== mine[0]).slice(0, 5).forEach(p => { p.tx = shooter.x + rnd(-22, 22); p.ty = shooter.y + rnd(-18, 18); });
      } });
      steps.push({ dur: 35, init() { resetKickoff(1 - atkSide); } });
    } else if (oc === 'var') {
      steps.push({ dur: 30, init() {
        flash = 0.4; ball.x = shotX; ball.y = goalY; ball.travelling = false;
        caption = { text: 'GOAL? VAR CHECK...', col: '#d35400', t: 30, big: true };
      } });
      steps.push({ dur: 45, init() {
        caption = { text: '🚫 NO GOAL — OFFSIDE', col: '#c0392b', t: 45, big: true };
      } });
      steps.push({ dur: 25, init() { resetKickoff(1 - atkSide); } });
    } else if (oc === 'save') {
      steps.push({ dur: 40, init() {
        // keeper claims it
        gk.tx = shotX; gk.ty = goalY + (atkSide === 0 ? 8 : -8);
        ballTo(gk);
        ball.x = shotX; ball.y = goalY + (atkSide === 0 ? 10 : -10); ball.travelling = false;
        caption = { text: '🧤 SAVED!', col: '#5aabdd', t: 40, big: false };
      } });
    } else if (oc === 'post') {
      steps.push({ dur: 16, init() {
        // clang — deflects back out
        caption = { text: '💥 OFF THE POST!', col: '#d35400', t: 45, big: false };
        shootTo(cw * (shotX > cw * 0.5 ? 0.62 : 0.38), goalY + (atkSide === 0 ? ch * 0.10 : -ch * 0.10), 12);
      } });
      steps.push({ dur: 26, init() { const d = pick(theirs.slice(1, 5)); ballTo(d); } });
    } else { // wide / over
      steps.push({ dur: 34, init() {
        caption = { text: pick(['WIDE!', 'OVER THE BAR!', 'JUST MISSES!']), col: '#d35400', t: 34, big: false };
        shootTo(shotX + pick([-1, 1]) * cw * 0.14, atkSide === 0 ? -ch * 0.03 : ch * 1.03, 12);
      } });
      steps.push({ dur: 16, init() { ballTo(gk); ball.travelling = false; ball.x = gk.x; ball.y = gk.y; } });
    }
    scene = { steps: steps, i: -1, t: 0, side: atkSide, onDone: onDone || null };
    advanceScene();
  }
  function resetKickoff(toTeam) {
    const cw = canvas.width, ch = canvas.height;
    players.forEach(p => { p.tx = p.fx * cw; p.ty = p.fy * ch; });
    ball.travelling = false; ball.owner = null;
    ball.x = cw * 0.5; ball.y = ch * 0.5;
    setPhase('kickoff', toTeam, 50);
  }
  function advanceScene() {
    scene.i++;
    if (scene.i >= scene.steps.length) {
      const cb = scene.onDone;
      scene = null;
      if (cb) cb();
      return;
    }
    scene.t = scene.steps[scene.i].dur;
    scene.steps[scene.i].init();
  }
  function showCard(colour, name) { cardPop = { col: colour, name: lastName(name), t: 80 }; }

  /* ── per-tick movement ────────────────────────────────────────── */
  /* Each player holds a formation anchor; the whole block slides with
     the ball. Only the designated presser (and one support) close the
     ball down — everyone else keeps shape, so no more bee-swarm. */
  function anchorOf(p, ourBall) {
    const cw = canvas.width, ch = canvas.height;
    // own formation spot, pushed up when attacking / compressed when defending
    const fwd = p.team === 0 ? -1 : 1; // direction this team attacks
    let nx = p.fx, ny = p.fy;
    if (ourBall) ny += fwd * (p.slot === 'GK' ? 0.01 : 0.07);
    else { ny -= fwd * 0.06; nx = 0.5 + (nx - 0.5) * 0.88; }
    // the block slides gently with the ball
    const gkDampen = p.slot === 'GK' ? 0.25 : 1;
    nx += (ball.x / cw - 0.5) * (ourBall ? 0.08 : 0.14) * gkDampen;
    ny += (ball.y / ch - 0.5) * (ourBall ? 0.07 : 0.13) * gkDampen;
    return { x: clamp(nx, 0.03, 0.97) * cw, y: clamp(ny, 0.04, 0.96) * ch };
  }
  let pressers = [];
  function pickPressers() {
    const defs = players.filter(p => p.team !== phaseTeam && p.slot !== 'GK')
      .sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
    pressers = defs.slice(0, 2);
  }
  function separate() {
    const cw = canvas.width, ch = canvas.height;
    const minD = cw * 0.046;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) {
          if (d < 0.001) { dx = 1; dy = 0.5; d = 1.1; }
          const push = (minD - d) * 0.32;
          a.x -= dx / d * push; a.y -= dy / d * push;
          b.x += dx / d * push; b.y += dy / d * push;
        }
      }
    }
    players.forEach(p => { p.x = clamp(p.x, cw * 0.02, cw * 0.98); p.y = clamp(p.y, ch * 0.02, ch * 0.98); });
  }

  function update() {
    if (!canvas) return;
    tick++;
    const cw = canvas.width, ch = canvas.height;
    if (scene) {
      scene.t--;
      if (scene.t <= 0) advanceScene();
      // players the scene isn't using drift back into shape
      if (scene) players.forEach(p => {
        if (Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty) < 5 && Math.random() < 0.03) {
          const a = anchorOf(p, p.team === scene.side);
          p.tx = (p.tx + a.x) / 2; p.ty = (p.ty + a.y) / 2;
        }
      });
    } else {
      if (tick % 12 === 0 || !pressers.length) pickPressers();
      players.forEach(p => {
        const ourBall = p.team === phaseTeam;
        if (p.hasBall) {
          // the carrier probes gently toward the goal he attacks
          const dir = p.team === 0 ? -1 : 1;
          if ((tick + p.idx * 7) % 45 === 0 || p.wx === undefined) { p.wx = rndf(-1, 1); p.wy = rndf(-1, 1); }
          p.tx = clamp(p.x + p.wx * cw * 0.02, cw * 0.06, cw * 0.94);
          p.ty = clamp(p.y + dir * ch * 0.02 + p.wy * ch * 0.008, ch * 0.06, ch * 0.94);
        } else if (pressers[0] === p) {
          // first defender closes the carrier down, goal-side
          p.tx = ball.x + rnd(-3, 3);
          p.ty = ball.y + (p.team === 0 ? 1 : -1) * ch * 0.035;
        } else if (pressers[1] === p) {
          // second defender screens the space behind the presser
          const a = anchorOf(p, false);
          p.tx = (ball.x + a.x) / 2;
          p.ty = (ball.y + a.y) / 2 + (p.team === 0 ? 1 : -1) * ch * 0.04;
        } else {
          // hold formation with a personal patrol radius
          if ((tick + p.idx * 7) % 55 === 0 || p.wx === undefined) { p.wx = rndf(-1, 1); p.wy = rndf(-1, 1); }
          const a = anchorOf(p, ourBall);
          p.tx = a.x + p.wx * cw * 0.035;
          p.ty = a.y + p.wy * ch * 0.045;
        }
      });
      tickPhase();
    }
    players.forEach(p => {
      p.x = clamp(p.x + (p.tx - p.x) * 0.075, cw * 0.02, cw * 0.98);
      p.y = clamp(p.y + (p.ty - p.y) * 0.075, ch * 0.02, ch * 0.98);
    });
    separate();
    if (ball.travelling) {
      ball.travelT++;
      const t = Math.min(1, ball.travelT / ball.travelDur);
      const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      ball.x = lerp(ball.fromX, ball.toX, et);
      ball.y = lerp(ball.fromY, ball.toY, et) - Math.sin(Math.PI * t) * canvas.height * 0.045;
      if (t >= 1) { ball.travelling = false; if (ball.owner) { ball.x = ball.owner.x; ball.y = ball.owner.y; } }
    } else if (ball.owner) {
      ball.x += (ball.owner.x - ball.x) * 0.22;
      ball.y += (ball.owner.y - ball.y) * 0.22;
    }
    if (caption && --caption.t <= 0) caption = null;
    if (cardPop && --cardPop.t <= 0) cardPop = null;
  }

  /* kept for API compatibility (subs page calls setName; goal flashes now live in scenes) */
  function goalFlash() { flash = 0.5; }
  function concededFlash() { flash = 0.35; }

  /* ── draw ─────────────────────────────────────────────────────── */
  function draw() {
    if (!ctx || !canvas) return;
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    // grass
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 === 0 ? '#1d6b1d' : '#1a631a'; ctx.fillRect(0, i * ch / 10, cw, ch / 10); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cw * 0.04, ch * 0.045, cw * 0.92, ch * 0.91);
    ctx.beginPath(); ctx.moveTo(cw * 0.04, ch * 0.5); ctx.lineTo(cw * 0.96, ch * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cw * 0.5, ch * 0.5, cw * 0.085, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(cw * 0.26, ch * 0.045, cw * 0.48, ch * 0.155); ctx.strokeRect(cw * 0.26, ch * 0.80, cw * 0.48, ch * 0.155);
    ctx.strokeRect(cw * 0.38, ch * 0.045, cw * 0.24, ch * 0.065); ctx.strokeRect(cw * 0.38, ch * 0.89, cw * 0.24, ch * 0.065);
    // goals
    ctx.fillStyle = 'rgba(255,255,255,.30)'; ctx.fillRect(cw * 0.41, ch * 0.012, cw * 0.18, ch * 0.033); ctx.fillRect(cw * 0.41, ch * 0.955, cw * 0.18, ch * 0.033);
    // direction labels: you attack the top goal
    ctx.font = 'bold ' + Math.round(cw * 0.018) + 'px sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillText('▲ ' + teamNames[0].toUpperCase() + ' ATTACK', cw * 0.055, ch * 0.085);
    ctx.fillText('▼ ' + teamNames[1].toUpperCase() + ' ATTACK', cw * 0.055, ch * 0.945);
    // players
    const rPL = Math.max(9, cw * 0.024);
    players.forEach(p => {
      ctx.beginPath(); ctx.ellipse(p.x, p.y + rPL * 0.55, rPL * 0.6, rPL * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, rPL, 0, Math.PI * 2);
      if (p.team === 0) { ctx.fillStyle = cols.home1; ctx.strokeStyle = p.hasBall ? '#ffffff' : 'rgba(255,255,255,.75)'; ctx.lineWidth = p.hasBall ? 3 : 1.6; }
      else { ctx.fillStyle = cols.away1; ctx.strokeStyle = p.hasBall ? '#ffffff' : 'rgba(0,0,0,.55)'; ctx.lineWidth = p.hasBall ? 3 : 1.4; }
      ctx.fill(); ctx.stroke();
      if (p.hasBall) { ctx.beginPath(); ctx.arc(p.x, p.y, rPL + 3.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,150,.85)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      // shirt number inside
      ctx.fillStyle = p.team === 0 ? cols.home2 : cols.away2;
      ctx.font = 'bold ' + Math.round(rPL * 0.95) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 2;
      ctx.fillText(String(p.num), p.x, p.y + 0.5);
      // name below
      ctx.font = 'bold ' + Math.max(8, Math.round(cw * 0.0155)) + 'px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.name, p.x, p.y + rPL + Math.max(6, cw * 0.012));
      ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
    });
    // ball
    const r = Math.max(5, cw * 0.012);
    ctx.beginPath(); ctx.ellipse(ball.x, ball.y + r * 0.6, r * 0.7, r * 0.28, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    const grad = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.05, ball.x, ball.y, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.6, '#ddd'); grad.addColorStop(1, '#888');
    ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; ctx.fill(); ctx.stroke();
    // goal flash
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,120,' + flash + ')'; ctx.fillRect(0, 0, cw, ch); flash = Math.max(0, flash - 0.02); }
    // card popup
    if (cardPop) {
      const a = Math.min(1, cardPop.t / 20);
      ctx.globalAlpha = a;
      const cx = cw * 0.5, cy = ch * 0.30;
      ctx.fillStyle = cardPop.col === 'red' ? '#e02020' : '#f1c40f';
      ctx.fillRect(cx - cw * 0.012, cy - ch * 0.055, cw * 0.024, ch * 0.075);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.strokeRect(cx - cw * 0.012, cy - ch * 0.055, cw * 0.024, ch * 0.075);
      ctx.font = 'bold ' + Math.round(cw * 0.022) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 3;
      ctx.fillText(cardPop.name, cx, cy + ch * 0.055);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // scene caption (big moment text)
    if (caption) {
      const a = Math.min(1, caption.t / 12);
      ctx.globalAlpha = a;
      ctx.font = '800 ' + Math.round(cw * (caption.big ? 0.052 : 0.034)) + 'px sans-serif';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(caption.text).width;
      ctx.fillStyle = 'rgba(8,14,28,.82)';
      const bh = ch * (caption.big ? 0.115 : 0.08);
      ctx.fillRect(cw * 0.5 - tw / 2 - 16, ch * 0.40 - bh * 0.66, tw + 32, bh);
      ctx.fillStyle = caption.col || '#fff';
      ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4;
      ctx.fillText(caption.text, cw * 0.5, ch * 0.40);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // phase HUD (ambient only — scenes speak through captions)
    if (!scene) {
      const labels = { kickoff: 'Kick Off', buildup: 'Build Up', midfield: 'Midfield Battle', attack: 'Going Forward', opp_attack: 'Defending', transition: 'Transition' };
      const who = phaseTeam === 0 ? teamNames[0] : teamNames[1];
      const label = (labels[phase] || phase) + ' · ' + who;
      ctx.font = 'bold ' + Math.round(cw * 0.02) + 'px sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = phaseTeam === 0 ? 'rgba(20,60,30,.78)' : 'rgba(60,22,22,.78)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cw * 0.5 - tw / 2 - 9, ch * 0.915, tw + 18, ch * 0.062, 4);
      else ctx.rect(cw * 0.5 - tw / 2 - 9, ch * 0.915, tw + 18, ch * 0.062);
      ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(label, cw * 0.5, ch * 0.958);
    }
  }

  return { init: init, update: update, draw: draw, busy: busy, playScene: playScene, showCard: showCard, goalFlash: goalFlash, concededFlash: concededFlash, setName: setName,
    _state: function () { return { players: players, ball: ball }; } };
})();
