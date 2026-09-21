import { neon } from "@neondatabase/serverless";
import {
  ADBRAIN_ANALYSIS_SYSTEM_PROMPT,
  ADBRAIN_CREATIVE_SYSTEM_PROMPT,
  ADBRAIN_SYSTEM_PROMPT,
  buildContextPrompt,
  buildCreativePrompt,
  buildProductAnalysisPrompt
} from "./prompts";

interface Env {
  AI: any;
  DATABASE_URL: string;
  NEON_AUTH_BASE_URL: string;
  ADBRAIN_MODEL: string;
  ADBRAIN_VERSION?: string;
  ALLOWED_ORIGIN?: string;
}

type ChatRequest = { message?: string; conversationId?: string | null; projectId?: string | null };
type InsightType = "pain" | "desire" | "objection" | "phrase" | "use_case" | "angle" | "hook" | "persona" | "offer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INSIGHT_TYPES = new Set<InsightType>(["pain", "desire", "objection", "phrase", "use_case", "angle", "hook", "persona", "offer"]);
const SOURCE_TYPES = new Set(["product_info", "review_text", "review_csv", "notes", "competitor"]);
const DAILY_CHAT_LIMIT = 20;
const DAILY_ANALYSIS_LIMIT = 3;
const DAILY_CREATIVE_LIMIT = 8;

function makeJson(data: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, cookie",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
    }
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

async function readJson(request: Request) {
  try {
    return await request.json<any>();
  } catch {
    return {};
  }
}

async function getUserId(request: Request, env: Env) {
  const cookie = request.headers.get("cookie");
  if (!cookie) throw new Error("UNAUTHORIZED");
  const res = await fetch(env.NEON_AUTH_BASE_URL + "/get-session", {
    headers: { cookie, accept: "application/json" }
  });
  if (!res.ok) throw new Error("UNAUTHORIZED");
  const session = await res.json<any>();
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHORIZED");
  return String(userId);
}

function extractResponseText(raw: any): string {
  if (typeof raw === "string") return raw.trim();
  if (!raw || typeof raw !== "object") return "";
  if (typeof raw.response === "string") return raw.response.trim();
  if (typeof raw.result === "string") return raw.result.trim();
  if (raw.result && typeof raw.result.response === "string") return raw.result.response.trim();
  if (Array.isArray(raw.choices) && typeof raw.choices[0]?.message?.content === "string") {
    return raw.choices[0].message.content.trim();
  }
  return "";
}

function parseJsonLoose(text: string) {
  const clean = text.trim().replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AI_JSON_INVALID");
  }
}

function cleanHtmlText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function validatePublicUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("INVALID_URL");
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) throw new Error("PRIVATE_URL_BLOCKED");
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new Error("PRIVATE_URL_BLOCKED");
    }
  }
  return parsed;
}

