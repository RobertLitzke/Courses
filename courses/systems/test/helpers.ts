// What the figure tests share: a context to build a figure in, and the
// reader's moves (a slider, a button, a guess locked in).
import { emptyProgress } from 'didactics/progress';
import { isDiagram } from 'didactics/blocks';
import type { Units } from 'didactics/units';
import { WRITTEN } from '../src/lessons';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

export const context = (units: Units = 'metric') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

/** A live chart's options, from the one block in the written lessons with that id. */
export const blockOptions = (id: string) => {
  const b = WRITTEN.flatMap((l) => l.parts.flatMap((p) => p.blocks)).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

/** Set the `n`th slider in the figure to `value`. */
export function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

/** Click the button whose text is `text`. */
export const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
export const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};
