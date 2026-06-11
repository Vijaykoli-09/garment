/**
 * PartyGstScreen.tsx  (rewritten)
 *
 * Flow:
 *  Step 1 — User enters GST number → POST /api/party/auth/verify-gst
 *    a) 404 GST_NOT_FOUND       → Alert → back to Login
 *    b) 409 ALREADY_REGISTERED  → Alert → go to Login
 *    c) 200 { partyId, partyName, phone } → Step 2
 *
 *  Step 2 — Phone pre-filled from DB but EDITABLE, user sets password
 *    → POST /api/party/auth/set-password  { partyId, phone, password }
 *    → 200 → Alert "Account ready" → navigate to Login
 *
 * Register in your Auth navigator:
 *   <Stack.Screen name="PartyGst" component={PartyGstScreen} />
 *
 * Backend changes required:
 *   PartyAuthController.java  → extract "phone" from request body, pass to service
 *   PartyAuthService.java     → accept phone param, use it instead of party.getMobileNo()
 *   api.ts                    → setPartyPassword body now includes phone: string
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { authApi } from '../api/api';

type Step = 'gst' | 'set_password';

export default function PartyGstScreen({ navigation }: any) {

  // ── Step 1 ────────────────────────────────────────────────────────
  const [gstNo, setGstNo]           = useState('');
  const [gstLoading, setGstLoading] = useState(false);
  const [gstError, setGstError]     = useState('');

  // ── Step 2 ────────────────────────────────────────────────────────
  const [step, setStep]             = useState<Step>('gst');
  const [partyId, setPartyId]       = useState<number | null>(null);
  const [partyName, setPartyName]   = useState('');
  const [partyPhone, setPartyPhone] = useState(''); // pre-filled but editable
  const [password, setPassword]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // ── Step 1: verify GST ────────────────────────────────────────────
  const handleVerifyGst = async () => {
    const gst = gstNo.trim().toUpperCase();
    if (gst.length !== 15) {
      setGstError('GST number must be exactly 15 characters');
      return;
    }
    setGstError('');
    setGstLoading(true);
    try {
      const res = await authApi.verifyPartyGst(gst);
      const d   = res.data;
      setPartyId(d.partyId);
      setPartyName(d.partyName ?? '');
      setPartyPhone(d.phone ?? '');
      setStep('set_password');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg  = err?.response?.data?.error ?? 'Something went wrong.';
      if (code === 'GST_NOT_FOUND') {
        Alert.alert(
          '❌ Not Found',
          'No party account found for this GST number.\nPlease contact your admin.',
        );
      } else if (code === 'ALREADY_REGISTERED') {
        Alert.alert(
          '✅ Already Registered',
          'This party already has login credentials.\nPlease login with your phone number and password.',
          [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }],
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setGstLoading(false);
    }
  };

  // ── Step 2: validate + set password ──────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[0-9]{10}$/.test(partyPhone)) e.phone    = 'Enter a valid 10-digit phone number';
    if (password.length < 6)             e.password = 'Minimum 6 characters';
    if (password !== confirmPwd)         e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSetPassword = async () => {
    if (!validate()) return;
    setPwdLoading(true);
    try {
      await authApi.setPartyPassword({
        partyId:  partyId!,
        phone:    partyPhone.trim(),
        password,
      });
      Alert.alert(
        '🎉 Account Ready!',
        `Login set up for ${partyName}.\n\nPhone: ${partyPhone}\nPassword: (the one you just set)`,
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={['#4c1d95', '#7c3aed', '#5b21b6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.bg}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            style={s.back}
            onPress={() => {
              if (step === 'set_password') { setStep('gst'); return; }
              navigation.goBack();
            }}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.circle}>
              <Text style={s.emoji}>🏪</Text>
            </View>
            <Text style={s.brand}>Party Login</Text>
            <Text style={s.tagline}>
              {step === 'gst'
                ? 'Enter your GST number to get started'
                : `Welcome, ${partyName}!\nSet your login password below`}
            </Text>
          </View>

          {/* Progress */}
          <View style={s.progressRow}>
            <View style={[s.dot, s.dotActive]} />
            <View style={[s.progressLine, step === 'set_password' && s.progressLineFilled]} />
            <View style={[s.dot, step === 'set_password' && s.dotActive]} />
          </View>
          <View style={s.progressLabels}>
            <Text style={[s.progressLbl, s.progressLblActive]}>Verify GST</Text>
            <Text style={[s.progressLbl, step === 'set_password' && s.progressLblActive]}>
              Set Password
            </Text>
          </View>

          {/* ══ Card ══ */}
          <View style={s.card}>

            {/* ── STEP 1: Enter GST ── */}
            {step === 'gst' && (
              <>
                <Text style={s.cardTitle}>Enter GST Number</Text>
                <Text style={s.cardSub}>
                  Your GST number must be registered in our system by the admin.
                </Text>

                <Text style={s.label}>GST Number</Text>
                <View style={[s.row, gstError ? s.rowErr : null]}>
                  <Text style={s.icon}>🧾</Text>
                  <TextInput
                    style={s.input}
                    value={gstNo}
                    onChangeText={t => { setGstNo(t.toUpperCase()); setGstError(''); }}
                    placeholder="e.g. 27AABCU9603R1ZX"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    maxLength={15}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyGst}
                  />
                  <Text style={s.charCount}>{gstNo.length}/15</Text>
                </View>
                {gstError ? <Text style={s.err}>{gstError}</Text> : null}

                <TouchableOpacity
                  onPress={handleVerifyGst}
                  disabled={gstLoading}
                  style={{ marginTop: 24 }}
                >
                  <LinearGradient colors={['#7c3aed', '#5b21b6']} style={s.btn}>
                    {gstLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnTxt}>Verify GST →</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 2: Phone + Password ── */}
            {step === 'set_password' && (
              <>
                {/* Verified badge */}
                <View style={s.verifiedBadge}>
                  <Text style={s.verifiedTxt}>✅  GST Verified — {gstNo}</Text>
                </View>

                <Text style={s.cardTitle}>Set Your Password</Text>
                <Text style={s.cardSub}>
                  Your phone number is pre-filled from our records. You can change it if needed.
                </Text>

                {/* Phone — editable, pre-filled from DB */}
                <Text style={s.label}>Phone Number</Text>
                <View style={[s.row, errors.phone ? s.rowErr : null]}>
                  <Text style={s.prefix}>🇮🇳 +91</Text>
                  <TextInput
                    style={s.input}
                    value={partyPhone}
                    onChangeText={t => {
                      setPartyPhone(t);
                      setErrors(e => ({ ...e, phone: '' }));
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit number"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                  />
                </View>
                {errors.phone
                  ? <Text style={s.err}>{errors.phone}</Text>
                  : <Text style={s.hintTxt}>You will use this number + password to login.</Text>
                }

                {/* New Password */}
                <Text style={s.label}>New Password</Text>
                <View style={[s.row, errors.password ? s.rowErr : null]}>
                  <Text style={s.icon}>🔑</Text>
                  <TextInput
                    style={s.input}
                    secureTextEntry={!showPwd}
                    value={password}
                    onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)}>
                    <Text style={s.toggle}>{showPwd ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={s.err}>{errors.password}</Text> : null}

                {/* Confirm Password */}
                <Text style={s.label}>Confirm Password</Text>
                <View style={[s.row, errors.confirm ? s.rowErr : null]}>
                  <Text style={s.icon}>🔑</Text>
                  <TextInput
                    style={s.input}
                    secureTextEntry={!showPwd}
                    value={confirmPwd}
                    onChangeText={t => { setConfirmPwd(t); setErrors(e => ({ ...e, confirm: '' })); }}
                    placeholder="Re-enter password"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={handleSetPassword}
                    autoCapitalize="none"
                  />
                </View>
                {errors.confirm ? <Text style={s.err}>{errors.confirm}</Text> : null}

                <TouchableOpacity
                  onPress={handleSetPassword}
                  disabled={pwdLoading}
                  style={{ marginTop: 24 }}
                >
                  <LinearGradient colors={['#7c3aed', '#5b21b6']} style={s.btn}>
                    {pwdLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnTxt}>Set Password & Login →</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerTxt}>Not a party?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.footerLink}>Customer Login</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bg:     { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 54 },

  back:    { marginBottom: 8 },
  backTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },

  hero:    { alignItems: 'center', marginBottom: 20 },
  circle:  {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 12,
  },
  emoji:   { fontSize: 36 },
  brand:   { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // Progress
  progressRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dot:                { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:          { backgroundColor: '#fff' },
  progressLine:       { width: 64, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 6 },
  progressLineFilled: { backgroundColor: '#fff' },
  progressLabels:     { flexDirection: 'row', justifyContent: 'center', gap: 52, marginBottom: 20 },
  progressLbl:        { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  progressLblActive:  { color: '#fff' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  cardSub:   { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 4 },

  verifiedBadge: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14,
  },
  verifiedTxt: { fontSize: 13, color: '#15803d', fontWeight: '600' },

  label: {
    fontSize: 11, fontWeight: '700', color: '#374151',
    marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#f9fafb',
  },
  rowErr:    { borderColor: '#ef4444' },
  prefix:    { fontSize: 13, color: '#374151', fontWeight: '600', marginRight: 8 },
  icon:      { fontSize: 15, marginRight: 8 },
  input:     { flex: 1, paddingVertical: 13, fontSize: 14, color: '#111827' },
  charCount: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  toggle:    { color: '#7c3aed', fontWeight: '700', fontSize: 12 },
  err:       { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '500' },
  hintTxt:   { fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },

  btn:    { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerTxt:  { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  footerLink: { color: '#fff', fontWeight: '800', fontSize: 14 },
});