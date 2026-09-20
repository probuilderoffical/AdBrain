const shortHooks = [
  'Stop guessing what your customers want.',
  'Your reviews already contain your next winning ad.',
  'Turn customer complaints into ad angles.',
];

export function analyzeMessage(input: string) {
  const text = input.toLowerCase();
  const isReviewLike = /review|customer|complaint|love|hate|easy|hard|problem/.test(text);
  const angle = isReviewLike
    ? 'Customer pain + desired outcome'
    : 'Product benefit + clear use case';

  return [
    '🔥 Best Angle',
    angle,
    '',
    '🎯 Hooks',
    ...shortHooks.map((hook, index) => String(index + 1) + '. ' + hook),
    '',
    '🧠 AdBrain note',
    'Abhi ye local rules engine hai. Next phase mein on-device language model, memory aur scoring layer connect hogi.',
  ].join('\n');
}
