import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar,
  ActivityIndicator, TouchableOpacity, RefreshControl,
  Alert,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { AppContext } from '../context/AppContext';
import { orderApi } from '../api/api';

// ── Types ─────────────────────────────────────────────────────────────
interface OrderItem {
  productId:    number;
  productName:  string;
  selectedSize: string;
  quantity:     number;
  pricePerPc:   number;
  itemTotal:    number;
}

interface Order {
  id:             number;
  totalAmount:    number;
  subtotal:       number;
  gstAmount:      number;
  advanceAmount:  number;
  creditAmount:   number;
  orderStatus:    string;
  paymentStatus:  string;   // 'PAID' | 'PENDING' | 'FAILED' | 'PARTIALLY_PAID'
  paymentMethod:  string;
  deliveryAddress:string;
  createdAt:      string;
  paidAt:         string | null;   // ← new: set by backend when credit is paid
  items:          OrderItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  PENDING:    { color: '#D97706', bg: '#FEF3C7', emoji: '⏳' },
  ACCEPTED:   { color: '#2563EB', bg: '#DBEAFE', emoji: '✅' },
  PROCESSING: { color: '#7C3AED', bg: '#EDE9FE', emoji: '⚙️' },
  SHIPPED:    { color: '#0891B2', bg: '#CFFAFE', emoji: '🚚' },
  DELIVERED:  { color: '#059669', bg: '#D1FAE5', emoji: '📦' },
  CANCELLED:  { color: '#DC2626', bg: '#FEE2E2', emoji: '❌' },
};

const PAY_METHOD_LABEL: Record<string, string> = {
  UPI:           '📱 UPI',
  BANK_TRANSFER: '🏦 Bank Transfer',
  DEBIT_CARD:    '🎯 Debit Card',
  CREDIT_CARD:   '💳 Credit Card',
  CREDIT_ORDER:  '📋 Credit Order',
  ADVANCE_CREDIT:'🔀 Advance + Credit',
};

// Credit orders whose credit portion is still unpaid
function creditUnpaid(order: Order): boolean {
  return (
    (order.paymentMethod === 'CREDIT_ORDER' || order.paymentMethod === 'ADVANCE_CREDIT') &&
    order.paymentStatus !== 'PAID'
  );
}

// Amount still owed on credit
function creditOwed(order: Order): number {
  if (order.paymentMethod === 'CREDIT_ORDER')  return order.totalAmount;
  if (order.paymentMethod === 'ADVANCE_CREDIT') return order.creditAmount ?? order.totalAmount * 0.7;
  return 0;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  } catch { return { date: iso, time: '' }; }
}