async function importPublicPage(rawUrl: string) {
  const url = validatePublicUrl(rawUrl);
  const res = await fetch(url.toString(), {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; AdBrainResearch/1.0)",
      accept: "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error("SOURCE_FETCH_FAILED_" + res.status);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("SOURCE_NOT_HTML");
  }

  const html = (await res.text()).slice(0, 1_500_000);
  const lower = html.toLowerCase();
  let title = "";
  const titleStart = lower.indexOf("<title");
  if (titleStart >= 0) {
    const titleOpenEnd = html.indexOf(">", titleStart);
    const titleClose = lower.indexOf("</title>", titleOpenEnd + 1);
    if (titleOpenEnd >= 0 && titleClose > titleOpenEnd) {
      title = cleanHtmlText(html.slice(titleOpenEnd + 1, titleClose)).slice(0, 240);
    }
  }

  const metaDescription = "";
  const jsonLd = "";
  const isShopify =
    html.includes("cdn.shopify.com") ||
    html.includes("Shopify.theme") ||
    html.includes("shopify-section") ||
    html.includes("ShopifyAnalytics");

  let shopifyProductJson = "";
  const productMarker = "/products/";
  const markerIndex = url.pathname.toLowerCase().indexOf(productMarker);
  let productHandle = "";
  if (markerIndex >= 0) {
    productHandle = url.pathname
      .slice(markerIndex + productMarker.length)
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];
  }

  if (isShopify && productHandle) {
    try {
      const productJsonUrl = new URL("/products/" + productHandle + ".js", url.origin);
      const productRes = await fetch(productJsonUrl.toString(), {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; AdBrainResearch/1.0)",
          accept: "application/json"
        }
      });
      if (productRes.ok) shopifyProductJson = (await productRes.text()).slice(0, 30000);
    } catch {
      shopifyProductJson = "";
    }
  }

  const visible = cleanHtmlText(html).slice(0, 50000);
  const content = [
    isShopify ? "PLATFORM: Shopify" : "PLATFORM: Ecommerce/Public Web",
    title ? "PAGE TITLE: " + title : "",
    metaDescription ? "META DESCRIPTION: " + cleanHtmlText(metaDescription) : "",
    shopifyProductJson ? "SHOPIFY PRODUCT DATA:\n" + shopifyProductJson : "",
    visible ? "PAGE TEXT:\n" + visible : ""
  ].filter(Boolean).join("\n\n").slice(0, 80000);

  if (!content) throw new Error("SOURCE_EMPTY");
  return {
    finalUrl: res.url || url.toString(),
    title: title || url.hostname,
    content,
    platform: isShopify ? "shopify" : "web"
  };
}

async function getSettings(sql: any, userId: string) {
  const rows = await sql`SELECT preferred_language, memory_enabled, improve_adbrain, chat_history_enabled, response_style
    FROM public.adbrain_user_settings WHERE user_id = ${userId}::uuid LIMIT 1`;
  return rows[0] || {
    preferred_language: "auto",
    memory_enabled: true,
    improve_adbrain: true,
    chat_history_enabled: true,
    response_style: "balanced"
  };
}

async function getOwnedProject(sql: any, userId: string, projectId: string) {
  if (!validUuid(projectId)) return null;
  const rows = await sql`SELECT * FROM public.adbrain_projects
    WHERE id = ${projectId}::uuid AND user_id = ${userId}::uuid LIMIT 1`;
  return rows[0] || null;
}

async function getDailyUsage(sql: any, userId: string) {
  const rows = await sql`SELECT chat_calls, analysis_calls, creative_calls
    FROM public.adbrain_ai_usage
    WHERE user_id = ${userId}::uuid AND usage_date = CURRENT_DATE
    LIMIT 1`;
  return rows[0] || { chat_calls: 0, analysis_calls: 0, creative_calls: 0 };
}

async function consumeAiUsage(sql: any, userId: string, kind: "chat" | "analysis" | "creative") {
  await sql`INSERT INTO public.adbrain_ai_usage (user_id, usage_date)
    VALUES (${userId}::uuid, CURRENT_DATE)
    ON CONFLICT (user_id, usage_date) DO NOTHING`;

  if (kind === "chat") {
    const rows = await sql`UPDATE public.adbrain_ai_usage
      SET chat_calls = chat_calls + 1, updated_at = now()
      WHERE user_id = ${userId}::uuid AND usage_date = CURRENT_DATE AND chat_calls < ${DAILY_CHAT_LIMIT}
      RETURNING chat_calls`;
    if (!rows.length) throw new Error("USER_DAILY_AI_LIMIT_CHAT");
  } else if (kind === "analysis") {
    const rows = await sql`UPDATE public.adbrain_ai_usage
      SET analysis_calls = analysis_calls + 1, updated_at = now()
      WHERE user_id = ${userId}::uuid AND usage_date = CURRENT_DATE AND analysis_calls < ${DAILY_ANALYSIS_LIMIT}
      RETURNING analysis_calls`;
    if (!rows.length) throw new Error("USER_DAILY_AI_LIMIT_ANALYSIS");
  } else {
    const rows = await sql`UPDATE public.adbrain_ai_usage
      SET creative_calls = creative_calls + 1, updated_at = now()
      WHERE user_id = ${userId}::uuid AND usage_date = CURRENT_DATE AND creative_calls < ${DAILY_CREATIVE_LIMIT}
      RETURNING creative_calls`;
    if (!rows.length) throw new Error("USER_DAILY_AI_LIMIT_CREATIVE");
  }
}

