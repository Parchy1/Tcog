/* ── data.js — static game data: clubs, players, pools, tactics ── */
'use strict';

/* Premier League clubs.
   str = baseline reputation, bud = transfer budget (£m),
   exp = board expectation, euro = European competition in season 1 */
const CLUBS = [
  { key: 'NEW', name: 'Newcastle',      full: 'Newcastle United',    stadium: "St. James' Park",   col1: '#241f20', col2: '#ffffff', str: 84, bud: 80,  exp: 'Top 4',      euro: 'UCL' },
  { key: 'ARS', name: 'Arsenal',        full: 'Arsenal',             stadium: 'Emirates Stadium',  col1: '#ef0107', col2: '#ffffff', str: 92, bud: 140, exp: 'Win the league', euro: 'UCL' },
  { key: 'MCI', name: 'Man City',       full: 'Manchester City',     stadium: 'Etihad Stadium',    col1: '#6cabdd', col2: '#1c2c5b', str: 93, bud: 150, exp: 'Win the league', euro: 'UCL' },
  { key: 'LIV', name: 'Liverpool',      full: 'Liverpool',           stadium: 'Anfield',           col1: '#c8102e', col2: '#f6eb61', str: 91, bud: 130, exp: 'Win the league', euro: 'UCL' },
  { key: 'CHE', name: 'Chelsea',        full: 'Chelsea',             stadium: 'Stamford Bridge',   col1: '#034694', col2: '#ffffff', str: 88, bud: 150, exp: 'Top 4',      euro: 'UCL' },
  { key: 'TOT', name: 'Spurs',          full: 'Tottenham Hotspur',   stadium: 'Tottenham Stadium', col1: '#132257', col2: '#ffffff', str: 83, bud: 90,  exp: 'Top 6',      euro: 'UCL' },
  { key: 'AVL', name: 'Aston Villa',    full: 'Aston Villa',         stadium: 'Villa Park',        col1: '#670e36', col2: '#95bfe5', str: 85, bud: 60,  exp: 'Top 6',      euro: 'UEL' },
  { key: 'MUN', name: 'Man Utd',        full: 'Manchester United',   stadium: 'Old Trafford',      col1: '#da291c', col2: '#fbe122', str: 81, bud: 100, exp: 'Top 6',      euro: null },
  { key: 'NFO', name: "Nott'm Forest",  full: 'Nottingham Forest',   stadium: 'City Ground',       col1: '#dd0000', col2: '#ffffff', str: 79, bud: 45,  exp: 'Top half',   euro: 'UEL' },
  { key: 'BHA', name: 'Brighton',       full: 'Brighton & Hove Albion', stadium: 'Amex Stadium',   col1: '#0057b8', col2: '#ffcd00', str: 79, bud: 50,  exp: 'Top half',   euro: null },
  { key: 'WHU', name: 'West Ham',       full: 'West Ham United',     stadium: 'London Stadium',    col1: '#7a263a', col2: '#1bb1e7', str: 77, bud: 45,  exp: 'Top half',   euro: null },
  { key: 'CRY', name: 'Crystal Palace', full: 'Crystal Palace',      stadium: 'Selhurst Park',     col1: '#1b458f', col2: '#c4122e', str: 77, bud: 40,  exp: 'Mid-table',  euro: 'UECL' },
  { key: 'BRE', name: 'Brentford',      full: 'Brentford',           stadium: 'Gtech Stadium',     col1: '#e30613', col2: '#fbb800', str: 76, bud: 40,  exp: 'Mid-table',  euro: null },
  { key: 'FUL', name: 'Fulham',         full: 'Fulham',              stadium: 'Craven Cottage',    col1: '#000000', col2: '#cc0000', str: 76, bud: 40,  exp: 'Mid-table',  euro: null },
  { key: 'EVE', name: 'Everton',        full: 'Everton',             stadium: 'Hill Dickinson Stadium', col1: '#003399', col2: '#ffffff', str: 73, bud: 45, exp: 'Mid-table', euro: null },
  { key: 'BOU', name: 'Bournemouth',    full: 'AFC Bournemouth',     stadium: 'Vitality Stadium',  col1: '#da291c', col2: '#000000', str: 75, bud: 40,  exp: 'Mid-table',  euro: null },
  { key: 'SUN', name: 'Sunderland',     full: 'Sunderland',          stadium: 'Stadium of Light',  col1: '#eb172b', col2: '#ffffff', str: 71, bud: 60,  exp: 'Avoid relegation', euro: null },
  { key: 'LEE', name: 'Leeds',          full: 'Leeds United',        stadium: 'Elland Road',       col1: '#ffffff', col2: '#1d428a', str: 70, bud: 45,  exp: 'Avoid relegation', euro: null },
  { key: 'IPS', name: 'Ipswich',        full: 'Ipswich Town',        stadium: 'Portman Road',      col1: '#0044a9', col2: '#ffffff', str: 67, bud: 35,  exp: 'Avoid relegation', euro: null },
  { key: 'SOU', name: 'Southampton',    full: 'Southampton',         stadium: "St. Mary's",        col1: '#d71920', col2: '#ffffff', str: 65, bud: 30,  exp: 'Avoid relegation', euro: null }
];
const CLUB_BY_KEY = {}; CLUBS.forEach(c => { CLUB_BY_KEY[c.key] = c; });
const EXP_POS = { 'Win the league': 1, 'Top 4': 4, 'Top 6': 6, 'Top half': 10, 'Mid-table': 14, 'Avoid relegation': 17 };

