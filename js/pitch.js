/* ── pitch.js — 2D canvas match visualisation ────────────────── */
'use strict';

const PITCH = (function () {
  let canvas = null, ctx = null;
  let players = [], ball = null;
  let phase = 'kickoff', phaseTeam = 0, phaseTimer = 60, tick = 0, flash = 0;
  let cols = { home1: '#1a1f8a', home2: '#2a3fff', away1: '#888888', away2: '#cc1010' };

  const ZONES_ATK = { GK:[0.42,0.58,0.82,0.95], CB:[0.25,0.75,0.60,0.78], RB:[0.70,0.92,0.42,0.68], LB:[0.08,0.30,0.42,0.68], WB:[0.72,0.95,0.30,0.60], DM:[0.30,0.70,0.48,0.65], CM:[0.20,0.80,0.32,0.58], AM:[0.22,0.78,0.20,0.42], RM:[0.65,0.95,0.20,0.48], LM:[0.05,0.35,0.20,0.48], RW:[0.68,0.97,0.08,0.35], LW:[0.03,0.32,0.08,0.35], ST:[0.28,0.72,0.05,0.28], CF:[0.28,0.72,0.05,0.28] };
  const ZONES_DEF = { GK:[0.42,0.58,0.86,0.97], CB:[0.20,0.80,0.68,0.85], RB:[0.60,0.90,0.60,0.82], LB:[0.10,0.40,0.60,0.82], WB:[0.60,0.92,0.55,0.80], DM:[0.25,0.75,0.55,0.72], CM:[0.20,0.80,0.45,0.68], AM:[0.20,0.80,0.38,0.58], RM:[0.55,0.90,0.42,0.65], LM:[0.10,0.45,0.42,0.65], RW:[0.55,0.90,0.38,0.62], LW:[0.10,0.45,0.38,0.62], ST:[0.25,0.75,0.28,0.52], CF:[0.25,0.75,0.28,0.52] };

  function lerp(a, b, t) { return a + (b - a) * t; }

  function init(canvasEl, formation, userNames, oppNames, userCols, oppCols) {
    canvas = canvasEl;
    const w = canvas.parentElement.clientWidth || 480;
    canvas.width = w; canvas.height = Math.round(w * 0.60);
    ctx = canvas.getContext('2d');
    cols = { home1: userCols[0], home2: userCols[1], away1: oppCols[0], away2: oppCols[1] };
    players = [];
    const slots = FORM_SLOTS[formation];
    const cw = canvas.width, ch = canvas.height;
    slots.forEach((slot, i) => {
      const z = ZONES_ATK[slot] || [0.3, 0.7, 0.3, 0.7];
      const bx = lerp(z[0], z[1], 0.5) * cw, by = lerp(z[2], z[3], 0.5) * ch;
      players.push({ team: 0, idx: i, slot: slot, x: bx, y: by, tx: bx, ty: by, vx: 0, vy: 0, hasBall: false, name: (userNames[i] || slot).split(' ').pop().substring(0, 7) });
    });
    const oppSlots = FORM_SLOTS['433'];
    oppSlots.forEach((slot, i) => {
      const z = ZONES_ATK[slot] || [0.3, 0.7, 0.3, 0.7];
      const bx = lerp(1 - z[1], 1 - z[0], 0.5) * cw, by = lerp(1 - z[3], 1 - z[2], 0.5) * ch;
      players.push({ team: 1, idx: i, slot: slot, x: bx, y: by, tx: bx, ty: by, vx: 0, vy: 0, hasBall: false, name: (oppNames[i] || slot).split(' ').pop().substring(0, 7) });
    });
    ball = { x: cw * 0.5, y: ch * 0.5, fromX: 0, fromY: 0, toX: 0, toY: 0, travelling: false, travelT: 0, travelDur: 0, owner: players[10] };
    players[10].hasBall = true;
    phase = 'kickoff'; phaseTeam = 0; phaseTimer = 60; tick = 0; flash = 0;
    draw();
  }

  function setName(idx, name) { if (players[idx]) players[idx].name = name.split(' ').pop().substring(0, 7); }

  function getZone(slot, team) {
    const ourBall = phaseTeam === team;
    const attacking = ['buildup', 'midfield', 'attack', 'shot', 'corner', 'freekick'].indexOf(phase) >= 0;
    const useAtk = ourBall ? attacking : !attacking;
    const cw = canvas.width, ch = canvas.height;
    const z = useAtk ? (ZONES_ATK[slot] || [0.3, 0.7, 0.3, 0.7]) : (ZONES_DEF[slot] || [0.3, 0.7, 0.5, 0.8]);
    if (team === 0) return { minX: z[0] * cw, maxX: z[1] * cw, minY: z[2] * ch, maxY: z[3] * ch };
    return { minX: (1 - z[1]) * cw, maxX: (1 - z[0]) * cw, minY: (1 - z[3]) * ch, maxY: (1 - z[2]) * ch };
  }

  function ballTo(pl) {
    if (!pl) return;
    if (ball.owner) ball.owner.hasBall = false;
    ball.owner = pl; pl.hasBall = true;
  }
  function passTo(toP) {
    if (!toP) return;
    if (ball.owner) ball.owner.hasBall = false;
    ball.owner = toP;
    ball.fromX = ball.x; ball.fromY = ball.y;
    ball.toX = toP.x + rnd(-10, 10); ball.toY = toP.y + rnd(-10, 10);
    ball.travelT = 0;
    ball.travelDur = Math.max(8, Math.min(28, Math.hypot(ball.toX - ball.fromX, ball.toY - ball.fromY) / 6));
    ball.travelling = true;
    toP.hasBall = true;
  }
  function setPhase(p, team, dur) { phase = p; phaseTeam = team; phaseTimer = Math.max(1, dur); }

  function tickPhase() {
    phaseTimer--; if (phaseTimer > 0) return;
    const cw = canvas.width, ch = canvas.height;
    const us = players.filter(p => p.team === 0);
    const them = players.filter(p => p.team === 1);
    if (phase === 'kickoff') { setPhase('buildup', phaseTeam, 40); ballTo(phaseTeam === 0 ? us[6] : them[6]); }
    else if (phase === 'buildup') {
      const t = phaseTeam === 0 ? us : them;
      if (Math.random() < 0.6) setPhase('midfield', phaseTeam, 35 + rnd(0, 20)); else setPhase(phaseTeam === 0 ? 'opp_attack' : 'attack', 1 - phaseTeam, 30);
      passTo(t[Math.floor(Math.random() * t.length)]);
    }
    else if (phase === 'midfield') {
      const r = Math.random();
      if (r < 0.55) setPhase(phaseTeam === 0 ? 'attack' : 'opp_attack', phaseTeam, 25 + rnd(0, 15));
      else if (r < 0.75) setPhase(phaseTeam === 0 ? 'opp_attack' : 'attack', 1 - phaseTeam, 30);
      else setPhase('midfield', phaseTeam, 20);
      const t = phaseTeam === 0 ? us : them;
      const fwd = t.filter(p => ['RW', 'LW', 'AM', 'ST', 'CF', 'RM', 'LM'].indexOf(p.slot) >= 0);
      if (fwd.length) passTo(pick(fwd));
    }
    else if (phase === 'attack' || phase === 'opp_attack') {
      const team = phase === 'attack' ? 0 : 1;
      const t = team === 0 ? us : them;
      const r = Math.random();
      if (r < 0.45) setPhase(team === 0 ? 'shot' : 'opp_shot', team, 15);
      else if (r < 0.62) setPhase('corner', team, 20);
      else setPhase('transition', 1 - team, 20);
      const att = t.filter(p => ['ST', 'CF', 'AM'].indexOf(p.slot) >= 0);
      if (att.length) ballTo(pick(att));
    }
    else if (phase === 'shot' || phase === 'opp_shot') {
      const team = phase === 'shot' ? 0 : 1;
      setPhase('transition', 1 - team, 25);
      if (ball.owner) ball.owner.hasBall = false;
      ball.owner = null;
      ball.fromX = ball.x; ball.fromY = ball.y;
      ball.toX = cw * lerp(0.35, 0.65, Math.random());
      ball.toY = team === 0 ? ch * 0.04 : ch * 0.96;
      ball.travelT = 0; ball.travelDur = 12; ball.travelling = true;
      flash = Math.max(flash, 0.3);
    }
    else if (phase === 'transition') {
      const toTeam = phaseTeam;
      setPhase('buildup', toTeam, 30);
      const t = toTeam === 0 ? us : them;
      ballTo(t[rnd(4, Math.min(8, t.length - 1))]);
    }
    else if (phase === 'corner') {
      setPhase(phaseTeam === 0 ? 'attack' : 'opp_attack', phaseTeam, 20);
      const t = phaseTeam === 0 ? us : them;
      const w = t.filter(p => p.slot === 'RW' || p.slot === 'LW' || p.slot === 'RM' || p.slot === 'LM');
      ballTo(w[0] || t[Math.min(9, t.length - 1)]);
    }
    else { setPhase('midfield', phaseTeam, 20); }
  }

  function update() {
    if (!canvas) return;
    tick++;
    const cw = canvas.width, ch = canvas.height;
    players.forEach(p => {
      if (p.hasBall) { p.tx = ball.x + rnd(-5, 5); p.ty = ball.y + rnd(-5, 5); }
      else if (tick % 4 === p.idx % 4) {
        const z = getZone(p.slot, p.team);
        p.tx = lerp(z.minX, z.maxX, 0.15 + Math.random() * 0.7);
        p.ty = lerp(z.minY, z.maxY, 0.15 + Math.random() * 0.7);
        if (phaseTeam !== p.team) {
          const dx = ball.x - p.x, dy = ball.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < cw * 0.20) { p.tx = ball.x + rnd(-15, 15); p.ty = ball.y + rnd(-15, 15); }
        }
      }
      p.vx = (p.tx - p.x) * 0.08; p.vy = (p.ty - p.y) * 0.08;
      p.x = clamp(p.x + p.vx, cw * 0.03, cw * 0.97);
      p.y = clamp(p.y + p.vy, ch * 0.03, ch * 0.97);
    });
    if (ball.travelling) {
      ball.travelT++;
      const t = Math.min(1, ball.travelT / ball.travelDur);
      const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      ball.x = lerp(ball.fromX, ball.toX, et);
      ball.y = lerp(ball.fromY, ball.toY, et) - Math.sin(Math.PI * t) * canvas.height * 0.04;
      if (t >= 1) { ball.travelling = false; if (ball.owner) { ball.x = ball.owner.x; ball.y = ball.owner.y; } }
    } else if (ball.owner) {
      ball.x += (ball.owner.x - ball.x) * 0.22;
      ball.y += (ball.owner.y - ball.y) * 0.22;
    }
    tickPhase();
  }

  function goalFlash() { flash = 0.6; setPhase('kickoff', 1, 80); if (canvas) { ball.x = canvas.width * 0.5; ball.y = canvas.height * 0.5; ball.travelling = false; } }
  function concededFlash() { flash = 0.35; setPhase('kickoff', 0, 80); if (canvas) { ball.x = canvas.width * 0.5; ball.y = canvas.height * 0.5; ball.travelling = false; } }

  function draw() {
    if (!ctx || !canvas) return;
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    // grass
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 === 0 ? '#1d6b1d' : '#1a631a'; ctx.fillRect(0, i * ch / 10, cw, ch / 10); }
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cw * 0.04, ch * 0.04, cw * 0.92, ch * 0.92);
    ctx.beginPath(); ctx.moveTo(cw * 0.04, ch * 0.5); ctx.lineTo(cw * 0.96, ch * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cw * 0.5, ch * 0.5, cw * 0.10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(cw * 0.26, ch * 0.04, cw * 0.48, ch * 0.16); ctx.strokeRect(cw * 0.26, ch * 0.80, cw * 0.48, ch * 0.16);
    ctx.strokeRect(cw * 0.38, ch * 0.04, cw * 0.24, ch * 0.07); ctx.strokeRect(cw * 0.38, ch * 0.89, cw * 0.24, ch * 0.07);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(cw * 0.41, ch * 0.01, cw * 0.18, ch * 0.03); ctx.fillRect(cw * 0.41, ch * 0.96, cw * 0.18, ch * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = 'bold ' + (cw * 0.022) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▲ ATTACK', cw * 0.5, ch * 0.075);
    // players
    const rPL = cw * 0.028;
    players.forEach(p => {
      ctx.beginPath(); ctx.ellipse(p.x, p.y + rPL * 0.5, rPL * 0.55, rPL * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, rPL, 0, Math.PI * 2);
      if (p.team === 0) { ctx.fillStyle = p.hasBall ? cols.home2 : cols.home1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = p.hasBall ? 2.5 : 1.8; }
      else { ctx.fillStyle = p.hasBall ? cols.away2 : cols.away1; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (rPL * 0.62) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 2;
      ctx.fillText(p.name.substring(0, 6), p.x, p.y);
      ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
    });
    // ball
    const r = cw * 0.018;
    ctx.beginPath(); ctx.ellipse(ball.x, ball.y + r * 0.5, r * 0.65, r * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    const grad = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.05, ball.x, ball.y, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.6, '#ddd'); grad.addColorStop(1, '#888');
    ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; ctx.fill(); ctx.stroke();
    // flash
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,120,' + flash + ')'; ctx.fillRect(0, 0, cw, ch); flash = Math.max(0, flash - 0.03); }
    // phase HUD
    const labels = { kickoff: 'Kick Off', buildup: 'Build Up', midfield: 'Midfield Play', attack: 'Attacking!', shot: 'SHOT!', opp_attack: 'Under Pressure', opp_shot: 'OPP SHOT!', transition: 'Transition', corner: 'Corner!', freekick: 'Free Kick' };
    const colors = { attack: 'rgba(39,174,96,.85)', shot: 'rgba(41,128,185,.9)', opp_attack: 'rgba(192,57,43,.7)', opp_shot: 'rgba(192,57,43,.92)' };
    const label = labels[phase] || phase;
    ctx.font = 'bold ' + (cw * 0.025) + 'px sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = colors[phase] || 'rgba(15,25,50,.7)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cw * 0.5 - tw / 2 - 8, ch * 0.91, tw + 16, ch * 0.075, 4);
    else ctx.rect(cw * 0.5 - tw / 2 - 8, ch * 0.91, tw + 16, ch * 0.075);
    ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(label, cw * 0.5, ch * 0.955);
  }

  return { init: init, update: update, draw: draw, goalFlash: goalFlash, concededFlash: concededFlash, setName: setName };
})();