async function addLearningEvent(
  sql: any,
  userId: string,
  eventType: "chat_pair" | "feedback" | "analysis" | "creative",
  projectId: string | null,
  metadata: Record<string, unknown> = {}
) {
  await sql`INSERT INTO public.adbrain_learning_events
    (user_id, project_id, event_type, eligible, metadata)
    VALUES (
      ${userId}::uuid,
      ${projectId}::uuid,
      ${eventType},
      true,
      ${JSON.stringify(metadata)}::jsonb
    )`;
}

async function projectContext(sql: any, userId: string, projectId: string | null) {
  if (!projectId || !validUuid(projectId)) return "";
  const project = await getOwnedProject(sql, userId, projectId);
  if (!project) return "";
  const [sources, insights] = await Promise.all([
    sql`SELECT source_type, name, content FROM public.adbrain_sources
      WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
      ORDER BY created_at DESC LIMIT 6`,
    sql`SELECT insight_type, label, detail, score FROM public.adbrain_insights
      WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
      ORDER BY score DESC, created_at DESC LIMIT 18`
  ]);
  const sourceSummary = sources.map((s: any) =>
    "- [" + s.source_type + "] " + (s.name || "source") + ": " + String(s.content).slice(0, 900)
  ).join("\n");
  const insightSummary = insights.map((i: any) =>
    "- " + i.insight_type + " (" + Math.round(Number(i.score || 0)) + "): " + i.label + (i.detail ? " — " + i.detail : "")
  ).join("\n");
  return [
    "Project: " + project.name,
    project.brand_name ? "Brand: " + project.brand_name : "",
    project.product_name ? "Product: " + project.product_name : "",
    project.product_description ? "Product description: " + project.product_description : "",
    project.target_audience ? "Target audience: " + project.target_audience : "",
    sourceSummary ? "Recent source evidence:\n" + sourceSummary : "",
    insightSummary ? "Saved structured insights:\n" + insightSummary : ""
  ].filter(Boolean).join("\n");
}

function normalizeInsight(raw: any) {
  const type = String(raw?.type || "").toLowerCase() as InsightType;
  const label = String(raw?.label || "").trim().slice(0, 240);
  if (!INSIGHT_TYPES.has(type) || !label) return null;
  const detail = String(raw?.detail || "").trim().slice(0, 2000);
  const scoreRaw = Number(raw?.score);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, scoreRaw)) : 50;
  const evidence = Array.isArray(raw?.evidence)
    ? raw.evidence.slice(0, 8).map((x: unknown) => String(x).slice(0, 500))
    : [];
  if (raw?.inference === true && !evidence.includes("INFERENCE")) evidence.push("INFERENCE");
  return { type, label, detail, score, evidence };
}

