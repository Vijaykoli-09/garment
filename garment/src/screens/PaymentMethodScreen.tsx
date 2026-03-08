import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { AppContext } from '../context/AppContext';
import { orderApi, OrderItemPayload } from '../api/api';

export default function PaymentMethodScreen({ navigation }: any) {
  const {
    cart, cartTotalWithGst: grandTotal,
    creditLimit, creditApproved, availableCredit,
    user, clearCart,
  } = useContext(AppContext);

  // advanceOption = admin has enabled the 30% advance + 70% credit option for this customer
  const advanceEnabled = creditApproved && Boolean(user?.advanceOption);

  const [loading, setLoading]           = useState(false);
  const [activeMethod, setActiveMethod] = useState<string | null>(null);

  // ── BUG FIX 1: Always recompute pricePerPc from pricePerBox/pcsPerBox.
  // item.pricePerPc stored in cart can be 0 or NaN if saved before the cart fix.
  // If subtotal → 0, Razorpay rejects the order and the gateway never opens.
  const buildItems = (): OrderItemPayload[] =>
    cart.map(item => ({
      productId:    item.productId,
      productName:  item.name,
      selectedSize: item.selectedSize,
      quantity:     item.quantity,
      pricePerPc:   (item.pcsPerBox > 0)
                      ? item.pricePerBox / item.pcsPerBox
                      : (item.pricePerPc ?? 0),
    }));

  // ════════════════════════════════════════════════════════════════
  // RAZORPAY FLOW — UPI / Card / Bank Transfer
  // ════════════════════════════════════════════════════════════════
  const handleRazorpayPayment = async (method: string) => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before proceeding.');
      return;
    }
    setLoading(true);
    setActiveMethod(method);
    try {
      const { data } = await orderApi.createRazorpayOrder({
        items:           buildItems(),
        paymentMethod:   method,
        deliveryAddress: (user as any)?.deliveryAddress ?? '',
      });

      // ── BUG FIX 2: Use the Razorpay order's actual amount (paise).
      // data.totalAmount is the full order total, but the Razorpay order on
      // the server was created for exactly that amount for UPI/card/bank.
      // Always pass amount as a number (paise), not a string.
      const amountInPaise: number = Math.round(data.totalAmount * 100);

      const options = {
        description: 'Shriuday Garments Order',
        currency:    'INR',
        key:         data.razorpayKeyId,
        amount:      amountInPaise,          // ← number in paise, not string
        name:        'Shriuday Garments',
        order_id:    data.razorpayOrderId,   // ← must match server-created order
        prefill: {
          email:   user?.email   ?? '',
          contact: user?.phone   ?? '',
          name:    user?.name    ?? '',
        },
        theme: { color: '#2563EB' },
      };

      // ── BUG FIX 3: Validate that razorpayOrderId is present before opening.
      // If the backend failed silently, data.razorpayOrderId is null/undefined,
      // and RazorpayCheckout.open() will hang or crash without error.
      if (!data.razorpayOrderId || !data.razorpayKeyId) {
        throw new Error('Server did not return a valid Razorpay order. Check backend logs.');
      }

      const paymentData = await RazorpayCheckout.open(options);

      await orderApi.verifyPayment({
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      clearCart();
      Alert.alert(
        '✅ Payment Successful!',
        `Order #${data.orderId} placed!\nAmount: ₹${data.totalAmount.toFixed(2)}`,
        [{ text: 'View Orders', onPress: () => navigation.navigate('OrderHistory') }]
      );
    } catch (error: any) {
      const cancelled =
        error?.code === 0 ||
        error?.code === 'PAYMENT_CANCELLED' ||
        error?.description === 'Payment Cancelled by user';
      if (cancelled) {
        Alert.alert('Payment Cancelled', 'You cancelled. Your cart is still saved.');
      } else {
        const msg =
          error?.response?.data?.error ??
          error?.description ??
          error?.message ??
          'Payment failed. Please try again.';
        Alert.alert('❌ Payment Failed', msg);
      }
    } finally {
      setLoading(false);
      setActiveMethod(null);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // CREDIT ORDER
  // ════════════════════════════════════════════════════════════════
  const handleCreditOrder = async () => {
    if (!creditApproved) {
      Alert.alert('❌ Credit Not Approved', 'Your credit has not been approved yet.');
      return;
    }
    if (grandTotal > availableCredit) {
      Alert.alert('⚠️ Credit Limit Exceeded',
        `Order: ₹${grandTotal.toFixed(2)}\nAvailable Credit: ₹${availableCredit.toFixed(2)}`);
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before proceeding.');
      return;
    }
    Alert.alert(
      '📋 Confirm Credit Order',
      `Order Amount: ₹${grandTotal.toFixed(2)}\nThis will be deducted from your credit limit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            setActiveMethod('CREDIT_ORDER');
            try {
              const { data } = await orderApi.createRazorpayOrder({
                items:           buildItems(),
                paymentMethod:   'CREDIT_ORDER',
                deliveryAddress: (user as any)?.deliveryAddress ?? '',
              });
              clearCart();
              Alert.alert(
                '✅ Credit Order Placed!',
                `Order #${data.orderId} placed!\nAmount: ₹${data.totalAmount.toFixed(2)}`,
                [{ text: 'View Orders', onPress: () => navigation.navigate('OrderHistory') }]
              );
            } catch (error: any) {
              const msg = error?.response?.data?.error ?? 'Failed to place credit order.';
              Alert.alert('❌ Order Failed', msg);
            } finally {
              setLoading(false);
              setActiveMethod(null);
            }
          },
        },
      ]
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ADVANCE + CREDIT — 30% Razorpay + 70% credit
  // ════════════════════════════════════════════════════════════════
  const handleAdvanceCredit = async () => {
    const advancePart = grandTotal * 0.30;
    const creditPart  = grandTotal * 0.70;

    if (!creditApproved) {
      Alert.alert('❌ Credit Not Approved', 'Your credit has not been approved yet.');
      return;
    }
    if (creditPart > availableCredit) {
      Alert.alert('❌ Insufficient Credit',
        `Credit needed: ₹${creditPart.toFixed(2)}\nAvailable: ₹${availableCredit.toFixed(2)}`);
      return;
    }
    Alert.alert(
      '🔀 Confirm Mixed Payment',
      `Pay Now (30%): ₹${advancePart.toFixed(2)}\nCredit (70%): ₹${creditPart.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            setLoading(true);
            setActiveMethod('ADVANCE_CREDIT');
            try {
              const { data } = await orderApi.createRazorpayOrder({
                items:           buildItems(),
                paymentMethod:   'ADVANCE_CREDIT',
                deliveryAddress: (user as any)?.deliveryAddress ?? '',
              });

              // ── BUG FIX 4: For ADVANCE_CREDIT, the Razorpay order on the server
              // was created for only 30% of totalAmount. Pass that same 30% to
              // RazorpayCheckout — passing the full amount would mismatch the
              // server order and Razorpay would reject/silently fail.
              const razorpayAmountInPaise: number = Math.round(data.totalAmount * 0.30 * 100);

              if (!data.razorpayOrderId || !data.razorpayKeyId) {
                throw new Error('Server did not return a valid Razorpay order. Check backend logs.');
              }

              const options = {
                description: 'Shriuday Garments Order (30% Advance)',
                currency:    'INR',
                key:         data.razorpayKeyId,
                amount:      razorpayAmountInPaise,   // ← 30% only, matches server order
                name:        'Shriuday Garments',
                order_id:    data.razorpayOrderId,
                prefill: {
                  email:   user?.email ?? '',
                  contact: user?.phone ?? '',
                  name:    user?.name  ?? '',
                },
                theme: { color: '#A855F7' },
              };

              const paymentData = await RazorpayCheckout.open(options);

              await orderApi.verifyPayment({
                razorpayOrderId:   paymentData.razorpay_order_id,
                razorpayPaymentId: paymentData.razorpay_payment_id,
                razorpaySignature: paymentData.razorpay_signature,
              });

              clearCart();
              Alert.alert(
                '✅ Order Placed!',
                `Order #${data.orderId} confirmed!\nPaid Now: ₹${(data.totalAmount * 0.30).toFixed(2)}\nOn Credit: ₹${(data.totalAmount * 0.70).toFixed(2)}`,
                [{ text: 'View Orders', onPress: () => navigation.navigate('OrderHistory') }]
              );
            } catch (error: any) {
              const cancelled =
                error?.code === 0 ||
                error?.code === 'PAYMENT_CANCELLED' ||
                error?.description === 'Payment Cancelled by user';
              if (cancelled) {
                Alert.alert('Payment Cancelled', 'You cancelled. Your cart is still saved.');
              } else {
                const msg = error?.response?.data?.error ?? error?.description ?? error?.message ?? 'Payment failed.';
                Alert.alert('❌ Payment Failed', msg);
              }
            } finally {
              setLoading(false);
              setActiveMethod(null);
            }
          },
        },
      ]
    );
  };

  const isMethodLoading = (method: string) => loading && activeMethod === method;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <Text style={styles.headerSubtitle}>Amount: ₹{grandTotal.toFixed(2)}</Text>
      </View>

      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color="#2563EB" size="small" />
          <Text style={styles.loadingTxt}>Processing, please wait...</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>💳 Digital Payments</Text>

      {[
        { method: 'UPI',           emoji: '📱', title: 'UPI Payment',   desc: 'Google Pay, PhonePe, BHIM' },
        { method: 'BANK_TRANSFER', emoji: '🏦', title: 'Bank Transfer', desc: 'Direct bank transfer / NEFT' },
        { method: 'DEBIT_CARD',    emoji: '🎯', title: 'Debit Card',    desc: 'Bank debit card payment' },
        { method: 'CREDIT_CARD',   emoji: '💳', title: 'Credit Card',   desc: 'Credit card payment' },
      ].map(({ method, emoji, title, desc }) => (
        <TouchableOpacity
          key={method}
          style={[styles.option, loading && styles.optionDisabled]}
          onPress={() => handleRazorpayPayment(method)}
          disabled={loading}
        >
          <Text style={styles.optionEmoji}>{emoji}</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionDesc}>{desc}</Text>
          </View>
          {isMethodLoading(method)
            ? <ActivityIndicator color="#2563EB" />
            : <Text style={styles.arrow}>›</Text>
          }
        </TouchableOpacity>
      ))}

      {creditApproved && (  /* shown only when admin has enabled credit */
        <>
          <Text style={styles.sectionTitle}>💰 Credit Options</Text>

          <TouchableOpacity
            style={[styles.creditOption, loading && styles.optionDisabled]}
            onPress={handleCreditOrder}
            disabled={loading}
          >
            <View style={styles.creditHeader}>
              <Text style={styles.creditEmoji}>📋</Text>
              <View style={styles.creditContent}>
                <Text style={styles.creditTitle}>Credit Order</Text>
                <Text style={styles.creditDesc}>Pay later from credit limit</Text>
              </View>
              {isMethodLoading('CREDIT_ORDER') && <ActivityIndicator color="#2563EB" />}
            </View>
            <View style={styles.creditDetails}>
              <View style={styles.creditDetailItem}>
                <Text style={styles.creditLabel}>Credit Limit</Text>
                <Text style={styles.creditValue}>₹{creditLimit.toLocaleString()}</Text>
              </View>
              <View style={styles.creditDetailItem}>
                <Text style={styles.creditLabel}>Order Amount</Text>
                <Text style={styles.creditValue}>₹{grandTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.creditDetailItem}>
                <Text style={styles.creditLabel}>Remaining</Text>
                <Text style={[styles.creditValue,
                  { color: (availableCredit - grandTotal) >= 0 ? '#10B981' : '#DC2626' }]}>
                  ₹{Math.max(0, availableCredit - grandTotal).toFixed(2)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 30/70 option: only shown when admin has enabled advanceOption for this customer */}
          {advanceEnabled && <TouchableOpacity
            style={[styles.mixedOption, loading && styles.optionDisabled]}
            onPress={handleAdvanceCredit}
            disabled={loading}
          >
            <View style={styles.creditHeader}>
              <Text style={styles.creditEmoji}>🔀</Text>
              <View style={styles.creditContent}>
                <Text style={styles.mixedTitle}>Advance + Credit</Text>
                <Text style={styles.mixedDesc}>30% advance now, 70% on credit</Text>
              </View>
              {isMethodLoading('ADVANCE_CREDIT') && <ActivityIndicator color="#A855F7" />}
            </View>
            <View style={styles.mixedDetails}>
              <View style={styles.mixedDetailItem}>
                <Text style={styles.mixedLabel}>Pay Now (30%)</Text>
                <Text style={styles.mixedValue}>₹{(grandTotal * 0.3).toFixed(2)}</Text>
              </View>
              <View style={styles.mixedDetailItem}>
                <Text style={styles.mixedLabel}>Credit (70%)</Text>
                <Text style={styles.mixedValue}>₹{(grandTotal * 0.7).toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8FAFC' },
  header:          { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle:     { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerSubtitle:  { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  loadingBanner:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', padding: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  loadingTxt:      { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#0F172A', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  option:          { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginVertical: 6, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  optionDisabled:  { opacity: 0.6 },
  optionEmoji:     { fontSize: 28, marginRight: 12 },
  optionContent:   { flex: 1 },
  optionTitle:     { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  optionDesc:      { fontSize: 12, color: '#64748B' },
  arrow:           { fontSize: 22, color: '#CBD5E1' },
  creditOption:    { backgroundColor: '#DBEAFE', marginHorizontal: 12, marginVertical: 8, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: '#2563EB' },
  creditHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  creditEmoji:     { fontSize: 28, marginRight: 12 },
  creditContent:   { flex: 1 },
  creditTitle:     { fontSize: 14, fontWeight: '700', color: '#0B5394', marginBottom: 2 },
  creditDesc:      { fontSize: 12, color: '#1E40AF' },
  creditDetails:   { flexDirection: 'row', justifyContent: 'space-between' },
  creditDetailItem:{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFFFFF' },
  creditLabel:     { fontSize: 11, color: '#0B5394', fontWeight: '500', marginBottom: 4 },
  creditValue:     { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  mixedOption:     { backgroundColor: '#F3E8FF', marginHorizontal: 12, marginVertical: 8, marginBottom: 20, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: '#A855F7' },
  mixedTitle:      { fontSize: 14, fontWeight: '700', color: '#6B21A8', marginBottom: 2 },
  mixedDesc:       { fontSize: 12, color: '#7C3AED' },
  mixedDetails:    { flexDirection: 'row', justifyContent: 'space-between' },
  mixedDetailItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFFFFF' },
  mixedLabel:      { fontSize: 11, color: '#6B21A8', fontWeight: '500', marginBottom: 4 },
  mixedValue:      { fontSize: 14, fontWeight: '700', color: '#A855F7' },
});