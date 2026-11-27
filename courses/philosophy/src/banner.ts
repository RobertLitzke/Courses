// The home page's picture (defineCourse `hero`), in the look of the course
// icon: a navy night with four-point stars, and on the horizon a striped
// retro sun (the icon's rose, mustard and burnt orange) setting behind the
// silhouette of a Greek temple, with broken columns and olive trees on the
// hill to either side. The title sits over the empty sky. Everything that
// matters is in the middle third, which is all a phone sees (xMidYMax
// slice); a desktop sees the whole width.

const W = 1440;
const H = 520;
/** The horizon, where the sun sets and the temple stands. */
const GROUND = 432;
const CX = W / 2;

const C = {
  night: '#1a1f45',
  deep: '#10143a',
  hill: '#0d1032',
  rose: '#cf5f63',
  mustard: '#e0a33a',
  orange: '#d4582a',
  cream: '#efd9a8',
};

const star = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;

/** The sun: a disc in three warm bands, with the navy gaps of a retro sunset widening towards the horizon. */
function sun(): string {
  const r = 168;
  const cy = GROUND + 6;
  const top = cy - r;
  const bands: string[] = [];
  const colours = [C.mustard, C.mustard, C.orange, C.orange, C.rose, C.rose];
  let y = top;
  const step = (cy - top) / colours.length;
  colours.forEach((c, i) => {
    const gap = i === 0 ? 0 : 2 + i * 2.2;
    bands.push(`<rect x="${CX - r}" y="${y + gap}" width="${2 * r}" height="${step - gap + 1}" fill="${c}"/>`);
    y += step;
  });
  return `<clipPath id="banner-sun"><circle cx="${CX}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${CX}" cy="${cy}" r="${r + 26}" fill="${C.orange}" opacity="0.12"/>
    <g clip-path="url(#banner-sun)">${bands.join('')}</g>`;
}

/** A Doric temple front, six columns under a pediment, standing on three steps at the horizon. */
function temple(): string {
  const w = 196;
  const x0 = CX - w / 2;
  const base = GROUND;
  const steps = [0, 1, 2].map((k) => `<rect x="${x0 - 22 + k * 8}" y="${base - 7 - k * 7}" width="${w + 44 - k * 16}" height="7" />`).join('');
  const floor = base - 21;
  const colH = 64;
  const colW = 15;
  const gap = (w - 6 * colW) / 5;
  const cols = Array.from({ length: 6 }, (_, k) => {
    const x = x0 + k * (colW + gap);
    // A slight taper, wider at the foot, and a square capital on top.
    return `<path d="M${x} ${floor} L${x + 2} ${floor - colH} L${x + colW - 2} ${floor - colH} L${x + colW} ${floor} Z"/><rect x="${x - 4}" y="${floor - colH - 8}" width="${colW + 8}" height="8"/>`;
  }).join('');
  const archTop = floor - colH - 8;
  const architrave = `<rect x="${x0 - 12}" y="${archTop - 22}" width="${w + 24}" height="22"/>`;
  const triglyphs = Array.from({ length: 12 }, (_, k) => `<rect x="${x0 - 4 + k * ((w + 8) / 12)}" y="${archTop - 19}" width="5" height="9" fill="${C.night}" opacity="0.55"/>`).join('');
  const pediment = `<path d="M${x0 - 20} ${archTop - 22} L${CX} ${archTop - 54} L${x0 + w + 20} ${archTop - 22} Z"/>`;
  return `<g fill="${C.hill}">${steps}${cols}${architrave}${pediment}</g>${triglyphs}`;
}

/** A broken column on the hill: shaft, capital fallen or still in place, height in px. */
const ruin = (x: number, h: number, capital: boolean) =>
  `<path d="M${x} ${GROUND} L${x + 1.5} ${GROUND - h} L${x + 16} ${GROUND - h + 6} L${x + 18} ${GROUND} Z"/>` +
  (capital ? '' : `<rect x="${x + 26}" y="${GROUND - 9}" width="24" height="9" rx="1" transform="rotate(-8 ${x + 38} ${GROUND - 4})"/>`);

/** An olive tree: a bent trunk and a loose crown of leaf clusters. */
function olive(x: number, s: number): string {
  const trunk = `<path d="M${x} ${GROUND} C${x - 4 * s} ${GROUND - 30 * s} ${x + 10 * s} ${GROUND - 40 * s} ${x + 2 * s} ${GROUND - 62 * s} L${x + 9 * s} ${GROUND - 62 * s} C${x + 18 * s} ${GROUND - 40 * s} ${x + 6 * s} ${GROUND - 28 * s} ${x + 10 * s} ${GROUND} Z"/>`;
  const leaves = ([[-26, -70, 22], [2, -86, 26], [30, -72, 22], [-8, -60, 18], [20, -58, 18], [-40, -58, 14], [44, -60, 14]] as const)
    .map(([dx, dy, r]) => `<ellipse cx="${x + dx * s}" cy="${GROUND + dy * s}" rx="${r * s}" ry="${r * 0.7 * s}"/>`).join('');
  return trunk + leaves;
}

/** The sky as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const stars = ([
    [90, 90, 14, C.orange], [260, 250, 10, C.mustard], [470, 110, 8, C.cream], [540, 330, 7, C.cream],
    [880, 90, 9, C.mustard], [910, 340, 8, C.orange], [1230, 70, 12, C.cream], [1390, 200, 9, C.mustard],
    [150, 330, 6, C.cream], [1180, 300, 7, C.cream], [1320, 350, 7, C.orange], [340, 60, 6, C.cream],
    [1050, 210, 6, C.cream], [560, 220, 5, C.mustard],
  ] as const).map(([x, y, r, c]) => star(x, y, r, c)).join('');
  // The hill: a gentle rise under the temple, falling away to both edges.
  const hill = `<path d="M0 ${GROUND + 8} C240 ${GROUND - 6} 420 ${GROUND - 2} ${CX - 260} ${GROUND} L${CX + 260} ${GROUND} C1020 ${GROUND - 2} 1200 ${GROUND - 8} ${W} ${GROUND + 6} L${W} ${H} L0 ${H} Z" fill="url(#banner-hill)"/>`;
  const side = `<g fill="${C.hill}">${ruin(CX - 330, 64, false)}${ruin(CX + 312, 92, true)}${olive(CX - 420, 1)}${olive(CX + 420, 1.15)}${olive(150, 0.9)}${olive(1290, 0.8)}${ruin(330, 40, true)}${ruin(1100, 52, false)}</g>`;
  const defs = `<defs>
    <linearGradient id="banner-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.deep}"/><stop offset="0.75" stop-color="${C.night}"/><stop offset="1" stop-color="#2a2552"/></linearGradient>
    <linearGradient id="banner-hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.hill}"/><stop offset="0.55" stop-color="${C.hill}"/><stop offset="1" stop-color="${C.night}"/></linearGradient>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}<rect width="${W}" height="${H}" fill="url(#banner-sky)"/>${stars}${sun()}${hill}${side}${temple()}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
