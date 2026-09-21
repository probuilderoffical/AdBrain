import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { ADBRAIN_API_URL, recordCloudFeedback, sendAdBrainMessage } from "@/api/adbrain";
import { authClient } from "@/auth/client";

type ChatMessage = { id?: string | null; role: "user" | "assistant"; text: string };

export default function ChatScreen() {
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectId = params.projectId ? String(params.projectId) : null;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const quick = useMemo(() => projectId
    ? ["Best 5 ad angles", "Top objections", "Write 10 hooks", "Create 3 UGC concepts"]
    : ["Analyze my product", "Find ad angles", "Write hooks"], [projectId]);

  async function send(valueOverride?: string) {
    const value = (valueOverride ?? input).trim();
    if (!value || isGenerating) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: value }]);
    setIsGenerating(true);
    try {
      const result = await sendAdBrainMessage({ message: value, conversationId, projectId });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { id: result.messageId, role: "assistant", text: result.answer }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "AdBrain request failed";
      setMessages((current) => [...current, { role: "assistant", text: "Error: " + message }]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 54 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.push("/projects")} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="folder-outline" size={23} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>AdBrain</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{projectId ? "Project Intelligence Chat" : "AdBrain One · Cloud AI"}</Text>
        </View>
        <Pressable onPress={() => router.push("/settings")} style={{ padding: 8, marginRight: -8 }}>
          <Ionicons name="settings-outline" size={23} color={colors.text} />
        </Pressable>
      </View>

      {!ADBRAIN_API_URL ? (
        <View style={{ marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Cloud backend pending</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
        {messages.length === 0 ? (
          <View style={{ marginTop: 50 }}>
            <Text style={{ fontSize: 29, fontWeight: "800", color: colors.text, lineHeight: 37 }}>{projectId ? "Project se poochho." : "Apna product batao."}</Text>
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 10, lineHeight: 24 }}>
              {session?.user?.name ? "Hi " + session.user.name + ". " : ""}
              {projectId ? "AdBrain saved research aur structured insights ko context me use karega." : "Product project banao, sources add karo aur phir evidence-backed strategy lo."}
            </Text>
            <View style={{ gap: 10, marginTop: 25 }}>
              {quick.map((item) => (
                <Pressable key={item} onPress={() => void send(item)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.card }}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : messages.map((message, index) => (
          <View key={message.id ?? index} style={{ alignSelf: message.role === "user" ? "flex-end" : "stretch", backgroundColor: message.role === "user" ? colors.userBubble : colors.card, borderRadius: 18, padding: 14, marginBottom: 12, maxWidth: message.role === "user" ? "84%" : "100%", borderWidth: message.role === "assistant" ? 1 : 0, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{message.text}</Text>
            {message.role === "assistant" && message.id ? (
              <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                <Pressable onPress={() => void recordCloudFeedback(message.id!, "like")}><Ionicons name="thumbs-up-outline" size={18} color={colors.muted} /></Pressable>
                <Pressable onPress={() => void recordCloudFeedback(message.id!, "save")}><Ionicons name="bookmark-outline" size={18} color={colors.muted} /></Pressable>
                <Pressable onPress={() => void recordCloudFeedback(message.id!, "dislike")}><Ionicons name="thumbs-down-outline" size={18} color={colors.muted} /></Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {isGenerating ? (
          <View style={{ alignSelf: "stretch", backgroundColor: colors.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.muted }}>AdBrain research context analyze kar raha hai...</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: 20, flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Message AdBrain..." placeholderTextColor={colors.muted} multiline style={{ flex: 1, maxHeight: 120, color: colors.text, fontSize: 16, paddingVertical: 9, paddingHorizontal: 8 }} />
        <Pressable disabled={isGenerating || !ADBRAIN_API_URL} onPress={() => void send()} style={{ opacity: isGenerating || !ADBRAIN_API_URL ? 0.35 : 1, backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-up" size={20} color={colors.background} />
        </Pressable>
      </View>
    </View>
  );
}