async function runProductAnalysis(env: Env, sql: any, userId: string, projectId: string) {
  const project = await getOwnedProject(sql, userId, projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const sources = await sql`SELECT source_type, name, content, metadata FROM public.adbrain_sources
    WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
    ORDER BY created_at ASC LIMIT 20`;
  if (!sources.length && !project.product_description) throw new Error("NO_PROJECT_EVIDENCE");

  const prompt = buildProductAnalysisPrompt({ project, sources: sources as any[] });
  await consumeAiUsage(sql, userId, "analysis");
  const aiResult = await env.AI.run(env.ADBRAIN_MODEL, {
    messages: [
      { role: "system", content: ADBRAIN_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    max_tokens: 1800,
    temperature: 0.2,
    top_p: 0.85
  });
  const text = extractResponseText(aiResult);
  if (!text) throw new Error("EMPTY_MODEL_RESPONSE");
  const parsed = parseJsonLoose(text);
  const insights = (Array.isArray(parsed?.insights) ? parsed.insights : [])
    .map(normalizeInsight)
    .filter(Boolean)
    .slice(0, 36) as Array<ReturnType<typeof normalizeInsight> & {}>;
  if (!insights.length) throw new Error("AI_ANALYSIS_EMPTY");

  await sql`DELETE FROM public.adbrain_insights
    WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid`;

  for (const insight of insights as any[]) {
    await sql`INSERT INTO public.adbrain_insights
      (project_id, user_id, insight_type, label, detail, score, evidence)
      VALUES (
        ${projectId}::uuid,
        ${userId}::uuid,
        ${insight.type},
        ${insight.label},
        ${insight.detail || null},
        ${insight.score},
        ${JSON.stringify(insight.evidence)}::jsonb
      )`;
  }

  const summary = String(parsed?.summary || "").trim().slice(0, 5000);
  if (summary) {
    await sql`DELETE FROM public.adbrain_memories
      WHERE user_id = ${userId}::uuid AND project_id = ${projectId}::uuid AND kind = 'project_summary'`;
    await sql`INSERT INTO public.adbrain_memories
      (user_id, project_id, kind, content, importance)
      VALUES (${userId}::uuid, ${projectId}::uuid, 'project_summary', ${summary}, 5)`;
  }

  return { summary, insights };
}

async function runCreativeStudio(env: Env, sql: any, userId: string, projectId: string, mode: string, instruction?: string) {
  const project = await getOwnedProject(sql, userId, projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const context = await projectContext(sql, userId, projectId);
  if (!context) throw new Error("NO_PROJECT_EVIDENCE");

  await consumeAiUsage(sql, userId, "creative");
  const result = await env.AI.run(env.ADBRAIN_MODEL, {
    messages: [
      { role: "system", content: ADBRAIN_CREATIVE_SYSTEM_PROMPT },
      { role: "user", content: buildCreativePrompt({ projectContext: context, mode, instruction }) }
    ],
    max_tokens: 2200,
    temperature: 0.65,
    top_p: 0.92
  });
  const text = extractResponseText(result);
  if (!text) throw new Error("EMPTY_MODEL_RESPONSE");
  const parsed = parseJsonLoose(text);
  const title = String(parsed?.title || (project.product_name || project.name) + " Creative Pack").trim().slice(0, 240);
  const content = {
    summary: String(parsed?.summary || "").slice(0, 5000),
    angles: Array.isArray(parsed?.angles) ? parsed.angles.slice(0, 12) : [],
    ugc_scripts: Array.isArray(parsed?.ugc_scripts) ? parsed.ugc_scripts.slice(0, 10) : [],
    offers: Array.isArray(parsed?.offers) ? parsed.offers.slice(0, 10) : [],
    ad_copy: Array.isArray(parsed?.ad_copy) ? parsed.ad_copy.slice(0, 10) : [],
    mode
  };
  const rows = await sql`INSERT INTO public.adbrain_artifacts
    (user_id, project_id, artifact_type, title, content)
    VALUES (${userId}::uuid, ${projectId}::uuid, 'creative_pack', ${title}, ${JSON.stringify(content)}::jsonb)
    RETURNING id, project_id, artifact_type, title, content, status, created_at, updated_at`;
  return rows[0];
}

function quotaError(message: string, origin: string) {
  if (message.includes("4006") || message.toLowerCase().includes("free allocation")) {
    return makeJson({
      error: "AI_DAILY_QUOTA_EXHAUSTED",
      detail: "AdBrain ki free daily AI capacity aaj ke liye use ho chuki hai. Quota 00:00 UTC par reset hota hai."
    }, 429, origin);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "content-type, cookie",
          "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
        }
      });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      try {
        if (!env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
        const healthSql = neon(env.DATABASE_URL);
        await healthSql`SELECT 1 AS ok`;
        return makeJson({
          ok: true,
          service: "adbrain-api",
          version: env.ADBRAIN_VERSION || "dev",
          database: "connected",
          aiBinding: !!env.AI,
          model: env.ADBRAIN_MODEL
        }, 200, origin);
      } catch (error) {
        return makeJson({ ok: false, service: "adbrain-api", database: "error", detail: errorMessage(error) }, 500, origin);
      }
    }

    if (request.method === "GET" && url.pathname === "/health/deep") {
      try {
        if (!env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
        const healthSql = neon(env.DATABASE_URL);
        await healthSql`SELECT 1 AS ok`;
        if (!env.AI) throw new Error("AI_BINDING_MISSING");
        return makeJson({
          ok: true,
          service: "adbrain-api",
          version: env.ADBRAIN_VERSION || "dev",
          database: "connected",
          ai: "binding-ready",
          model: env.ADBRAIN_MODEL,
          note: "No inference is executed by health checks to preserve the free AI quota."
        }, 200, origin);
      } catch (error) {
        return makeJson({ ok: false, service: "adbrain-api", detail: errorMessage(error) }, 500, origin);
      }
    }

    try {
      const userId = await getUserId(request, env);
      if (!env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
      const sql = neon(env.DATABASE_URL);
      const path = url.pathname;
      const segments = path.split("/").filter(Boolean);

      if (path === "/settings" && request.method === "GET") {
        return makeJson({ settings: await getSettings(sql, userId) }, 200, origin);
      }

      if (path === "/usage" && request.method === "GET") {
        const usage = await getDailyUsage(sql, userId);
        return makeJson({ usage, limits: { chat: DAILY_CHAT_LIMIT, analysis: DAILY_ANALYSIS_LIMIT, creative: DAILY_CREATIVE_LIMIT } }, 200, origin);
      }

      if (path === "/settings" && (request.method === "POST" || request.method === "PATCH")) {
        const body = await readJson(request);
        const current = await getSettings(sql, userId);
        const preferredLanguage = typeof body.preferred_language === "string" ? body.preferred_language.slice(0, 32) : current.preferred_language;
        const responseStyle = typeof body.response_style === "string" ? body.response_style.slice(0, 32) : current.response_style;
        const memoryEnabled = typeof body.memory_enabled === "boolean" ? body.memory_enabled : current.memory_enabled;
        const improveAdbrain = typeof body.improve_adbrain === "boolean" ? body.improve_adbrain : current.improve_adbrain;
        const chatHistoryEnabled = typeof body.chat_history_enabled === "boolean" ? body.chat_history_enabled : current.chat_history_enabled;
        const rows = await sql`INSERT INTO public.adbrain_user_settings
          (user_id, preferred_language, memory_enabled, improve_adbrain, chat_history_enabled, response_style)
          VALUES (
            ${userId}::uuid, ${preferredLanguage}, ${memoryEnabled}, ${improveAdbrain}, ${chatHistoryEnabled}, ${responseStyle}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            preferred_language = EXCLUDED.preferred_language,
            memory_enabled = EXCLUDED.memory_enabled,
            improve_adbrain = EXCLUDED.improve_adbrain,
            chat_history_enabled = EXCLUDED.chat_history_enabled,
            response_style = EXCLUDED.response_style,
            updated_at = now()
          RETURNING preferred_language, memory_enabled, improve_adbrain, chat_history_enabled, response_style`;

        if (current.improve_adbrain && !improveAdbrain) {
          await sql`UPDATE public.adbrain_learning_events
            SET eligible = false, revoked_at = now()
            WHERE user_id = ${userId}::uuid AND eligible = true`;
        }

        return makeJson({ settings: rows[0] }, 200, origin);
      }

      if (path === "/projects" && request.method === "GET") {
        const projects = await sql`SELECT p.*,
          (SELECT count(*)::int FROM public.adbrain_sources s WHERE s.project_id = p.id) AS source_count,
          (SELECT count(*)::int FROM public.adbrain_insights i WHERE i.project_id = p.id) AS insight_count
          FROM public.adbrain_projects p
          WHERE p.user_id = ${userId}::uuid AND p.status = 'active'
          ORDER BY p.updated_at DESC`;
        return makeJson({ projects }, 200, origin);
      }

      if (path === "/projects" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || body.product_name || "").trim().slice(0, 160);
        if (!name) return makeJson({ error: "Project name is required" }, 400, origin);
        const rows = await sql`INSERT INTO public.adbrain_projects
          (user_id, name, brand_name, product_name, product_description, target_audience)
          VALUES (
            ${userId}::uuid,
            ${name},
            ${String(body.brand_name || "").trim().slice(0, 160) || null},
            ${String(body.product_name || "").trim().slice(0, 240) || null},
            ${String(body.product_description || "").trim().slice(0, 12000) || null},
            ${String(body.target_audience || "").trim().slice(0, 3000) || null}
          ) RETURNING *`;
        return makeJson({ project: rows[0] }, 201, origin);
      }

      if (segments[0] === "projects" && segments.length >= 2) {
        const projectId = segments[1];
        const project = await getOwnedProject(sql, userId, projectId);
        if (!project) return makeJson({ error: "Project not found" }, 404, origin);

        if (segments.length === 2 && request.method === "GET") {
          const [sources, insights] = await Promise.all([
            sql`SELECT id, source_type, name, content, metadata, created_at
              FROM public.adbrain_sources
              WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
              ORDER BY created_at DESC`,
            sql`SELECT id, insight_type, label, detail, score, evidence, created_at
              FROM public.adbrain_insights
              WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
              ORDER BY insight_type ASC, score DESC, created_at DESC`
          ]);
          return makeJson({ project, sources, insights }, 200, origin);
        }

        if (segments.length === 2 && request.method === "PATCH") {
          const body = await readJson(request);
          const rows = await sql`UPDATE public.adbrain_projects SET
            name = ${String(body.name ?? project.name).trim().slice(0, 160)},
            brand_name = ${String(body.brand_name ?? project.brand_name ?? "").trim().slice(0, 160) || null},
            product_name = ${String(body.product_name ?? project.product_name ?? "").trim().slice(0, 240) || null},
            product_description = ${String(body.product_description ?? project.product_description ?? "").trim().slice(0, 12000) || null},
            target_audience = ${String(body.target_audience ?? project.target_audience ?? "").trim().slice(0, 3000) || null},
            updated_at = now()
            WHERE id = ${projectId}::uuid AND user_id = ${userId}::uuid
            RETURNING *`;
          return makeJson({ project: rows[0] }, 200, origin);
        }

        if (segments.length === 2 && request.method === "DELETE") {
          await sql`DELETE FROM public.adbrain_projects WHERE id = ${projectId}::uuid AND user_id = ${userId}::uuid`;
          return makeJson({ ok: true }, 200, origin);
        }

        if (segments[2] === "sources" && segments.length === 3 && request.method === "POST") {
          const body = await readJson(request);
          const sourceType = String(body.source_type || "product_info");
          if (!SOURCE_TYPES.has(sourceType)) return makeJson({ error: "Invalid source type" }, 400, origin);
          let content = String(body.content || "").trim();
          let name = String(body.name || "").trim().slice(0, 240) || null;
          const metadata: Record<string, unknown> = typeof body.metadata === "object" && body.metadata ? body.metadata : {};
          if (body.url) {
            const imported = await importPublicPage(String(body.url));
            content = [content, imported.content].filter(Boolean).join("\n\n");
            name = name || imported.title;
            metadata.url = imported.finalUrl;
            metadata.platform = imported.platform;
            metadata.imported_at = new Date().toISOString();
          }
          content = content.slice(0, 100000);
          if (!content) return makeJson({ error: "Source content or URL is required" }, 400, origin);
          const rows = await sql`INSERT INTO public.adbrain_sources
            (user_id, project_id, source_type, name, content, metadata)
            VALUES (
              ${userId}::uuid,
              ${projectId}::uuid,
              ${sourceType},
              ${name},
              ${content},
              ${JSON.stringify(metadata)}::jsonb
            ) RETURNING id, source_type, name, content, metadata, created_at`;
          await sql`UPDATE public.adbrain_projects SET updated_at = now() WHERE id = ${projectId}::uuid`;
          return makeJson({ source: rows[0] }, 201, origin);
        }

        if (segments[2] === "sources" && segments[3] && request.method === "DELETE") {
          const sourceId = segments[3];
          if (!validUuid(sourceId)) return makeJson({ error: "Source not found" }, 404, origin);
          const rows = await sql`DELETE FROM public.adbrain_sources
            WHERE id = ${sourceId}::uuid AND project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
            RETURNING id`;
          if (!rows.length) return makeJson({ error: "Source not found" }, 404, origin);
          return makeJson({ ok: true }, 200, origin);
        }

        if (segments[2] === "artifacts" && request.method === "GET") {
          const artifacts = await sql`SELECT id, project_id, artifact_type, title, content, status, created_at, updated_at
            FROM public.adbrain_artifacts
            WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid AND status = 'active'
            ORDER BY updated_at DESC LIMIT 50`;
          return makeJson({ artifacts }, 200, origin);
        }

        if (segments[2] === "creative" && request.method === "POST") {
          const body = await readJson(request);
          const artifact = await runCreativeStudio(env, sql, userId, projectId, String(body.mode || "full_pack"),
            typeof body.instruction === "string" ? body.instruction : undefined);
          return makeJson({ artifact, model: env.ADBRAIN_MODEL }, 201, origin);
        }

        if (segments[2] === "analyze" && request.method === "POST") {
          const result = await runProductAnalysis(env, sql, userId, projectId);
          await sql`UPDATE public.adbrain_projects SET updated_at = now() WHERE id = ${projectId}::uuid`;
          return makeJson({ projectId, ...result, model: env.ADBRAIN_MODEL }, 200, origin);
        }
      }

      if (path === "/feedback" && request.method === "POST") {
        const body = await readJson(request);
        const settings = await getSettings(sql, userId);
        if (!settings.improve_adbrain) return makeJson({ ok: true, ignored: true }, 200, origin);
        const signal = String(body.signal || "");
        const weights: Record<string, number> = { like: 4, dislike: -5, save: 3, copy: 2, used: 5, regenerate: -2 };
        if (!(signal in weights) || !validUuid(body.messageId)) return makeJson({ error: "Invalid feedback" }, 400, origin);
        const owned = await sql`SELECT id FROM public.adbrain_messages
          WHERE id = ${body.messageId}::uuid AND user_id = ${userId}::uuid LIMIT 1`;
        if (!owned.length) return makeJson({ error: "Message not found" }, 404, origin);
        await sql`INSERT INTO public.adbrain_feedback (user_id, message_id, signal, value, metadata)
          VALUES (${userId}::uuid, ${body.messageId}::uuid, ${signal}, ${weights[signal]}, ${JSON.stringify(body.metadata || {})}::jsonb)`;
        const key = "response." + signal;
        await sql`INSERT INTO public.adbrain_preferences (user_id, preference_key, score, samples)
          VALUES (${userId}::uuid, ${key}, ${weights[signal]}, 1)
          ON CONFLICT (user_id, preference_key) DO UPDATE SET
            score = public.adbrain_preferences.score + EXCLUDED.score,
            samples = public.adbrain_preferences.samples + 1,
            updated_at = now()`;
        return makeJson({ ok: true }, 200, origin);
      }

      if (path === "/chat" && request.method === "POST") {
        const body = (await readJson(request)) as ChatRequest;
        const message = body.message?.trim();
        if (!message) return makeJson({ error: "Message is required" }, 400, origin);
        if (message.length > 30000) return makeJson({ error: "Message too long" }, 413, origin);

        const settings = await getSettings(sql, userId);
        let conversationId = validUuid(body.conversationId) ? body.conversationId : null;
        let projectId = validUuid(body.projectId) ? body.projectId : null;

        if (projectId) {
          const ownedProject = await getOwnedProject(sql, userId, projectId);
          if (!ownedProject) return makeJson({ error: "Project not found" }, 404, origin);
        }

        if (conversationId) {
          const owned = await sql`SELECT id, project_id FROM public.adbrain_conversations
            WHERE id = ${conversationId}::uuid AND user_id = ${userId}::uuid LIMIT 1`;
          if (!owned.length) return makeJson({ error: "Conversation not found" }, 404, origin);
          projectId = projectId || (owned[0].project_id ? String(owned[0].project_id) : null);
        } else if (settings.chat_history_enabled) {
          const created = await sql`INSERT INTO public.adbrain_conversations (user_id, project_id, title)
            VALUES (${userId}::uuid, ${projectId}::uuid, ${message.slice(0, 72)}) RETURNING id`;
          conversationId = String(created[0].id);
        }

        const recent = conversationId && settings.chat_history_enabled
          ? await sql`SELECT role, content FROM public.adbrain_messages
              WHERE conversation_id = ${conversationId}::uuid AND user_id = ${userId}::uuid
              ORDER BY created_at DESC LIMIT 10`
          : [];

        const memories = settings.memory_enabled
          ? await sql`SELECT kind, content, importance FROM public.adbrain_memories
              WHERE user_id = ${userId}::uuid AND active = true
              AND (${projectId}::uuid IS NULL OR project_id = ${projectId}::uuid OR project_id IS NULL)
              ORDER BY importance DESC, updated_at DESC LIMIT 12`
          : [];

        if (conversationId && settings.chat_history_enabled) {
          await sql`INSERT INTO public.adbrain_messages (conversation_id, user_id, role, content, model)
            VALUES (${conversationId}::uuid, ${userId}::uuid, 'user', ${message}, ${env.ADBRAIN_MODEL})`;
        }

        const prompt = buildContextPrompt({
          userText: message,
          recentMessages: [...recent].reverse() as Array<{ role: string; content: string }>,
          memories: memories as Array<{ kind: string; content: string; importance: number }>,
          projectContext: await projectContext(sql, userId, projectId)
        });

        await consumeAiUsage(sql, userId, "chat");
        const aiResult = await env.AI.run(env.ADBRAIN_MODEL, {
          messages: [
            { role: "system", content: ADBRAIN_SYSTEM_PROMPT + " Response style: " + settings.response_style + ". Preferred language: " + settings.preferred_language + "." },
            { role: "user", content: prompt }
          ],
          max_tokens: 700,
          temperature: 0.5,
          top_p: 0.9
        });
        const answer = extractResponseText(aiResult);
        if (!answer) throw new Error("EMPTY_MODEL_RESPONSE");

        let messageId: string | null = null;
        let createdAt = new Date().toISOString();
        if (conversationId && settings.chat_history_enabled) {
          const saved = await sql`INSERT INTO public.adbrain_messages
            (conversation_id, user_id, role, content, model)
            VALUES (${conversationId}::uuid, ${userId}::uuid, 'assistant', ${answer}, ${env.ADBRAIN_MODEL})
            RETURNING id, created_at`;
          messageId = String(saved[0].id);
          createdAt = String(saved[0].created_at);
          await sql`UPDATE public.adbrain_conversations SET updated_at = now() WHERE id = ${conversationId}::uuid`;
        }

        return makeJson({ conversationId, messageId, answer, model: env.ADBRAIN_MODEL, createdAt, projectId }, 200, origin);
      }

      return makeJson({ error: "Not found" }, 404, origin);
    } catch (error) {
      const message = errorMessage(error);
      if (message === "UNAUTHORIZED") return makeJson({ error: "Unauthorized" }, 401, origin);
      const quota = quotaError(message, origin);
      if (quota) return quota;
      if (message === "PROJECT_NOT_FOUND") return makeJson({ error: "Project not found" }, 404, origin);
      if (message === "NO_PROJECT_EVIDENCE") return makeJson({ error: "Add product details, reviews or competitor sources before analysis." }, 400, origin);
      if (message.startsWith("USER_DAILY_AI_LIMIT_")) {
        return makeJson({ error: message, detail: "Aaj ka free AdBrain AI allowance is action ke liye complete ho gaya hai. Kal quota reset hoga." }, 429, origin);
      }
      if (["INVALID_URL", "PRIVATE_URL_BLOCKED", "SOURCE_NOT_HTML", "SOURCE_EMPTY"].includes(message) || message.startsWith("SOURCE_FETCH_FAILED_")) {
        return makeJson({ error: message }, 400, origin);
      }
      console.error("AdBrain worker error", error);
      return makeJson({ error: "AdBrain backend error", detail: message }, 500, origin);
    }
  }
};
