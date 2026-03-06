import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../context/AppContext';

export default function SplashScreen({ navigation }: any) {
  const { user, isLoading } = useContext(AppContext);

  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      navigation.replace(user ? 'Dashboard' : 'Login');
    }, 1800);
    return () => clearTimeout(t);
  }, [isLoading, user]);

  return (
    <LinearGradient
      colors={['#1e3a8a', '#2563eb', '#1e40af']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.container}
    >
      <View style={s.center}>
        <View style={s.circle}>
          <Text style={s.emoji}>👕</Text>
        </View>
        <Text style={s.brand}>Shriuday</Text>
        <Text style={s.sub}>Garments</Text>
        <Text style={s.tagline}>Premium Quality · Wholesale Pricing</Text>
      </View>
      <View style={s.bottom}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
        <Text style={s.loadTxt}>Loading...</Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 80 },
  center: { alignItems: 'center', marginTop: 60 },
  circle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 22,
  },
  emoji: { fontSize: 52 },
  brand: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  sub: { fontSize: 20, fontWeight: '300', color: 'rgba(255,255,255,0.85)', letterSpacing: 6, marginTop: -4 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 14 },
  bottom: { alignItems: 'center', gap: 8 },
  loadTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});