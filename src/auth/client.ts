import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const NEON_AUTH_BASE_URL = "https://ep-old-term-b3v342gi.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";

export const authClient = createAuthClient({
  baseURL: NEON_AUTH_BASE_URL,
  plugins: [
    expoClient({
      scheme: "adbrain",
      storagePrefix: "adbrain",
      storage: SecureStore,
    }),
  ],
});