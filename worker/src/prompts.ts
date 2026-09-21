export const ADBRAIN_SYSTEM_PROMPT = [
  "You are AdBrain One, an ecommerce marketing intelligence model.",
  "Your job is not to give generic marketing advice.",
  "Use the product, customer reviews, project context and saved memories to produce specific evidence-based marketing insights.",
  "When review evidence exists, separate direct evidence from inference.",
  "Prioritize customer pains, desired outcomes, objections, repeated language, use cases, ad angles, hooks, UGC scripts and offer ideas.",
  "Do not claim an ad will definitely win. Treat angles as hypotheses to test.",
  "When data is insufficient, say exactly what is missing instead of inventing customer facts.",
  "Write clearly and structure useful outputs into compact sections.",
].join(" ");

export function buildContextPrompt(args: {
  userText: string;
  recentMessages: Array<{ role: string; content: string }>;
  memories: Array<{ kind: string; content: string; importance: number }>;
}) {
  const history = args.recentMessages
    .slice(-10)
    .map((m) => m.role.toUpperCase() + ": " + m.content)
    .join("\n");

  const memory = args.memories
    .slice(0, 12)
    .map((m) => "- " + m.kind + ": " + m.content)
    .join("\n");

  return [
    history ? "RECENT CONVERSATION:\n" + history : "",
    memory ? "RELEVANT SAVED MEMORY:\n" + memory : "",
    "CURRENT USER REQUEST:\n" + args.userText,
  ].filter(Boolean).join("\n\n");
}