/* Hand-written key players per club: [name, pos, rating, age].
   Sub-attributes and value are derived from position archetypes. */
const STARS = {
  NEW: [], // Newcastle uses the full detailed squad below
  ARS: [['Raya','GK',89,30],['Saliba','CB',91,24],['Gabriel','CB',88,27],['Timber','RB',85,24],['Calafiori','LB',84,23],['White','RB',83,28],['Zubimendi','DM',87,26],['Rice','DM',88,26],['Odegaard','AM',88,27],['Eze','AM',85,27],['Saka','RW',90,24],['Martinelli','LW',85,24],['Madueke','RW',83,23],['Gyokeres','ST',91,27],['Havertz','ST',85,26],['Trossard','LW',82,30],['Lewis-Skelly','LB',80,19],['Nwaneri','AM',78,18]],
  MCI: [['Ederson','GK',87,32],['Dias','CB',88,28],['Stones','CB',85,31],['Gvardiol','LB',86,23],['Lewis','RB',81,21],['Ake','CB',83,30],['Rodri','DM',91,29],['Kovacic','CM',83,31],['Reijnders','CM',86,27],['B.Silva','AM',87,31],['Foden','AM',87,25],['Cherki','AM',84,22],['Doku','LW',83,23],['Savinho','RW',83,21],['Marmoush','ST',85,26],['Haaland','ST',96,25],['Bobb','RW',79,22]],
  LIV: [['Alisson','GK',90,33],['Van Dijk','CB',90,34],['Konate','CB',85,26],['Frimpong','RB',84,24],['Kerkez','LB',84,22],['Gomez','CB',81,28],['Gravenberch','DM',87,23],['Mac Allister','CM',88,27],['Szoboszlai','CM',86,25],['Jones','CM',81,24],['Wirtz','AM',93,22],['Salah','RW',91,33],['Gakpo','LW',85,26],['Chiesa','RW',81,28],['Ekitike','ST',86,23],['Nunez','ST',83,26]],
  CHE: [['Sanchez','GK',84,28],['Colwill','CB',85,22],['Chalobah','CB',83,26],['James','RB',86,26],['Cucurella','LB',85,27],['Gusto','RB',82,22],['Caicedo','DM',87,24],['Fernandez','CM',86,24],['Lavia','DM',82,21],['Palmer','AM',91,23],['Neto','RW',84,25],['Garnacho','LW',83,21],['Gittens','LW',82,21],['Joao Pedro','ST',85,24],['Delap','ST',82,22],['Estevao','RW',83,18]],
  TOT: [['Vicario','GK',84,29],['Romero','CB',87,27],['Van de Ven','CB',86,24],['Porro','RB',84,26],['Udogie','LB',83,23],['Danso','CB',80,27],['Bentancur','CM',83,28],['Sarr','CM',82,23],['Bergvall','CM',81,19],['Palhinha','DM',83,30],['Simons','AM',85,22],['Kudus','RW',84,25],['Odobert','LW',79,21],['Richarlison','ST',82,28],['Solanke','ST',83,28],['Tel','ST',79,20]],
  AVL: [['Martinez','GK',88,33],['Konsa','CB',84,28],['Pau Torres','CB',85,28],['Cash','RB',82,28],['Digne','LB',81,32],['Kamara','DM',84,26],['Onana','DM',84,24],['Tielemans','CM',85,28],['Rogers','AM',86,23],['McGinn','LM',83,31],['Buendia','AM',80,29],['Malen','RW',81,26],['Guessand','ST',80,24],['Watkins','ST',86,30]],
  MUN: [['Lammens','GK',80,23],['Onana','GK',82,29],['Martinez','CB',84,27],['De Ligt','CB',84,26],['Yoro','CB',81,20],['Dalot','RB',82,26],['Dorgu','LB',80,21],['Casemiro','DM',83,33],['Ugarte','DM',81,24],['Mainoo','CM',83,20],['Bruno Fernandes','AM',88,31],['Amad','RW',84,23],['Mbeumo','RW',87,26],['Cunha','LW',86,26],['Sesko','ST',84,22],['Zirkzee','ST',79,24]],
  NFO: [['Sels','GK',81,33],['Milenkovic','CB',83,28],['Murillo','CB',84,23],['Aina','RB',81,29],['Williams','LB',80,24],['Anderson','CM',82,22],['Sangare','DM',79,28],['Gibbs-White','AM',84,25],['Ndoye','RW',81,25],['Hudson-Odoi','LW',80,25],['Igor Jesus','ST',79,24],['Wood','ST',82,34],['Awoniyi','ST',78,28]],
  BHA: [['Verbruggen','GK',83,23],['Van Hecke','CB',82,25],['Dunk','CB',81,34],['Veltman','RB',79,33],['Kadioglu','LB',80,26],['Baleba','DM',84,21],['Ayari','CM',80,22],['Hinshelwood','CM',79,20],['Rutter','AM',82,23],['Mitoma','LW',85,28],['Minteh','RW',82,21],['Welbeck','ST',80,35],['Gomez','ST',78,24]],
  WHU: [['Areola','GK',81,32],['Kilman','CB',80,28],['Todibo','CB',80,25],['Wan-Bissaka','RB',81,28],['Emerson','LB',79,31],['Ward-Prowse','CM',81,31],['Soucek','CM',79,30],['Paqueta','AM',84,28],['Bowen','RW',85,29],['Summerville','LW',81,24],['Kudus? No','LW',1,1],['Fullkrug','ST',81,32],['Wilson','ST',77,33]],
  CRY: [['Henderson','GK',81,28],['Guehi','CB',85,25],['Lacroix','CB',82,25],['Richards','CB',80,26],['Munoz','RB',82,29],['Mitchell','LB',80,26],['Wharton','CM',83,21],['Hughes','CM',79,30],['Kamada','AM',80,29],['Sarr','RW',81,27],['Pino','LW',81,23],['Mateta','ST',83,28],['Esse','LW',78,20]],
  BRE: [['Kelleher','GK',81,27],['Collins','CB',83,24],['Pinnock','CB',80,32],['Ajer','RB',79,27],['Henry','LB',80,30],['Janelt','CM',79,27],['Yarmoliuk','CM',78,21],['Damsgaard','AM',81,25],['Schade','LW',81,23],['Ouattara','RW',80,23],['Thiago','ST',81,24],['Carvalho','AM',79,23]],
  FUL: [['Leno','GK',83,33],['Bassey','CB',82,26],['Andersen','CB',81,29],['Castagne','RB',79,30],['Robinson','LB',81,28],['Berge','DM',80,27],['Lukic','CM',79,29],['Pereira','AM',82,30],['Iwobi','LM',80,29],['Wilson','RW',79,33],['Muniz','ST',80,24],['Jimenez','ST',79,34]],
  EVE: [['Pickford','GK',85,31],['Tarkowski','CB',82,33],['Branthwaite','CB',83,23],["O'Brien",'RB',79,26],['Mykolenko','LB',79,26],['Gueye','DM',80,36],['Garner','CM',79,24],['Dewsbury-Hall','CM',80,27],['Ndiaye','RW',82,25],['Grealish','LW',84,30],['Beto','ST',78,27],['Barry','ST',76,22]],
  BOU: [['Petrovic','GK',80,26],['Senesi','CB',81,28],['Diakite','CB',78,24],['Smith','RB',78,22],['Truffert','LB',79,24],['Adams','DM',79,29],['Scott','CM',78,22],['Christie','CM',78,30],['Kluivert','AM',82,26],['Semenyo','LW',84,25],['Brooks','RW',78,28],['Evanilson','ST',81,26],['Kroupi','ST',76,19]],
  SUN: [['Roefs','GK',76,22],['Ballard','CB',77,26],['Mukiele','CB',78,28],['Hume','RB',77,23],['Reinildo','LB',76,31],['Xhaka','CM',82,33],['Sadiki','CM',75,21],['Le Fee','AM',78,25],['Adingra','RW',78,23],['Talbi','LW',77,22],['Isidor','ST',76,25],['Mayenda','ST',75,20]],
  LEE: [['Perri','GK',76,25],['Struijk','CB',77,26],['Rodon','CB',76,28],['Bogle','RB',75,25],['Gudmundsson','LB',74,28],['Ampadu','DM',77,25],['Stach','CM',77,27],['Aaronson','AM',76,25],['Gnonto','RW',77,22],['James','LW',76,28],['Calvert-Lewin','ST',77,28],['Nmecha','ST',75,27]],
  IPS: [['Walton','GK',73,26],['Greaves','CB',75,24],['Burgess','CB',73,29],['Johnson','RB',73,26],['Davis','LB',74,30],['Morsy','CM',73,34],['Cajuste','CM',74,26],['Taylor','CM',72,25],['Hutchinson','RW',76,22],['Clarke','LW',74,25],['Philogene','LW',75,23],['Hirst','ST',74,26]],
  SOU: [['Bazunu','GK',73,24],['Harwood-Bellis','CB',75,23],['Stephens','CB',71,31],['Sugawara','RB',73,25],['Manning','LB',72,29],['Downes','DM',75,26],['Aribo','CM',73,29],['Ugochukwu','CM',73,21],['Dibling','AM',76,19],['Fernandes','RW',74,21],['Armstrong','LW',73,28],['Stewart','ST',73,28],['Archer','ST',73,24]]
};
// remove the placeholder bad row in WHU
STARS.WHU = STARS.WHU.filter(s => s[2] > 1);

