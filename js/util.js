/* ── util.js — small shared helpers (DOM-free) ─────────────────── */
'use strict';

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rndf(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function money(m) {
  if (m >= 1000) return '£' + (m / 1000).toFixed(2) + 'bn';
  if (m >= 1) return '£' + (m % 1 === 0 ? m : m.toFixed(1)) + 'm';
  return '£' + Math.round(m * 1000) + 'k';
}
function ordinal(n) {
  const s = n % 100;
  if (s >= 11 && s <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDate(d) { return WDAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
function fmtShort(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

function fitCol(f) { return f >= 80 ? '#27ae60' : f >= 60 ? '#d35400' : '#c0392b'; }
function fitLbl(f) { return f >= 85 ? 'Fresh' : f >= 70 ? 'Good' : f >= 55 ? 'Tired' : 'Exhausted'; }
function moraleEmoji(m) { return m >= 80 ? '😄' : m >= 60 ? '😐' : m >= 40 ? '😟' : '😤'; }
function ratCol(r) { return r >= 8 ? '#27ae60' : r >= 7 ? '#5aabdd' : r >= 6.4 ? '#d35400' : '#c0392b'; }
function fmtMin(m) { return (m <= 90 ? m : '90+' + (m - 90)) + "'"; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
