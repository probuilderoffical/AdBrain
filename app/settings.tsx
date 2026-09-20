import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePreferences } from '@/store/preferences';
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
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const memory = usePreferences((state) => state.memory);
  const improve = usePreferences((state) => state.improve);
  const chatHistory = usePreferences((state) => state.chatHistory);
  const set = usePreferences((state) => state.set);

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
        <ToggleRow label="Memory" value={memory} onValueChange={(value) => set('memory', value)} note="Preferences, brands aur project context yaad rakho." />
        <ToggleRow label="Improve AdBrain" value={improve} onValueChange={(value) => set('improve', value)} note="Likes, dislikes, saves aur edits se is device par ranking improve karo." />
        <ToggleRow label="Chat History" value={chatHistory} onValueChange={(value) => set('chatHistory', value)} note="Chats ko local device par save karo." />
      </Section>

      <Section title="Appearance">
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Theme</Text>
        <Text style={{ color: colors.muted, marginTop: 5 }}>Light (default) · Dark aur System planned</Text>
      </Section>

      <Section title="Data & Privacy">
        <Text style={{ color: colors.text, lineHeight: 27 }}>Processed on device{'
'}Export data{'
'}Clear local data{'
'}Model storage</Text>
      </Section>

      <Section title="Security">
        <Text style={{ color: colors.text, lineHeight: 27 }}>App lock{'
'}PIN / Biometrics</Text>
      </Section>

      <Section title="About">
        <Text style={{ color: colors.muted, lineHeight: 22 }}>AdBrain v0.1{'
'}AdBrain One · AB-1</Text>
      </Section>
    </ScrollView>
  );
}
