/**
 * BrokerPinLoginScreen.tsx
 *
 * Reached only from BrokerLoginScreen after check-phone confirms the
 * broker exists AND already has a PIN set. Server enforces attempt
 * limiting / lockout — this screen just surfaces whatever it returns.
 *
 * Register in your Auth navigator:
 *   <Stack.Screen name="BrokerPinLogin" component={BrokerPinLoginScreen} />
 */

import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { agentApi } from '../api/api';
import { BrokerContext } from '../context/BrokerContext';

export default function BrokerPinLoginScreen({ navigation, route }: any) {
  const { phone } = route.params as { phone: string };
  const { loginBroker } = useContext(BrokerContext);

  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [locked, setLocked]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^[0-9]{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await agentApi.verifyPin(phone, pin);
      const { token, agent } = res.data;
      await loginBroker(agent, token);
      // reset (not navigate) so "back" can't return to setup/login screens
      navigation.reset({ index: 0, routes: [{ name: 'BrokerDashboard' }] });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const remaining = err?.response?.data?.attemptsRemaining;
      if (code === 'PIN_LOCKED') {
        setLocked(true);
        setError('Too many wrong attempts. This account is temporarily locked — contact admin to reset your PIN.');
      } else if (code === 'INVALID_PIN') {
        setPin('');
        setError(
          typeof remaining === 'number'
            ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Incorrect PIN. Please try again.'
        );
      } else {
        setError(err?.response?.data?.error ?? 'Something went wrong. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#b45309', '#d97706', '#f59e0b']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.bg}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>

          <View style={s.hero}>
            <View style={s.circle}>
              <Text style={s.emoji}>🔑</Text>
            </View>
            <Text style={s.brand}>Enter Your PIN</Text>
            <Text style={s.tagline}>Welcome back — +91 {phone}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.label}>PIN</Text>
            <TextInput
              style={s.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={!locked}
              value={pin}
              onChangeText={t => { setPin(t.replace(/[^0-9]/g, '')); setError(''); }}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              autoFocus
            />

            {error ? <Text style={s.err}>{error}</Text> : null}

            <TouchableOpacity onPress={handleSubmit} disabled={loading || locked} style={{ marginTop: 22 }}>
              <LinearGradient colors={locked ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>{locked ? 'Locked' : 'Login →'}</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.hint}>
              Forgot your PIN or account locked? Contact admin to reset it.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bg:     { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 8 },
  backTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  hero:    { alignItems: 'center', marginBottom: 32, marginTop: 24 },
  circle:  {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 14,
  },
  emoji:   { fontSize: 42 },
  brand:   { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },

  label: {
    fontSize: 11, fontWeight: '700', color: '#374151',
    marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  pinInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 20,
    letterSpacing: 8, color: '#111827', backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  err: { color: '#ef4444', fontSize: 11, marginTop: 10, fontWeight: '500', textAlign: 'center' },

  btn:    { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  hint: {
    fontSize: 11, color: '#9ca3af', textAlign: 'center',
    marginTop: 16, lineHeight: 16,
  },
});