/* Newcastle United — full detailed squad (from the 25/26 prototype) */
const NUFC_SQUAD = [
  { n: 'Pope',        p: 'GK', r: 86, pac: 52, sho: 14, pas: 62, dri: 55, def: 84, phy: 76, num: 1,  val: 20,  age: 33, contract: 2, pot: 86 },
  { n: 'Vlachodimos', p: 'GK', r: 81, pac: 48, sho: 12, pas: 60, dri: 50, def: 80, phy: 72, num: 32, val: 10,  age: 30, contract: 2, pot: 82 },
  { n: 'Ruddy',       p: 'GK', r: 70, pac: 40, sho: 10, pas: 50, dri: 42, def: 68, phy: 65, num: 26, val: 2,   age: 37, contract: 1, pot: 70 },
  { n: 'Livramento',  p: 'RB', r: 83, pac: 88, sho: 60, pas: 74, dri: 80, def: 80, phy: 76, num: 21, val: 36,  age: 22, contract: 3, pot: 88 },
  { n: 'Trippier',    p: 'RB', r: 83, pac: 67, sho: 72, pas: 85, dri: 77, def: 80, phy: 73, num: 2,  val: 12,  age: 34, contract: 1, pot: 83 },
  { n: 'Schar',       p: 'CB', r: 82, pac: 62, sho: 55, pas: 73, dri: 60, def: 84, phy: 78, num: 5,  val: 8,   age: 33, contract: 1, pot: 82 },
  { n: 'Botman',      p: 'CB', r: 83, pac: 66, sho: 48, pas: 68, dri: 58, def: 85, phy: 84, num: 4,  val: 30,  age: 25, contract: 3, pot: 87 },
  { n: 'Thiaw',       p: 'CB', r: 84, pac: 72, sho: 50, pas: 66, dri: 62, def: 85, phy: 86, num: 12, val: 40,  age: 23, contract: 3, pot: 89 },
  { n: 'Burn',        p: 'CB', r: 79, pac: 60, sho: 45, pas: 60, dri: 52, def: 80, phy: 82, num: 33, val: 6,   age: 32, contract: 2, pot: 79 },
  { n: 'Hall',        p: 'LB', r: 82, pac: 84, sho: 55, pas: 76, dri: 77, def: 79, phy: 74, num: 3,  val: 30,  age: 26, contract: 3, pot: 86 },
  { n: 'Guimaraes',   p: 'CM', r: 90, pac: 73, sho: 75, pas: 88, dri: 85, def: 83, phy: 85, num: 39, val: 95,  age: 27, contract: 3, pot: 91 },
  { n: 'Tonali',      p: 'CM', r: 87, pac: 71, sho: 73, pas: 85, dri: 81, def: 81, phy: 83, num: 8,  val: 75,  age: 24, contract: 3, pot: 90 },
  { n: 'Joelinton',   p: 'CM', r: 83, pac: 76, sho: 70, pas: 74, dri: 78, def: 74, phy: 89, num: 7,  val: 30,  age: 28, contract: 2, pot: 84 },
  { n: 'Ramsey',      p: 'CM', r: 83, pac: 75, sho: 73, pas: 81, dri: 79, def: 69, phy: 77, num: 41, val: 44,  age: 24, contract: 3, pot: 88 },
  { n: 'Miley',       p: 'CM', r: 79, pac: 73, sho: 65, pas: 78, dri: 75, def: 66, phy: 69, num: 67, val: 14,  age: 19, contract: 3, pot: 86 },
  { n: 'Willock',     p: 'CM', r: 77, pac: 77, sho: 68, pas: 71, dri: 73, def: 63, phy: 75, num: 28, val: 12,  age: 25, contract: 2, pot: 80 },
  { n: 'Elanga',      p: 'RW', r: 83, pac: 92, sho: 74, pas: 71, dri: 83, def: 58, phy: 74, num: 20, val: 42,  age: 23, contract: 3, pot: 87 },
  { n: 'Murphy',      p: 'RW', r: 78, pac: 82, sho: 70, pas: 68, dri: 74, def: 55, phy: 68, num: 23, val: 8,   age: 29, contract: 2, pot: 79 },
  { n: 'Gordon',      p: 'LW', r: 86, pac: 89, sho: 79, pas: 77, dri: 87, def: 61, phy: 73, num: 10, val: 70,  age: 24, contract: 3, pot: 90 },
  { n: 'Barnes',      p: 'LW', r: 81, pac: 85, sho: 74, pas: 71, dri: 79, def: 54, phy: 71, num: 11, val: 24,  age: 27, contract: 2, pot: 83 },
  { n: 'Isak',        p: 'ST', r: 92, pac: 91, sho: 91, pas: 78, dri: 89, def: 49, phy: 79, num: 14, val: 130, age: 26, contract: 4, pot: 94 },
  { n: 'Wissa',       p: 'ST', r: 84, pac: 82, sho: 84, pas: 70, dri: 80, def: 46, phy: 76, num: 9,  val: 55,  age: 28, contract: 2, pot: 86 },
  { n: 'Woltemade',   p: 'ST', r: 83, pac: 76, sho: 80, pas: 72, dri: 76, def: 44, phy: 80, num: 27, val: 42,  age: 23, contract: 3, pot: 87 }
];

