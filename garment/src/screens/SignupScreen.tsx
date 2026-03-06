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
    if (!form.fullName.trim())               e.fullName       = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email          = 'Enter a valid email';
    if (!/^[0-9]{10}$/.test(form.phone))    e.phone          = 'Enter 10-digit phone';
    if (!form.customerType)                 e.customerType   = 'Select customer type';
    if (!form.deliveryAddress.trim())       e.deliveryAddress = 'Required';
    if (form.password.length < 6)           e.password       = 'Min 6 characters';
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
        deliveryAddress: form.deliveryAddress, gstNo: form.gstNo,
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
            <Text style={s.tagline}>Create your account</Text>
          </View>

          <View style={s.card}>

            <F label="Full Name *" error={errors.fullName}>
              <TextInput style={s.input} value={form.fullName} onChangeText={set('fullName')}
                placeholder="Enter full name" placeholderTextColor="#9CA3AF" />
            </F>

            <F label="Email *" error={errors.email}>
              <TextInput style={s.input} value={form.email} onChangeText={set('email')}
                placeholder="Enter email" placeholderTextColor="#9CA3AF"
                keyboardType="email-address" autoCapitalize="none" />
            </F>

            <F label="Phone *" error={errors.phone}>
              <Text style={s.prefix}>+91</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={set('phone')}
                placeholder="10-digit number" placeholderTextColor="#9CA3AF"
                keyboardType="number-pad" maxLength={10} />
            </F>

            {/* Customer type picker */}
            <Text style={s.label}>Customer Type *</Text>
            <TouchableOpacity
              style={[s.row, errors.customerType ? s.rowErr : null, { justifyContent: 'space-between', paddingVertical: 13 }]}
              onPress={() => setTypeModal(true)}
            >
              <Text style={{ fontSize: 14, color: form.customerType ? '#111827' : '#9CA3AF' }}>
                {form.customerType || 'Select customer type'}
              </Text>
              <Text style={{ color: '#9CA3AF' }}>▼</Text>
            </TouchableOpacity>
            {errors.customerType ? <Text style={s.err}>{errors.customerType}</Text> : null}

            {/* Type bottom sheet */}
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
              <TextInput style={[s.input, { paddingTop: 8 }]} value={form.deliveryAddress}
                onChangeText={set('deliveryAddress')} placeholder="Full delivery address"
                placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </F>

            <F label="GST No (Optional)">
              <TextInput style={s.input} value={form.gstNo} onChangeText={set('gstNo')}
                placeholder="GST number" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
            </F>

            <F label="Broker Name (Optional)">
              <TextInput style={s.input} value={form.brokerName} onChangeText={set('brokerName')}
                placeholder="Broker name" placeholderTextColor="#9CA3AF" />
            </F>

            <F label="Broker Phone (Optional)">
              <Text style={s.prefix}>+91</Text>
              <TextInput style={s.input} value={form.brokerPhone} onChangeText={set('brokerPhone')}
                placeholder="10-digit number" placeholderTextColor="#9CA3AF"
                keyboardType="number-pad" maxLength={10} />
            </F>

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

            <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ marginTop: 22 }}>
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

// Field wrapper component
const F = ({ label, error, children, multiline }: any) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <View style={[s.row, multiline && { height: 80, alignItems: 'flex-start' }, error && s.rowErr]}>
      {children}
    </View>
    {error ? <Text style={s.err}>{error}</Text> : null}
  </View>
);

const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 40 },
  hero: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 46, marginBottom: 10 },
  brand: { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#f9fafb',
  },
  rowErr: { borderColor: '#ef4444' },
  prefix: { color: '#374151', fontWeight: '600', marginRight: 8, fontSize: 13 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  toggle: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  err: { color: '#ef4444', fontSize: 11, marginTop: 3, fontWeight: '500' },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  footerLink: { color: '#fff', fontWeight: '800', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionTxt: { fontSize: 15, color: '#374151' },
  optionActive: { color: '#2563eb', fontWeight: '700' },
  cancel: { textAlign: 'center', marginTop: 16, color: '#dc2626', fontWeight: '700', fontSize: 14 },
});