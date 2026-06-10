/* ── main.js — boot ──────────────────────────────────────────── */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  UI.renderSetup();
  gid('su-name').addEventListener('keydown', e => {
    if (e.key === 'Enter' && UI.setupClub) UI.confirmNewGame();
  });
  // close modals on overlay click
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('on'); });
  });
  // autosave when the tab is closed
  window.addEventListener('beforeunload', () => { if (G) saveGame(); });
});