/* Star players at non-PL clubs — available on the transfer market */
const EURO_STARS = [
  ['Mbappe','ST',95,26,'Real Madrid'],['Vinicius Jr','LW',93,25,'Real Madrid'],['Bellingham','CM',92,22,'Real Madrid'],['Courtois','GK',91,33,'Real Madrid'],
  ['Yamal','RW',95,18,'Barcelona'],['Pedri','CM',90,23,'Barcelona'],['Raphinha','LW',89,29,'Barcelona'],['Balde','LB',85,22,'Barcelona'],
  ['Kane','ST',93,32,'Bayern Munich'],['Musiala','AM',88,22,'Bayern Munich'],['Olise','RW',88,23,'Bayern Munich'],['Kimmich','DM',87,30,'Bayern Munich'],
  ['Kvaratskhelia','LW',87,24,'PSG'],['Doue','AM',87,20,'PSG'],['Hakimi','RB',89,26,'PSG'],['Vitinha','CM',88,25,'PSG'],['Joao Neves','CM',86,21,'PSG'],['Barcola','LW',84,23,'PSG'],['Huijsen','CB',83,20,'Real Madrid'],
  ['L.Martinez','ST',88,28,'Inter Milan'],['Bastoni','CB',87,26,'Inter Milan'],['Barella','CM',86,28,'Inter Milan'],
  ['Leao','LW',86,26,'AC Milan'],['Pulisic','RW',85,27,'AC Milan'],['Theo Hernandez','LB',85,28,'AC Milan'],['Camarda','ST',74,17,'AC Milan'],
  ['Guirassy','ST',86,29,'Dortmund'],['Adeyemi','LW',84,23,'Dortmund'],['Schlotterbeck','CB',84,26,'Dortmund'],
  ['Schick','ST',85,29,'Leverkusen'],['Grimaldo','LB',85,30,'Leverkusen'],['Tah','CB',84,29,'Bayern Munich'],
  ['Alvarez','ST',88,25,'Atletico Madrid'],['Griezmann','AM',84,34,'Atletico Madrid'],['Oblak','GK',88,32,'Atletico Madrid'],
  ['Osimhen','ST',88,26,'Galatasaray'],['Gyokeres? no','ST',1,1,'x'],['Vlahovic','ST',85,25,'Juventus'],['Yildiz','AM',85,20,'Juventus'],
  ['Zubeldia','CB',81,28,'Real Sociedad'],['Greenwood','RW',84,24,'Marseille'],['David','ST',84,25,'Juventus'],['Sane','RW',83,29,'Galatasaray'],
  ['Donnarumma','GK',89,26,'Man City? no']
].filter(s => s[2] > 1 && s[4].indexOf('?') < 0);

