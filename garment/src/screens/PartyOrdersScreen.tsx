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
  FlatList, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { partyOrderApi, PartyOrderDto } from '../api/api';

// ════════════════════════════════════════════════════════════════════
// Date helpers
// ════════════════════════════════════════════════════════════════════
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29); // last 30 days by default
  return d;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['S','M','T','W','T','F','S'];

// ════════════════════════════════════════════════════════════════════
// Calendar modal (pure JS, no native dependency)
// ════════════════════════════════════════════════════════════════════
function CalendarModal({
  visible, initialDate, maxDate, onSelect, onClose,
}: {
  visible: boolean;
  initialDate: Date;
  maxDate?: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear]   = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(initialDate.getFullYear());
      setViewMonth(initialDate.getMonth());
    }
  }, [visible, initialDate]);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays    = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const isDisabled = (day: number) => {
    if (!maxDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d > maxDate;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={c.sheet} onPress={() => {}}>
          <View style={c.navRow}>
            <TouchableOpacity onPress={goPrevMonth} style={c.navBtn}>
              <Text style={c.navBtnTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={c.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={goNextMonth} style={c.navBtn}>
              <Text style={c.navBtnTxt}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={c.weekRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={c.weekLabel}>{w}</Text>
            ))}
          </View>

          <View style={c.grid}>
            {cells.map((day, idx) => {
              if (day == null) return <View key={idx} style={c.cell} />;
              const thisDate = new Date(viewYear, viewMonth, day);
              const selected = sameDay(thisDate, initialDate);
              const disabled = isDisabled(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[c.cell, selected && c.cellSelected]}
                  disabled={disabled}
                  onPress={() => { onSelect(thisDate); onClose(); }}
                >
                  <Text style={[
                    c.cellTxt,
                    selected && c.cellTxtSelected,
                    disabled && c.cellTxtDisabled,
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={c.closeBtn} onPress={onClose}>
            <Text style={c.closeBtnTxt}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '86%', backgroundColor: '#fff', borderRadius: 16, padding: 18 },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navBtnTxt: { fontSize: 22, fontWeight: '800', color: '#d97706' },
  monthLabel: { fontSize: 15, fontWeight: '800', color: '#1f2937' },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9ca3af' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 1 },
  cellSelected: { backgroundColor: '#d97706', borderRadius: 999 },
  cellTxt: { fontSize: 13, color: '#374151', fontWeight: '600' },
  cellTxtSelected: { color: '#fff', fontWeight: '800' },
  cellTxtDisabled: { color: '#e5e7eb' },

  closeBtn: { marginTop: 14, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  closeBtnTxt: { color: '#9ca3af', fontWeight: '700', fontSize: 13 },
});

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
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
  backBtn: { marginBottom: 10 },
  backTxt: { color: '#d97706', fontWeight: '700', fontSize: 14 },
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