import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProjectsScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 54, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>Projects</Text>
      </View>

      <View style={{ marginTop: 44, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 22, borderRadius: 20 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>No projects yet</Text>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 21 }}>
          Jab tum product analysis save karoge, uski chats, reviews, angles aur performance memory yahan organize hogi.
        </Text>
      </View>
    </View>
  );
}
