/**
 * PartyOrdersScreen.tsx
 *
 * Shows every order (web SaleOrder + app AppOrder, merged) placed by
 * one party — newest first — with a From/To date picker on top.
 *
 * Date picker is a small pure-JS calendar modal (no native module) —
 * works in Expo Go and doesn't need any native rebuild. If you later
 * do a full native build, you can swap this for
 * @react-native-community/datetimepicker if you prefer the OS-native
 * calendar UI.
 *
 * Route params expected: { partyId: number; partyName: string }
 *
 * Register in BrokerNavigator:
 *   <Stack.Screen name="PartyOrders" component={PartyOrdersScreen} />
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { partyOrderApi, PartyOrderDto } from '../api/api';
import CalendarModal, { toISODate, formatDisplay, defaultFromDate } from '../components/CalendarModal';

const defaultFrom = defaultFromDate;

// ════════════════════════════════════════════════════════════════════
// Main screen
// ════════════════════════════════════════════════════════════════════
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  ACCEPTED: '#2563eb',
  PROCESSING: '#2563eb',
  SHIPPED: '#7c3aed',
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626',
};

export default function PartyOrdersScreen({ route, navigation }: any) {
  const { partyId, partyName } = route.params ?? {};

  const [fromDate, setFromDate] = useState<Date>(defaultFrom());
  const [toDate, setToDate]     = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);

  const [orders, setOrders]     = useState<PartyOrderDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!partyId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await partyOrderApi.getByParty(partyId, toISODate(fromDate), toISODate(toDate));
      setOrders(res.data ?? []);
    } catch {
      setError('Could not load orders. Pull down to retry.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [partyId, fromDate, toDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalAmount = useMemo(
    () => orders.reduce((sum, o) => sum + (o.amount ?? 0), 0),
    [orders],
  );

  const handleSelect = (d: Date) => {
    if (pickerOpen === 'from') {
      setFromDate(d > toDate ? toDate : d);
    } else if (pickerOpen === 'to') {
      setToDate(d < fromDate ? fromDate : d);
    }
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.statementBtn}
            onPress={() => navigation.navigate('PartyStatement', { partyId, partyName })}
          >
            <Text style={s.statementBtnTxt}>📄 Statement</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.title}>{partyName || 'Party'}</Text>
        <Text style={s.subtitle}>{orders.length} orders · ₹{totalAmount.toLocaleString('en-IN')}</Text>
      </View>

      {/* Date range picker */}
      <View style={s.dateRow}>
        <TouchableOpacity style={s.dateBtn} onPress={() => setPickerOpen('from')}>
          <Text style={s.dateLabel}>From</Text>
          <Text style={s.dateValue}>{formatDisplay(fromDate)}</Text>
        </TouchableOpacity>
        <Text style={s.dateSep}>—</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setPickerOpen('to')}>
          <Text style={s.dateLabel}>To</Text>
          <Text style={s.dateValue}>{formatDisplay(toDate)}</Text>
        </TouchableOpacity>
      </View>

      <CalendarModal
        visible={pickerOpen !== null}
        initialDate={pickerOpen === 'from' ? fromDate : toDate}
        maxDate={new Date()}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(null)}
      />

      {/* Content */}
      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      ) : error ? (
        <View style={s.centerWrap}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchOrders()}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => `${item.source}-${item.id}`}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#d97706']} />
          }
          ListEmptyComponent={
            <View style={s.centerWrap}>
              <Text style={s.emptyIcon}>📦</Text>
              <Text style={s.emptyTxt}>No orders in this range.</Text>
            </View>
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

function OrderCard({ order }: { order: PartyOrderDto }) {
  const statusColor = order.status ? (STATUS_COLORS[order.status] ?? '#6b7280') : null;
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.orderNoRow}>
          <View style={[s.sourceBadge, order.source === 'APP' ? s.sourceBadgeApp : s.sourceBadgeWeb]}>
            <Text style={s.sourceBadgeTxt}>{order.source}</Text>
          </View>
          <Text style={s.orderNo}>{order.orderNo}</Text>
        </View>
        {statusColor && (
          <View style={[s.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[s.statusTxt, { color: statusColor }]}>{order.status}</Text>
          </View>
        )}
      </View>

      <View style={s.cardBottom}>
        <Text style={s.date}>{order.date}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          {order.amount != null && (
            <Text style={s.amount}>₹{Number(order.amount).toLocaleString('en-IN')}</Text>
          )}
          {(order.totalPeti != null || order.totalPcs != null) && (
            <Text style={s.meta}>{order.totalPeti ?? 0} peti · {order.totalPcs ?? 0} pcs</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  backBtn: {},
  backTxt: { color: '#d97706', fontWeight: '700', fontSize: 14 },
  statementBtn: {
    backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: '#fde68a',
  },
  statementBtnTxt: { color: '#b45309', fontWeight: '800', fontSize: 12 },
  title:   { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  subtitle:{ fontSize: 12, color: '#9ca3af', marginTop: 2, fontWeight: '600' },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 4,
  },
  dateBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  dateLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, color: '#1f2937', fontWeight: '700', marginTop: 2 },
  dateSep: { color: '#d1d5db', fontSize: 14, fontWeight: '700' },

  list: { padding: 20, paddingTop: 12, flexGrow: 1 },

  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorTxt:   { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn:   { backgroundColor: '#d97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTxt:   { color: '#9ca3af', fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNoRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },

  sourceBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 8 },
  sourceBadgeWeb: { backgroundColor: '#eff6ff' },
  sourceBadgeApp: { backgroundColor: '#f0fdf4' },
  sourceBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#374151' },

  orderNo: { fontSize: 14, fontWeight: '800', color: '#1f2937' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 11, fontWeight: '800' },

  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  date:   { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  amount: { fontSize: 15, color: '#1f2937', fontWeight: '800' },
  meta:   { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});