import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { AppContext } from '../context/AppContext';
import { orderApi } from '../api/api';

// ── Payment method display labels ────────────────────────────────────
const METHOD_LABEL: Record<string, string> = {
  UPI:           '📱 UPI',
  BANK_TRANSFER: '🏦 Bank Transfer',
  DEBIT_CARD:    '🎯 Debit Card',
  CREDIT_CARD:   '💳 Credit Card',
  CREDIT_ORDER:  '📋 Credit Order',
  ADVANCE_CREDIT:'🔀 Advance + Credit',
};

function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

// ════════════════════════════════════════════════════════════════════
export default function PaymentScreen({ navigation }: any) {
  const { creditLimit, availableCredit, duePayments, usedCredit } = useContext(AppContext);

  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderApi.getMyOrders();
      setOrders(res.data ?? []);
    } catch { /* ignore — show cached */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  // ── Derive payment history: PAID orders, newest first, last 5 ─────
  const paidOrders = orders
    .filter(o => o.paymentStatus === 'PAID')
    .sort((a, b) => {
      const dateA = new Date(a.paidAt ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.paidAt ?? b.createdAt ?? 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  // ── Summary: total paid this month ─────────────────────────────────
  const now         = new Date();
  const thisMonth   = now.getMonth();
  const thisYear    = now.getFullYear();
  const paidThisMonth = orders
    .filter(o => {
      if (o.paymentStatus !== 'PAID') return false;
      const d = new Date(o.paidAt ?? o.createdAt ?? 0);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  const lastPaid = paidOrders[0];

  // ── Pending credit orders count ────────────────────────────────────
  const pendingCreditCount = orders.filter(o =>
    (o.paymentMethod === 'CREDIT_ORDER' || o.paymentMethod === 'ADVANCE_CREDIT')
    && o.paymentStatus !== 'PAID'
  ).length;

  const paymentPercentage = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

  return (
    <>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💳 Payment Details</Text>
          <Text style={styles.subtitle}>Manage your credit & payments</Text>
        </View>

        {/* Credit Overview */}
        <View style={styles.creditSection}>
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <Text style={styles.creditHeaderTitle}>Credit Limit</Text>
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>Active</Text>
              </View>
            </View>

            <Text style={styles.creditAmount}>
              ₹{creditLimit.toLocaleString('en-IN')}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(paymentPercentage, 100)}%` as any,
                    backgroundColor:
                      paymentPercentage > 80 ? '#DC2626' :
                      paymentPercentage > 50 ? '#F59E0B' : '#10B981',
                  }
                ]} />
              </View>
              <Text style={styles.progressLabel}>{paymentPercentage.toFixed(0)}% Used</Text>
            </View>

            <View style={styles.creditDetails}>
              {[
                { label: 'Used Credit', amount: usedCredit,      color: '#DC2626' },
                { label: 'Available',   amount: availableCredit, color: '#10B981' },
                { label: 'Due Amount',  amount: duePayments,     color: '#F59E0B' },
              ].map(({ label, amount, color }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.creditDetailItem}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={[styles.detailAmount, { color }]}>
                      ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {duePayments > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Outstanding Amount</Text>
                  <Text style={styles.warningText}>
                    You have ₹{duePayments.toLocaleString('en-IN', { maximumFractionDigits: 0 })} pending payment
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Credit Orders Banner — navigate to new screen */}
        {pendingCreditCount > 0 && (
          <TouchableOpacity
            style={styles.creditBanner}
            onPress={() => navigation.navigate('CreditOrders')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.creditBannerTitle}>
                📋 {pendingCreditCount} Pending Credit Order{pendingCreditCount > 1 ? 's' : ''}
              </Text>
              <Text style={styles.creditBannerSub}>
                Pay before 60 days to avoid overdue. Tap to view →
              </Text>
            </View>
            <Text style={{ fontSize: 22, color: '#fff' }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>📊</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Total Paid This Month</Text>
              <Text style={styles.summaryAmount}>
                {loading
                  ? '...'
                  : `₹${paidThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                }
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>✅</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Last Paid On</Text>
              <Text style={styles.summaryAmount}>
                {loading
                  ? '...'
                  : lastPaid
                    ? formatDate(lastPaid.paidAt ?? lastPaid.createdAt)
                    : 'No payments yet'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Payment History — last 5 paid orders */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Payment History</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={styles.historyViewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
          ) : paidOrders.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={styles.emptyHistoryTxt}>No payments yet</Text>
            </View>
          ) : (
            paidOrders.map(order => (
              <View key={order.id} style={styles.paymentItem}>
                <View style={styles.paymentLeft}>
                  {/* Date */}
                  <Text style={styles.paymentDate}>
                    {formatDate(order.paidAt ?? order.createdAt)}
                  </Text>
                  {/* Order number */}
                  <Text style={styles.paymentOrderNo}>
                    ORD-{String(order.id).padStart(4, '0')}
                  </Text>
                  {/* Payment method */}
                  <Text style={styles.paymentMethod}>
                    {METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
                  </Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>
                    ₹{order.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#D1FAE520' }]}>
                    <Text style={styles.statusIcon}>✅</Text>
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Paid</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F8FAFC' },
  header:            { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  title:             { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle:          { fontSize: 13, color: '#64748B' },
  creditSection:     { paddingHorizontal: 16, paddingVertical: 20 },
  creditCard:        { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderLeftWidth: 4, borderLeftColor: '#2563EB', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  creditHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  creditHeaderTitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  creditBadge:       { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  creditBadgeText:   { fontSize: 11, color: '#0B5394', fontWeight: '600' },
  creditAmount:      { fontSize: 32, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  progressSection:   { marginBottom: 16 },
  progressBar:       { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:      { height: '100%' as any, borderRadius: 4 },
  progressLabel:     { fontSize: 12, color: '#64748B' },
  creditDetails:     { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  creditDetailItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailLabel:       { fontSize: 13, color: '#64748B' },
  detailAmount:      { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  divider:           { height: 1, backgroundColor: '#E2E8F0' },
  warningBox:        { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  warningIcon:       { fontSize: 20, marginRight: 10 },
  warningContent:    { flex: 1 },
  warningTitle:      { fontSize: 13, fontWeight: '600', color: '#DC2626', marginBottom: 2 },
  warningText:       { fontSize: 12, color: '#991B1B' },
  creditBanner:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#DC2626', borderRadius: 14, padding: 14, gap: 10 },
  creditBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 },
  creditBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  summarySection:    { paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  summaryCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  summaryIcon:       { width: 52, height: 52, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  summaryIconText:   { fontSize: 24 },
  summaryContent:    { flex: 1 },
  summaryLabel:      { fontSize: 12, color: '#64748B', marginBottom: 4 },
  summaryAmount:     { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  historySection:    { paddingHorizontal: 16, marginBottom: 20 },
  historyHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle:      { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  historyViewAll:    { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  emptyHistory:      { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyHistoryTxt:   { fontSize: 14, color: '#64748B' },
  paymentItem:       { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  paymentLeft:       { flex: 1 },
  paymentDate:       { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  paymentOrderNo:    { fontSize: 11, color: '#2563EB', fontWeight: '600', marginBottom: 2 },
  paymentMethod:     { fontSize: 12, color: '#64748B' },
  paymentRight:      { alignItems: 'flex-end' },
  paymentAmount:     { fontSize: 14, fontWeight: '700', color: '#10B981', marginBottom: 4 },
  statusBadge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4, backgroundColor: '#D1FAE5' },
  statusIcon:        { fontSize: 11 },
  statusText:        { fontSize: 11, fontWeight: '600' },
});