const FREE_AGENTS = [
  ['De Vrij','CB',80,33],['Lloris','GK',76,38],['Rabiot','CM',82,30],['Depay','ST',80,31],['Dybala','AM',83,32],['Goretzka','CM',82,30],['Sergi Roberto','CM',76,33],['Mariano','ST',72,32]
];

/* Name pools for procedurally generated squad players */
const FIRST_NAMES = ['James','Harry','Ollie','Jack','Charlie','Tom','George','Lewis','Callum','Kieran','Owen','Reece','Tyler','Mason','Archie','Finley','Theo','Luca','Ethan','Josh','Sam','Ben','Max','Joe','Dan','Aaron','Conor','Liam','Ryan','Nathan','Kai','Cole','Jude','Rio','Alfie','Freddie','Marcus','Jayden','Andre','Marc','Pablo','Diego','Sergi','Iker','Alvaro','Mateo','Bruno','Joao','Tiago','Rafael','Goncalo','Nuno','Luis','Pedro','Karim','Yacine','Moussa','Ibrahim','Amadou','Sekou','Idrissa','Cheikh','Lamine','Youssef','Jean','Antoine','Hugo','Lucas','Theo','Mathis','Enzo','Leo','Nico','Jonas','Felix','Emil','Lukas','Florian','Tobias','Jan','Stefan','Milan','Marko','Ivan','Petar','Andrej','Viktor','Oleksandr','Mikkel','Lasse','Anders','Erik','Gustav','Oscar','Axel','Santiago','Facundo','Thiago','Agustin','Nicolas','Julian','Kenji','Takumi','Daichi','Min-jae','Heung-soo'];
const LAST_NAMES = ['Walker','Hughes','Robinson','Clarke','Wright','Turner','Baker','Carter','Mitchell','Foster','Murray','Graham','Shaw','Hayes','Palmer','Gibson','Burke','Doyle','Quinn','Byrne','Kelly','Lynch','Moran','Sweeney','Fletcher','Dawson','Barton','Whitfield','Crowther','Ashworth','Garcia','Fernandez','Lopez','Martinez','Sanchez','Torres','Ramos','Vazquez','Navarro','Iglesias','Silva','Santos','Costa','Pereira','Oliveira','Carvalho','Sousa','Ferreira','Rodrigues','Almeida','Diallo','Traore','Kone','Toure','Keita','Camara','Cisse','Mendy','Sarr','Gueye','Dubois','Moreau','Lefevre','Fontaine','Roux','Garnier','Chevalier','Lambert','Muller','Schmidt','Weber','Wagner','Becker','Hoffmann','Schulz','Keller','Richter','Kovac','Novak','Horvat','Petrovic','Jovanovic','Babic','Pavlovic','Larsen','Nielsen','Andersen','Berg','Lindgren','Dahl','Holm','Lund','Rodriguez','Gonzalez','Acosta','Medina','Herrera','Rojas','Tanaka','Sato','Yamamoto','Kim','Park','Nakamura'];

