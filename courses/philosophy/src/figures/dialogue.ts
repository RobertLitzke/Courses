// A dialogue the reader takes part in: at each turn they pick what the other
// speaker says (from replies the speaker really gives, or could), and the
// philosopher answers that reply. The transcript builds up in a box of fixed
// height, so the controls do not move. Lesson 1 uses it for the Euthyphro.
//
// { "type": "interactive_diagram", "id": "dialogue", "goal": "end", "task": "…",
//   "options": { "a": "Socrates", "b": "Euthyphro", "open": "What Socrates asks first",
//     "turns": [ { "replies": [ { "say": "What Euthyphro might say", "answer": "Socrates' answer to it" } ],
//                  "then": "Socrates' next question, after whichever reply" } ],
//     "end": "Said when the dialogue is over" } }

import { el } from 'didactics/dom';
import { choices as chipRow, figure, frame, type Options } from './kit';

export interface DialogueTurn {
  replies: { say: string; answer: string }[];
  /** The philosopher's next question, whichever reply was picked. */
  then?: string;
}

export interface DialogueOptions {
  a: string;
  b: string;
  open: string;
  turns: DialogueTurn[];
  end: string;
}

export function dialogueProblems(o: Options | undefined): string[] {
  const d = o as Partial<DialogueOptions> | undefined;
  if (!d) return ['has no options'];
  const out: string[] = [];
  if (!d.a || !d.b) out.push('needs the speakers "a" and "b"');
  if (!d.open) out.push('needs an "open" line');
  if (!Array.isArray(d.turns) || !d.turns.length) out.push('needs "turns"');
  for (const [i, t] of (d.turns ?? []).entries()) {
    if (!Array.isArray(t.replies) || t.replies.length < 2) out.push(`turn ${i + 1} needs two or more replies`);
    for (const r of t.replies ?? []) if (!r.say || !r.answer) out.push(`turn ${i + 1}: a reply needs "say" and "answer"`);
  }
  if (!d.end) out.push('needs an "end"');
  return out;
}

export const dialogueFigure = figure<DialogueOptions & Options>(['end'], (_ctx, t, o) => {
  const d = o as DialogueOptions;
  const log = el('div', { style: 'height: 300px; overflow-y: auto;', 'aria-live': 'polite' });
  const f = frame({ drawing: log, lines: 2 });
  const line = (who: string, text: string, reader = false) => {
    log.append(el(`p.dialogue-line${reader ? '.reader' : ''}`, {}, el('b', {}, `${who}: `), text));
    log.scrollTop = log.scrollHeight;
  };
  const picks: number[] = [];
  const show = (k: number) => {
    f.controls.replaceChildren();
    if (k >= d.turns.length) {
      f.readout.textContent = d.end;
      t.keep({ picks });
      t.done();
      return;
    }
    f.readout.textContent = `What does ${d.b} say? Pick a reply (${k + 1} of ${d.turns.length}).`;
    const turn = d.turns[k];
    const row = chipRow(turn.replies.map((r) => r.say), (i) => answer(k, i));
    f.controls.append(row.node);
  };
  const answer = (k: number, i: number) => {
    const turn = d.turns[k];
    picks[k] = i;
    line(d.b, turn.replies[i].say, true);
    line(d.a, turn.replies[i].answer);
    if (turn.then) line(d.a, turn.then);
    show(k + 1);
  };
  line(d.a, d.open);
  const kept = (t.kept as { picks?: number[] } | undefined)?.picks;
  if (kept && kept.length === d.turns.length) {
    for (const [k, i] of kept.entries()) {
      const turn = d.turns[k];
      if (!turn.replies[i]) break;
      picks[k] = i;
      line(d.b, turn.replies[i].say, true);
      line(d.a, turn.replies[i].answer);
      if (turn.then) line(d.a, turn.then);
    }
    show(d.turns.length);
  } else show(0);
  return f.node;
}, { options: dialogueProblems });
