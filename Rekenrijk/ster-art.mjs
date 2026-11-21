/* Rekenster: de blogger als SVG. Elke categorie heeft een paar varianten. Geen echte merken of personages. */
export const SKINS = ['#fbe0cc', '#efc09b', '#c98d62', '#8d5a3b'];
export const HAIR = [['#2b2321', 'zwart'], ['#6b3e26', 'bruin'], ['#a8703f', 'lichtbruin'], ['#f0cc6e', 'blond'], ['#c2452d', 'rood'], ['#f497c2', 'roze'], ['#5aa9e6', 'blauw'], ['#9b6bff', 'paars']];
export const NAMES = {
  kapsel: ['Lang en los', 'Paardenstaart', 'Twee knotjes', 'Bob', 'Krullen', 'Vlechten'],
  haarkleur: HAIR.map(h => h[1][0].toUpperCase() + h[1].slice(1)),
  top: ['Sterren-shirt', 'Roze hoodie', 'Blouse met strik', 'Gestreepte trui', 'Glittertop', 'Spijkerjasje', 'Sportshirt', 'Regenboogtrui'],
  onder: ['Plooirok', 'Spijkerbroek', 'Korte broek', 'Tutu', 'Lange rok', 'Legging met hartjes', 'Tuinbroek'],
  schoenen: ['Sneakers', 'Laarzen', 'Sandalen', 'Ballerina\'s', 'Glitterschoenen', 'Rolschaatsen'],
  accessoire: ['Zonnebril', 'Zonnehoed', 'Haarband met strik', 'Koptelefoon', 'Kroontje', 'Pet', 'Hartjesbril'],
  tas: ['Rugzak', 'Schoudertas', 'Hartjestas', 'Selfiestick', 'Boekentas', 'Glittertasje'],
  achtergrond: ['Stad', 'Strand', 'Podium', 'Park', 'Ruimte', 'Snoepwinkel']
};

