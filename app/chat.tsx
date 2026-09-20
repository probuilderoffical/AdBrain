import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { analyzeMessage } from '@/brain/analyzeMessage';
import { addMessage, createChat, getLatestChat, getMessages } from '@/db/chatRepo';
import { recordFeedback } from '@/db/learningRepo';
import { usePreferences } from '@/store/preferences';

type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatScreen() {
  const { colors } = useTheme();
  const chatHistory = usePreferences((state) => state.chatHistory);
  const improve = usePreferences((state) => state.improve);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatIdRef = useRef<number | null>(null);
  const quick = useMemo(() => ['Analyze product', 'Find ad angles', 'Write hooks'], []);

  useEffect(() => {
    if (!chatHistory) return;
    void (async () => {
      const latest = await getLatestChat();
      if (!latest) return;
      chatIdRef.current = latest.id;
      const rows = await getMessages(latest.id);
      setMessages(rows.map((row) => ({ id: row.id, role: row.role, text: row.content })));
    })();
  }, [chatHistory]);

  async function persist(role: 'user' | 'assistant', text: string) {
    if (!chatHistory) return undefined;
    if (!chatIdRef.current) {
      chatIdRef.current = await createChat(text.slice(0, 48) || 'New chat');
    }
    await addMessage(chatIdRef.current, role, text);
    const rows = await getMessages(chatIdRef.current);
    return rows.at(-1)?.id;
  }

  const send = async () => {
    const value = input.trim();
    if (!value) return;

    setInput('');
    setMessages((current) => [...current, { role: 'user', text: value }]);
    await persist('user', value);

    const reply = analyzeMessage(value);
    const assistantId = await persist('assistant', reply);
    setMessages((current) => [...current, { id: assistantId, role: 'assistant', text: reply }]);
  };

  async function feedback(signal: 'like' | 'dislike' | 'save' | 'copy', messageId?: number) {
    if (!improve) return;
    await recordFeedback(signal, messageId);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 54 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push('/projects')} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="folder-outline" size={23} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>AdBrain</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>AdBrain One</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={{ padding: 8, marginRight: -8 }}>
          <Ionicons name="settings-outline" size={23} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
        {messages.length === 0 ? (
          <View style={{ marginTop: 76 }}>
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text, lineHeight: 38 }}>
              Apna product batao.
            </Text>
            <Text style={{ color: colors.muted, fontSize: 17, marginTop: 10, lineHeight: 25 }}>
              Reviews paste karo ya product explain karo. AdBrain customer pains, angles aur hooks organize karega.
            </Text>

            <View style={{ gap: 10, marginTop: 28 }}>
              {quick.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setInput(item)}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: colors.card }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((message, index) => (
            <View
              key={message.id ?? index}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'stretch',
                backgroundColor: message.role === 'user' ? colors.userBubble : colors.card,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                maxWidth: message.role === 'user' ? '84%' : '100%',
                borderWidth: message.role === 'assistant' ? 1 : 0,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{message.text}</Text>
              {message.role === 'assistant' ? (
                <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
                  <Pressable onPress={() => void feedback('like', message.id)}><Ionicons name="thumbs-up-outline" size={18} color={colors.muted} /></Pressable>
                  <Pressable onPress={() => void feedback('dislike', message.id)}><Ionicons name="thumbs-down-outline" size={18} color={colors.muted} /></Pressable>
                  <Pressable onPress={() => void feedback('save', message.id)}><Ionicons name="bookmark-outline" size={18} color={colors.muted} /></Pressable>
                  <Pressable onPress={() => void feedback('copy', message.id)}><Ionicons name="copy-outline" size={18} color={colors.muted} /></Pressable>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
        <Pressable style={{ padding: 8 }}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message AdBrain..."
          placeholderTextColor={colors.muted}
          multiline
          style={{ flex: 1, maxHeight: 120, color: colors.text, fontSize: 16, paddingVertical: 9 }}
        />
        <Pressable onPress={() => void send()} style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-up" size={20} color={colors.background} />
        </Pressable>
      </View>
    </View>
  );
}
