import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { ADBRAIN_API_URL, sendAdBrainMessage } from "@/api/adbrain";
import { authClient } from "@/auth/client";

type ChatMessage = { id?: string; role: "user" | "assistant"; text: string };

export default function ChatScreen() {
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const quick = useMemo(() => ["Analyze my product", "Find ad angles", "Write hooks"], []);

  async function send() {
    const value = input.trim();
    if (!value || isGenerating) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: value }]);
    setIsGenerating(true);
    try {
      const result = await sendAdBrainMessage({ message: value, conversationId });
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>AdBrain</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>AdBrain One · Cloud AI</Text>
        </View>
        <Pressable onPress={() => router.push("/settings")} style={{ padding: 8, marginRight: -8 }}>
          <Ionicons name="settings-outline" size={23} color={colors.text} />
        </Pressable>
      </View>

      {!ADBRAIN_API_URL ? (
        <View style={{ marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Cloud backend pending</Text>
          <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>Cloudflare Worker deploy hone ke baad API URL yahan connect hogi.</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
        {messages.length === 0 ? (
          <View style={{ marginTop: 56 }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text, lineHeight: 38 }}>Apna product batao.</Text>
            <Text style={{ color: colors.muted, fontSize: 17, marginTop: 10, lineHeight: 25 }}>
              {session?.user?.name ? "Hi " + session.user.name + ". " : ""}Reviews paste karo ya product explain karo. AdBrain real cloud model se response generate karega.
            </Text>
            <View style={{ gap: 10, marginTop: 28 }}>
              {quick.map((item) => (
                <Pressable key={item} onPress={() => setInput(item)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: colors.card }}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : messages.map((message, index) => (
          <View key={message.id ?? index} style={{ alignSelf: message.role === "user" ? "flex-end" : "stretch", backgroundColor: message.role === "user" ? colors.userBubble : colors.card, borderRadius: 18, padding: 14, marginBottom: 12, maxWidth: message.role === "user" ? "84%" : "100%", borderWidth: message.role === "assistant" ? 1 : 0, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{message.text}</Text>
          </View>
        ))}
        {isGenerating ? (
          <View style={{ alignSelf: "stretch", backgroundColor: colors.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.muted }}>AdBrain One soch raha hai...</Text>
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