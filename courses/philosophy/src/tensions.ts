// Pairs of verdicts that pull against each other, written by hand. The
// Verdicts page shows a pair once the reader has given both answers named.
// Each is framed as a tension philosophers themselves argue about, never as
// a gotcha. A pair whose lessons are not written yet waits quietly.

export interface Tension {
  /** Two verdict keys and, for each, the choices that set the tension off. */
  a: { key: string; picks: number[] };
  b: { key: string; picks: number[] };
  text: string;
}

export const TENSIONS: readonly Tension[] = [
  {
    a: { key: 'euthyphro', picks: [1] },
    b: { key: 'relativism', picks: [0] },
    text: 'You said the gods love good things because they are good, so goodness does not depend on anyone\'s say-so; and you said morality is a matter of opinion. Socrates would ask whose opinion the gods were tracking, since on your first answer it cannot be their own.',
  },
  {
    a: { key: 'ring', picks: [0] },
    b: { key: 'ring-happier', picks: [0] },
    text: 'You said you would use Gyges\' ring, and also that a just person is better off even when no one finds out. Plato would say you have admitted the ring would make you worse off. Glaucon would say the second answer is what people say, and the first is what they do.',
  },
];
