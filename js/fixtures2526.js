/* ── fixtures2526.js — the real 2025/26 Premier League fixture list ──
   All 380 fixtures in their true matchday order, with real matchday
   date offsets from the Aug 15 2025 opener (source: openfootball). */
'use strict';

const REAL_ROUNDS_2526 = [
  [["LIV","BOU"],["AVL","NEW"],["BHA","FUL"],["SUN","WHU"],["TOT","BUR"],["WOL","MCI"],["NFO","BRE"],["CHE","CRY"],["MUN","ARS"],["LEE","EVE"]],
  [["WHU","CHE"],["MCI","TOT"],["BOU","WOL"],["BRE","AVL"],["BUR","SUN"],["ARS","LEE"],["CRY","NFO"],["EVE","BHA"],["FUL","MUN"],["NEW","LIV"]],
  [["CHE","FUL"],["SUN","BRE"],["MUN","BUR"],["TOT","BOU"],["WOL","EVE"],["LEE","NEW"],["BHA","MCI"],["NFO","WHU"],["LIV","ARS"],["AVL","CRY"]],
  [["ARS","NFO"],["BOU","BHA"],["CRY","SUN"],["EVE","AVL"],["FUL","LEE"],["NEW","WOL"],["WHU","TOT"],["BRE","CHE"],["BUR","LIV"],["MCI","MUN"]],
  [["LIV","EVE"],["BHA","TOT"],["BUR","NFO"],["WHU","CRY"],["WOL","LEE"],["MUN","CHE"],["FUL","BRE"],["BOU","NEW"],["SUN","AVL"],["ARS","MCI"]],
  [["BRE","MUN"],["CRY","LIV"],["CHE","BHA"],["LEE","BOU"],["MCI","BUR"],["NFO","SUN"],["TOT","WOL"],["AVL","FUL"],["NEW","ARS"],["EVE","WHU"]],
  [["BOU","FUL"],["LEE","TOT"],["ARS","WHU"],["MUN","SUN"],["CHE","LIV"],["AVL","BUR"],["EVE","CRY"],["NEW","NFO"],["WOL","BHA"],["BRE","MCI"]],
  [["NFO","CHE"],["BHA","NEW"],["CRY","BOU"],["BUR","LEE"],["MCI","EVE"],["SUN","WOL"],["FUL","ARS"],["TOT","AVL"],["LIV","MUN"],["WHU","BRE"]],
  [["LEE","WHU"],["CHE","SUN"],["NEW","FUL"],["MUN","BHA"],["BRE","LIV"],["BOU","NFO"],["AVL","MCI"],["ARS","CRY"],["WOL","BUR"],["EVE","TOT"]],
  [["BHA","LEE"],["CRY","BRE"],["BUR","ARS"],["FUL","WOL"],["NFO","MUN"],["TOT","CHE"],["LIV","AVL"],["WHU","NEW"],["MCI","BOU"],["SUN","EVE"]],
  [["TOT","MUN"],["EVE","FUL"],["WHU","BUR"],["SUN","ARS"],["CHE","WOL"],["AVL","BOU"],["CRY","BHA"],["BRE","NEW"],["NFO","LEE"],["MCI","LIV"]],
  [["BUR","CHE"],["BOU","WHU"],["BHA","BRE"],["FUL","SUN"],["LIV","NFO"],["WOL","CRY"],["NEW","MCI"],["LEE","AVL"],["ARS","TOT"],["MUN","EVE"]],
  [["SUN","BOU"],["BRE","BUR"],["MCI","LEE"],["EVE","NEW"],["TOT","FUL"],["CRY","MUN"],["AVL","WOL"],["NFO","BHA"],["WHU","LIV"],["CHE","ARS"]],
  [["BOU","EVE"],["FUL","MCI"],["NEW","TOT"],["BHA","AVL"],["ARS","BRE"],["BUR","CRY"],["WOL","NFO"],["LIV","SUN"],["LEE","CHE"],["MUN","WHU"]],
  [["AVL","ARS"],["BOU","CHE"],["EVE","NFO"],["MCI","SUN"],["NEW","BUR"],["TOT","BRE"],["LEE","LIV"],["BHA","WHU"],["FUL","CRY"],["WOL","MUN"]],
  [["CHE","EVE"],["LIV","BHA"],["BUR","FUL"],["ARS","WOL"],["SUN","NEW"],["CRY","MCI"],["NFO","TOT"],["WHU","AVL"],["BRE","LEE"],["MUN","BOU"]],
  [["NEW","CHE"],["BOU","BUR"],["BHA","SUN"],["MCI","WHU"],["WOL","BRE"],["TOT","LIV"],["EVE","ARS"],["LEE","CRY"],["AVL","MUN"],["FUL","NFO"]],
  [["MUN","NEW"],["NFO","MCI"],["ARS","BHA"],["BRE","BOU"],["BUR","EVE"],["LIV","WOL"],["WHU","FUL"],["CHE","AVL"],["SUN","LEE"],["CRY","TOT"]],
  [["BUR","NEW"],["CHE","BOU"],["NFO","EVE"],["WHU","BHA"],["ARS","AVL"],["MUN","WOL"],["CRY","FUL"],["LIV","LEE"],["SUN","MCI"],["BRE","TOT"]],
  [["AVL","NFO"],["BHA","BUR"],["WOL","WHU"],["BOU","ARS"],["LEE","MUN"],["EVE","BRE"],["NEW","CRY"],["TOT","SUN"],["FUL","LIV"],["MCI","CHE"]],
  [["WHU","NFO"],["BOU","TOT"],["CRY","AVL"],["BRE","SUN"],["EVE","WOL"],["FUL","CHE"],["MCI","BHA"],["BUR","MUN"],["NEW","LEE"],["ARS","LIV"]],
  [["MUN","MCI"],["SUN","CRY"],["CHE","BRE"],["LIV","BUR"],["LEE","FUL"],["TOT","WHU"],["NFO","ARS"],["WOL","NEW"],["AVL","EVE"],["BHA","BOU"]],
  [["WHU","SUN"],["BUR","TOT"],["FUL","BHA"],["MCI","WOL"],["BOU","LIV"],["CRY","CHE"],["BRE","NFO"],["NEW","AVL"],["ARS","MUN"],["EVE","LEE"]],
  [["BHA","EVE"],["LEE","ARS"],["WOL","BOU"],["CHE","WHU"],["LIV","NEW"],["AVL","BRE"],["MUN","FUL"],["NFO","CRY"],["TOT","MCI"],["SUN","BUR"]],
  [["LEE","NFO"],["MUN","TOT"],["BOU","AVL"],["ARS","SUN"],["BUR","WHU"],["FUL","EVE"],["WOL","CHE"],["NEW","BRE"],["BHA","CRY"],["LIV","MCI"]],
  [["CHE","LEE"],["EVE","BOU"],["TOT","NEW"],["WHU","MUN"],["AVL","BHA"],["MCI","FUL"],["NFO","WOL"],["CRY","BUR"],["SUN","LIV"],["BRE","ARS"]],
  [["AVL","LEE"],["BRE","BHA"],["CHE","BUR"],["WHU","BOU"],["MCI","NEW"],["SUN","FUL"],["CRY","WOL"],["NFO","LIV"],["TOT","ARS"],["EVE","MUN"]],
  [["WOL","AVL"],["BOU","SUN"],["BUR","BRE"],["LIV","WHU"],["NEW","EVE"],["LEE","MCI"],["BHA","NFO"],["FUL","TOT"],["MUN","CRY"],["ARS","CHE"]],
  [["BOU","BRE"],["EVE","BUR"],["LEE","SUN"],["WOL","LIV"],["AVL","CHE"],["BHA","ARS"],["FUL","WHU"],["MCI","NFO"],["NEW","MUN"],["TOT","CRY"]],
  [["SUN","BHA"],["BUR","BOU"],["ARS","EVE"],["CHE","NEW"],["WHU","MCI"],["CRY","LEE"],["MUN","AVL"],["NFO","FUL"],["LIV","TOT"],["BRE","WOL"]],
  [["WOL","ARS"],["BOU","MUN"],["BHA","LIV"],["FUL","BUR"],["EVE","CHE"],["LEE","BRE"],["NEW","SUN"],["AVL","WHU"],["TOT","NFO"],["MCI","CRY"]],
  [["WHU","WOL"],["ARS","BOU"],["BRE","EVE"],["BUR","BHA"],["LIV","FUL"],["SUN","TOT"],["CRY","NEW"],["NFO","AVL"],["CHE","MCI"],["MUN","LEE"]],
  [["BRE","FUL"],["NEW","BOU"],["LEE","WOL"],["TOT","BHA"],["CHE","MUN"],["NFO","BUR"],["AVL","SUN"],["EVE","LIV"],["MCI","ARS"],["CRY","WHU"]],
  [["BHA","CHE"],["BOU","LEE"],["BUR","MCI"],["SUN","NFO"],["FUL","AVL"],["LIV","CRY"],["WHU","EVE"],["WOL","TOT"],["ARS","NEW"],["MUN","BRE"]],
  [["LEE","BUR"],["BRE","WHU"],["NEW","BHA"],["WOL","SUN"],["ARS","FUL"],["BOU","CRY"],["MUN","LIV"],["AVL","TOT"],["CHE","NFO"],["EVE","MCI"]],
  [["LIV","CHE"],["SUN","MUN"],["BHA","WOL"],["FUL","BOU"],["MCI","BRE"],["CRY","EVE"],["BUR","AVL"],["NFO","NEW"],["WHU","ARS"],["TOT","LEE"]],
  [["AVL","LIV"],["MUN","NFO"],["BRE","CRY"],["EVE","SUN"],["LEE","BHA"],["WOL","FUL"],["NEW","WHU"],["ARS","BUR"],["BOU","MCI"],["CHE","TOT"]],
  [["SUN","CHE"],["BHA","MUN"],["CRY","ARS"],["BUR","WOL"],["FUL","NEW"],["LIV","BRE"],["MCI","AVL"],["NFO","BOU"],["TOT","EVE"],["WHU","LEE"]]
];
const REAL_ROUND_DAYS_2526 = [0, 7, 15, 29, 36, 43, 49, 64, 70, 78, 85, 99, 106, 109, 113, 120, 127, 133, 137, 141, 144, 155, 162, 169, 175, 179, 190, 196, 200, 211, 213, 238, 246, 249, 259, 267, 273, 282];
