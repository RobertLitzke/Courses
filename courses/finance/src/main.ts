import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { el } from 'didactics/dom';
import { SITE_URL } from './asset';
import { RULES_YEAR } from './engine/rules';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS } from './lessons';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

/** The line under every lesson's title: the rules year, and what the course is not. */
const adviceNote = () =>
  el('p.advice-note', {},
    el('b', {}, `Tax rules: ${RULES_YEAR}, US federal. `),
    'This is education about how the rules work, not advice for anyone’s situation. Rules and limits change every year; check a real plan against the current ones, or with a fee-only planner or a CPA.');

defineCourse({
  release: course.release as CourseRelease,
  id: 'finance',
  title: 'Money That Lasts',
  subtitle: 'Saving, spending and paying less tax',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'A course for someone who already knows what an index fund and a Roth IRA are, and wants to know how the pieces behave together over a lifetime: how much a portfolio can pay out, why the order of good and bad years matters, and how to move money between accounts so that tax and income-tested costs take as little as the law allows.'),
    el('p', {}, 'The models run on US stock, bond and inflation history since 1871 and on the ', String(RULES_YEAR), ' federal tax rules. Branches cover Washington state, living in Portugal, equity pay, couples and more.'),
    el('p.advice-note', {}, el('b', {}, 'Not personal advice. '), 'Every lesson explains how rules work in general, with sample households. Before acting, check the current year’s rules or ask a fee-only planner or a CPA.')),
  figures: FIGURES,
  prose,
  lesson: { intro: adviceNote, of: () => 14 },
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'finance' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
