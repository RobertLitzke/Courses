// The home page's picture (defineCourse `hero`), in the look of the course
// icon: a navy sky with four-point stars, three warm bands (rose, mustard,
// burnt orange) flowing across it, a large mustard question mark, and a film
// of grain. The title sits over the upper half; a phone sees the middle third
// (xMidYMax slice), a desktop the whole width.

const W = 1440;
const H = 520;

const C = {
  night: '#1a1f45',
  rose: '#cf5f63',
  mustard: '#e0a33a',
  orange: '#d4582a',
  cream: '#efd9a8',
};

const star = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;

/** One band's centre line: a slow wave from left to right, rising at the end. */
function wave(offset: number): string {
  const y = (v: number) => v + offset;
  return `M-40 ${y(150)} C220 ${y(60)} 380 ${y(260)} 640 ${y(230)} S1000 ${y(40)} 1180 ${y(150)} S1380 ${y(330)} 1500 ${y(300)}`;
}

/** The sky as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const bands = [
    [C.rose, -46],
    [C.mustard, 0],
    [C.orange, 46],
  ].map(([c, o]) => `<path d="${wave(Number(o) + 210)}" fill="none" stroke="${c}" stroke-width="50" stroke-linecap="round"/>`).join('');
  const stars = ([
    [90, 90, 14, C.orange], [260, 470, 10, C.mustard], [470, 110, 8, C.cream], [600, 470, 12, C.orange],
    [880, 90, 9, C.mustard], [1040, 460, 8, C.cream], [1230, 70, 12, C.cream], [1390, 200, 9, C.mustard],
    [150, 300, 6, C.cream], [760, 300, 6, C.cream], [1300, 480, 7, C.orange],
  ] as const).map(([x, y, r, c]) => star(x, y, r, c)).join('');
  const question = `<g transform="translate(1185 190) scale(0.72)" fill="${C.mustard}">
    <path d="M-62 -70 C-62 -150 70 -160 70 -80 C70 -30 18 -18 12 30 L12 50 L-18 50 L-18 25 C-18 -30 38 -40 38 -82 C38 -122 -30 -122 -30 -70 Z"/>
    <circle cx="-3" cy="96" r="22"/>
  </g>`;
  const defs = `<defs>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}<rect width="${W}" height="${H}" fill="${C.night}"/>${bands}${stars}${question}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
