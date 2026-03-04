import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function SignupScreen({ navigation }: any) {

  const customerTypes = [
    "Wholesaler",
    "Semi-Wholesaler",
    "Retailer"
  ];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedType, setSelectedType] = useState("Select Customer Type");
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let valid = true;
    let newErrors: any = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
      valid = false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter valid email";
      valid = false;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = "Enter valid 10 digit phone";
      valid = false;
    }

    if (selectedType === "Select Customer Type") {
      newErrors.type = "Please select customer type";
      valid = false;
    }

    if (!deliveryAddress.trim()) {
      newErrors.deliveryAddress = "Delivery address is required";
      valid = false;
    }

    // GST validation: standard Indian GST format (15 alphanumeric characters)
    if (!gstNo.trim()) {
      newErrors.gstNo = "GST number is required";
      valid = false;
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNo.toUpperCase())) {
      newErrors.gstNo = "Enter valid GST number (e.g. 22AAAAA0000A1Z5)";
      valid = false;
    }

    // Broker fields are optional — only validate phone if provided
    if (brokerPhone && !/^[0-9]{10}$/.test(brokerPhone)) {
      newErrors.brokerPhone = "Enter valid 10 digit phone";
      valid = false;
    }

    if (password.length < 6) {
      newErrors.password = "Password must be 6+ characters";
      valid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSignup = () => {
    if (!validate()) return;

    Alert.alert(
      "Request Sent",
      "Your account request is sent to admin.\nTry login after approval (approx 30 mins).",
      [{ text: "OK", onPress: () => navigation.replace('Login') }]
    );
  };

  return (
    <LinearGradient
      colors={['#403abf', '#ca3131', '#0d3371']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>👕</Text>
            <Text style={styles.title}>Create B2B Account</Text>
            <Text style={styles.subtitle}>Join Shriuday Garments</Text>
          </View>

          <View style={styles.formCard}>

            {/* Full Name */}
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#9CA3AF"
            />
            {errors.fullName && <Text style={styles.error}>{errors.fullName}</Text>}

            {/* Email */}
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email (e.g., name@example.com)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            {errors.email && <Text style={styles.error}>{errors.email}</Text>}

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
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

            {/* Customer Type Dropdown */}
            <Text style={styles.label}>Customer Type <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.dropdownText, selectedType === "Select Customer Type" && { color: '#9CA3AF' }]}>
                {selectedType}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {errors.type && <Text style={styles.error}>{errors.type}</Text>}

            {/* Modal for Dropdown */}
            <Modal visible={modalVisible} transparent animationType="fade">
              <TouchableOpacity
                style={styles.modalOverlay}
                onPress={() => setModalVisible(false)}
                activeOpacity={1}
              >
                <View style={styles.modalContent}>
                  {customerTypes.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.option,
                        index === customerTypes.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => {
                        setSelectedType(type);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.optionText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Delivery Address */}
            <Text style={styles.label}>Delivery Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter full delivery address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
            {errors.deliveryAddress && <Text style={styles.error}>{errors.deliveryAddress}</Text>}

            {/* GST Number */}
            <Text style={styles.label}>GST Number <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={gstNo}
              onChangeText={(text) => setGstNo(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={15}
              placeholderTextColor="#9CA3AF"
            />
            {errors.gstNo && <Text style={styles.error}>{errors.gstNo}</Text>}

            {/* Optional Section */}
            <Text style={styles.sectionTitle}>Refers Information (Optional)</Text>

            {/* Refers Name */}
            <Text style={styles.label}>Account by</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter refers name"
              value={brokerName}
              onChangeText={setBrokerName}
              placeholderTextColor="#9CA3AF"
            />

            {/* Broker Phone */}
            <Text style={styles.label}>Refers Phone Number</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="number-pad"
                maxLength={10}
                value={brokerPhone}
                onChangeText={setBrokerPhone}
                placeholder="Enter 10 digit number"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {errors.brokerPhone && <Text style={styles.error}>{errors.brokerPhone}</Text>}

            {/* Password */}
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPass}
                placeholder="Atleast 6 characters"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.toggle}>{showPass ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.error}>{errors.password}</Text>}

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showConfirmPass}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                <Text style={styles.toggle}>{showConfirmPass ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

            <Text style={styles.requiredNote}><Text style={styles.required}>*</Text> Required fields</Text>

            <LinearGradient
              colors={['#2563EB', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <TouchableOpacity onPress={handleSignup} style={styles.buttonContent}>
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#0f0101',
    fontSize: 14,
  },
  required: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  requiredNote: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontWeight: '700',
    color: '#020612',
    fontSize: 13,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#0f0101',
    fontSize: 14,
  },
  textArea: {
    paddingVertical: 10,
    height: 90,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  prefix: {
    paddingHorizontal: 12,
    fontWeight: '600',
    color: '#E0E7FF',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownText: {
    color: '#080101',
    fontSize: 14,
  },
  dropdownArrow: {
    color: '#01030d',
    fontSize: 12,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: '#130202',
    fontSize: 14,
  },
  toggle: {
    color: '#E0E7FF',
    fontWeight: '600',
    fontSize: 12,
  },
  button: {
    borderRadius: 10,
    marginTop: 16,
    shadowColor: '#808611',
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
  error: {
    color: '#FCA5A5',
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 40,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#E0E7FF',
    fontSize: 14,
  },
  footerLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});