export const UGLY_NAMES = { kapsel: 'Vogelnest', haarkleur: 'Moerasgroen', top: 'Kriebeltrui met vlek', onder: 'Te korte pyjamabroek', schoenen: 'Clownsschoenen', accessoire: 'Koekenpan', tas: 'Stinksok', achtergrond: 'Regenachtige vuilnisbelt' };
export const itemName = (cat, k) => k === 99 ? UGLY_NAMES[cat] : NAMES[cat][k];
function bg(i) {
  switch (i) {
    case 99: return `<rect width="240" height="360" fill="#9aa1a8"/>${Array.from({ length: 26 }, (_, k) => `<path d="M${(k * 37) % 240} ${(k * 53) % 300} l-6 16" stroke="#dfe6ee" stroke-width="2"/>`).join('')}<rect y="300" width="240" height="60" fill="#6b6150"/><rect x="180" y="250" width="40" height="56" rx="4" fill="#5c6b5f"/><rect x="176" y="244" width="48" height="10" rx="3" fill="#4a574d"/><path d="M20 300 q20 -30 40 0" fill="#7a6a4f"/><circle cx="60" cy="40" r="30" fill="#7d858c"/><circle cx="100" cy="36" r="34" fill="#868e95"/>`;
    case 0: return `<rect width="240" height="360" fill="#cfe7ff"/><rect y="150" width="44" height="170" fill="#9fb4d8"/><rect x="50" y="110" width="50" height="210" fill="#b6c7e6"/><rect x="150" y="130" width="40" height="190" fill="#9fb4d8"/><rect x="196" y="90" width="44" height="230" fill="#b6c7e6"/>${[60, 70, 160, 205].map(x => `<rect x="${x}" y="140" width="8" height="10" fill="#fff8c4"/><rect x="${x + 14}" y="170" width="8" height="10" fill="#fff8c4"/>`).join('')}<rect y="320" width="240" height="40" fill="#8a8f9c"/>`;
    case 1: return `<rect width="240" height="360" fill="#9fe0ff"/><circle cx="196" cy="54" r="26" fill="#ffd54f"/><rect y="220" width="240" height="60" fill="#3aa7d8"/><path d="M0 222q30-10 60 0t60 0 60 0 60 0" stroke="#fff" stroke-width="4" fill="none"/><rect y="280" width="240" height="80" fill="#f3d9a4"/>`;
    case 2: return `<rect width="240" height="360" fill="#3a1d5c"/>${[30, 90, 150, 210].map((x, k) => `<path d="M${x} 0 L${x - 30} 330 L${x + 30} 330 Z" fill="${['#ff7ad9', '#ffd34d', '#6be0ff', '#a98bff'][k]}" opacity=".25"/>`).join('')}<rect y="320" width="240" height="40" fill="#7a3fb0"/><rect y="316" width="240" height="6" fill="#ffd34d"/>`;
    case 3: return `<rect width="240" height="360" fill="#bfe8ff"/><circle cx="40" cy="190" r="46" fill="#7cc46a"/><circle cx="205" cy="180" r="52" fill="#6db35c"/><rect x="34" y="200" width="12" height="80" fill="#8b5a2b"/><rect x="200" y="200" width="12" height="80" fill="#8b5a2b"/><rect y="270" width="240" height="90" fill="#8fd17a"/>${[30, 70, 180, 215].map(x => `<circle cx="${x}" cy="300" r="5" fill="#ff8ac8"/>`).join('')}`;
    case 4: return `<rect width="240" height="360" fill="#121433"/>${Array.from({ length: 30 }, (_, k) => `<circle cx="${(k * 53) % 240}" cy="${(k * 97) % 300}" r="${k % 3 ? 1.5 : 2.5}" fill="#fff"/>`).join('')}<circle cx="190" cy="60" r="24" fill="#ffb648"/><ellipse cx="190" cy="60" rx="38" ry="8" fill="none" stroke="#ffd98a" stroke-width="3"/><rect y="320" width="240" height="40" fill="#5b5f88"/>`;
    default: return `<rect width="240" height="360" fill="#ffe3f1"/>${[0, 40, 80, 120, 160, 200].map((x, k) => `<rect x="${x}" y="0" width="20" height="120" fill="${k % 2 ? '#ff9ccf' : '#fff'}"/>`).join('')}<rect y="110" width="240" height="14" fill="#ff6fb3"/>${[30, 80, 170, 210].map((x, k) => `<circle cx="${x}" cy="200" r="14" fill="${['#ffd34d', '#7ad3ff', '#b28bff', '#7be0a3'][k]}"/><rect x="${x - 2}" y="212" width="4" height="40" fill="#fff"/>`).join('')}<rect y="300" width="240" height="60" fill="#ffc4e1"/>`;
  }
}
const hairBack = (k, c) => k === 99 ? '' : ({ 0: `<path d="M64 96 Q60 230 86 236 L154 236 Q180 230 176 96 Z" fill="${c}"/>`, 4: `<circle cx="72" cy="140" r="26" fill="${c}"/><circle cx="168" cy="140" r="26" fill="${c}"/><circle cx="76" cy="176" r="22" fill="${c}"/><circle cx="164" cy="176" r="22" fill="${c}"/>`, 5: `<path d="M70 120 q-14 60 6 110" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M170 120 q14 60 -6 110" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="round"/>` }[k] || '');
function hairFront(k, c) {
  const fringe = `<path d="M68 100 Q70 48 120 46 Q170 48 172 100 Q150 76 120 80 Q96 76 68 100 Z" fill="${c}"/>`;
  switch (k) {
    case 99: return `${Array.from({ length: 16 }, (_, i) => `<circle cx="${70 + (i * 37) % 100}" cy="${44 + (i * 23) % 40}" r="${12 + i % 3 * 4}" fill="${c}"/>`).join('')}${[[80, 40, 110, 20], [140, 30, 170, 10], [100, 60, 60, 50], [150, 60, 185, 70]].map(([a, b, c2, d]) => `<path d="M${a} ${b} L${c2} ${d}" stroke="#7a4b25" stroke-width="4"/>`).join('')}<ellipse cx="146" cy="30" rx="12" ry="8" fill="#c8a070"/><circle cx="150" cy="26" r="2" fill="#222"/>`;
    case 1: return `${fringe}<path d="M164 70 q40 10 30 70 q-6 30 -20 40" stroke="${c}" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="168" cy="70" r="8" fill="#ff6fb3"/>`;
    case 2: return `${fringe}<circle cx="78" cy="48" r="20" fill="${c}"/><circle cx="162" cy="48" r="20" fill="${c}"/>`;
    case 3: return `<path d="M64 112 Q62 46 120 44 Q178 46 176 112 L170 140 L160 100 Q120 84 80 100 L70 140 Z" fill="${c}"/>`;
    case 4: return `${[70, 90, 110, 130, 150, 170].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 56 : 66}" r="16" fill="${c}"/>`).join('')}`;
    case 5: return `${fringe}<circle cx="76" cy="234" r="6" fill="#ff6fb3"/><circle cx="164" cy="234" r="6" fill="#ff6fb3"/>`;
    default: return fringe;
  }
}
function top(k) {
  const torso = (fill, extra = '') => `<path d="M84 166 Q120 156 156 166 L162 252 L78 252 Z" fill="${fill}"/>${extra}`;
  switch (k) {
    case 99: return torso('#8a6d3b', `<rect x="92" y="190" width="20" height="18" fill="#6b8e23"/><rect x="132" y="214" width="18" height="20" fill="#b55d3b"/><ellipse cx="124" cy="186" rx="12" ry="8" fill="#5b4321"/>${[176, 200, 224, 246].map(y => `<path d="M82 ${y} l80 0" stroke="#7a5f30" stroke-width="2" stroke-dasharray="4 4"/>`).join('')}`);
    case 0: return torso('#3b5bdb', [96, 124, 146, 108, 136].map((x, i) => `<path d="M${x} ${186 + (i % 3) * 20} l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffd34d"/>`).join(''));
    case 1: return torso('#ff8ac8', `<path d="M96 168 q24 26 48 0" fill="#ff6fb3"/><rect x="104" y="214" width="32" height="20" rx="6" fill="#ff6fb3"/>`);
    case 2: return torso('#ffffff', `<path d="M108 168 l12 10 12 -10 -4 14 -8 -6 -8 6z" fill="#ff5d8f"/>${[192, 212, 232].map(y => `<circle cx="120" cy="${y}" r="2.5" fill="#ddd"/>`).join('')}`);
    case 3: return torso('#ffffff', [176, 196, 216, 236].map(y => `<rect x="80" y="${y}" width="80" height="9" fill="#ff7a59"/>`).join(''));
    case 4: return torso('#c9a8ff', Array.from({ length: 14 }, (_, i) => `<circle cx="${88 + (i * 23) % 66}" cy="${176 + (i * 17) % 70}" r="2.5" fill="#fff"/>`).join(''));
    case 5: return torso('#5b86c5', `<path d="M120 160 L120 252" stroke="#3e6aa8" stroke-width="3"/><path d="M100 164 L120 196 L140 164" fill="#f4f4f4"/>`);
    case 6: return torso('#22b07d', `<path d="M84 196 L156 196" stroke="#fff" stroke-width="6"/><text x="120" y="232" font-size="22" text-anchor="middle" fill="#fff" font-weight="900">7</text>`);
    default: return torso('#ff7a59', ['#ff7a59', '#ffb02e', '#ffd34d', '#7be0a3', '#6bb7ff', '#a98bff'].map((c, i) => `<rect x="80" y="${166 + i * 14}" width="82" height="14" fill="${c}"/>`).join(''));
  }
}
function bottom(k, skin) {
  const legs = `<rect x="98" y="250" width="16" height="72" rx="7" fill="${skin}"/><rect x="126" y="250" width="16" height="72" rx="7" fill="${skin}"/>`;
  switch (k) {
    case 99: return `${legs}<path d="M84 246 L156 246 L154 296 L126 296 L120 266 L114 296 L86 296 Z" fill="#cfe3ff"/>${[256, 268, 280, 292].map(y => `<path d="M86 ${y} h68" stroke="#ff9ccf" stroke-width="3"/>`).join('')}<rect x="132" y="272" width="14" height="12" fill="#9be38f"/>`;
    case 0: return `${legs}<path d="M80 246 L160 246 L172 292 L68 292 Z" fill="#8c5bd6"/>${[84, 100, 116, 132, 148].map(x => `<path d="M${x + 2} 248 L${x - 4} 292" stroke="#7046b8" stroke-width="2"/>`).join('')}`;
    case 1: return `<path d="M80 246 L160 246 L156 324 L126 324 L120 270 L114 324 L84 324 Z" fill="#4a72b8"/><path d="M120 250 L120 270" stroke="#2f538f" stroke-width="2"/>`;
    case 2: return `${legs}<path d="M80 246 L160 246 L162 282 L124 282 L120 266 L116 282 L78 282 Z" fill="#f4a261"/>`;
    case 3: return `${legs}<ellipse cx="120" cy="266" rx="58" ry="20" fill="#ffc4e1"/><ellipse cx="120" cy="260" rx="50" ry="14" fill="#ff9ccf"/>`;
    case 4: return `${legs}<path d="M82 246 L158 246 L172 318 L68 318 Z" fill="#2ec4b6"/><path d="M70 304 L170 304" stroke="#fff" stroke-width="4"/>`;
    case 5: return `<path d="M84 246 L156 246 L150 324 L128 324 L120 272 L112 324 L90 324 Z" fill="#2b2d42"/>${[[100, 290], [140, 286], [104, 312], [136, 310]].map(([x, y]) => `<path d="M${x} ${y} c-4 -6 -10 0 0 6 c10 -6 4 -12 0 -6z" fill="#ff5d8f"/>`).join('')}`;
    default: return `${legs}<path d="M84 210 L156 210 L160 290 L82 290 Z" fill="#5b86c5"/><rect x="96" y="180" width="8" height="34" fill="#5b86c5"/><rect x="136" y="180" width="8" height="34" fill="#5b86c5"/><rect x="104" y="222" width="32" height="22" rx="4" fill="#4a72b8"/>`;
  }
}
function shoes(k) {
  const pair = (fill, extra = '') => `<path d="M92 318 h26 v10 q0 6 -6 6 h-24 q-6 0 -4 -6z" fill="${fill}"/><path d="M122 318 h26 q6 6 4 10 q0 6 -6 6 h-24 v-16z" fill="${fill}"/>${extra}`;
  switch (k) {
    case 99: return `<ellipse cx="96" cy="330" rx="34" ry="12" fill="#e63946"/><ellipse cx="146" cy="330" rx="34" ry="12" fill="#ffd34d"/><circle cx="76" cy="328" r="6" fill="#fff"/><circle cx="166" cy="328" r="6" fill="#fff"/>`;
    case 0: return pair('#ffffff', `<path d="M90 330 h30 M122 330 h30" stroke="#ff5d8f" stroke-width="4"/>`);
    case 1: return `<rect x="94" y="292" width="22" height="40" rx="6" fill="#7a4b25"/><rect x="124" y="292" width="22" height="40" rx="6" fill="#7a4b25"/>`;
    case 2: return pair('none', `<path d="M92 330 h26 M122 330 h26" stroke="#c98d62" stroke-width="5"/><path d="M98 322 h16 M128 322 h16" stroke="#c98d62" stroke-width="3"/>`);
    case 3: return pair('#ff8ac8', `<circle cx="104" cy="320" r="4" fill="#fff"/><circle cx="136" cy="320" r="4" fill="#fff"/>`);
    case 4: return pair('#c9a8ff', Array.from({ length: 8 }, (_, i) => `<circle cx="${92 + i * 8}" cy="${326 + (i % 2) * 3}" r="1.8" fill="#fff"/>`).join(''));
    default: return pair('#ffffff', `${[96, 112, 128, 144].map(x => `<circle cx="${x}" cy="340" r="5" fill="#ff7a59"/>`).join('')}`);
  }
}
function acc(k) {
  switch (k) {
    case 99: return `<ellipse cx="120" cy="50" rx="56" ry="16" fill="#3b3b3b"/><ellipse cx="120" cy="46" rx="46" ry="11" fill="#555"/><rect x="170" y="44" width="56" height="10" rx="5" fill="#7a4b25" transform="rotate(-8 170 49)"/>`;
    case 0: return `<rect x="84" y="98" width="30" height="18" rx="6" fill="#222"/><rect x="126" y="98" width="30" height="18" rx="6" fill="#222"/><path d="M114 104 h12" stroke="#222" stroke-width="3"/>`;
    case 1: return `<ellipse cx="120" cy="56" rx="82" ry="14" fill="#f2d49b"/><path d="M80 56 Q84 14 120 14 Q156 14 160 56 Z" fill="#f2d49b"/><rect x="80" y="44" width="80" height="8" fill="#ff7a59"/>`;
    case 2: return `<path d="M70 70 Q120 40 170 70" stroke="#ff5d8f" stroke-width="8" fill="none"/><path d="M150 54 l20 -12 0 24 z M150 54 l-20 -12 0 24 z" fill="#ff5d8f"/>`;
    case 3: return `<path d="M64 104 Q64 36 120 36 Q176 36 176 104" stroke="#444" stroke-width="8" fill="none"/><rect x="54" y="92" width="20" height="30" rx="8" fill="#7a6cf0"/><rect x="166" y="92" width="20" height="30" rx="8" fill="#7a6cf0"/>`;
    case 4: return `<path d="M92 50 L98 26 L110 42 L120 20 L130 42 L142 26 L148 50 Z" fill="#ffd34d" stroke="#e0a800" stroke-width="2"/><circle cx="120" cy="38" r="4" fill="#ff5d8f"/>`;
    case 5: return `<path d="M68 68 Q70 30 120 30 Q170 30 172 68 Z" fill="#e63946"/><path d="M120 66 h70 q4 10 -8 12 h-62z" fill="#c92f3b"/>`;
    default: return `${[99, 141].map(x => `<path d="M${x} 116 c-16 -16 -26 2 0 18 c26 -16 16 -34 0 -18z" fill="none" stroke="#ff5d8f" stroke-width="5"/>`).join('')}<path d="M114 112 h12" stroke="#ff5d8f" stroke-width="3"/>`;
  }
}
function bag(k) {
  switch (k) {
    case 99: return `<path d="M168 214 h18 v26 q0 10 10 10 h8 q8 0 8 8 v4 h-26 q-18 0 -18 -18z" fill="#d9d2b6" stroke="#a89f80" stroke-width="2"/><rect x="168" y="214" width="18" height="6" fill="#8fb6d9"/>${[[196, 230], [210, 220], [202, 206]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#222"/><path d="M${x - 4} ${y - 3} l4 2 4 -2" stroke="#555" fill="none"/>`).join('')}<path d="M190 200 q6 -6 0 -12 M200 196 q6 -6 0 -12" stroke="#9bb57a" stroke-width="2" fill="none"/>`;
    case 0: return `<rect x="150" y="176" width="34" height="46" rx="10" fill="#ffb02e"/><rect x="156" y="198" width="22" height="14" rx="4" fill="#ff8c42"/>`;
    case 1: return `<path d="M96 168 L176 236" stroke="#7a4b25" stroke-width="4"/><rect x="164" y="230" width="34" height="26" rx="6" fill="#a0673b"/>`;
    case 2: return `<path d="M190 236 c-20 -20 -34 2 0 26 c34 -24 20 -46 0 -26z" fill="#ff5d8f"/><path d="M178 222 q12 -16 24 0" stroke="#ff5d8f" stroke-width="3" fill="none"/>`;
    case 3: return `<path d="M176 230 L206 150" stroke="#555" stroke-width="5"/><rect x="198" y="128" width="20" height="32" rx="4" fill="#222"/><circle cx="208" cy="138" r="3" fill="#6bb7ff"/>`;
    case 4: return `<rect x="164" y="214" width="40" height="32" rx="4" fill="#2ec4b6"/><rect x="170" y="206" width="28" height="10" rx="3" fill="#219e93"/><path d="M172 226 h24 M172 234 h18" stroke="#fff" stroke-width="2"/>`;
    default: return `<rect x="168" y="224" width="32" height="24" rx="8" fill="#c9a8ff"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${172 + (i * 7) % 26}" cy="${230 + (i * 5) % 14}" r="1.8" fill="#fff"/>`).join('')}<path d="M174 224 q10 -14 20 0" stroke="#a98bff" stroke-width="3" fill="none"/>`;
  }
}
/* outfit: {kapsel, haarkleur, top, onder, schoenen, accessoire, tas, achtergrond} (indices); ontbrekend = basis */
export function avatar(outfit = {}, skin = 1, opts = {}) {
  const s = SKINS[skin] || SKINS[1], hc = outfit.haarkleur === 99 ? '#7a8b3a' : (HAIR[outfit.haarkleur ?? 1] || HAIR[1])[0], ks = outfit.kapsel ?? 0;
  const face = `<circle cx="120" cy="104" r="54" fill="${s}"/><ellipse cx="100" cy="108" rx="7" ry="9" fill="#2b2321"/><ellipse cx="140" cy="108" rx="7" ry="9" fill="#2b2321"/><circle cx="102" cy="105" r="2.5" fill="#fff"/><circle cx="142" cy="105" r="2.5" fill="#fff"/><ellipse cx="88" cy="124" rx="8" ry="5" fill="#ff9ccf" opacity=".6"/><ellipse cx="152" cy="124" rx="8" ry="5" fill="#ff9ccf" opacity=".6"/><path d="M110 132 q10 9 20 0" stroke="#b5485d" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const arms = `<path d="M86 172 Q66 206 72 236" stroke="${s}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M154 172 Q176 206 170 236" stroke="${s}" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 240 360" class="${opts.cls || 'st-avatar'}" role="img" aria-label="${opts.label || 'Jouw blogger'}">${outfit.achtergrond !== undefined ? bg(outfit.achtergrond) : '<rect width="240" height="360" fill="#f6f2ff"/>'}
    <ellipse cx="120" cy="338" rx="62" ry="10" fill="rgba(0,0,0,.15)"/>${hairBack(ks, hc)}
    ${outfit.onder !== undefined ? bottom(outfit.onder, s) : bottom(2, s)}${outfit.schoenen !== undefined ? shoes(outfit.schoenen) : shoes(0)}
    ${arms}${outfit.top !== undefined ? top(outfit.top) : top(0)}<rect x="110" y="148" width="20" height="16" fill="${s}"/>${face}${hairFront(ks, hc)}
    ${outfit.accessoire !== undefined ? acc(outfit.accessoire) : ''}${outfit.tas !== undefined ? bag(outfit.tas) : ''}</svg>`;
}
