// A course's catalog description with every lesson under it, as Markdown:
// what to read before rewriting the description, and what the Gemini copy
// edit of it is given (tools/lib/outline.mjs).
//
//   npm run outline -- <course>

import { courseArg } from './lib/course.mjs';
import { courseOutline, outlineMarkdown } from './lib/outline.mjs';

const { name, course } = courseArg('usage: npm run outline -- <course>');
process.stdout.write(outlineMarkdown(courseOutline(name), course));
