import { authClient } from "@/auth/client";

export const ADBRAIN_API_URL = process.env.EXPO_PUBLIC_ADBRAIN_API_URL ?? "";

type ChatPayload = {
  message: string;
  conversationId?: string | null;
  projectId?: string | null;
};

export async function sendAdBrainMessage(payload: ChatPayload) {
  if (!ADBRAIN_API_URL) throw new Error("AdBrain cloud backend is not configured yet.");
  const cookie = await authClient.getCookie();
  if (!cookie) throw new Error("Please sign in first.");

  const response = await fetch(ADBRAIN_API_URL.replace(/\/$/, "") + "/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    credentials: "omit",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || "AdBrain request failed.");
  }
  return data as {
    conversationId: string;
    messageId: string;
    answer: string;
    model: string;
    createdAt: string;
  };
}