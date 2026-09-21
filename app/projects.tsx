import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { createProject, listProjects, Project } from "@/api/adbrain";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const rows = await listProjects();
      setProjects(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Projects load nahi huay.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createProject({
        name: name.trim(),
        product_name: product.trim() || undefined,
        product_description: description.trim() || undefined
      });
      setName("");
      setProduct("");
      setDescription("");
      setShowCreate(false);
      router.push({ pathname: "/project/[id]", params: { id: created.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project create nahi hua.");
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
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>Product Projects</Text>
        <Pressable onPress={() => setShowCreate((v) => !v)} style={{ padding: 8 }}>
          <Ionicons name={showCreate ? "close" : "add"} size={27} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Har product ka apna research brain: sources, customer evidence, angles, hooks aur project-aware chat.
        </Text>

        {showCreate ? (
          <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Naya Product Project</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Project name *" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 }} />
            <TextInput value={product} onChangeText={setProduct} placeholder="Product name" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 }} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Product description / offer / audience" placeholderTextColor={colors.muted} multiline style={{ color: colors.text, minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 }} />
            <Pressable disabled={busy || !name.trim()} onPress={() => void submit()} style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 13, alignItems: "center", opacity: busy || !name.trim() ? 0.45 : 1 }}>
              {busy ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: "800" }}>Create Project</Text>}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={{ color: "#B42318", marginTop: 14 }}>{error}</Text> : null}
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

        <View style={{ gap: 12, marginTop: 22 }}>
          {projects.map((project) => (
            <Pressable key={project.id} onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 17 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{project.name}</Text>
                  {project.product_name ? <Text style={{ color: colors.muted, marginTop: 5 }}>{project.product_name}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </View>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{project.source_count ?? 0} sources</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{project.insight_count ?? 0} insights</Text>
              </View>
            </Pressable>
          ))}
          {!loading && projects.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 22 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Abhi koi project nahi</Text>
              <Text style={{ color: colors.muted, marginTop: 7, lineHeight: 21 }}>+ dabao aur apna pehla ecommerce product add karo.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
