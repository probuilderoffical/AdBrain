export const ADBRAIN_SYSTEM_PROMPT = [
  "You are AdBrain One, an ecommerce product intelligence and creative strategy model.",
  "Never give generic marketing filler when project evidence exists.",
  "Use product facts, reviews, competitor material, saved insights and memories before making recommendations.",
  "Clearly separate direct evidence from inference.",
  "Prioritize customer pains, desired outcomes, objections, repeated language, use cases, personas, offers, ad angles, hooks and UGC concepts.",
  "Never claim an ad will definitely win. Treat creative ideas as hypotheses to test.",
  "If evidence is weak or missing, say what is missing instead of inventing customer facts.",
  "Keep answers useful, concrete and compact."
].join(" ");

export const ADBRAIN_ANALYSIS_SYSTEM_PROMPT = [
  "You are the structured analysis engine inside AdBrain, an ecommerce product research tool.",
  "Analyze only the supplied project and source evidence.",
  "Return valid JSON only. No markdown and no code fences.",
  "Every insight must be grounded in supplied evidence or explicitly marked as inference.",
  "Allowed insight types: pain, desire, objection, phrase, use_case, angle, hook, persona, offer.",
  "Scores are 0 to 100 and represent evidence strength/usefulness, not guaranteed ad performance.",
  "Prefer repeated customer language and concrete product facts over generic marketing advice."
].join(" ");

export function buildContextPrompt(args: {
  userText: string;
  recentMessages: Array<{ role: string; content: string }>;
  memories: Array<{ kind: string; content: string; importance: number }>;
  projectContext?: string;
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
    args.projectContext ? "PROJECT INTELLIGENCE:\n" + args.projectContext : "",
    history ? "RECENT CONVERSATION:\n" + history : "",
    memory ? "RELEVANT SAVED MEMORY:\n" + memory : "",
    "CURRENT USER REQUEST:\n" + args.userText
  ].filter(Boolean).join("\n\n");
}

export function buildProductAnalysisPrompt(args: {
  project: {
    name: string;
    brand_name?: string | null;
    product_name?: string | null;
    product_description?: string | null;
    target_audience?: string | null;
  };
  sources: Array<{ source_type: string; name?: string | null; content: string; metadata?: unknown }>;
}) {
  const sourceText = args.sources
    .slice(0, 20)
    .map((source, index) => {
      const clipped = source.content.slice(0, 10000);
      return [
        "SOURCE " + (index + 1),
        "TYPE: " + source.source_type,
        source.name ? "NAME: " + source.name : "",
        "CONTENT:",
        clipped
      ].filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n")
    .slice(0, 28000);

  return [
    "PROJECT:",
    "Name: " + args.project.name,
    "Brand: " + (args.project.brand_name || "unknown"),
    "Product: " + (args.project.product_name || "unknown"),
    "Description: " + (args.project.product_description || "unknown"),
    "Target audience: " + (args.project.target_audience || "unknown"),
    "",
    "EVIDENCE SOURCES:",
    sourceText || "No source text supplied.",
    "",
    "Return exactly this JSON shape:",
    '{"summary":"short research summary","insights":[{"type":"pain|desire|objection|phrase|use_case|angle|hook|persona|offer","label":"short label","detail":"specific explanation","score":0,"evidence":["short evidence quote or source reference"],"inference":false}]}',
    "",
    "Produce 12-30 high-value insights across multiple types. Do not duplicate the same idea."
  ].join("\n");
}
