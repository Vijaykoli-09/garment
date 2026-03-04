import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

export default function SplashScreen({ navigation }: any) {

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E3A8A" barStyle="light-content" />
      
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>👕</Text>
      </View>

      <Text style={styles.appName}>Shriuday Garments</Text>
      <Text style={styles.tagline}>B2B Wholesale Platform</Text>
      <Text style={styles.subtitle}>Premium Quality, Bulk Ordering</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 10,
    opacity: 0.9,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#C7D2E8',
    marginTop: 6,
    opacity: 0.85,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});