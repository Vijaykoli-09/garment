import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar,
  ActivityIndicator, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { orderApi } from '../api/api';

// ── Types matching AppOrderResponse DTO ──────────────────────────────
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
  paymentStatus:  string;
  paymentMethod:  string;
  deliveryAddress:string;
  createdAt:      string;
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
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const cfg     = STATUS_CONFIG[order.orderStatus] ?? STATUS_CONFIG.PENDING;
  const { date, time } = formatDate(order.createdAt);
  const payLabel = PAY_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod;

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
          <Text style={[s.statusText, { color: cfg.color }]}>
            {order.orderStatus}
          </Text>
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
            color: order.paymentStatus === 'PAID' ? '#059669' :
                   order.paymentStatus === 'FAILED' ? '#DC2626' : '#D97706'
          }]}>
            {order.paymentStatus === 'PAID' ? '✅ Paid' :
             order.paymentStatus === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
          </Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>Items</Text>
          <Text style={s.infoValue}>{order.items?.length ?? 0} product{(order.items?.length ?? 0) !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* ── Credit split (only for credit orders) ── */}
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
              {/* Placeholder image — products don't include image URL in order snapshot */}
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

      {/* ── Delivery ── */}
      {order.deliveryAddress ? (
        <Text style={s.address}>📍 {order.deliveryAddress}</Text>
      ) : null}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState('');

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
    (async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

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
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadTxt:    { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorTxt:   { color: '#DC2626', fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  emptyTxt:   { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptySub:   { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  title:    { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderId:    { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  dateTime:   { fontSize: 12, color: '#64748B' },
  statusBadge:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusEmoji:{ fontSize: 13 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider:    { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },

  infoRow:    { flexDirection: 'row', marginBottom: 6 },
  infoItem:   { flex: 1 },
  infoLabel:  { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  infoValue:  { fontSize: 12, fontWeight: '700', color: '#0F172A' },

  creditSplit:    { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginVertical: 6, gap: 3 },
  creditSplitTxt: { fontSize: 12, color: '#065F46', fontWeight: '600' },

  expandBtn:  { alignItems: 'center', paddingVertical: 8 },
  expandTxt:  { fontSize: 12, color: '#2563EB', fontWeight: '700' },

  itemsList:  { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, gap: 10 },
  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemImg:    { width: 56, height: 56, backgroundColor: '#F3F4F6', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemName:   { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  itemDetail: { fontSize: 11, color: '#64748B', marginBottom: 1 },
  itemTotal:  { fontSize: 13, fontWeight: '800', color: '#2563EB' },

  totalsSection: { gap: 4 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLbl:   { fontSize: 12, color: '#64748B' },
  totalVal:   { fontSize: 12, fontWeight: '600', color: '#374151' },
  grandRow:   { paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  grandLbl:   { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  grandVal:   { fontSize: 15, fontWeight: '800', color: '#2563EB' },

  address:    { marginTop: 8, fontSize: 11, color: '#64748B', fontStyle: 'italic' },
});