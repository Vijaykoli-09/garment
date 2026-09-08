/**
 * BrokerPinSetupScreen.tsx
 *
 * Reached only from BrokerLoginScreen after check-phone confirms the
 * broker exists but has no PIN set yet. Broker sets a 4-digit PIN,
 * confirms it, and we hand the token to BrokerContext — same pattern
 * as party set-password.
 *
 * Register in your Auth navigator:
 *   <Stack.Screen name="BrokerPinSetup" component={BrokerPinSetupScreen} />
 */

import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { agentApi } from '../api/api';
import { BrokerContext } from '../context/BrokerContext';

export default function BrokerPinSetupScreen({ navigation, route }: any) {
  const { phone } = route.params as { phone: string };
  const { loginBroker } = useContext(BrokerContext);

  const [pin, setPin]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^[0-9]{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirm) {
      setError('PINs do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await agentApi.setPin(phone, pin);
      const { token, agent } = res.data;
      await loginBroker(agent, token);
      // reset (not navigate) so "back" can't return to setup/login screens
      navigation.reset({ index: 0, routes: [{ name: 'BrokerDashboard' }] });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg  = err?.response?.data?.error;
      if (code === 'PIN_ALREADY_SET') {
        setError('A PIN is already set for this number. Go back and use PIN login instead.');
      } else {
        setError(msg ?? 'Something went wrong. Please check your connection and try again.');
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
              <Text style={s.emoji}>🔐</Text>
            </View>
            <Text style={s.brand}>Set Up Your PIN</Text>
            <Text style={s.tagline}>First time here — create a 4-digit PIN for +91 {phone}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.label}>New PIN</Text>
            <TextInput
              style={s.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={t => { setPin(t.replace(/[^0-9]/g, '')); setError(''); }}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={s.label}>Confirm PIN</Text>
            <TextInput
              style={s.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={confirm}
              onChangeText={t => { setConfirm(t.replace(/[^0-9]/g, '')); setError(''); }}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />

            {error ? <Text style={s.err}>{error}</Text> : null}

            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ marginTop: 22 }}>
              <LinearGradient colors={['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Set PIN & Continue →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.hint}>
              Remember this PIN — you'll need it to log in each time. If you forget it, contact admin to reset it.
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
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },

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