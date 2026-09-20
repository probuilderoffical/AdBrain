import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemeMode, usePreferences } from '@/store/preferences';
import { useTheme } from '@/theme/ThemeProvider';

function ToggleRow({ label, note, value, onValueChange }: { label: string; note: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{note}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const memory = usePreferences((state) => state.memory);
  const improve = usePreferences((state) => state.improve);
  const chatHistory = usePreferences((state) => state.chatHistory);
  const themeMode = usePreferences((state) => state.themeMode);
  const setBool = usePreferences((state) => state.setBool);
  const setThemeMode = usePreferences((state) => state.setThemeMode);

  const themes: ThemeMode[] = ['light', 'dark', 'system'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 54, paddingBottom: 60 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>Settings</Text>
      </View>

      <Section title="AdBrain One">
        <Text style={{ color: colors.muted, lineHeight: 20 }}>Model mode: Automatic · Local-first</Text>
      </Section>

      <Section title="Personalization">
        <ToggleRow label="Memory" value={memory} onValueChange={(value) => setBool('memory', value)} note="Preferences, brands aur project context yaad rakho." />
        <ToggleRow label="Improve AdBrain" value={improve} onValueChange={(value) => setBool('improve', value)} note="Likes, dislikes, saves aur edits se is device par ranking improve karo." />
        <ToggleRow label="Chat History" value={chatHistory} onValueChange={(value) => setBool('chatHistory', value)} note="Chats ko local device par save karo." />
      </Section>

      <Section title="Appearance">
        <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap' }}>
          {themes.map((mode) => {
            const selected = themeMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: selected ? colors.background : colors.text, textTransform: 'capitalize', fontWeight: '600' }}>{mode}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.muted, marginTop: 10 }}>Default Light hai.</Text>
      </Section>

      <Section title="Data & Privacy">
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text }}>Processed on device</Text>
          <Text style={{ color: colors.text }}>Export data</Text>
          <Text style={{ color: colors.text }}>Clear local data</Text>
          <Text style={{ color: colors.text }}>Model storage</Text>
        </View>
      </Section>

      <Section title="Security">
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text }}>App lock</Text>
          <Text style={{ color: colors.text }}>PIN / Biometrics</Text>
        </View>
      </Section>

      <Section title="About">
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.muted }}>AdBrain v0.1</Text>
          <Text style={{ color: colors.muted }}>AdBrain One · AB-1</Text>
        </View>
      </Section>
    </ScrollView>
  );
}
