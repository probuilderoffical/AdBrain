import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getCloudSettings, saveCloudSettings } from "@/api/adbrain";
import { ThemeMode, usePreferences } from "@/store/preferences";
import { useTheme } from "@/theme/ThemeProvider";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ marginTop: 28 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>{title}</Text>{children}</View>;
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const themeMode = usePreferences((state) => state.themeMode);
  const setThemeMode = usePreferences((state) => state.setThemeMode);
  const [memory, setMemory] = useState(true);
  const [improve, setImprove] = useState(true);
  const [history, setHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getCloudSettings();
        setMemory(settings.memory_enabled);
        setImprove(settings.improve_adbrain);
        setHistory(settings.chat_history_enabled);
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Cloud settings load nahi huay.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function update(key: "memory_enabled" | "improve_adbrain" | "chat_history_enabled", value: boolean) {
    if (key === "memory_enabled") setMemory(value);
    if (key === "improve_adbrain") setImprove(value);
    if (key === "chat_history_enabled") setHistory(value);
    setSaving(true);
    setNote("");
    try {
      await saveCloudSettings({ [key]: value });
      setNote("Cloud setting saved.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Setting save nahi hui.");
    } finally {
      setSaving(false);
    }
  }

  const themes: ThemeMode[] = ["light", "dark", "system"];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 54, paddingBottom: 60 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>Settings</Text>
      </View>

      <Section title="AdBrain One">
        <Text style={{ color: colors.muted, lineHeight: 20 }}>Cloudflare Workers AI + Neon project intelligence.</Text>
      </Section>

      <Section title="Privacy & Learning">
        {loading ? <ActivityIndicator /> : (
          <>
            {[
              ["Memory", "Project aur brand context future answers me use karo.", memory, (v: boolean) => update("memory_enabled", v)],
              ["Improve AdBrain", "Likes, dislikes, saves aur usage signals se ranking improve karo.", improve, (v: boolean) => update("improve_adbrain", v)],
              ["Chat History", "Chat messages account ke saath Neon me save karo.", history, (v: boolean) => update("chat_history_enabled", v)]
            ].map(([label, desc, value, fn]: any) => (
              <View key={label} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
                <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text><Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{desc}</Text></View>
                <Switch value={value} onValueChange={fn} disabled={saving} />
              </View>
            ))}
          </>
        )}
        {note ? <Text style={{ color: note.includes("saved") ? colors.muted : "#B42318", marginTop: 10 }}>{note}</Text> : null}
      </Section>

      <Section title="Appearance">
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {themes.map((mode) => {
            const selected = themeMode === mode;
            return (
              <Pressable key={mode} onPress={() => setThemeMode(mode)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: selected ? colors.primary : colors.card, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}>
                <Text style={{ color: selected ? colors.background : colors.text, textTransform: "capitalize", fontWeight: "600" }}>{mode}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="About">
        <Text style={{ color: colors.muted }}>AdBrain v0.3 · Product Intelligence Engine</Text>
      </Section>
    </ScrollView>
  );
}
