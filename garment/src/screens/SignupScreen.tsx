import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { authApi } from '../api/api';

const TYPES = ['Wholesaler', 'Semi-Wholesaler', 'Retailer'];

export default function SignupScreen({ navigation }: any) {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', customerType: '',
    deliveryAddress: '', gstNo: '', brokerName: '', brokerPhone: '',
    password: '', confirmPassword: '',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [typeModal, setTypeModal]     = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);

  const set = (key: string) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())                e.fullName        = 'Full name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email))  e.email           = 'Enter a valid email';
    if (!/^[0-9]{10}$/.test(form.phone))     e.phone           = 'Enter a valid 10-digit phone';
    if (!form.customerType)                   e.customerType    = 'Select customer type';
    if (!form.deliveryAddress.trim())         e.deliveryAddress = 'Delivery address is required';

    // GST — MANDATORY with format check
    if (!form.gstNo.trim()) {
      e.gstNo = 'GST number is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNo.toUpperCase())) {
      e.gstNo = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    }

    if (form.brokerPhone && !/^[0-9]{10}$/.test(form.brokerPhone))
      e.brokerPhone = 'Enter a valid 10-digit phone';
    if (form.password.length < 6)             e.password        = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.signup({
        fullName: form.fullName, email: form.email, phone: form.phone,
        password: form.password, customerType: form.customerType,
        deliveryAddress: form.deliveryAddress,
        gstNo: form.gstNo.toUpperCase(),
        brokerName: form.brokerName, brokerPhone: form.brokerPhone,
      });
      Alert.alert(
        '✅ Registration Submitted',
        'Your account is under review.\nPlease try logging in after 30 minutes.',
        [{ text: 'Go to Login', onPress: () => navigation.replace('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Signup Failed', err?.response?.data?.error ?? 'Something went wrong.');
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

          <View style={s.hero}>
            <Text style={s.emoji}>👕</Text>
            <Text style={s.brand}>Shriuday Garments</Text>
            <Text style={s.tagline}>Create your B2B account</Text>
          </View>

          <View style={s.card}>

            {/* ── Required notice ── */}
            <Text style={s.requiredNote}><Text style={s.star}>*</Text> All fields marked are required</Text>

            <F label="Full Name *" error={errors.fullName}>
              <TextInput style={s.input} value={form.fullName} onChangeText={set('fullName')}
                placeholder="Enter full name" placeholderTextColor="#9CA3AF" />
            </F>

            <F label="Email *" error={errors.email}>
              <TextInput style={s.input} value={form.email} onChangeText={set('email')}
                placeholder="name@example.com" placeholderTextColor="#9CA3AF"
                keyboardType="email-address" autoCapitalize="none" />
            </F>

            <F label="Phone *" error={errors.phone}>
              <Text style={s.prefix}>+91</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={set('phone')}
                placeholder="10-digit number" placeholderTextColor="#9CA3AF"
                keyboardType="number-pad" maxLength={10} />
            </F>

            {/* ── Customer Type ── */}
            <Text style={s.label}>Customer Type <Text style={s.star}>*</Text></Text>
            <TouchableOpacity
              style={[s.row, { justifyContent: 'space-between', paddingVertical: 13 }, errors.customerType ? s.rowErr : null]}
              onPress={() => setTypeModal(true)}
            >
              <Text style={{ fontSize: 14, color: form.customerType ? '#111827' : '#9CA3AF' }}>
                {form.customerType || 'Select customer type'}
              </Text>
              <Text style={{ color: '#9CA3AF' }}>▼</Text>
            </TouchableOpacity>
            {errors.customerType ? <Text style={s.err}>{errors.customerType}</Text> : null}

            <Modal visible={typeModal} transparent animationType="slide">
              <View style={s.overlay}>
                <View style={s.sheet}>
                  <Text style={s.sheetTitle}>Select Customer Type</Text>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t} style={s.option}
                      onPress={() => { set('customerType')(t); setTypeModal(false); }}>
                      <Text style={[s.optionTxt, form.customerType === t && s.optionActive]}>{t}</Text>
                      {form.customerType === t && <Text style={{ color: '#2563eb' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setTypeModal(false)}>
                    <Text style={s.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <F label="Delivery Address *" error={errors.deliveryAddress} multiline>
              <TextInput style={[s.input, { paddingTop: 10 }]} value={form.deliveryAddress}
                onChangeText={set('deliveryAddress')} placeholder="Full delivery address"
                placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </F>

            {/* ── GST — MANDATORY ── */}
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

            {/* ── Optional section ── */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>Referral Info (Optional)</Text>
              <View style={s.dividerLine} />
            </View>

            <F label="Referral Name">
              <TextInput style={s.input} value={form.brokerName} onChangeText={set('brokerName')}
                placeholder="Referral name" placeholderTextColor="#9CA3AF" />
            </F>

            <F label="Referral Phone" error={errors.brokerPhone}>
              <Text style={s.prefix}>+91</Text>
              <TextInput style={s.input} value={form.brokerPhone} onChangeText={set('brokerPhone')}
                placeholder="10-digit number" placeholderTextColor="#9CA3AF"
                keyboardType="number-pad" maxLength={10} />
            </F>

            {/* ── Password ── */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>Security</Text>
              <View style={s.dividerLine} />
            </View>

            <F label="Password *" error={errors.password}>
              <TextInput style={s.input} value={form.password} onChangeText={set('password')}
                placeholder="Min 6 characters" placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPass} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={s.toggle}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </F>

            <F label="Confirm Password *" error={errors.confirmPassword}>
              <TextInput style={s.input} value={form.confirmPassword}
                onChangeText={set('confirmPassword')} placeholder="Re-enter password"
                placeholderTextColor="#9CA3AF" secureTextEntry={!showConfirm} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={s.toggle}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </F>

            <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ marginTop: 24 }}>
              <LinearGradient colors={['#10b981', '#059669']} style={s.btn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Create Account →</Text>}
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

const F = ({ label, error, children, multiline }: any) => (
  <View>
    <Text style={s.label}>{label}</Text>
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
  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 4, gap: 10 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerTxt:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  btn:          { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt:       { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 12 },
  footerTxt:    { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  footerLink:   { color: '#fff', fontWeight: '800', fontSize: 13 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  option:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionTxt:    { fontSize: 15, color: '#374151' },
  optionActive: { color: '#2563EB', fontWeight: '700' },
  cancel:       { textAlign: 'center', marginTop: 16, color: '#DC2626', fontWeight: '700', fontSize: 14 },
});