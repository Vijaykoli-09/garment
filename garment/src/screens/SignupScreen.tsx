import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { authApi } from '../api/api';

export default function SignupScreen({ navigation }: any) {
  const [form, setForm] = useState({
    fullName:        '',
    email:           '',   // optional
    phone:           '',
    deliveryAddress: '',
    gstNo:           '',
    brokerName:      '',
    brokerPhone:     '',
    password:        '',
    confirmPassword: '',
  });

  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);

  const set = (key: string) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.fullName.trim())
      e.fullName = 'Full name is required';

    // Email is optional — only validate format if provided
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email))
      e.email = 'Enter a valid email address';

    if (!/^[0-9]{10}$/.test(form.phone))
      e.phone = 'Enter a valid 10-digit phone number';

    if (!form.deliveryAddress.trim())
      e.deliveryAddress = 'Delivery address is required';

    // GST — mandatory
    if (!form.gstNo.trim()) {
      e.gstNo = 'GST number is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNo.toUpperCase())) {
      e.gstNo = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    }

    if (form.brokerPhone && !/^[0-9]{10}$/.test(form.brokerPhone))
      e.brokerPhone = 'Enter a valid 10-digit phone number';

    if (form.password.length < 6)
      e.password = 'Minimum 6 characters';

    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.signup({
        fullName:        form.fullName.trim(),
        email:           form.email.trim() || '',
        phone:           form.phone.trim(),
        password:        form.password,
        // customerType not sent — admin sets it during approval
        deliveryAddress: form.deliveryAddress.trim(),
        gstNo:           form.gstNo.toUpperCase().trim(),
        brokerName:      form.brokerName.trim(),
        brokerPhone:     form.brokerPhone.trim(),
      });
      Alert.alert(
        '✅ Registration Submitted',
        'Your account is under review.\nAdmin will contact you to confirm your account type.\nPlease try logging in after approval.',
        [{ text: 'Go to Login', onPress: () => navigation.replace('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Signup Failed', err?.response?.data?.error ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e3a8a', '#2563eb', '#1e40af']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.bg}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.emoji}>👕</Text>
            <Text style={s.brand}>Shriuday Garments</Text>
            <Text style={s.tagline}>Create your B2B account</Text>
          </View>

          <View style={s.card}>

            <Text style={s.requiredNote}><Text style={s.star}>*</Text> Required fields</Text>

            {/* ── Full Name ── */}
            <F label="Full Name *" error={errors.fullName}>
              <TextInput
                style={s.input}
                value={form.fullName}
                onChangeText={set('fullName')}
                placeholder="Enter full name"
                placeholderTextColor="#9CA3AF"
              />
            </F>

            {/* ── Phone ── */}
            <F label="Phone *" error={errors.phone}>
              <Text style={s.prefix}>+91</Text>
              <TextInput
                style={s.input}
                value={form.phone}
                onChangeText={set('phone')}
                placeholder="10-digit number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={10}
              />
            </F>

            {/* ── Email (optional) ── */}
            <F label="Email (Optional)" error={errors.email}>
              <TextInput
                style={s.input}
                value={form.email}
                onChangeText={set('email')}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </F>

            {/* ── Delivery Address ── */}
            <F label="Delivery Address *" error={errors.deliveryAddress} multiline>
              <TextInput
                style={[s.input, { paddingTop: 10 }]}
                value={form.deliveryAddress}
                onChangeText={set('deliveryAddress')}
                placeholder="Full delivery address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </F>

            {/* ── GST Number ── */}
            <Text style={s.label}>GST Number <Text style={s.star}>*</Text></Text>
            <View style={[s.row, errors.gstNo ? s.rowErr : s.rowHighlight]}>
              <Text style={s.gstIcon}>🧾</Text>
              <TextInput
                style={s.input}
                value={form.gstNo}
                onChangeText={v => set('gstNo')(v.toUpperCase())}
                placeholder="e.g. 22AAAAA0000A1Z5"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={15}
              />
              {form.gstNo.length === 15 && !errors.gstNo && (
                <Text style={{ color: '#10b981', fontSize: 16 }}>✓</Text>
              )}
            </View>
            {errors.gstNo
              ? <Text style={s.err}>{errors.gstNo}</Text>
              : <Text style={s.hint}>15-character GST Identification Number (GSTIN)</Text>
            }

            

            {/* ── Referral (optional) ── */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>Referral Info (Optional)</Text>
              <View style={s.dividerLine} />
            </View>

            <F label="Referral Name">
              <TextInput
                style={s.input}
                value={form.brokerName}
                onChangeText={set('brokerName')}
                placeholder="Referral name"
                placeholderTextColor="#9CA3AF"
              />
            </F>

            <F label="Referral Phone" error={errors.brokerPhone}>
              <Text style={s.prefix}>+91</Text>
              <TextInput
                style={s.input}
                value={form.brokerPhone}
                onChangeText={set('brokerPhone')}
                placeholder="10-digit number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={10}
              />
            </F>

            {/* ── Password ── */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>Security</Text>
              <View style={s.dividerLine} />
            </View>

            <F label="Password *" error={errors.password}>
              <TextInput
                style={s.input}
                value={form.password}
                onChangeText={set('password')}
                placeholder="Min 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={s.toggle}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </F>

            <F label="Confirm Password *" error={errors.confirmPassword}>
              <TextInput
                style={s.input}
                value={form.confirmPassword}
                onChangeText={set('confirmPassword')}
                placeholder="Re-enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={s.toggle}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </F>

            <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ marginTop: 24 }}>
              <LinearGradient colors={['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Create Account →</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

          </View>

          <View style={s.footer}>
            <Text style={s.footerTxt}>Already have an account?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
const F = ({ label, error, children, multiline }: any) => (
  <View>
    {label ? <Text style={s.label}>{label}</Text> : null}
    <View style={[s.row, multiline && { height: 82, alignItems: 'flex-start' }, error && s.rowErr]}>
      {children}
    </View>
    {error ? <Text style={s.err}>{error}</Text> : null}
  </View>
);

const s = StyleSheet.create({
  bg:           { flex: 1 },
  scroll:       { flexGrow: 1, padding: 20, paddingTop: 44 },
  hero:         { alignItems: 'center', marginBottom: 24 },
  emoji:        { fontSize: 48, marginBottom: 10 },
  brand:        { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline:      { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  requiredNote: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  star:         { color: '#EF4444', fontWeight: '700' },
  label:        { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#F9FAFB' },
  rowErr:       { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  rowHighlight: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  prefix:       { color: '#374151', fontWeight: '600', marginRight: 8, fontSize: 13 },
  input:        { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  toggle:       { color: '#2563EB', fontWeight: '700', fontSize: 12 },
  err:          { color: '#EF4444', fontSize: 11, marginTop: 3, fontWeight: '500' },
  hint:         { color: '#6B7280', fontSize: 11, marginTop: 3 },
  gstIcon:      { fontSize: 16, marginRight: 8 },
  // Info banner
  infoBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  infoIcon:     { fontSize: 16, marginTop: 1 },
  infoText:     { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },
  // Dividers
  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 4, gap: 10 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerTxt:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Submit
  btn:          { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt:       { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Footer
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 12 },
  footerTxt:    { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  footerLink:   { color: '#fff', fontWeight: '800', fontSize: 13 },
});