// ── Order Card ────────────────────────────────────────────────────────
function OrderCard({
  order,
  user,
  onCreditPaid,
}: {
  order: Order;
  user: any;
  onCreditPaid: (updatedOrder: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying]     = useState(false);

  const cfg      = STATUS_CONFIG[order.orderStatus] ?? STATUS_CONFIG.PENDING;
  const { date, time } = formatDate(order.createdAt);
  const payLabel = PAY_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod;
  const showPayBtn = creditUnpaid(order);
  const owed       = creditOwed(order);

  // ── Pay credit amount via Razorpay ───────────────────────────────
  const handlePayCredit = async () => {
    Alert.alert(
      '💳 Pay Credit Amount',
      `Pay ₹${owed.toFixed(2)} now to clear this credit order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setPaying(true);
            try {
              // 1. Ask backend to create a Razorpay order for the credit amount
              const { data } = await orderApi.createCreditPaymentOrder(order.id);

              if (!data.razorpayOrderId || !data.razorpayKeyId) {
                throw new Error('Server did not return a valid Razorpay order.');
              }

              // 2. Open Razorpay checkout
              const options = {
                description:  `Clearing credit for Order #${order.id}`,
                currency:     'INR',
                key:          data.razorpayKeyId,
                amount:       Math.round(data.creditAmount * 100), // paise
                name:         'Shriuday Garments',
                order_id:     data.razorpayOrderId,
                prefill: {
                  email:   user?.email   ?? '',
                  contact: user?.phone   ?? '',
                  name:    user?.name    ?? '',
                },
                theme: { color: '#059669' },
              };

              const paymentData = await RazorpayCheckout.open(options);

              // 3. Verify with backend — backend marks order PAID and sets paidAt
              const { data: verified } = await orderApi.verifyCreditPayment({
                orderId:           order.id,
                razorpayOrderId:   paymentData.razorpay_order_id,
                razorpayPaymentId: paymentData.razorpay_payment_id,
                razorpaySignature: paymentData.razorpay_signature,
              });

              // 4. Update this card in the list
              onCreditPaid(verified.order);

              Alert.alert(
                '✅ Payment Successful!',
                `₹${owed.toFixed(2)} paid for Order #${order.id}.`,
              );
            } catch (error: any) {
              const cancelled =
                error?.code === 0 ||
                error?.code === 'PAYMENT_CANCELLED' ||
                error?.description === 'Payment Cancelled by user';
              if (cancelled) {
                Alert.alert('Cancelled', 'Payment cancelled. You can pay later.');
              } else {
                const msg =
                  error?.response?.data?.error ??
                  error?.description ??
                  error?.message ??
                  'Payment failed. Please try again.';
                Alert.alert('❌ Payment Failed', msg);
              }
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.card}>

      {/* ── Header ── */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.orderId}>Order #{order.id}</Text>
          <Text style={s.dateTime}>{date}  ·  {time}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={s.statusEmoji}>{cfg.emoji}</Text>
          <Text style={[s.statusText, { color: cfg.color }]}>{order.orderStatus}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Payment info ── */}
      <View style={s.infoRow}>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>Payment</Text>
          <Text style={s.infoValue}>{payLabel}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>Status</Text>
          <Text style={[s.infoValue, {
            color: order.paymentStatus === 'PAID'           ? '#059669' :
                   order.paymentStatus === 'FAILED'         ? '#DC2626' :
                   order.paymentStatus === 'PARTIALLY_PAID' ? '#D97706' : '#D97706',
          }]}>
            {order.paymentStatus === 'PAID'           ? '✅ Paid' :
             order.paymentStatus === 'FAILED'         ? '❌ Failed' :
             order.paymentStatus === 'PARTIALLY_PAID' ? '🔀 Partial' : '⏳ Pending'}
          </Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>Items</Text>
          <Text style={s.infoValue}>
            {order.items?.length ?? 0} product{(order.items?.length ?? 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* ── Credit split ── */}
      {(order.paymentMethod === 'ADVANCE_CREDIT' || order.paymentMethod === 'CREDIT_ORDER') && (
        <View style={s.creditSplit}>
          {order.advanceAmount > 0 && (
            <Text style={s.creditSplitTxt}>💳 Paid now: ₹{order.advanceAmount.toFixed(2)}</Text>
          )}
          {order.creditAmount > 0 && (
            <Text style={s.creditSplitTxt}>📋 On credit: ₹{order.creditAmount.toFixed(2)}</Text>
          )}
        </View>
      )}

      {/* ── PAY NOW button (credit orders only, while unpaid) ── */}
      {showPayBtn && (
        <TouchableOpacity
          style={[s.payNowBtn, paying && s.payNowBtnDisabled]}
          onPress={handlePayCredit}
          disabled={paying}
          activeOpacity={0.8}
        >
          {paying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={s.payNowEmoji}>💳</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.payNowTitle}>Pay Credit Amount</Text>
                <Text style={s.payNowSub}>₹{owed.toFixed(2)} pending</Text>
              </View>
              <Text style={s.payNowArrow}>›</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ── Paid timestamp (shown after credit is paid) ── */}
      {order.paymentStatus === 'PAID' && order.paidAt && (
        <View style={s.paidBadge}>
          <Text style={s.paidBadgeTxt}>
            ✅ Paid on {formatDate(order.paidAt).date} at {formatDate(order.paidAt).time}
          </Text>
        </View>
      )}

      {/* ── Items (expandable) ── */}
      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={s.expandBtn} activeOpacity={0.7}>
        <Text style={s.expandTxt}>
          {expanded ? '▲ Hide products' : `▼ Show ${order.items?.length ?? 0} product(s)`}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.itemsList}>
          {(order.items ?? []).map((item, idx) => (
            <View key={idx} style={s.itemRow}>
              <View style={s.itemImg}>
                <Text style={{ fontSize: 28 }}>👕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{item.productName}</Text>
                <Text style={s.itemDetail}>Size: {item.selectedSize}  ·  Qty: {item.quantity} pcs</Text>
                <Text style={s.itemDetail}>₹{item.pricePerPc?.toFixed(2)}/pc</Text>
              </View>
              <Text style={s.itemTotal}>₹{item.itemTotal?.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.divider} />

      {/* ── Totals ── */}
      <View style={s.totalsSection}>
        <View style={s.totalRow}>
          <Text style={s.totalLbl}>Subtotal</Text>
          <Text style={s.totalVal}>₹{order.subtotal?.toFixed(2)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLbl}>GST (18%)</Text>
          <Text style={s.totalVal}>₹{order.gstAmount?.toFixed(2)}</Text>
        </View>
        <View style={[s.totalRow, s.grandRow]}>
          <Text style={s.grandLbl}>Grand Total</Text>
          <Text style={s.grandVal}>₹{order.totalAmount?.toFixed(2)}</Text>
        </View>
      </View>

      {order.deliveryAddress ? (
        <Text style={s.address}>📍 {order.deliveryAddress}</Text>
      ) : null}

    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const { user } = useContext(AppContext);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [error, setError]       = useState('');

  const fetchOrders = useCallback(async () => {
    setError('');
    try {
      const res = await orderApi.getMyOrders();
      setOrders(res.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to load orders.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchOrders(); setLoading(false); })();
  }, []);

  const onRefresh = async () => {
    setRefresh(true); await fetchOrders(); setRefresh(false);
  };

  // Called by OrderCard after credit payment succeeds — updates just that order in state
  const handleCreditPaid = useCallback((updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  }, []);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={s.loadTxt}>Loading orders...</Text>
    </View>
  );

  return (
    <>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        style={s.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>📦 Order History</Text>
            <Text style={s.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={s.center}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : (
            <View style={s.center}>
              <Text style={{ fontSize: 56 }}>📭</Text>
              <Text style={s.emptyTxt}>No orders yet</Text>
              <Text style={s.emptySub}>Your placed orders will appear here</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <OrderCard order={item} user={user} onCreditPaid={handleCreditPaid} />
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadTxt:   { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorTxt:  { color: '#DC2626', fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  emptyTxt:  { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptySub:  { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  header:   { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:    { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  card: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderId:     { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  dateTime:    { fontSize: 12, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusEmoji: { fontSize: 13 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  divider:     { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },

  infoRow:   { flexDirection: 'row', marginBottom: 6 },
  infoItem:  { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },

  creditSplit:    { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginVertical: 6, gap: 3 },
  creditSplitTxt: { fontSize: 12, color: '#065F46', fontWeight: '600' },

  // ── Pay Now button ──────────────────────────────────────────────
  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#059669', borderRadius: 12, padding: 12,
    marginVertical: 8,
  },
  payNowBtnDisabled: { opacity: 0.6 },
  payNowEmoji:       { fontSize: 22 },
  payNowTitle:       { fontSize: 14, fontWeight: '800', color: '#fff' },
  payNowSub:         { fontSize: 11, color: '#D1FAE5', marginTop: 1 },
  payNowArrow:       { fontSize: 22, color: '#fff', fontWeight: '700' },

  // ── Paid timestamp badge ─────────────────────────────────────────
  paidBadge:    { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  paidBadgeTxt: { fontSize: 12, color: '#059669', fontWeight: '700', textAlign: 'center' },

  expandBtn: { alignItems: 'center', paddingVertical: 8 },
  expandTxt: { fontSize: 12, color: '#2563EB', fontWeight: '700' },

  itemsList: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, gap: 10 },
  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemImg:   { width: 56, height: 56, backgroundColor: '#F3F4F6', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemName:  { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  itemDetail:{ fontSize: 11, color: '#64748B', marginBottom: 1 },
  itemTotal: { fontSize: 13, fontWeight: '800', color: '#2563EB' },

  totalsSection: { gap: 4 },
  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLbl:  { fontSize: 12, color: '#64748B' },
  totalVal:  { fontSize: 12, fontWeight: '600', color: '#374151' },
  grandRow:  { paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  grandLbl:  { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  grandVal:  { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  address:   { marginTop: 8, fontSize: 11, color: '#64748B', fontStyle: 'italic' },
});