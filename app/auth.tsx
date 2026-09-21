import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { authClient } from "@/auth/client";
import { useTheme } from "@/theme/ThemeProvider";

export default function AuthScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({ name: name.trim() || "AdBrain User", email: email.trim(), password });
        if (result.error) throw new Error(result.error.message || "Sign up failed");
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) throw new Error(result.error.message || "Sign in failed");
      }
      router.replace("/chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontSize: 34, fontWeight: "800" }}>AdBrain</Text>
      <Text style={{ color: colors.muted, marginTop: 8, fontSize: 16 }}>Sign in to AdBrain One</Text>

      {mode === "signup" ? (
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.muted} style={{ marginTop: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, color: colors.text, backgroundColor: colors.card }} />
      ) : null}

      <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} style={{ marginTop: mode === "signup" ? 12 : 28, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, color: colors.text, backgroundColor: colors.card }} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} style={{ marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, color: colors.text, backgroundColor: colors.card }} />

      {error ? <Text style={{ color: "#B42318", marginTop: 12 }}>{error}</Text> : null}

      <Pressable disabled={busy} onPress={() => void submit()} style={{ marginTop: 18, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center", opacity: busy ? 0.5 : 1 }}>
        <Text style={{ color: colors.background, fontWeight: "700", fontSize: 16 }}>{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ marginTop: 18, alignItems: "center" }}>
        <Text style={{ color: colors.muted }}>{mode === "signin" ? "New here? Create account" : "Already have an account? Sign in"}</Text>
      </Pressable>
    </View>
  );
}