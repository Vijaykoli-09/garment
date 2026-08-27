/**
 * DispatchChallanListScreen.tsx
 *
 * Party-facing list of their own dispatch challans, with a from/to
 * date filter (reusing the same CalendarModal used by PartyStatement
 * / PartyOrders). Tapping a card expands it in place to show the
 * item-level rows — no navigation, no extra libraries, just the data
 * already returned by useDispatchChallans.
 */

import React, { useContext, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
// npm install react-native-razorpay  (then pod install for iOS)
import RazorpayCheckout from 'react-native-razorpay';
import { AppContext } from '../context/AppContext';
import { useDispatchChallans, DispatchChallan, dispatchChallanTotals } from '../hooks/DispatchChallanRow';
import CalendarModal, { toISODate, formatDisplay, defaultFromDate } from '../components/CalendarModal';

// Public identifier only — safe to ship inside the app.
// The key SECRET must live only on your backend (env var), never here.
const RAZORPAY_KEY_ID = 'rzp_test_RlsdeJP7YBOLHZ';

// Point this at your own backend. The backend is what actually talks to
// Razorpay's Orders API using the key secret, and verifies the signature
// after checkout completes.
const API_BASE_URL = 'https://your-api.example.com';

async function createRazorpayOrder(challan: DispatchChallan) {
  const res = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challanId: challan.id,
      amount: Number(challan.netAmt ?? 0), // rupees; backend converts to paise
    }),
  });
  if (!res.ok) throw new Error('Could not start payment. Please try again.');
  return res.json() as Promise<{ orderId: string; amountPaise: number }>;
}

async function verifyRazorpayPayment(challanId: number, payment: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challanId, ...payment }),
  });
  if (!res.ok) throw new Error('Payment received but verification failed.');
  return res.json() as Promise<{ status: 'paid' | 'pending' }>;
}

