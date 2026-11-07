// A course's description with its whole lesson list under it: the catalog's
// words for the course (subtitle and summary, from its course.json) beside
// what each lesson, written or planned, says it teaches. The description is
// written and revised against this, by a person, by Claude or by Gemini
// (tools/copyedit.mjs --description), so it never promises what the lessons
// don't cover and never drifts from them.
//
//   npm run outline -- <course>        prints it as Markdown

import { collect } from '../status.mjs';

/** The course's description and lessons, or null if there is no such course. */
export function courseOutline(folder) {
  const { courses } = collect();
  const c = courses.find((x) => x.folder === folder && !x.outlineOnly);
  if (!c) return null;
  return {
    folder,
    title: c.title,
    lessons: c.lessons.map((l) => ({ code: l.code, title: l.title, about: l.about, branch: l.branch, planned: l.status === 'planned' })),
    /** The other courses on the site, by folder, for a description to be told apart from. */
    others: courses.filter((x) => x.folder !== folder && !x.outlineOnly).map((x) => x.folder),
  };
}

/** One course's outline as Markdown: the description, then every lesson by trunk and branch. */
export function outlineMarkdown(o, info) {
  const out = [`# ${info.title}${info.subtitle ? `: ${info.subtitle}` : ''}`, '', '## Description (course.json "summary")', '', info.summary, '', '## Lessons'];
  let branch = null;
  for (const l of o.lessons) {
    if (l.branch !== branch) {
      branch = l.branch;
      out.push('', `### ${branch ? `Branch: ${branch}` : 'Trunk'}`, '');
    }
    out.push(`- ${l.code}. **${l.title}**${l.planned ? ' (not written yet)' : ''}: ${l.about}`);
  }
  return `${out.join('\n')}\n`;
}
