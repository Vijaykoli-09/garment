import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../context/AppContext';
import { authApi } from '../api/api';

export default function LoginScreen({ navigation }: any) {
  const { login } = useContext(AppContext);
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[0-9]{10}$/.test(phone)) e.phone = 'Enter a valid 10-digit phone number';
    if (password.length < 6)        e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      const d = res.data;
      await login({
        id: d.id, name: d.name, phone: d.phone, email: d.email,
        type: d.type, token: d.token,
        creditEnabled: d.creditEnabled, creditLimit: d.creditLimit,
        advanceOption: d.advanceOption, accountApproved: true,
      });
      navigation.replace('Dashboard');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg  = err?.response?.data?.error;
      if (code === 'ACCOUNT_PENDING') {
        Alert.alert('⏳ Account Pending', 'Your account is under review.\nPlease try again after 30 minutes.');
      } else if (code === 'ACCOUNT_REJECTED') {
        Alert.alert('❌ Account Rejected', 'Your account was rejected. Please contact support.');
      } else {
        Alert.alert('Login Failed', msg ?? 'Invalid phone number or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1e3a8a', '#2563eb', '#1e40af']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.hero}>
            <View style={s.circle}>
              <Text style={s.emoji}>👕</Text>
            </View>
            <Text style={s.brand}>Shriuday Garments</Text>
            <Text style={s.tagline}>Welcome back</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Login to your account</Text>

            {/* Phone */}
            <Text style={s.label}>Phone Number</Text>
            <View style={[s.row, errors.phone ? s.rowErr : null]}>
              <Text style={s.prefix}>🇮🇳 +91</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }}
                placeholder="10-digit number"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />
            </View>
            {errors.phone ? <Text style={s.err}>{errors.phone}</Text> : null}

            {/* Password */}
            <Text style={s.label}>Password</Text>
            <View style={[s.row, errors.password ? s.rowErr : null]}>
              <Text style={s.icon}>🔒</Text>
              <TextInput
                style={s.input}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={s.toggle}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.err}>{errors.password}</Text> : null}

            {/* Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} style={{ marginTop: 22 }}>
              <LinearGradient colors={['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Login →</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerTxt}>Don't have an account?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={s.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hero: { alignItems: 'center', marginBottom: 32 },
  circle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 14,
  },
  emoji: { fontSize: 42 },
  brand: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#f9fafb',
  },
  rowErr: { borderColor: '#ef4444' },
  prefix: { fontSize: 13, color: '#374151', fontWeight: '600', marginRight: 8 },
  icon: { fontSize: 15, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#111827' },
  toggle: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  err: { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '500' },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  footerLink: { color: '#fff', fontWeight: '800', fontSize: 14 },
});