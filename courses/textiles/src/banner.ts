// The home page's picture (defineCourse `hero`): cloth on a loom, in the
// colours of the course icon. Warp threads in shades of the icon's deep
// blue-green run top to bottom across the whole width. The lower part is
// woven: weft rows in the icon's rose, coral and pale pink bands, each cell
// showing warp or weft on top as a 2/2 twill does, so the diagonal shows.
// Above the fell (the edge of the weaving) the warp is still bare, a shuttle
// sits on the last row trailing its thread, and the title sits over the bare
// warp. A phone sees the middle third (xMidYMax slice), a desktop the whole
// width.

const W = 1440;
const H = 520;
const CELL = 18;
/** The fell: where the weaving stops and the bare warp begins. */
const FELL = 336;

const C = {
  ground: '#1f2b62',
  warp: ['#2c3a78', '#35448a', '#27336a'],
  weft: ['#d98c95', '#c76f7e', '#e07a6a', '#efb3a4', '#a95471', '#e07a6a', '#d98c95'],
  shuttle: '#d98a3c',
  shuttleDark: '#a8642a',
  thread: '#efe3c4',
};

/** The cloth as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const cols = Math.ceil(W / CELL);
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${C.ground}"/>`];
  // Bare warp above the fell, fading upward.
  for (let c = 0; c < cols; c++) {
    const x = c * CELL + CELL / 2;
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${FELL}" stroke="${C.warp[c % 3]}" stroke-width="${CELL * 0.55}" stroke-linecap="butt"/>`);
  }
  // The woven cloth below it, in 2/2 twill: each float crosses two threads, and each row steps one to the side, so the floats line up in diagonals.
  const rows = Math.ceil((H - FELL) / CELL) + 1;
  for (let r = -1; r < rows; r++) {
    const band = C.weft[Math.floor((r + 1) / 3) % C.weft.length];
    const y = FELL + r * CELL;
    for (let c = -1; c < cols + 1; c++) {
      // A weft float starts where the next two cells are weft over warp.
      if ((((c + r) % 4) + 4) % 4 === 2) parts.push(`<rect x="${c * CELL - 1}" y="${y + 2}" width="${2 * CELL + 2}" height="${CELL - 4}" rx="${(CELL - 4) / 2}" fill="${band}"/>`);
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = -2; r < rows; r++) {
      // A warp float starts where this cell and the one below are warp over weft.
      if ((((c + r) % 4) + 4) % 4 === 0) {
        const y = Math.max(FELL, FELL + r * CELL - 1);
        const h = FELL + (r + 2) * CELL + 1 - y;
        if (h > 0) parts.push(`<rect x="${c * CELL + 2}" y="${y}" width="${CELL - 4}" height="${h}" rx="${(CELL - 4) / 2}" fill="${C.warp[c % 3]}"/>`);
      }
    }
  }
  // A soft shadow along the fell, where the reed has just beaten the last row in.
  parts.push(`<rect x="0" y="${FELL - 6}" width="${W}" height="6" fill="#0f1c24" opacity="0.35"/>`);
  // The shuttle on the fell, trailing weft back across the cloth.
  const sx = 1210;
  const sy = FELL - 18;
  parts.push(
    `<path d="M${sx - 300} ${FELL - 2} C${sx - 200} ${FELL - 14} ${sx - 120} ${sy + 16} ${sx - 70} ${sy + 14}" fill="none" stroke="${C.thread}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M${sx - 80} ${sy + 12} Q${sx - 60} ${sy - 6} ${sx} ${sy - 6} L${sx + 120} ${sy - 6} Q${sx + 180} ${sy - 6} ${sx + 200} ${sy + 12} Q${sx + 180} ${sy + 30} ${sx + 120} ${sy + 30} L${sx} ${sy + 30} Q${sx - 60} ${sy + 30} ${sx - 80} ${sy + 12} Z" fill="${C.shuttle}"/>`,
    `<rect x="${sx + 10}" y="${sy + 3}" width="100" height="18" rx="9" fill="${C.shuttleDark}"/>`,
    `<rect x="${sx + 22}" y="${sy + 6}" width="76" height="12" rx="6" fill="${C.thread}"/>`,
  );
  const defs = `<defs>
    <linearGradient id="banner-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ground}" stop-opacity="0.92"/><stop offset="0.85" stop-color="${C.ground}" stop-opacity="0.15"/><stop offset="1" stop-color="${C.ground}" stop-opacity="0"/></linearGradient>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.15  0 0 0 0 0.18  0 0 0 0.18 0"/></filter>
  </defs>`;
  // The bare warp fades toward the top, so the title reads over it.
  parts.splice(1 + cols, 0, `<rect width="${W}" height="${FELL}" fill="url(#banner-fade)"/>`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}${parts.join('')}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