export default function DispatchChallanListScreen({ navigation }: any) {
  const { user } = useContext(AppContext);
  const partyName = user?.name ?? '';

  const { loading, refreshing, error, challans, filterByRange, refresh, retry } =
    useDispatchChallans(partyName);

  const [fromDate, setFromDate] = useState<Date>(defaultFromDate(29));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingOnly, setPendingOnly] = useState<boolean>(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  // Optimistic local overrides, keyed by challan id, in case the list from
  // the backend hasn't refreshed with the new status yet.
  const [paidOverrides, setPaidOverrides] = useState<Record<number, boolean>>({});

  const isPaid = (item: DispatchChallan) => {
    if (paidOverrides[item.id] !== undefined) return paidOverrides[item.id];
    return String((item as any).paymentStatus ?? '').toLowerCase() === 'paid';
  };

  const filtered = useMemo(
    () => filterByRange(toISODate(fromDate), toISODate(toDate)),
    [filterByRange, fromDate, toDate],
  );

  const displayed = useMemo(
    () => (pendingOnly ? filtered.filter((c) => !isPaid(c)) : filtered),
    [filtered, pendingOnly, paidOverrides],
  );

  const handlePay = async (item: DispatchChallan) => {
    setPayingId(item.id);
    try {
      const order = await createRazorpayOrder(item);
      const result = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: 'INR',
        name: 'Dispatch Challan Payment',
        description: `Challan No. ${item.challanNo ?? item.id}`,
        prefill: { name: partyName },
      });

      const verified = await verifyRazorpayPayment(item.id, {
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_signature: result.razorpay_signature,
      });

      setPaidOverrides((prev) => ({ ...prev, [item.id]: verified.status === 'paid' }));
      if (verified.status === 'paid') {
        Alert.alert('Payment successful', `Challan No. ${item.challanNo ?? item.id} is now marked paid.`);
        refresh();
      } else {
        Alert.alert('Payment pending', 'We received your payment but it is still being confirmed.');
      }
    } catch (err: any) {
      // Razorpay throws on user cancel too — don't show a scary alert for that.
      if (err?.code !== 'PAYMENT_CANCELLED' && err?.description !== 'Payment cancelled') {
        Alert.alert('Payment failed', err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setPayingId(null);
    }
  };

  const renderItem = ({ item }: { item: DispatchChallan }) => {
    const { totalBoxes, totalPcs } = dispatchChallanTotals(item);
    const expanded = expandedId === item.id;
    const rows = Array.isArray(item.rows) ? item.rows : [];
    const paid = isPaid(item);
    const isPaying = payingId === item.id;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => setExpandedId(expanded ? null : item.id)}
      >
        <View style={s.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Challan No. {item.challanNo || '—'}</Text>
            <Text style={s.cardSub}>{formatDisplay(new Date(item.date || item.dated || ''))}</Text>
            <Text style={s.cardMeta}>
              {item.station || item.destination || '—'} · {totalBoxes} box · {totalPcs} pcs
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.cardAmt}>₹{Number(item.netAmt ?? 0).toLocaleString('en-IN')}</Text>
            <View style={[s.statusBadge, paid ? s.statusBadgePaid : s.statusBadgePending]}>
              <Text style={[s.statusBadgeTxt, paid ? s.statusBadgeTxtPaid : s.statusBadgeTxtPending]}>
                {paid ? 'PAID' : 'PENDING'}
              </Text>
            </View>
            <Text style={[s.chevron, expanded && s.chevronUp]}>›</Text>
          </View>
        </View>

        {!paid && (
          <TouchableOpacity
            style={s.payBtn}
            disabled={isPaying}
            onPress={(e) => {
              e.stopPropagation();
              handlePay(item);
            }}
          >
            {isPaying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.payBtnTxt}>Pay Now</Text>
            )}
          </TouchableOpacity>
        )}

        {expanded && (
          <View style={s.detail}>
            {item.brokerName ? <Text style={s.detailLine}>BY A/C: {item.brokerName}</Text> : null}
            {item.transportName ? <Text style={s.detailLine}>Transport: {item.transportName}</Text> : null}
            {item.serialNo ? <Text style={s.detailLine}>Serial No: {item.serialNo}</Text> : null}

            <View style={s.rowHeaderLine}>
              <Text style={[s.rowHeaderTxt, { flex: 2 }]}>Art / Desc</Text>
              <Text style={[s.rowHeaderTxt, s.rowNumTxt]}>Size</Text>
              <Text style={[s.rowHeaderTxt, s.rowNumTxt]}>Box</Text>
              <Text style={[s.rowHeaderTxt, s.rowNumTxt]}>Pcs</Text>
              <Text style={[s.rowHeaderTxt, s.rowNumTxt]}>Amt</Text>
            </View>

            {rows.length === 0 ? (
              <Text style={s.detailLine}>No item rows on this challan.</Text>
            ) : (
              rows.map((r, idx) => (
                <View key={idx} style={s.rowLine}>
                  <Text style={[s.rowTxt, { flex: 2 }]} numberOfLines={1}>
                    {r.artNo || '—'}{r.description ? ` · ${r.description}` : ''}
                  </Text>
                  <Text style={[s.rowTxt, s.rowNumTxt]}>{r.size || '—'}</Text>
                  <Text style={[s.rowTxt, s.rowNumTxt]}>{r.box ?? '—'}</Text>
                  <Text style={[s.rowTxt, s.rowNumTxt]}>{r.pcs ?? '—'}</Text>
                  <Text style={[s.rowTxt, s.rowNumTxt]}>{r.amt ?? '—'}</Text>
                </View>
              ))
            )}

            <View style={s.totalsLine}>
              <Text style={s.totalsTxt}>Total: {totalBoxes} box · {totalPcs} pcs</Text>
              <Text style={s.totalsTxt}>Net Amt: ₹{Number(item.netAmt ?? 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dispatch Challans</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.filterRow}>
        <TouchableOpacity style={s.dateChip} onPress={() => setPickerFor('from')}>
          <Text style={s.dateChipLabel}>From</Text>
          <Text style={s.dateChipValue}>{formatDisplay(fromDate)}</Text>
        </TouchableOpacity>
        <Text style={s.dateSep}>→</Text>
        <TouchableOpacity style={s.dateChip} onPress={() => setPickerFor('to')}>
          <Text style={s.dateChipLabel}>To</Text>
          <Text style={s.dateChipValue}>{formatDisplay(toDate)}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.pendingFilterRow}
        activeOpacity={0.7}
        onPress={() => setPendingOnly((v) => !v)}
      >
        <View style={[s.checkbox, pendingOnly && s.checkboxChecked]}>
          {pendingOnly && <Text style={s.checkboxTick}>✓</Text>}
        </View>
        <Text style={s.pendingFilterTxt}>Show pending only</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#d97706" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={retry}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#d97706" colors={['#d97706']} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTxt}>
                {pendingOnly ? 'No pending challans in this date range.' : 'No dispatch challans in this date range.'}
              </Text>
            </View>
          }
        />
      )}

      <CalendarModal
        visible={pickerFor !== null}
        initialDate={pickerFor === 'from' ? fromDate : toDate}
        maxDate={new Date()}
        onSelect={(d) => (pickerFor === 'from' ? setFromDate(d) : setToDate(d))}
        onClose={() => setPickerFor(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 54, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt: { fontSize: 26, fontWeight: '800', color: '#d97706' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 8,
  },
  dateChip: {
    flex: 1, backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  dateChipLabel: { fontSize: 10, fontWeight: '700', color: '#c2410c', marginBottom: 2 },
  dateChipValue: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  dateSep: { fontSize: 14, color: '#9ca3af', fontWeight: '700' },

  pendingFilterRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 8,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#d97706', borderColor: '#d97706' },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '900' },
  pendingFilterTxt: { fontSize: 13, fontWeight: '600', color: '#334155' },

  statusBadge: {
    marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  statusBadgePaid: { backgroundColor: '#DCFCE7' },
  statusBadgePending: { backgroundColor: '#FEF3C7' },
  statusBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  statusBadgeTxtPaid: { color: '#15803D' },
  statusBadgeTxtPending: { color: '#b45309' },

  payBtn: {
    marginTop: 12, backgroundColor: '#d97706', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  cardAmt: { fontSize: 15, fontWeight: '800', color: '#059669' },
  chevron: { fontSize: 20, color: '#CBD5E1', fontWeight: '800', marginTop: 2, transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },

  detail: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  detailLine: { fontSize: 12, color: '#475569', marginBottom: 3 },

  rowHeaderLine: {
    flexDirection: 'row', marginTop: 8, marginBottom: 4, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  rowHeaderTxt: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  rowLine: { flexDirection: 'row', paddingVertical: 4 },
  rowTxt: { fontSize: 12, color: '#334155' },
  rowNumTxt: { flex: 1, textAlign: 'right' },

  totalsLine: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  totalsTxt: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 24 },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: '#d97706', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryTxt: { color: '#fff', fontWeight: '700' },
  emptyTxt: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
});