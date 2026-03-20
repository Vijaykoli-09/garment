import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { AppContext } from '../context/AppContext';
import { orderApi } from '../api/api';

// ── 60-day countdown from order createdAt ────────────────────────────
function getDaysRemaining(createdAt: string): number {
  if (!createdAt) return 60;
  const created   = new Date(createdAt).getTime();
  const deadline  = created + 60 * 24 * 60 * 60 * 1000; // 60 days in ms
  const remaining = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
  return remaining;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function deadlineDate(createdAt: string): string {
  if (!createdAt) return '—';
  try {
    const d = new Date(new Date(createdAt).getTime() + 60 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

const METHOD_LABEL: Record<string, string> = {
  CREDIT_ORDER:  '📋 Credit Order',
  ADVANCE_CREDIT:'🔀 Advance + Credit',
};

// ════════════════════════════════════════════════════════════════════
export default function CreditOrdersScreen({ navigation }: any) {
  const { user } = useContext(AppContext);

  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res  = await orderApi.getMyOrders();
      const all: any[] = res.data ?? [];

      // Only credit orders that haven't been fully paid yet
      const credit = all
        .filter(o =>
          (o.paymentMethod === 'CREDIT_ORDER' || o.paymentMethod === 'ADVANCE_CREDIT')
          && o.paymentStatus !== 'PAID'
        )
        .sort((a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
          // sort by oldest first — most urgent at top
        );

      setOrders(credit);
    } catch { /* keep current */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  // ── Pay Now flow ──────────────────────────────────────────────────
  const handlePayNow = async (order: any) => {
    setPayingId(order.id);
    try {
      // Step 1: backend creates Razorpay order for the credit amount
      const { data } = await orderApi.createCreditPaymentOrder(order.id);

      const amountInPaise: number = Math.round(data.creditAmount * 100);

      if (!data.razorpayOrderId || !data.razorpayKeyId) {
        throw new Error('Server did not return a valid Razorpay order.');
      }

      const options = {
        description:  `Pay Credit — ORD-${String(order.id).padStart(4, '0')}`,
        currency:     'INR',
        key:          data.razorpayKeyId,
        amount:       amountInPaise,
        name:         'Shriuday Garments',
        order_id:     data.razorpayOrderId,
        prefill: {
          email:   user?.email   ?? '',
          contact: user?.phone   ?? '',
          name:    user?.name    ?? '',
        },
        theme: { color: '#2563EB' },
      };

      // Step 2: open Razorpay checkout
      const paymentData = await RazorpayCheckout.open(options);

      // Step 3: verify with backend
      await orderApi.verifyCreditPayment({
        orderId:           data.orderId,
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      // Success — remove from this list and show confirmation
      setOrders(prev => prev.filter(o => o.id !== order.id));

      Alert.alert(
        '✅ Payment Successful!',
        `Credit for ORD-${String(order.id).padStart(4, '0')} has been paid.\n₹${data.creditAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} cleared.`,
        [{ text: 'OK', onPress: () => navigation.navigate('PaymentScreen') }]
      );
    } catch (error: any) {
      const cancelled =
        error?.code === 0 ||
        error?.code === 'PAYMENT_CANCELLED' ||
        error?.description === 'Payment Cancelled by user';

      if (!cancelled) {
        Alert.alert(
          '❌ Payment Failed',
          error?.response?.data?.error ?? error?.description ?? error?.message ?? 'Payment failed. Try again.'
        );
      }
    } finally {
      setPayingId(null);
    }
  };

  // ── Render one credit order card ──────────────────────────────────
  const renderItem = ({ item }: { item: any }) => {
    const daysLeft    = getDaysRemaining(item.createdAt);
    const isUrgent    = daysLeft <= 10;
    const isOverdue   = daysLeft <= 0;
    const isPaying    = payingId === item.id;

    const creditAmt   = item.creditAmount ?? item.totalAmount ?? 0;
    const orderNo     = `ORD-${String(item.id).padStart(4, '0')}`;

    return (
      <View style={[
        s.card,
        isOverdue && s.cardOverdue,
        isUrgent && !isOverdue && s.cardUrgent,
      ]}>

        {/* Header row */}
        <View style={s.cardHeader}>
          <View>
            <Text style={s.orderNo}>{orderNo}</Text>
            <Text style={s.orderDate}>Placed: {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[
            s.methodBadge,
            { backgroundColor: item.paymentMethod === 'ADVANCE_CREDIT' ? '#EDE9FE' : '#DBEAFE' }
          ]}>
            <Text style={[
              s.methodTxt,
              { color: item.paymentMethod === 'ADVANCE_CREDIT' ? '#7C3AED' : '#1D4ED8' }
            ]}>
              {METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod}
            </Text>
          </View>
        </View>

        {/* Items preview */}
        {item.items?.length > 0 && (
          <View style={s.itemsRow}>
            <Text style={s.itemsTxt} numberOfLines={2}>
              {item.items.map((i: any) => `${i.productName} (${i.selectedSize})`).join('  ·  ')}
            </Text>
          </View>
        )}

        {/* Amount row */}
        <View style={s.amountRow}>
          <View>
            <Text style={s.amountLabel}>Total Bill</Text>
            <Text style={s.amountVal}>
              ₹{item.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.amountLabel}>Credit Due</Text>
            <Text style={[s.amountVal, { color: '#DC2626' }]}>
              ₹{creditAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          {item.advanceAmount > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.amountLabel}>Advance Paid</Text>
              <Text style={[s.amountVal, { color: '#10B981' }]}>
                ₹{item.advanceAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          )}
        </View>

        {/* Countdown */}
        <View style={[s.countdownRow, isUrgent && s.countdownRowUrgent]}>
          <View style={{ flex: 1 }}>
            <Text style={[
              s.countdownLabel,
              isUrgent && { color: isOverdue ? '#991B1B' : '#92400E' },
            ]}>
              {isOverdue
                ? '🚨 OVERDUE'
                : isUrgent
                  ? '⚠️ Due Soon'
                  : '📅 Pay Before'
              }
            </Text>
            <Text style={[
              s.deadlineTxt,
              isUrgent && { color: isOverdue ? '#991B1B' : '#92400E' },
            ]}>
              {deadlineDate(item.createdAt)}
            </Text>
          </View>

          {/* Days remaining — big and coloured */}
          <View style={[
            s.daysBox,
            isOverdue ? s.daysBoxOverdue :
            isUrgent  ? s.daysBoxUrgent  : s.daysBoxNormal,
          ]}>
            <Text style={[
              s.daysNum,
              isOverdue ? { color: '#991B1B' } :
              isUrgent  ? { color: '#92400E' } : { color: '#065F46' },
            ]}>
              {isOverdue ? '0' : daysLeft}
            </Text>
            <Text style={[
              s.daysTxt,
              isOverdue ? { color: '#991B1B' } :
              isUrgent  ? { color: '#92400E' } : { color: '#065F46' },
            ]}>
              {isOverdue ? 'overdue' : 'days left'}
            </Text>
          </View>
        </View>

        {/* Countdown progress bar */}
        <View style={s.progressTrack}>
          <View style={[
            s.progressFill,
            {
              width: `${Math.max(0, Math.min(100, (daysLeft / 60) * 100))}%` as any,
              backgroundColor:
                isOverdue ? '#DC2626' :
                isUrgent  ? '#F59E0B' : '#10B981',
            }
          ]} />
        </View>

        {/* Pay Now button */}
        <TouchableOpacity
          style={[s.payBtn, isPaying && s.payBtnLoading]}
          onPress={() => handlePayNow(item)}
          disabled={isPaying || payingId !== null}
          activeOpacity={0.85}
        >
          {isPaying
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.payBtnTxt}>💳  Pay Now  ₹{creditAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ color: '#64748B', marginTop: 12 }}>Loading credit orders…</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListHeaderComponent={
            orders.length > 0 ? (
              <View style={s.listHeader}>
                <Text style={s.listHeaderTxt}>
                  {orders.length} pending credit order{orders.length !== 1 ? 's' : ''}
                </Text>
                <Text style={s.listHeaderSub}>
                  Pay within 60 days of order date
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 56 }}>🎉</Text>
              <Text style={s.emptyTitle}>No pending credit orders!</Text>
              <Text style={s.emptySub}>All your credit dues are cleared.</Text>
              <TouchableOpacity
                style={s.browseBtn}
                onPress={() => navigation.navigate('Category')}
              >
                <Text style={s.browseBtnTxt}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F8FAFC' },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 60, gap: 12 },
  list:              { padding: 14 },
  listHeader:        { marginBottom: 14 },
  listHeaderTxt:     { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  listHeaderSub:     { fontSize: 12, color: '#64748B', marginTop: 3 },

  // Card
  card:              { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  cardUrgent:        { borderColor: '#FCD34D', borderWidth: 2 },
  cardOverdue:       { borderColor: '#FCA5A5', borderWidth: 2, backgroundColor: '#FFF5F5' },

  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNo:           { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  orderDate:         { fontSize: 11, color: '#64748B', marginTop: 2 },
  methodBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  methodTxt:         { fontSize: 11, fontWeight: '700' },

  itemsRow:          { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginBottom: 12 },
  itemsTxt:          { fontSize: 12, color: '#374151', lineHeight: 18 },

  amountRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  amountLabel:       { fontSize: 11, color: '#6B7280', marginBottom: 3 },
  amountVal:         { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  // Countdown
  countdownRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10 },
  countdownRowUrgent:{ backgroundColor: '#FFF7ED' },
  countdownLabel:    { fontSize: 11, fontWeight: '700', color: '#065F46', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  deadlineTxt:       { fontSize: 13, fontWeight: '600', color: '#065F46' },

  daysBox:           { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  daysBoxNormal:     { backgroundColor: '#D1FAE5' },
  daysBoxUrgent:     { backgroundColor: '#FEF3C7' },
  daysBoxOverdue:    { backgroundColor: '#FEE2E2' },
  daysNum:           { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  daysTxt:           { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Progress bar
  progressTrack:     { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  progressFill:      { height: '100%' as any, borderRadius: 3 },

  // Pay button
  payBtn:            { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  payBtnLoading:     { backgroundColor: '#93C5FD' },
  payBtnTxt:         { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Empty state
  emptyTitle:        { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptySub:          { fontSize: 14, color: '#64748B', textAlign: 'center' },
  browseBtn:         { marginTop: 8, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  browseBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 14 },
});