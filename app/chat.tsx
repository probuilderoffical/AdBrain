import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { analyzeMessage } from '@/brain/analyzeMessage';

export default function ChatScreen() {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const quick = useMemo(() => ['Analyze product', 'Find ad angles', 'Write hooks'], []);

  const send = () => {
    const value = input.trim();
    if (!value) return;
    const reply = analyzeMessage(value);
    setMessages((current) => [
      ...current,
      { role: 'user', text: value },
      { role: 'assistant', text: reply },
    ]);
    setInput('');
  };

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
              key={index}
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
                  <Ionicons name="thumbs-up-outline" size={18} color={colors.muted} />
                  <Ionicons name="thumbs-down-outline" size={18} color={colors.muted} />
                  <Ionicons name="bookmark-outline" size={18} color={colors.muted} />
                  <Ionicons name="copy-outline" size={18} color={colors.muted} />
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
        <Pressable onPress={send} style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
