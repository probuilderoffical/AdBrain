import { neon } from "@neondatabase/serverless";
import { ADBRAIN_SYSTEM_PROMPT, buildContextPrompt } from "./prompts";

interface Env {
  AI: any;
  DATABASE_URL: string;
  NEON_AUTH_BASE_URL: string;
  ADBRAIN_MODEL: string;
  ALLOWED_ORIGIN?: string;
}

type ChatRequest = { message?: string; conversationId?: string; projectId?: string };

function makeJson(data: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, cookie",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

async function getUserId(request: Request, env: Env) {
  const cookie = request.headers.get("cookie");
  if (!cookie) throw new Error("UNAUTHORIZED");
  const res = await fetch(env.NEON_AUTH_BASE_URL + "/get-session", {
    headers: { cookie, accept: "application/json" },
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
  if (Array.isArray(raw.choices) && typeof raw.choices[0]?.message?.content === "string") return raw.choices[0].message.content.trim();
  return "";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, cookie",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    }});

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        if (!env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
        const healthSql = neon(env.DATABASE_URL);
        await healthSql`SELECT 1 AS ok`;
        return makeJson({ ok: true, service: "adbrain-api", database: "connected", aiBinding: !!env.AI, model: env.ADBRAIN_MODEL }, 200, origin);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return makeJson({ ok: false, service: "adbrain-api", database: "error", aiBinding: !!env.AI, model: env.ADBRAIN_MODEL, detail }, 500, origin);
      }
    }
    if (request.method === "GET" && url.pathname === "/health/deep") {
      try {
        if (!env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
        const healthSql = neon(env.DATABASE_URL);
        await healthSql`SELECT 1 AS ok`;
        if (!env.AI) throw new Error("AI_BINDING_MISSING");
        const probe = await env.AI.run(env.ADBRAIN_MODEL, {
          messages: [
            { role: "system", content: "Return exactly OK." },
            { role: "user", content: "health check" }
          ],
          max_tokens: 8,
          temperature: 0,
        });
        const aiText = extractResponseText(probe);
        if (!aiText) throw new Error("AI_EMPTY_RESPONSE");
        return makeJson({ ok: true, service: "adbrain-api", database: "connected", ai: "responding", model: env.ADBRAIN_MODEL }, 200, origin);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return makeJson({ ok: false, service: "adbrain-api", detail }, 500, origin);
      }
    }

    if (request.method !== "POST" || url.pathname !== "/chat") return makeJson({ error: "Not found" }, 404, origin);

    try {
      const userId = await getUserId(request, env);
      const body = (await request.json()) as ChatRequest;
      const message = body.message?.trim();
      if (!message) return makeJson({ error: "Message is required" }, 400, origin);
      if (message.length > 30000) return makeJson({ error: "Message too long" }, 413, origin);

      const sql = neon(env.DATABASE_URL);
      let conversationId = body.conversationId || null;
      if (conversationId) {
        const owned = await sql`SELECT id FROM public.adbrain_conversations WHERE id = ${conversationId}::uuid AND user_id = ${userId}::uuid LIMIT 1`;
        if (!owned.length) return makeJson({ error: "Conversation not found" }, 404, origin);
      } else {
        const projectId = body.projectId || null;
        const created = await sql`INSERT INTO public.adbrain_conversations (user_id, project_id, title) VALUES (${userId}::uuid, ${projectId}::uuid, ${message.slice(0,72)}) RETURNING id`;
        conversationId = String(created[0].id);
      }

      const recent = await sql`SELECT role, content FROM public.adbrain_messages WHERE conversation_id = ${conversationId}::uuid AND user_id = ${userId}::uuid ORDER BY created_at DESC LIMIT 10`;
      const projectIdForMemory = body.projectId || null;
      const memories = await sql`SELECT kind, content, importance FROM public.adbrain_memories WHERE user_id = ${userId}::uuid AND active = true AND (${projectIdForMemory}::uuid IS NULL OR project_id = ${projectIdForMemory}::uuid OR project_id IS NULL) ORDER BY importance DESC, updated_at DESC LIMIT 12`;

      await sql`INSERT INTO public.adbrain_messages (conversation_id, user_id, role, content, model) VALUES (${conversationId}::uuid, ${userId}::uuid, 'user', ${message}, ${env.ADBRAIN_MODEL})`;

      const prompt = buildContextPrompt({
        userText: message,
        recentMessages: [...recent].reverse() as Array<{ role: string; content: string }>,
        memories: memories as Array<{ kind: string; content: string; importance: number }>,
      });

      const aiResult = await env.AI.run(env.ADBRAIN_MODEL, {
        messages: [
          { role: "system", content: ADBRAIN_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.55,
        repetition_penalty: 1.05,
      });
      const answer = extractResponseText(aiResult);
      if (!answer) throw new Error("EMPTY_MODEL_RESPONSE");

      const saved = await sql`INSERT INTO public.adbrain_messages (conversation_id, user_id, role, content, model) VALUES (${conversationId}::uuid, ${userId}::uuid, 'assistant', ${answer}, ${env.ADBRAIN_MODEL}) RETURNING id, created_at`;
      await sql`UPDATE public.adbrain_conversations SET updated_at = now() WHERE id = ${conversationId}::uuid`;

      return makeJson({ conversationId, messageId: saved[0].id, answer, model: env.ADBRAIN_MODEL, createdAt: saved[0].created_at }, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "UNAUTHORIZED") return makeJson({ error: "Unauthorized" }, 401, origin);
      console.error("AdBrain worker error", error);
      if (message.includes("4006") || message.toLowerCase().includes("free allocation")) {
        return makeJson({
          error: "AI_DAILY_QUOTA_EXHAUSTED",
          detail: "Cloudflare Workers AI free daily quota is exhausted. It resets at 00:00 UTC."
        }, 429, origin);
      }
      return makeJson({ error: "AdBrain backend error", detail: message }, 500, origin);
    }
  },
};