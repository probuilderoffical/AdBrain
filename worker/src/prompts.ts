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
  reviews?: Array<{ ref: string; text: string; sourceName?: string | null }>;
  reviewStats?: { unique: number; sampled: number; duplicatesRemoved: number };
}) {
  const sourceText = args.sources
    .slice(0, 16)
    .map((source, index) => {
      const clipped = source.content.slice(0, 5000);
      return [
        "SOURCE_REF: S" + (index + 1),
        "TYPE: " + source.source_type,
        source.name ? "NAME: " + source.name : "",
        "CONTENT:",
        clipped
      ].filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n")
    .slice(0, 14000);

  const reviewText = (args.reviews || [])
    .map((review) => "[" + review.ref + "] " + review.text.slice(0, 320))
    .join("\n")
    .slice(0, 14000);

  const stats = args.reviewStats
    ? "Unique reviews: " + args.reviewStats.unique +
      "; analyzed sample: " + args.reviewStats.sampled +
      "; exact duplicates removed: " + args.reviewStats.duplicatesRemoved
    : "No normalized review statistics available.";

  return [
    "PROJECT:",
    "Name: " + args.project.name,
    "Brand: " + (args.project.brand_name || "unknown"),
    "Product: " + (args.project.product_name || "unknown"),
    "Description: " + (args.project.product_description || "unknown"),
    "Target audience: " + (args.project.target_audience || "unknown"),
    "",
    "REVIEW DATASET STATS:",
    stats,
    "",
    "NORMALIZED CUSTOMER REVIEWS:",
    reviewText || "No normalized reviews supplied.",
    "",
    "OTHER EVIDENCE SOURCES:",
    sourceText || "No other source text supplied.",
    "",
    "Citation rules:",
    "- Review evidence must cite review refs like R001, R002.",
    "- Other source evidence must cite source refs like S1, S2.",
    "- Only cite refs that are actually supplied above.",
    "- For repeated review signals, include every clearly matching review ref you can identify, up to 30 refs.",
    "- If an idea is inference rather than directly stated, set inference=true and do not invent refs.",
    "",
    "Return exactly this JSON shape:",
    '{"summary":"short research summary","insights":[{"type":"pain|desire|objection|phrase|use_case|angle|hook|persona|offer","label":"short label","detail":"specific explanation","score":0,"evidence_refs":["R001","S1"],"inference":false}]}',
    "",
    "Produce 12-30 distinct high-value insights across multiple types.",
    "Scores are evidence/usefulness strength only. They are not ad-performance predictions."
  ].join("\n");
}


export const ADBRAIN_CREATIVE_SYSTEM_PROMPT = [
  "You are AdBrain Creative Studio, an ecommerce performance creative engine.",
  "Use only the supplied project intelligence as the strategic basis.",
  "Return valid JSON only. No markdown or code fences.",
  "Create diverse testable concepts, not minor rewrites of the same idea.",
  "Do not invent customer claims, guarantees, medical claims or product capabilities.",
  "Prefer specific customer language, pains, desires, objections and use cases from the evidence.",
  "Treat every angle and hook as a hypothesis to test, never as a guaranteed winner."
].join(" ");

export function buildCreativePrompt(args: {
  projectContext: string;
  mode: string;
  instruction?: string;
}) {
  const mode = ["full_pack", "hooks", "ugc", "offers", "ad_copy"].includes(args.mode)
    ? args.mode
    : "full_pack";
  return [
    "PROJECT INTELLIGENCE:",
    args.projectContext,
    "",
    "REQUESTED MODE: " + mode,
    args.instruction ? "EXTRA INSTRUCTION: " + args.instruction.slice(0, 2000) : "",
    "",
    "Return exactly this JSON-compatible structure:",
    '{"title":"Creative Pack","summary":"strategy summary","angles":[{"name":"angle","why":"evidence-based reason","hooks":["hook 1","hook 2","hook 3"]}],"ugc_scripts":[{"concept":"concept","hook":"opening hook","body":"short creator script","cta":"CTA"}],"offers":[{"name":"offer idea","why":"why it may fit"}],"ad_copy":[{"headline":"headline","primary_text":"short primary text","cta":"CTA"}]}',
    "",
    "For full_pack create 5 angles, 15 hooks total, 3 UGC scripts, 3 offer ideas and 3 ad-copy variations.",
    "For a focused mode, prioritize that section but keep the same JSON keys."
  ].filter(Boolean).join("\n");
}
