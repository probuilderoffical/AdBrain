import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getCloudSettings, saveCloudSettings } from "@/api/adbrain";
import { ThemeMode, usePreferences } from "@/store/preferences";
import { useTheme } from "@/theme/ThemeProvider";
import { ResponsiveContent, ResponsiveScreen, useResponsiveLayout } from "@/ui/ResponsiveScreen";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ marginTop: 26 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>{title}</Text>{children}</View>;
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { isNarrow, gutter } = useResponsiveLayout();
  const themeMode = usePreferences((state) => state.themeMode);
  const setThemeMode = usePreferences((state) => state.setThemeMode);
  const [memory, setMemory] = useState(true);
  const [improve, setImprove] = useState(true);
  const [history, setHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
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
    const old = key === "memory_enabled" ? memory : key === "improve_adbrain" ? improve : history;
    if (key === "memory_enabled") setMemory(value);
    if (key === "improve_adbrain") setImprove(value);
    if (key === "chat_history_enabled") setHistory(value);
    setSavingKey(key);
    setNote("");
    try {
      await saveCloudSettings({ [key]: value });
      setNote(key === "improve_adbrain"
        ? value
          ? "Improve AdBrain on hai. Naya eligible data future improvements ke liye use ho sakta hai."
          : "Improve AdBrain off hai. Naya data learning ke liye use nahi hoga aur pending eligible data revoke kar diya gaya hai."
        : "Setting saved.");
    } catch (e) {
      if (key === "memory_enabled") setMemory(old);
      if (key === "improve_adbrain") setImprove(old);
      if (key === "chat_history_enabled") setHistory(old);
      setNote(e instanceof Error ? e.message : "Setting save nahi hui.");
    } finally {
      setSavingKey(null);
    }
  }

  const themes: ThemeMode[] = ["light", "dark", "system"];

  return (
    <ResponsiveScreen>
      <ResponsiveContent bottomPadding={50}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: isNarrow ? 25 : 28, fontWeight: "800", color: colors.text }}>Settings</Text>
        </View>

        <Section title="AdBrain One">
          <Text style={{ color: colors.muted, lineHeight: 20 }}>Cloudflare Workers AI + Neon project intelligence.</Text>
        </Section>

        <Section title="Privacy & Learning">
          {loading ? <ActivityIndicator /> : (
            <>
              <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Memory</Text>
                  <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>Project aur brand context future answers me use karo.</Text>
                </View>
                <Switch value={memory} onValueChange={(v) => void update("memory_enabled", v)} disabled={savingKey !== null} />
              </View>

              <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Improve AdBrain</Text>
                  <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>
                    Default on. On ho to chats aur feedback future AdBrain ranking/model improvements ke liye eligible ho sakte hain. Off karne par is account ka naya data learning pipeline me nahi jayega.
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12, lineHeight: 17 }}>
                    Ye live Qwen model ko har message par train nahi karta; ye AdBrain ki future improvement pipeline ko control karta hai.
                  </Text>
                </View>
                <Switch value={improve} onValueChange={(v) => void update("improve_adbrain", v)} disabled={savingKey !== null} />
              </View>

              <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Chat History</Text>
                  <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>Chat messages account ke saath Neon me save karo.</Text>
                </View>
                <Switch value={history} onValueChange={(v) => void update("chat_history_enabled", v)} disabled={savingKey !== null} />
              </View>
            </>
          )}
          {note ? <Text style={{ color: note.toLowerCase().includes("failed") ? "#B42318" : colors.muted, marginTop: 10, lineHeight: 19 }}>{note}</Text> : null}
        </Section>

        <Section title="Appearance">
          <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
            {themes.map((mode) => {
              const selected = themeMode === mode;
              return (
                <Pressable key={mode} onPress={() => setThemeMode(mode)}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: selected ? colors.primary : colors.card, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}>
                  <Text style={{ color: selected ? colors.background : colors.text, textTransform: "capitalize", fontWeight: "600" }}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="About">
          <Text style={{ color: colors.muted }}>AdBrain v0.3 · Product Intelligence Engine</Text>
        </Section>
      </ResponsiveContent>
    </ResponsiveScreen>
  );
}
