import { authClient } from "@/auth/client";

export const ADBRAIN_API_URL = process.env.EXPO_PUBLIC_ADBRAIN_API_URL ?? "https://adbrain.aw5703066.workers.dev";

async function api<T>(path: string, init: RequestInit = {}) {
  const cookie = await authClient.getCookie();
  if (!cookie) throw new Error("Please sign in first.");
  const response = await fetch(ADBRAIN_API_URL.replace(/\/$/, "") + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      cookie,
      ...(init.headers || {})
    },
    credentials: "omit"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.error || "AdBrain request failed.");
  return data as T;
}

export type Project = {
  id: string;
  name: string;
  brand_name?: string | null;
  product_name?: string | null;
  product_description?: string | null;
  target_audience?: string | null;
  source_count?: number;
  insight_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProjectSource = {
  id: string;
  source_type: "product_info" | "review_text" | "review_csv" | "notes" | "competitor";
  name?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type Insight = {
  id?: string;
  type?: string;
  insight_type?: string;
  label: string;
  detail?: string | null;
  score: number;
  evidence?: string[];
};

export type CloudSettings = {
  preferred_language: string;
  memory_enabled: boolean;
  improve_adbrain: boolean;
  chat_history_enabled: boolean;
  response_style: string;
};

export async function sendAdBrainMessage(payload: {
  message: string;
  conversationId?: string | null;
  projectId?: string | null;
}) {
  return api<{
    conversationId: string | null;
    messageId: string | null;
    answer: string;
    model: string;
    createdAt: string;
    projectId?: string | null;
  }>("/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listProjects() {
  const data = await api<{ projects: Project[] }>("/projects");
  return data.projects;
}

export async function createProject(input: {
  name: string;
  brand_name?: string;
  product_name?: string;
  product_description?: string;
  target_audience?: string;
}) {
  const data = await api<{ project: Project }>("/projects", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.project;
}

export async function getProject(projectId: string) {
  return api<{ project: Project; sources: ProjectSource[]; insights: Insight[] }>("/projects/" + projectId);
}

export async function addProjectSource(projectId: string, input: {
  source_type: ProjectSource["source_type"];
  name?: string;
  content?: string;
  url?: string;
}) {
  const data = await api<{ source: ProjectSource }>("/projects/" + projectId + "/sources", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.source;
}

export async function analyzeProject(projectId: string) {
  return api<{ projectId: string; summary: string; insights: Insight[]; model: string }>(
    "/projects/" + projectId + "/analyze",
    { method: "POST", body: "{}" }
  );
}

export async function getCloudSettings() {
  const data = await api<{ settings: CloudSettings }>("/settings");
  return data.settings;
}

export async function saveCloudSettings(settings: Partial<CloudSettings>) {
  const data = await api<{ settings: CloudSettings }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(settings)
  });
  return data.settings;
}

export async function recordCloudFeedback(messageId: string, signal: "like" | "dislike" | "save" | "copy" | "used" | "regenerate") {
  return api<{ ok: boolean; ignored?: boolean }>("/feedback", {
    method: "POST",
    body: JSON.stringify({ messageId, signal })
  });
}