/* European competition opponent pools (name → strength) */
const UCL_POOL = { 'Real Madrid': 96, 'Bayern Munich': 94, 'PSG': 92, 'Barcelona': 91, 'Inter Milan': 89, 'Atletico Madrid': 88, 'Leverkusen': 86, 'AC Milan': 86, 'Juventus': 85, 'Atalanta': 85, 'Dortmund': 84, 'Napoli': 84, 'Benfica': 83, 'PSV': 82, 'Frankfurt': 82, 'Sporting CP': 81, 'Villarreal': 81, 'Athletic Club': 80, 'Ajax': 80, 'Monaco': 80, 'Marseille': 80, 'Galatasaray': 79, 'Club Brugge': 77, 'Copenhagen': 76, 'Slavia Praha': 75, 'Union SG': 75, 'Olympiacos': 73, 'Bodo Glimt': 72, 'Qarabag': 68, 'Kairat': 64 };
const UEL_POOL = { 'Roma': 84, 'Lazio': 81, 'Porto': 82, 'Braga': 78, 'Fenerbahce': 79, 'Lyon': 79, 'Lille': 80, 'Real Betis': 80, 'Sevilla': 78, 'Feyenoord': 79, 'Rangers': 74, 'Celtic': 76, 'Stuttgart': 81, 'Freiburg': 78, 'Real Sociedad': 80, 'Nice': 77, 'Bologna': 80, 'Genk': 74, 'Basel': 72, 'Ferencvaros': 70, 'Midtjylland': 71, 'Viktoria Plzen': 70, 'Salzburg': 75, 'Sturm Graz': 70, 'Anderlecht': 72, 'Utrecht': 71, 'Brann': 67, 'Go Ahead Eagles': 65, 'PAOK': 72, 'Dinamo Zagreb': 73 };
const UECL_POOL = { 'Fiorentina': 80, 'AZ Alkmaar': 74, 'Legia Warsaw': 68, 'Rapid Wien': 67, 'Djurgarden': 64, 'Lugano': 63, 'Hearts': 62, 'Shamrock Rovers': 58, 'Omonia': 60, 'Hacken': 63, 'Cercle Brugge': 65, 'Gent': 70, 'Heidenheim': 69, 'Mainz': 74, 'Strasbourg': 74, 'Guimaraes': 70, 'Panathinaikos': 71, 'Besiktas': 74, 'Trabzonspor': 71, 'Slovan Bratislava': 62, 'Borac': 56, 'Noah': 55, 'Pafos': 61, 'Jagiellonia': 63 };
const EURO_CFG = {
  UCL:  { label: 'Champions League',  icon: '⭐', mds: 8, pool: UCL_POOL,  teams: 36, prize: [40, 30, 22, 15, 10, 6] },
  UEL:  { label: 'Europa League',     icon: '🏅', mds: 8, pool: UEL_POOL,  teams: 36, prize: [25, 18, 13, 9, 6, 4] },
  UECL: { label: 'Conference League', icon: '🥉', mds: 6, pool: UECL_POOL, teams: 36, prize: [12, 9, 7, 5, 3, 2] }
};

/* Cups */
const FA_ROUNDS = ['R3', 'R4', 'R5', 'QF', 'SF', 'F'];
const LC_ROUNDS = ['R2', 'R3', 'R4', 'QF', 'SF', 'F'];
const LOWER_LEAGUE = { 'Accrington': 48, 'Wrexham': 60, 'Birmingham': 64, 'Coventry': 66, 'Norwich': 65, 'West Brom': 66, 'Middlesbrough': 65, 'Hull': 62, 'Preston': 61, 'Luton': 60, 'Wycombe': 52, 'Stockport': 55, 'Bradford': 53, 'Walsall': 50, 'Burnley': 67, 'Sheffield Utd': 66, 'Wolves': 72, 'Cardiff': 58, 'Plymouth': 56, 'Oxford': 58 };

