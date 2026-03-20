import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Modal, ScrollView,
} from 'react-native';
import { orderApi } from '../api/api';

// ── Status config ────────────────────────────────────────────────────

// Order status — set by admin (what the customer cares about most)
const ORDER_STATUS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  PENDING:    { label: 'Pending',    color: '#92400E', bg: '#FEF3C7', emoji: '⏳' },
  ACCEPTED:   { label: 'Accepted',   color: '#065F46', bg: '#D1FAE5', emoji: '✅' },
  PROCESSING: { label: 'Processing', color: '#1E40AF', bg: '#DBEAFE', emoji: '⚙️' },
  SHIPPED:    { label: 'Shipped',    color: '#5B21B6', bg: '#EDE9FE', emoji: '🚚' },
  DELIVERED:  { label: 'Delivered',  color: '#064E3B', bg: '#ECFDF5', emoji: '📦' },
  CANCELLED:  { label: 'Cancelled',  color: '#991B1B', bg: '#FEE2E2', emoji: '❌' },
};

// Payment status — whether money was received
const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Payment Pending', color: '#92400E', bg: '#FEF3C7' },
  PAID:     { label: 'Paid',            color: '#065F46', bg: '#D1FAE5' },
  FAILED:   { label: 'Failed',          color: '#991B1B', bg: '#FEE2E2' },
  REFUNDED: { label: 'Refunded',        color: '#5B21B6', bg: '#EDE9FE' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  UPI:           '📱 UPI',
  BANK_TRANSFER: '🏦 Bank Transfer',
  DEBIT_CARD:    '🎯 Debit Card',
  CREDIT_CARD:   '💳 Credit Card',
  CREDIT_ORDER:  '📋 Credit Order',
  ADVANCE_CREDIT:'🔀 Advance + Credit',
};

// Filter tabs — what the customer wants to track
const FILTERS = [
  { key: 'ALL',        label: '📦 All' },
  { key: 'PENDING',    label: '⏳ Pending' },
  { key: 'ACCEPTED',   label: '✅ Accepted' },
  { key: 'PROCESSING', label: '⚙️ Processing' },
  { key: 'SHIPPED',    label: '🚚 Shipped' },
  { key: 'DELIVERED',  label: '📦 Delivered' },
  { key: 'CANCELLED',  label: '❌ Cancelled' },
];

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

