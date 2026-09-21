import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AdBrainArtifact, generateCreativePack, getDailyUsage, listProjectArtifacts } from "@/api/adbrain";
import { useTheme } from "@/theme/ThemeProvider";

const MODES = [
  { key: "full_pack", label: "Full Pack" },
  { key: "hooks", label: "Hooks" },
  { key: "ugc", label: "UGC" },
  { key: "offers", label: "Offers" },
  { key: "ad_copy", label: "Ad Copy" }
] as const;

export default function CreativeStudioScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = String(params.id || "");
  const [artifacts, setArtifacts] = useState<AdBrainArtifact[]>([]);
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("full_pack");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usageText, setUsageText] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setError("");
      const [rows, usage] = await Promise.all([listProjectArtifacts(projectId), getDailyUsage()]);
      setArtifacts(rows);
      setUsageText("Today: " + usage.usage.creative_calls + "/" + usage.limits.creative + " creative · " +
        usage.usage.analysis_calls + "/" + usage.limits.analysis + " analysis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative Studio load nahi hua.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await generateCreativePack(projectId, { mode, instruction: instruction.trim() || undefined });
      setInstruction("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative pack generate nahi hua.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 54 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Creative Studio</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Research → Ads</Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/chat", params: { projectId } })} style={{ padding: 8 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.card, padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Generate from saved intelligence</Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            AdBrain tumhare saved product facts, customer pains, objections, phrases, personas aur angles ko use karega.
          </Text>
          {usageText ? <Text style={{ color: colors.muted, marginTop: 9, fontSize: 12 }}>{usageText}</Text> : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
            {MODES.map((item) => {
              const selected = mode === item.key;
              return (
                <Pressable key={item.key} onPress={() => setMode(item.key)} style={{
                  paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.background
                }}>
                  <Text style={{ color: selected ? colors.background : colors.text, fontWeight: "700", fontSize: 13 }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput value={instruction} onChangeText={setInstruction} multiline
            placeholder="Optional: TikTok style, skeptical buyers, premium positioning..."
            placeholderTextColor={colors.muted}
            style={{ color: colors.text, minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }} />

          <Pressable disabled={busy} onPress={() => void generate()} style={{
            backgroundColor: colors.primary, borderRadius: 13, padding: 14, marginTop: 12,
            alignItems: "center", opacity: busy ? 0.5 : 1
          }}>
            {busy ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: "800" }}>Generate & Save</Text>}
          </Pressable>
        </View>

        {error ? <Text style={{ color: "#B42318", marginTop: 14, lineHeight: 20 }}>{error}</Text> : null}
        {loading ? <ActivityIndicator style={{ marginTop: 30 }} /> : null}

        <View style={{ gap: 18, marginTop: 24 }}>
          {artifacts.map((artifact) => (
            <View key={artifact.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.card, padding: 16 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{artifact.title}</Text>
              {artifact.content.summary ? <Text style={{ color: colors.muted, marginTop: 7, lineHeight: 21 }}>{artifact.content.summary}</Text> : null}

              {artifact.content.angles?.length ? <View style={{ marginTop: 18 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>Angles & Hooks</Text>
                {artifact.content.angles.map((angle, i) => <View key={i} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{angle.name || "Angle " + (i + 1)}</Text>
                  {angle.why ? <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{angle.why}</Text> : null}
                  {angle.hooks?.map((hook, h) => <Text key={h} style={{ color: colors.text, marginTop: 5 }}>• {hook}</Text>)}
                </View>)}
              </View> : null}

              {artifact.content.ugc_scripts?.length ? <View style={{ marginTop: 18 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>UGC Scripts</Text>
                {artifact.content.ugc_scripts.map((script, i) => <View key={i} style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{script.concept || "UGC " + (i + 1)}</Text>
                  {script.hook ? <Text style={{ color: colors.text, marginTop: 6 }}>Hook: {script.hook}</Text> : null}
                  {script.body ? <Text style={{ color: colors.muted, marginTop: 5, lineHeight: 20 }}>{script.body}</Text> : null}
                  {script.cta ? <Text style={{ color: colors.text, marginTop: 5 }}>CTA: {script.cta}</Text> : null}
                </View>)}
              </View> : null}

              {artifact.content.offers?.length ? <View style={{ marginTop: 18 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>Offer Ideas</Text>
                {artifact.content.offers.map((offer, i) => <Text key={i} style={{ color: colors.text, marginTop: 7 }}>• {offer.name}{offer.why ? " — " + offer.why : ""}</Text>)}
              </View> : null}

              {artifact.content.ad_copy?.length ? <View style={{ marginTop: 18 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>Ad Copy</Text>
                {artifact.content.ad_copy.map((copy, i) => <View key={i} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{copy.headline || "Ad " + (i + 1)}</Text>
                  {copy.primary_text ? <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>{copy.primary_text}</Text> : null}
                  {copy.cta ? <Text style={{ color: colors.text, marginTop: 4 }}>CTA: {copy.cta}</Text> : null}
                </View>)}
              </View> : null}
            </View>
          ))}

          {!loading && artifacts.length === 0 ? <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, backgroundColor: colors.card }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>Abhi creative pack nahi hai</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>Upar se Full Pack generate karo. Result project ke saath save rahega.</Text>
          </View> : null}
        </View>
      </ScrollView>
    </View>
  );
}
