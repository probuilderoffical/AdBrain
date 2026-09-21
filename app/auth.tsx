import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { authClient } from '@/auth/client';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPending && session?.user) router.replace('/chat');
  }, [isPending, session?.user]);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Email aur password required hain.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Naam required hai.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = mode === 'signup'
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          })
        : await authClient.signIn.email({
            email: email.trim().toLowerCase(),
            password,
            rememberMe: true,
          });

      if (result.error) {
        setError(result.error.message || 'Authentication failed.');
        return;
      }
      router.replace('/chat');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 80 }}>
      <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800' }}>AdBrain</Text>
      <Text style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>
        {mode === 'signin' ? 'Sign in to AdBrain One' : 'Create your AdBrain account'}
      </Text>

      <View style={{ gap: 12, marginTop: 34 }}>
        {mode === 'signup' ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.muted}
            style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16 }}
          />
        ) : null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16 }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password (8+ characters)"
          placeholderTextColor={colors.muted}
          style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16 }}
        />

        {error ? <Text style={{ color: '#B42318', lineHeight: 20 }}>{error}</Text> : null}

        <Pressable
          disabled={busy}
          onPress={() => void submit()}
          style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator color={colors.background} /> : (
            <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        style={{ paddingVertical: 18, alignSelf: 'center' }}
      >
        <Text style={{ color: colors.text }}>
          {mode === 'signin' ? "New here? Create account" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}