// ════════════════════════════════════════════════════════════════════
export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [filter, setFilter]     = useState('ALL');

  const fetchOrders = useCallback(async () => {
    try {
      setError('');
      const res = await orderApi.getMyOrders();
      const sorted = [...(res.data ?? [])].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      setOrders(sorted);
    } catch {
      setError('Could not load orders. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const displayed = filter === 'ALL'
    ? orders
    : orders.filter(o => o.orderStatus === filter);

  // ── Order card ────────────────────────────────────────────────────
  const renderOrder = ({ item }: { item: any }) => {
    const os = ORDER_STATUS[item.orderStatus]   ?? ORDER_STATUS.PENDING;
    const ps = PAYMENT_STATUS[item.paymentStatus] ?? PAYMENT_STATUS.PENDING;

    return (
      <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.8}>

        {/* Top: order number + ORDER STATUS badge (most important for customer) */}
        <View style={s.cardTop}>
          <View>
            <Text style={s.orderId}>Order #ORD-{String(item.id).padStart(4, '0')}</Text>
            <Text style={s.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          {/* ORDER STATUS — big and clear so customer knows admin accepted/shipped */}
          <View style={[s.orderStatusBadge, { backgroundColor: os.bg }]}>
            <Text style={[s.orderStatusTxt, { color: os.color }]}>
              {os.emoji} {os.label}
            </Text>
          </View>
        </View>

        {/* Items preview */}
        {item.items?.length > 0 && (
          <View style={s.itemsPreview}>
            {item.items.slice(0, 2).map((it: any, idx: number) => (
              <Text key={idx} style={s.itemPreviewTxt} numberOfLines={1}>
                • {it.productName}  ({it.selectedSize})  ×  {it.quantity} pcs
              </Text>
            ))}
            {item.items.length > 2 && (
              <Text style={s.itemMore}>+{item.items.length - 2} more items</Text>
            )}
          </View>
        )}

        {/* Bottom: payment method + payment status + total */}
        <View style={s.cardBottom}>
          <View>
            <Text style={s.paymentMethod}>
              {PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}
            </Text>
            {/* Payment status — smaller, secondary info */}
            <View style={[s.paymentStatusBadge, { backgroundColor: ps.bg }]}>
              <Text style={[s.paymentStatusTxt, { color: ps.color }]}>{ps.label}</Text>
            </View>
          </View>
          <Text style={s.totalAmt}>
            ₹{item.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Detail modal ──────────────────────────────────────────────────
  const DetailModal = () => {
    if (!selected) return null;
    const os = ORDER_STATUS[selected.orderStatus]    ?? ORDER_STATUS.PENDING;
    const ps = PAYMENT_STATUS[selected.paymentStatus] ?? PAYMENT_STATUS.PENDING;

    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>

            {/* Modal header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>
                  Order #ORD-{String(selected.id).padStart(4, '0')}
                </Text>
                <Text style={s.modalDate}>{formatDate(selected.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

              {/* Status row — ORDER STATUS large, payment status small */}
              <View style={s.statusRow}>
                <View style={[s.orderStatusBadge, { backgroundColor: os.bg, paddingHorizontal: 14, paddingVertical: 8 }]}>
                  <Text style={[s.orderStatusTxt, { color: os.color, fontSize: 14 }]}>
                    {os.emoji}  {os.label}
                  </Text>
                </View>
                <View style={[s.paymentStatusBadge, { backgroundColor: ps.bg, paddingHorizontal: 10, paddingVertical: 6 }]}>
                  <Text style={[s.paymentStatusTxt, { color: ps.color }]}>{ps.label}</Text>
                </View>
              </View>

              {/* Status timeline hint */}
              <View style={s.timelineHint}>
                {['PENDING','ACCEPTED','PROCESSING','SHIPPED','DELIVERED'].map((step, i, arr) => {
                  const stepOs = ORDER_STATUS[step];
                  const isActive = selected.orderStatus === step;
                  const isDone   = arr.indexOf(selected.orderStatus) > i;
                  const isCancelled = selected.orderStatus === 'CANCELLED';
                  return (
                    <React.Fragment key={step}>
                      <View style={[
                        s.timelineDot,
                        isDone && { backgroundColor: '#10B981' },
                        isActive && { backgroundColor: stepOs.color, transform: [{ scale: 1.2 }] },
                        isCancelled && { backgroundColor: '#E5E7EB' },
                      ]}>
                        <Text style={{ fontSize: 8, color: isDone || isActive ? '#fff' : '#9CA3AF' }}>
                          {isDone ? '✓' : stepOs.emoji}
                        </Text>
                      </View>
                      {i < arr.length - 1 && (
                        <View style={[s.timelineLine, isDone && { backgroundColor: '#10B981' }]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Items */}
              <Text style={s.detailSection}>🛍️ Items</Text>
              {selected.items?.map((it: any, idx: number) => (
                <View key={idx} style={s.detailItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailItemName}>{it.productName}</Text>
                    <Text style={s.detailItemMeta}>
                      Size: {it.selectedSize}  ·  {it.quantity} pcs  ·  ₹{it.pricePerPc?.toFixed(2)}/pc
                    </Text>
                  </View>
                  <Text style={s.detailItemAmt}>
                    ₹{(it.pricePerPc * it.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}

              {/* Payment breakdown */}
              <Text style={s.detailSection}>💰 Payment</Text>
              <View style={s.detailCard}>
                {[
                  ['Subtotal',          `₹${selected.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}`],
                  ['GST (18%)',         `₹${selected.gstAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}`],
                  ['Total',             `₹${selected.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}`],
                  ['Payment Method',    PAYMENT_METHOD_LABELS[selected.paymentMethod] ?? selected.paymentMethod],
                  ...(selected.advanceAmount > 0 ? [
                    ['Advance Paid (30%)', `₹${selected.advanceAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
                    ['Credit (70%)',       `₹${selected.creditAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
                  ] : []),
                  ...(selected.paymentMethod === 'CREDIT_ORDER' && selected.creditAmount > 0 ? [
                    ['Credit Amount', `₹${selected.creditAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
                  ] : []),
                ].map(([lbl, val]) => (
                  <View key={lbl} style={s.detailRow}>
                    <Text style={s.detailLbl}>{lbl}</Text>
                    <Text style={s.detailVal}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Delivery */}
              {selected.deliveryAddress && (
                <>
                  <Text style={s.detailSection}>📍 Delivery Address</Text>
                  <View style={s.detailCard}>
                    <Text style={s.detailVal}>{selected.deliveryAddress}</Text>
                  </View>
                </>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Main render ───────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ color: '#64748B', marginTop: 12 }}>Loading orders…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={s.errTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchOrders}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={i => String(i.id)}
          renderItem={renderOrder}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 56 }}>📭</Text>
              <Text style={s.emptyTxt}>No orders yet</Text>
              <TouchableOpacity style={s.shopBtn} onPress={() => navigation.navigate('Category')}>
                <Text style={s.shopBtnTxt}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <DetailModal />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8FAFC' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 60, gap: 12 },
  filterScroll:       { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterRow:          { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive:   { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterTxt:          { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTxtActive:    { color: '#fff' },
  list:               { padding: 12 },

  // Card
  card:               { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderId:            { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  orderDate:          { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Order status — prominent on card
  orderStatusBadge:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  orderStatusTxt:     { fontSize: 12, fontWeight: '800' },

  // Payment status — smaller, secondary
  paymentStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  paymentStatusTxt:   { fontSize: 11, fontWeight: '600' },

  itemsPreview:       { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginBottom: 10 },
  itemPreviewTxt:     { fontSize: 12, color: '#374151', lineHeight: 18 },
  itemMore:           { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cardBottom:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  paymentMethod:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalAmt:           { fontSize: 18, fontWeight: '800', color: '#2563EB' },

  // Error / empty
  errTxt:             { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn:           { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt:           { color: '#fff', fontWeight: '700' },
  emptyTxt:           { fontSize: 16, fontWeight: '600', color: '#64748B' },
  shopBtn:            { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 4 },
  shopBtnTxt:         { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:              { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 32 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle:         { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalDate:          { fontSize: 13, color: '#64748B', marginTop: 3 },
  closeBtn:           { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  closeTxt:           { fontSize: 16, color: '#374151', fontWeight: '700' },
  statusRow:          { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4, flexWrap: 'wrap' },

  // Timeline
  timelineHint:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  timelineDot:        { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  timelineLine:       { flex: 1, height: 3, backgroundColor: '#E5E7EB', marginHorizontal: 2 },

  detailSection:      { fontSize: 14, fontWeight: '700', color: '#374151', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  detailItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailItemName:     { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  detailItemMeta:     { fontSize: 11, color: '#6B7280' },
  detailItemAmt:      { fontSize: 14, fontWeight: '800', color: '#374151' },
  detailCard:         { marginHorizontal: 16, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  detailRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLbl:          { fontSize: 13, color: '#6B7280' },
  detailVal:          { fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1, textAlign: 'right' },
});