/* Formations */
const FORM_SLOTS = {
  '433':  ['GK','RB','CB','CB','LB','CM','CM','CM','RW','LW','ST'],
  '4231': ['GK','RB','CB','CB','LB','DM','DM','AM','RW','LW','ST'],
  '442':  ['GK','RB','CB','CB','LB','RM','CM','CM','LM','ST','ST'],
  '4411': ['GK','RB','CB','CB','LB','RM','CM','CM','LM','AM','ST'],
  '343':  ['GK','CB','CB','CB','CM','CM','CM','RW','LW','ST','ST'],
  '352':  ['GK','CB','CB','CB','WB','CM','CM','CM','WB','ST','ST'],
  '41410':['GK','RB','CB','CB','LB','DM','CM','CM','RW','LW','ST'],
  '532':  ['GK','WB','CB','CB','CB','WB','CM','CM','CM','ST','ST'],
  '541':  ['GK','WB','CB','CB','CB','WB','CM','CM','CM','AM','ST'],
  '4222': ['GK','RB','CB','CB','LB','DM','DM','AM','AM','ST','ST'],
  '451':  ['GK','RB','CB','CB','LB','RM','CM','CM','CM','LM','ST'],
  '3412': ['GK','CB','CB','CB','CM','CM','AM','AM','RW','LW','ST']
};
const FORM_XY = {
  '433':  [[50,89],[13,72],[34,72],[66,72],[87,72],[27,53],[50,47],[73,53],[12,22],[88,22],[50,13]],
  '4231': [[50,89],[13,72],[34,72],[66,72],[87,72],[35,61],[65,61],[50,43],[14,28],[86,28],[50,14]],
  '442':  [[50,89],[13,72],[34,72],[66,72],[87,72],[14,52],[38,52],[62,52],[86,52],[35,21],[65,21]],
  '4411': [[50,89],[13,72],[34,72],[66,72],[87,72],[14,52],[38,52],[62,52],[86,52],[50,34],[50,15]],
  '343':  [[50,89],[25,72],[50,69],[75,72],[20,51],[40,51],[60,51],[80,51],[20,21],[80,21],[50,13]],
  '352':  [[50,89],[25,72],[50,69],[75,72],[10,52],[32,49],[50,45],[68,49],[90,52],[35,20],[65,20]],
  '41410':[[50,89],[13,72],[34,72],[66,72],[87,72],[50,60],[30,45],[70,45],[14,26],[86,26],[50,14]],
  '532':  [[50,89],[10,73],[27,70],[50,67],[73,70],[90,73],[27,52],[50,46],[73,52],[35,21],[65,21]],
  '541':  [[50,89],[10,73],[27,70],[50,67],[73,70],[90,73],[20,51],[50,45],[80,51],[50,29],[50,15]],
  '4222': [[50,89],[13,72],[34,72],[66,72],[87,72],[35,60],[65,60],[28,39],[72,39],[35,19],[65,19]],
  '451':  [[50,89],[13,72],[34,72],[66,72],[87,72],[14,51],[33,45],[54,45],[75,45],[86,51],[50,14]],
  '3412': [[50,89],[25,73],[50,69],[75,73],[25,51],[75,51],[35,37],[65,37],[14,22],[86,22],[50,13]]
};
const POS_OK = { GK:['GK'], RB:['RB','CB'], CB:['CB','RB','LB'], LB:['LB','CB'], WB:['LB','RB','CM'], DM:['DM','CM'], CM:['CM','DM','AM'], AM:['AM','CM','RW','LW'], RM:['RW','RB','CM'], LM:['LW','LB','CM'], RW:['RW','LW','AM'], LW:['LW','RW','AM'], CF:['ST','AM'], ST:['ST','LW','RW'] };

const INSTRS = ['Counter on turnovers','Playmaker drops deep to build','Wide players run in behind','High press — win it high','Target the big CB at set pieces','Overload the left flank','Sit deep and absorb','Striker drops wide, mids run','Play through the lines','Exploit pace in behind','Early crosses from wide','Box-to-box runs'];

const TRAIN_OPTS = [
  { id:'attack',    label:'Attacking',  icon:'⚡', desc:'+8% goal probability next match', atkBonus:0.08, defBonus:0 },
  { id:'defence',   label:'Defensive',  icon:'🛡️', desc:'-10% conceding probability next match', atkBonus:0, defBonus:0.10 },
  { id:'fitness',   label:'Fitness',    icon:'🏃', desc:'+8 fitness recovery for all players', atkBonus:0, defBonus:0, fitBonus:8 },
  { id:'setpieces', label:'Set Pieces', icon:'🎯', desc:'+4% to score, better from corners', atkBonus:0.04, defBonus:0.01 },
  { id:'pressing',  label:'High Press', icon:'🔥', desc:'+6% to score, +3% to concede', atkBonus:0.06, defBonus:-0.03 },
  { id:'tactics',   label:'Tactics/Shape', icon:'🗂️', desc:'Cohesion up: +2% score, -4% concede', atkBonus:0.02, defBonus:0.04 },
  { id:'balanced',  label:'Balanced',   icon:'⚖️', desc:'Standard week, small all-round benefit', atkBonus:0.01, defBonus:0.01 }
];

