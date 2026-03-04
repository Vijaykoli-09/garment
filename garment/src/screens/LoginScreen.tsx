import React, { useContext, useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { demoUsers } from '../data/demoUsers';
import { AppContext } from '../context/AppContext';
export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
const { login } = useContext(AppContext);
  const validate = () => {
    let valid = true;
    let newErrors: any = {};

    if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = "Enter valid 10 digit phone number";
      valid = false;
    }

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

 const handleLogin = () => {

  const cleanPhone = phone.replace('+91', '');

  const foundUser = demoUsers.find(
    user =>
      user.phone === cleanPhone &&
      user.password === password
  );

  if (!foundUser) {
    Alert.alert("Invalid Credentials");
    return;
  }

  if (!foundUser.accountApproved) {
    Alert.alert("Account Not Approved");
    return;
  }

  login(foundUser);
  navigation.replace("ProductList");
};

  return (
    <LinearGradient
      colors={['#4f4fd8', '#b6492b', '#112e5e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👕</Text>
          <Text style={styles.title}>Shriuday Garments</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter 10 digit number"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={{ flex: 1, color: '#1F2937' }}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.toggle}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.error}>{errors.password}</Text>}

        <LinearGradient
          colors={['#2563EB', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <TouchableOpacity onPress={handleLogin} style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>Create Account</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 6,
  },
  formCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 14,
  },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  prefix: {
    paddingHorizontal: 12,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  phoneInput: { flex: 1, padding: 12, color: '#FFFFFF' },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },

  toggle: { color: '#E0E7FF', fontWeight: '600', fontSize: 12 },

  button: {
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  buttonContent: {
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#E0E7FF',
    fontSize: 14,
  },
  link: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  error: { color: '#FCA5A5', marginBottom: 10, fontSize: 12, fontWeight: '500' }
});
