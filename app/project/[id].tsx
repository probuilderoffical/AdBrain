import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { addProjectSource, analyzeProject, getProject, Insight, Project, ProjectSource } from "@/api/adbrain";
import { useTheme } from "@/theme/ThemeProvider";

const SOURCE_OPTIONS: Array<{ key: ProjectSource["source_type"]; label: string }> = [
  { key: "product_info", label: "Product URL / Info" },
  { key: "review_text", label: "Customer Reviews" },
  { key: "competitor", label: "Competitor URL / Info" },
  { key: "notes", label: "Research Notes" }
];

export default function ProjectDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = String(params.id || "");
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sourceType, setSourceType] = useState<ProjectSource["source_type"]>("product_info");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setError("");
      const data = await getProject(projectId);
      setProject(data.project);
      setSources(data.sources);
      setInsights(data.insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project load nahi hua.");
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function addSource() {
    if (!sourceText.trim() && !sourceUrl.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addProjectSource(projectId, {
        source_type: sourceType,
        name: sourceName.trim() || undefined,
        content: sourceText.trim() || undefined,
        url: sourceUrl.trim() || undefined
      });
      setSourceText("");
      setSourceUrl("");
      setSourceName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Source import nahi hua.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setError("");
    try {
      const result = await analyzeProject(projectId);
      setSummary(result.summary);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis run nahi hui.");
    } finally {
      setAnalyzing(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Insight[]>();
    for (const insight of insights) {
      const key = insight.insight_type || insight.type || "insight";
      map.set(key, [...(map.get(key) || []), insight]);
    }
    return [...map.entries()];
  }, [insights]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 54 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" }}>{project?.name || "Project"}</Text>
        <Pressable onPress={() => router.push({ pathname: "/chat", params: { projectId } })} style={{ padding: 8 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }}>
        {project ? (
          <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 16 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{project.product_name || project.name}</Text>
            {project.product_description ? <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 21 }}>{project.product_description}</Text> : null}
          </View>
        ) : <ActivityIndicator />}

        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 26 }}>Research Sources</Text>
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 21 }}>Public product/competitor URL import karo, reviews paste karo ya apni notes add karo.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 13 }}>
          {SOURCE_OPTIONS.map((item) => {
            const selected = sourceType === item.key;
            return (
              <Pressable key={item.key} onPress={() => setSourceType(item.key)} style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }}>
                <Text style={{ color: selected ? colors.background : colors.text, fontSize: 13, fontWeight: "600" }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 9 }}>
          <TextInput value={sourceName} onChangeText={setSourceName} placeholder="Source name (optional)" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }} />
          <TextInput value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" keyboardType="url" placeholder="https://product-or-competitor-page.com" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }} />
          <TextInput value={sourceText} onChangeText={setSourceText} multiline placeholder="Ya reviews / product info / notes yahan paste karo..." placeholderTextColor={colors.muted} style={{ color: colors.text, minHeight: 110, textAlignVertical: "top", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }} />
          <Pressable disabled={busy || (!sourceText.trim() && !sourceUrl.trim())} onPress={() => void addSource()} style={{ backgroundColor: colors.primary, borderRadius: 13, padding: 13, alignItems: "center", opacity: busy || (!sourceText.trim() && !sourceUrl.trim()) ? 0.45 : 1 }}>
            {busy ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: "800" }}>Add Research Source</Text>}
          </Pressable>
        </View>

        {sources.length ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            {sources.slice(0, 8).map((source) => (
              <View key={source.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.card }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{source.name || source.source_type}</Text>
                <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12, textTransform: "uppercase" }}>{source.source_type}</Text>
                <Text numberOfLines={3} style={{ color: colors.muted, marginTop: 7, lineHeight: 18 }}>{source.content}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          disabled={!insights.length}
          onPress={() => router.push({ pathname: "/creative/[id]", params: { id: projectId } })}
          style={{ marginTop: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 16, opacity: insights.length ? 1 : 0.55 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>Creative Studio</Text>
              <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
                Saved research se ad angles, hooks, UGC scripts, offers aur ad copy generate karo.
              </Text>
            </View>
            <Ionicons name="sparkles-outline" size={25} color={colors.text} />
          </View>
          {!insights.length ? <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>Pehle Product Intelligence analysis run karo.</Text> : null}
        </Pressable>

        <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>AdBrain Product Intelligence</Text>
          <Text style={{ color: colors.muted, marginTop: 7, lineHeight: 21 }}>Sources ko evidence-based pains, desires, objections, customer language, personas, offers, angles aur hooks me convert karta hai.</Text>
          <Pressable disabled={analyzing} onPress={() => void analyze()} style={{ marginTop: 15, backgroundColor: colors.primary, borderRadius: 13, padding: 14, alignItems: "center", opacity: analyzing ? 0.5 : 1 }}>
            {analyzing ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: "800" }}>{insights.length ? "Re-run Analysis" : "Analyze Product"}</Text>}
          </Pressable>
        </View>

        {error ? <Text style={{ color: "#B42318", marginTop: 14, lineHeight: 20 }}>{error}</Text> : null}
        {summary ? <Text style={{ color: colors.text, marginTop: 18, lineHeight: 22 }}>{summary}</Text> : null}

        {grouped.map(([type, rows]) => (
          <View key={type} style={{ marginTop: 24 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800", textTransform: "capitalize" }}>{type.replace(/_/g, " ")}</Text>
            <View style={{ gap: 9, marginTop: 10 }}>
              {rows.slice(0, 8).map((insight, index) => (
                <View key={insight.id || type + index} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 14, padding: 13 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ flex: 1, color: colors.text, fontWeight: "700" }}>{insight.label}</Text>
                    <Text style={{ color: colors.muted, fontWeight: "700" }}>{Math.round(Number(insight.score || 0))}</Text>
                  </View>
                  {insight.detail ? <Text style={{ color: colors.muted, marginTop: 7, lineHeight: 20 }}>{insight.detail}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