const INJ_TYPES = [
  { n:'Hamstring strain', min:2, max:5 }, { n:'Muscle fatigue', min:1, max:2 }, { n:'Knock', min:1, max:1 },
  { n:'Ankle sprain', min:2, max:6 }, { n:'Knee problem', min:3, max:8 }, { n:'Calf strain', min:2, max:4 },
  { n:'Groin strain', min:2, max:4 }, { n:'Thigh strain', min:1, max:3 }, { n:'Back problem', min:2, max:5 },
  { n:'Concussion', min:1, max:2 }
];

/* Press conference question pools. m = squad morale delta, b = board confidence delta */
const PRESS_QS = {
  pre: [
    { q:'How are you feeling ahead of this match?', opts:[ {t:"Very confident — we're ready.",m:5,b:4,risk:true}, {t:"It will be a tough game but we're prepared.",m:2,b:2}, {t:"We'll take it game by game.",m:0,b:0}, {t:"I won't reveal our approach.",m:-2,b:0} ] },
    { q:'Your opponents have been in good form. Worried?', opts:[ {t:'Form means nothing against us.',m:4,b:2,risk:true}, {t:'We respect them, but focus on ourselves.',m:2,b:2}, {t:'Every game in this league is hard.',m:1,b:1} ] },
    { q:'Any team news you can share?', opts:[ {t:'Everyone is fighting for their place.',m:3,b:1}, {t:'You will see the XI tomorrow.',m:0,b:0}, {t:'We have a few knocks, nothing serious.',m:1,b:0} ] },
    { q:'What would represent success this season?', opts:[ {t:'Trophies. Nothing less.',m:5,b:3,risk:true}, {t:'Meeting the board\'s targets.',m:1,b:3}, {t:'Improving week by week.',m:2,b:1} ] },
    { q:'Is there transfer news ahead of the window?', opts:[ {t:"We're always looking to improve the squad.",m:2,b:2}, {t:'No targets I can discuss publicly.',m:0,b:1}, {t:"We're happy with our current squad.",m:1,b:1} ] }
  ],
  post_win: [
    { q:'How do you reflect on that performance?', opts:[ {t:'Brilliant. The lads were outstanding.',m:8,b:5}, {t:'Good result, more improvement needed.',m:5,b:3}, {t:'Three points is what matters.',m:3,b:2} ] },
    { q:'Who was your standout performer?', opts:[ {t:'The whole team deserves credit.',m:6,b:4}, {t:'Our man of the match was excellent.',m:5,b:3}, {t:"I'll keep that between us.",m:2,b:1} ] },
    { q:'Can you keep this run going?', opts:[ {t:'Absolutely — we fear nobody.',m:6,b:3,risk:true}, {t:'One game at a time.',m:2,b:2}, {t:'The squad depth will be tested.',m:1,b:1} ] }
  ],
  post_draw: [
    { q:'Was a draw a fair result?', opts:[ {t:'We deserved more, honestly.',m:-2,b:-1}, {t:'Fair enough given the performance.',m:2,b:1}, {t:"We'll take a point on the road.",m:3,b:1} ] },
    { q:'What needs to improve next time?', opts:[ {t:'We need more clinical finishing.',m:2,b:2}, {t:'Defensive shape needs tightening.',m:2,b:3}, {t:'Energy and intensity must be higher.',m:3,b:2} ] }
  ],
  post_loss: [
    { q:'What went wrong today?', opts:[ {t:'We were poor. I take responsibility.',m:-3,b:-2}, {t:'They were the better team today.',m:0,b:-1}, {t:"The result doesn't reflect our effort.",m:-4,b:-3} ] },
    { q:'Is the squad confidence still intact?', opts:[ {t:"Absolutely. One bad result won't define us.",m:5,b:3}, {t:'We need to bounce back quickly.',m:3,b:2}, {t:"I'm disappointed but we move on.",m:1,b:1} ] },
    { q:'Are you under pressure now?', opts:[ {t:'Pressure is a privilege at this level.',m:3,b:2}, {t:'I answer only to the board and the fans.',m:1,b:0}, {t:'Ask me after the next game.',m:-1,b:-1} ] }
  ]
};

const SHOUT_EFFECTS = {
  encourage: { morale: 4, eff: 0.03, msg: '💪 Lads fired up!' },
  demand:    { morale: 2, eff: 0.06, msg: '🔥 Intensity up!' },
  calm:      { morale: 6, eff: -0.02, msg: '✋ Settled and focused.' },
  tactics:   { morale: 1, eff: 0.01, msg: '🎯 Sticking to the plan.' },
  express:   { morale: 3, eff: 0.04, msg: '🌟 Expressing themselves!' }
};
