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
  {
    a: { key: 'freewill', picks: [0] },
    b: { key: 'libet', picks: [0] },
    text: 'You said a choice can be free even if it is fully caused, and also that brain activity coming before a decision would show it was not free. A compatibilist would say the brain activity is just one of the causes, and you have already allowed that a caused choice can be free. Libet\'s critics would say the same.',
  },
  {
    a: { key: 'fire', picks: [1] },
    b: { key: 'nature', picks: [0] },
    text: 'You agreed with al-Ghazali that we never see a cause, only one thing following another, and with Hobbes that people would fall into war without a government. Hobbes\'s argument relies on confident predictions about what causes what in human behaviour; al-Ghazali, and Hume after him, would ask what those predictions rest on.',
  },
  {
    a: { key: 'euthyphro', picks: [0] },
    b: { key: 'abraham', picks: [1] },
    text: 'You said an act is right because God commands it, and also that no command could make killing an innocent child right. Divine command theorists such as Robert Adams escape this by saying a loving God could never command cruelty; Kierkegaard thought Abraham\'s story shows the escape is not so easy.',
  },
  {
    a: { key: 'cave', picks: [0] },
    b: { key: 'machine', picks: [0] },
    text: 'You said you would rather know the truth about your life even at a cost, and also that you would plug into the experience machine for life. Plato and Nozick would both say the second answer gives up the first: the machine is a cave you choose, with better shadows.',
  },
  {
    a: { key: 'veil', picks: [0] },
    b: { key: 'wilt', picks: [0] },
    text: 'You chose Rawls\'s rule behind the veil, and also said the state may not tax Wilt Chamberlain\'s earnings to help the worst-off. Rawls would say his rule is exactly a reason to tax them, and that the fans paid under tax rules everyone knew. Nozick would say your second answer shows why no pattern survives free choice.',
  },
];
