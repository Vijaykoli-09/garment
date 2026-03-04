import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function PaymentMethodScreen({ navigation }: any) {
  const {
    grandTotal,
    creditLimit,
    creditApproved,
    availableCredit
  } = useContext(AppContext);

  const handleCreditOrder = () => {
    if (!creditApproved) {
      Alert.alert('❌ Credit Not Approved', 'Your credit has not been approved yet.');
      return;
    }

    if (grandTotal > availableCredit) {
      Alert.alert(
        '⚠️ Credit Limit Exceeded',
        `Available Credit: ₹${availableCredit.toFixed(2)}`
      );
      return;
    }

    Alert.alert('✅ Credit Order Placed', 'Your order will be processed soon.');
  };

  const handleOtherPayment = (method: string) => {
    Alert.alert('✅ Payment Selected', `${method} has been selected.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <Text style={styles.headerSubtitle}>Amount: ₹{grandTotal.toFixed(2)}</Text>
      </View>

      <Text style={styles.sectionTitle}>💳 Digital Payments</Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() => handleOtherPayment('UPI')}
      >
        <Text style={styles.optionEmoji}>📱</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>UPI Payment</Text>
          <Text style={styles.optionDesc}>Google Pay, PhonePe, BHIM</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => handleOtherPayment('Bank Transfer')}
      >
        <Text style={styles.optionEmoji}>🏦</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Bank Transfer</Text>
          <Text style={styles.optionDesc}>Direct bank transfer</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => handleOtherPayment('Debit Card')}
      >
        <Text style={styles.optionEmoji}>🎯</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Debit Card</Text>
          <Text style={styles.optionDesc}>Bank debit card payment</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => handleOtherPayment('Credit Card')}
      >
        <Text style={styles.optionEmoji}>💳</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Credit Card</Text>
          <Text style={styles.optionDesc}>Credit card payment</Text>
        </View>
      </TouchableOpacity>

      {creditApproved && (
        <>
          <Text style={styles.sectionTitle}>💰 Credit Options</Text>

          <TouchableOpacity
            style={styles.creditOption}
            onPress={handleCreditOrder}
          >
            <View style={styles.creditHeader}>
              <Text style={styles.creditEmoji}>📋</Text>
              <View style={styles.creditContent}>
                <Text style={styles.creditTitle}>Credit Order</Text>
                <Text style={styles.creditDesc}>Pay later from credit limit</Text>
              </View>
            </View>
            <View style={styles.creditDetails}>
              <View style={styles.creditDetail}>
                <Text style={styles.creditLabel}>Credit Limit</Text>
                <Text style={styles.creditValue}>₹{creditLimit}</Text>
              </View>
              <View style={styles.creditDetail}>
                <Text style={styles.creditLabel}>Order Amount</Text>
                <Text style={styles.creditValue}>₹{grandTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.creditDetail}>
                <Text style={styles.creditLabel}>Remaining</Text>
                <Text style={[styles.creditValue, { color: (availableCredit - grandTotal) >= 0 ? '#10B981' : '#DC2626' }]}>
                  ₹{Math.max(0, availableCredit - grandTotal).toFixed(2)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixedOption}
            onPress={() => {
              const advance = grandTotal * 0.3;
              const creditPart = grandTotal - advance;

              if (creditPart > availableCredit) {
                Alert.alert('❌ Insufficient Credit', `You need ₹${creditPart.toFixed(2)} credit but only have ₹${availableCredit.toFixed(2)}`);
                return;
              }

              Alert.alert(
                '✅ Mixed Payment Selected',
                `Advance (30%): ₹${advance.toFixed(2)}\nCredit (70%): ₹${creditPart.toFixed(2)}`
              );
            }}
          >
            <View style={styles.creditHeader}>
              <Text style={styles.creditEmoji}>🔀</Text>
              <View style={styles.creditContent}>
                <Text style={styles.creditTitle}>Advance + Credit</Text>
                <Text style={styles.creditDesc}>30% advance, 70% on credit</Text>
              </View>
            </View>
            <View style={styles.mixedDetails}>
              <View style={styles.mixedDetail}>
                <Text style={styles.mixedLabel}>Advance Required</Text>
                <Text style={styles.mixedValue}>₹{(grandTotal * 0.3).toFixed(2)}</Text>
              </View>
              <View style={styles.mixedDetail}>
                <Text style={styles.mixedLabel}>From Credit</Text>
                <Text style={styles.mixedValue}>₹{(grandTotal * 0.7).toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  option: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  creditOption: {
    backgroundColor: '#DBEAFE',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  creditContent: {
    flex: 1,
  },
  creditTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B5394',
    marginBottom: 2,
  },
  creditDesc: {
    fontSize: 12,
    color: '#1E40AF',
  },
  creditDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditDetail: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  creditLabel: {
    fontSize: 11,
    color: '#0B5394',
    fontWeight: '500',
    marginBottom: 4,
  },
  creditValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  mixedOption: {
    backgroundColor: '#F3E8FF',
    marginHorizontal: 12,
    marginVertical: 8,
    marginBottom: 20,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#A855F7',
  },
  mixedDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mixedDetail: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  mixedLabel: {
    fontSize: 11,
    color: '#6B21A8',
    fontWeight: '500',
    marginBottom: 4,
  },
  mixedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A855F7',
  },
});
