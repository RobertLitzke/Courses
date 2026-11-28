// The home page's picture (defineCourse `hero`), in the look of the painted
// course icon: a ringed planet low in the frame with thin orbit rings around
// it, four-point stars, a navy sky warmed with violet, and a film of grain.
// The title sits over the upper half; a phone sees the middle third
// (xMidYMax slice), a desktop the whole sky.

const W = 1440;
const H = 520;

const C = {
  night: '#0c1230',
  violet: '#8a5a9a',
  cream: '#f3e0c0',
  sand: '#e6c9a0',
  mustard: '#d9a441',
  gold: '#f0c56a',
  orange: '#e07a3a',
  burnt: '#c0522a',
  rust: '#8f3a2a',
  teal: '#2f7f78',
};

const star = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;

/** The sky as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const cx = 720;
  const cy = 392;
  const orbits = [140, 230, 330, 440, 560, 690, 830].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.cream}" stroke-opacity="0.16" stroke-width="2"/>`).join('');
  const stars = ([
    [100, 80, 7, C.mustard], [300, 180, 5, C.cream], [520, 60, 6, C.cream], [1380, 120, 6, C.mustard], [1250, 470, 5, C.cream],
    [760, 440, 4, C.cream], [620, 300, 3, C.cream], [1400, 400, 3, C.cream], [220, 420, 4, C.mustard],
  ] as const).map(([x, y, r, c]) => star(x, y, r, c)).join('');
  const dots = ([[400, 300, 2], [860, 120, 2], [1150, 200, 2], [680, 160, 1.5], [980, 500, 2], [60, 320, 1.5]] as const)
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.cream}" opacity="0.7"/>`).join('');
  // The ring's far half behind the planet, the near half in front.
  const planet = `<g transform="translate(${cx} ${cy}) rotate(-18)">
    <path d="M-160 0 a160 48 0 0 0 320 0" fill="none" stroke="${C.sand}" stroke-width="16"/>
    <circle r="78" fill="${C.orange}"/><circle r="78" fill="url(#banner-planet)"/><path d="M-78 0 a78 78 0 0 0 156 0Z" fill="${C.burnt}" opacity="0.55"/>
    <path d="M-160 0 a160 48 0 0 1 320 0" fill="none" stroke="${C.sand}" stroke-width="16"/><path d="M-160 0 a160 48 0 0 1 320 0" fill="none" stroke="${C.mustard}" stroke-width="5"/>
  </g>`;
  const moons = `<circle cx="1160" cy="392" r="14" fill="${C.mustard}"/><circle cx="330" cy="392" r="9" fill="${C.burnt}"/><circle cx="720" cy="52" r="8" fill="${C.teal}"/>`;
  const defs = `<defs>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
    <radialGradient id="banner-glow" cx="0.5" cy="0.75" r="0.7"><stop offset="0" stop-color="${C.violet}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.night}" stop-opacity="0"/></radialGradient>
    <radialGradient id="banner-planet" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.rust}" stop-opacity="0.5"/></radialGradient>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}<rect width="${W}" height="${H}" fill="${C.night}"/><rect width="${W}" height="${H}" fill="url(#banner-glow)"/>${orbits}${stars}${dots}${planet}${moons}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
