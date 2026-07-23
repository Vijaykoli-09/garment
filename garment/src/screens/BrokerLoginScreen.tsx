/**
 * BrokerLoginScreen.tsx
 *
 * Phone-only lookup against your `agents` table (Agent entity).
 *   GET /api/agent/check-phone/{contactNo}
 *
 * On match: BrokerContext.loginBroker() persists the session to
 * AsyncStorage (via BrokerSessionStorage) AND updates in-memory state,
 * so BrokerDashboard (and any future broker screen) can read `broker`
 * straight from context — same pattern as AppContext.login() for customers.
 *
 * Register in your Auth navigator:
 *   <Stack.Screen name="BrokerLogin" component={BrokerLoginScreen} />
 */

import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { agentApi } from '../api/api';
import { BrokerContext } from '../context/BrokerContext';

export default function BrokerLoginScreen({ navigation }: any) {
  const { loginBroker } = useContext(BrokerContext);

  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Enter a valid 10-digit phone number');
      return false;
    }
    setError('');
    return true;
  };

  const handleCheck = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await agentApi.checkPhone(phone);
      const data = res.data;

      if (data?.exists && data?.agent) {
        await loginBroker(data.agent);
        // reset (not navigate) so "back" can't return to the login screen
        navigation.reset({ index: 0, routes: [{ name: 'BrokerDashboard' }] });
      } else {
        setError('No broker found with this phone number.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      setError(msg ?? 'Something went wrong. Please check your connection and try again.');
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

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.circle}>
              <Text style={s.emoji}>🤝</Text>
            </View>
            <Text style={s.brand}>Broker Login</Text>
            <Text style={s.tagline}>Enter your registered phone number</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.label}>Phone Number</Text>
            <View style={[s.row, error ? s.rowErr : null]}>
              <Text style={s.prefix}>🇮🇳 +91</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={t => { setPhone(t); setError(''); }}
                placeholder="10-digit number"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                onSubmitEditing={handleCheck}
                autoFocus
              />
            </View>
            {error ? <Text style={s.err}>{error}</Text> : null}

            <TouchableOpacity onPress={handleCheck} disabled={loading} style={{ marginTop: 22 }}>
              <LinearGradient colors={['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Continue →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.hint}>
              Not registered as a broker yet? Contact admin to get added.
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
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#f9fafb',
  },
  rowErr: { borderColor: '#ef4444' },
  prefix: { fontSize: 13, color: '#374151', fontWeight: '600', marginRight: 8 },
  input:  { flex: 1, paddingVertical: 13, fontSize: 14, color: '#111827' },
  err:    { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '500' },

  btn:    { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  hint: {
    fontSize: 11, color: '#9ca3af', textAlign: 'center',
    marginTop: 16, lineHeight: 16,
  },
});