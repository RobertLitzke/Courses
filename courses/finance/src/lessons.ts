// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The outline:
// https://claude.ai/artifact/DET1mpVWYLfSQDCU9bWzsg

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type MoneyLesson = Lesson & TreeLesson;

const written = import.meta.glob<MoneyLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<MoneyLesson> = {}): MoneyLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const PLAN: MoneyLesson[] = [
  coming('savings-rate', 1, 'Why the savings rate beats the return', 'How the share of income saved sets the years until savings can cover spending'),
  coming('four-percent', 2, 'Where 4 percent came from', 'Bengen’s rule and the Trinity study, run on every start since 1871'),
  coming('sequence', 3, 'The same average, a different order', 'Sequence-of-returns risk, and why 1966 is the worst US start'),
  coming('long-retirement', 4, 'A fifty-year retirement', 'Safe rates for long horizons, starting valuations and the spread of outcomes'),
  coming('flexible-spending', 5, 'Spending rules that bend', 'Guardrails, variable withdrawals and floors, and what each trades away'),
  coming('allocation', 6, 'Stocks, bonds and the glide path', 'What bonds do in a portfolio you are spending, the bond tent, and Japan'),
  coming('brackets', 7, 'How a federal return stacks', 'Ordinary income, gains on top at 0, 15 or 20 percent, and marginal against average rates'),
  coming('accounts', 8, 'Four buckets', 'Pre-tax, Roth, HSA and taxable, compared by the tax rate in and the rate out'),
  coming('early-access', 9, 'Money before 59 and a half', 'Conversion ladders, Roth basis, 72(t), the rule of 55 and a taxable bridge'),
  coming('filling-brackets', 10, 'Filling the low brackets', 'Roth conversions and 0 percent gains in low-income years, and how they collide'),
  coming('aca', 11, 'Health insurance before 65', 'ACA premium credits as a tax on income, and the 400 percent cliff'),
  coming('withdrawal-order', 12, 'Which account to spend first', 'Withdrawal order, RMDs and the Social Security tax torpedo over a lifetime'),
  coming('social-security', 13, 'Social Security, worked out', 'The 35-year average, bend points, claiming age and survivors'),
  coming('capstone', 14, 'Build the plan', 'A whole plan for one household, stress-tested against history'),
  coming('portugal-residency', 101, 'Becoming a Portuguese tax resident', 'When Portugal taxes you, how its income tax is built, and what replaced NHR', { branch: 'portugal', needs: ['brackets'] }),
  coming('portugal-two-countries', 102, 'Two tax systems on one income', 'The US-Portugal treaty, foreign tax credits, and each US account abroad', { branch: 'portugal', needs: ['portugal-residency', 'accounts'] }),
  coming('portugal-life', 103, 'Health, homes and heirs in Portugal', 'The national health service, Medicare abroad, property tax and inheritance', { branch: 'portugal', needs: ['portugal-two-countries'] }),
  coming('wa-taxes', 201, 'What Washington taxes instead', 'The state’s tax on long-term gains, its sales tax, and moving states', { branch: 'washington', needs: ['brackets'] }),
  coming('wa-health', 202, 'Apple Health and Cascade Care', 'The Medicaid floor, state premium help and estate recovery', { branch: 'washington', needs: ['aca'] }),
  coming('wa-estate', 203, 'WA Cares and the estate tax', 'The long-term care premium and benefit, and the state’s estate tax', { branch: 'washington', needs: ['wa-taxes'] }),
  coming('asset-location', 301, 'Where to hold what', 'Which assets belong in which account, and what that is worth', { branch: 'taxable', needs: ['filling-brackets'] }),
  coming('harvesting', 302, 'Harvesting losses and gains', 'Tax-loss harvesting, wash sales, lots, and gains at 0 percent', { branch: 'taxable', needs: ['asset-location'] }),
  coming('giving-heirs', 303, 'Giving and heirs', 'Appreciated shares, donor-advised funds, QCDs and the step-up', { branch: 'taxable', needs: ['harvesting'] }),
  coming('mega-backdoor', 401, 'The mega backdoor and the pro-rata rule', 'After-tax 401(k) money into Roth, and the backdoor Roth IRA', { branch: 'equity', needs: ['accounts'] }),
  coming('rsus-espp', 402, 'RSUs and ESPP', 'Vested shares as wages, the withholding gap, and ESPP sales', { branch: 'equity', needs: ['mega-backdoor'] }),
  coming('options', 403, 'Options and the AMT', 'Incentive and non-qualified options, the AMT, and 83(b)', { branch: 'equity', needs: ['rsus-espp'] }),
  coming('filing-status', 501, 'Two people, one plan', 'Marriage penalties and bonuses, unmarried partners, and the survivor', { branch: 'couples', needs: ['brackets'] }),
  coming('beneficiaries', 502, 'Beneficiaries and inherited accounts', 'Beneficiary forms, the 10-year rule and spousal rollover', { branch: 'couples', needs: ['filing-status'] }),
  coming('medicare', 601, 'Medicare and IRMAA', 'Medicare at 65 and the surcharges set two years earlier', { branch: 'after65', needs: ['aca'] }),
  coming('long-term-care', 602, 'Long-term care', 'What care costs, insurance against self-funding, and Medicaid', { branch: 'after65', needs: ['medicare'] }),
  coming('coast', 701, 'Coast, part-time and partial', 'How a little earned income raises a safe spending rate', { branch: 'shapes', needs: ['flexible-spending'] }),
  coming('housing', 702, 'The house', 'Paying off the mortgage against investing, and the sale exclusion', { branch: 'shapes', needs: ['coast'] }),
];

/** The branches: two places, then situations, then ways of shaping the plan. */
export const BRANCHES: TreeBranch[] = [
  { id: 'portugal', title: 'Portugal', promise: 'Residency, two tax systems, health and heirs', from: 'brackets', kind: 'people', color: 'var(--b-clay)', prefix: 'P' },
  { id: 'washington', title: 'Washington', promise: 'The state’s gains tax, Apple Health, WA Cares and the estate tax', from: 'brackets', kind: 'local', color: 'var(--b-fir)', prefix: 'W' },
  { id: 'taxable', title: 'Taxable-account craft', promise: 'Asset location, harvesting, giving and heirs', from: 'filling-brackets', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'T' },
  { id: 'equity', title: 'Equity pay and big-company plans', promise: 'Mega backdoor Roth, RSUs and ESPP, options', from: 'accounts', kind: 'further', color: 'var(--b-gold)', prefix: 'E' },
  { id: 'couples', title: 'Couples and heirs', promise: 'Filing status, beneficiaries and inherited IRAs', from: 'brackets', kind: 'people', color: 'var(--b-madder)', prefix: 'C' },
  { id: 'after65', title: 'Health after 65', promise: 'Medicare surcharges and long-term care', from: 'aca', kind: 'people', color: 'var(--b-plum)', prefix: 'H' },
  { id: 'shapes', title: 'Other shapes', promise: 'Part-time work, coasting, and the house', from: 'flexible-spending', kind: 'further', color: 'var(--b-sky)', prefix: 'S' },
];

const writtenIds = new Set(Object.values(written).map((l) => l.id));
const all = [...Object.values(written), ...PLAN.filter((l) => !writtenIds.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "P2"). */
export const LESSONS: readonly MoneyLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly MoneyLesson[] = LESSONS.filter((l) => !l.coming);
