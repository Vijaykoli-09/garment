/**
 * PartyStatementScreen.tsx
 *
 * The broker's "Statement" view for one party — full account
 * statement (opening balance, every Dispatch/Purchase/JobWork/
 * Payment/Receipt entry, running balance, LIFO-based pending amount,
 * and 60+ day overdue highlighting), calculated ON-DEVICE from the
 * same raw org-wide data the web AccountStatement.tsx page uses.
 *
 * Route params expected: { partyId: number; partyName: string }
 *
 * Register in BrokerNavigator:
 *   <Stack.Screen name="PartyStatement" component={PartyStatementScreen} />
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import CalendarModal, { toISODate, formatDisplay, defaultFromDate } from '../components/CalendarModal';
import { usePartyStatement } from '../hooks/usePartyStatement';
import { OVERDUE_DAYS, StatementResult, StatementRow, TxType, typeLabel } from '../utils/statementCalculator';

const fmtMoney = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDateHeader(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TYPE_FILTERS: Array<TxType | 'all'> = [
  'all', 'Dispatch', 'OtherDispatch', 'PurchaseOrder', 'PurchaseEntry',
  'PurchaseReturn', 'JobOutward', 'JobInward', 'Payment', 'Receipt',
];

export default function PartyStatementScreen({ route, navigation }: any) {
  const { partyId, partyName } = route.params ?? {};

  const [fromDate, setFromDate] = useState<Date>(defaultFromDate());
  const [toDate, setToDate]     = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);
  const [showOpening, setShowOpening] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all');
  const [overdueExpanded, setOverdueExpanded] = useState(false);

  const { loading, refreshing, error, hasData, refresh, retry, compute } = usePartyStatement(partyName);

  const result = useMemo(() => {
    if (!hasData) return null;
    return compute(toISODate(fromDate), toISODate(toDate), showOpening);
  }, [hasData, compute, fromDate, toDate, showOpening]);

  const filteredRows: StatementRow[] = useMemo(() => {
    if (!result) return [];
    if (typeFilter === 'all') return result.rows;
    return result.rows.filter((r) => r.type === typeFilter);
  }, [result, typeFilter]);

  const filteredDebit = useMemo(() => filteredRows.reduce((s, r) => s + r.debit, 0), [filteredRows]);
  const filteredCredit = useMemo(() => filteredRows.reduce((s, r) => s + r.credit, 0), [filteredRows]);

  const handleSelectDate = (d: Date) => {
    if (pickerOpen === 'from') setFromDate(d > toDate ? toDate : d);
    else if (pickerOpen === 'to') setToDate(d < fromDate ? fromDate : d);
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>{partyName || 'Party'}</Text>
        <Text style={s.subtitle}>Account Statement</Text>
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

      <TouchableOpacity style={s.openingToggle} onPress={() => setShowOpening((v) => !v)}>
        <View style={[s.checkbox, showOpening && s.checkboxChecked]}>
          {showOpening && <Text style={s.checkboxTick}>✓</Text>}
        </View>
        <Text style={s.openingToggleTxt}>Show Opening Balance</Text>
      </TouchableOpacity>

      <CalendarModal
        visible={pickerOpen !== null}
        initialDate={pickerOpen === 'from' ? fromDate : toDate}
        maxDate={new Date()}
        onSelect={handleSelectDate}
        onClose={() => setPickerOpen(null)}
      />

      {/* Type filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {TYPE_FILTERS.map((t) => {
          const active = typeFilter === t;
          const label = t === 'all' ? 'All' : typeLabel(t);
          return (
            <TouchableOpacity
              key={t}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      ) : error ? (
        <View style={s.centerWrap}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={retry}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => `${item.type}-${item.id}-${item.srNo}`}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#d97706']} />
          }
          ListHeaderComponent={
            result ? (
              <>
                <SummaryCard result={result} filteredDebit={filteredDebit} filteredCredit={filteredCredit} />
                {result.overdueRows.length > 0 && (
                  <OverdueBanner
                    rows={result.overdueRows}
                    expanded={overdueExpanded}
                    onToggle={() => setOverdueExpanded((v) => !v)}
                  />
                )}
              </>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.centerWrap}>
              <Text style={s.emptyIcon}>🧾</Text>
              <Text style={s.emptyTxt}>No transactions in this range.</Text>
            </View>
          }
          ListFooterComponent={
            result && filteredRows.length > 0 ? (
              <FooterSummary
                result={result}
                filteredDebit={filteredDebit}
                filteredCredit={filteredCredit}
                typeFilter={typeFilter}
              />
            ) : null
          }
          renderItem={({ item }) => <StatementRowCard row={item} />}
        />
      )}
    </View>
  );
}

// ── Summary card ───────────────────────────────────────────────────
function SummaryCard({
  result, filteredDebit, filteredCredit,
}: {
  result: StatementResult;
  filteredDebit: number;
  filteredCredit: number;
}) {
  const closingPositive = result.closingBalance >= 0;
  return (
    <View style={s.summaryCard}>
      <View style={s.summaryRow}>
        <SummaryStat label="Opening" value={fmtMoney(result.openingBalance)} />
        <SummaryStat label="Debit" value={fmtMoney(filteredDebit)} color="#b91c1c" />
        <SummaryStat label="Credit" value={fmtMoney(filteredCredit)} color="#15803d" />
      </View>
      <View style={s.divider} />
      <View style={s.closingRow}>
        <Text style={s.closingLabel}>Closing Balance</Text>
        <View style={[s.closingBadge, { backgroundColor: closingPositive ? '#fef2f2' : '#f0fdf4' }]}>
          <Text style={[s.closingValue, { color: closingPositive ? '#dc2626' : '#16a34a' }]}>
            {fmtMoney(Math.abs(result.closingBalance))} {closingPositive ? 'DR' : 'CR'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// ── Overdue banner ────────────────────────────────────────────────
function OverdueBanner({
  rows, expanded, onToggle,
}: { rows: StatementRow[]; expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={s.overdueBanner} onPress={onToggle} activeOpacity={0.8}>
      <Text style={s.overdueTitle}>
        ⚠ {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} overdue ({OVERDUE_DAYS}+ days) — tap to {expanded ? 'hide' : 'view'}
      </Text>
      {expanded && (
        <View style={{ marginTop: 8 }}>
          {rows.slice(0, 20).map((r) => (
            <View key={`${r.type}-${r.id}`} style={s.overdueLine}>
              <Text style={s.overdueLineTxt} numberOfLines={1}>
                {typeLabel(r.type)} · {r.docNo || '-'} · {fmtDateHeader(r.date)}
              </Text>
              <Text style={s.overdueLineDays}>{r.days}d</Text>
              <Text style={s.overdueLinePending}>{fmtMoney(r.pending)}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Footer summary — mirrors the web report's bottom totals block ──
function FooterSummary({
  result, filteredDebit, filteredCredit, typeFilter,
}: {
  result: StatementResult;
  filteredDebit: number;
  filteredCredit: number;
  typeFilter: TxType | 'all';
}) {
  const netFiltered = filteredDebit - filteredCredit;
  const isAll = typeFilter === 'all';
  const netPositionLabel = isAll ? 'Net Position (All)' : 'Net (Filtered)';
  const netPositionValue = isAll ? result.closingBalance : netFiltered;
  const netPositionPositive = netPositionValue >= 0;

  return (
    <View style={s.footerCard}>
      {/* Totals (Filtered) */}
      <Text style={s.footerSectionTitle}>Totals (Filtered)</Text>
      <View style={s.footerLineRow}>
        <Text style={s.footerLineLabel}>Debit</Text>
        <Text style={s.footerLineValue}>{fmtMoney(filteredDebit)}</Text>
      </View>
      <View style={s.footerLineRow}>
        <Text style={s.footerLineLabel}>Credit</Text>
        <Text style={s.footerLineValue}>{fmtMoney(filteredCredit)}</Text>
      </View>
      <View style={s.footerLineRow}>
        <Text style={s.footerLineLabel}>Net</Text>
        <Text style={s.footerLineValue}>{fmtMoney(netFiltered)}</Text>
      </View>
      <Text style={s.footerRefLine}>
        (All Tx) Dr: {fmtMoney(result.totalDebit)} | Cr: {fmtMoney(result.totalCredit)}
      </Text>

      <View style={s.footerDivider} />

      {/* Balance Summary (All) */}
      <Text style={s.footerSectionTitle}>Balance Summary (All)</Text>
      <View style={s.footerLineRow}>
        <Text style={s.footerLineLabel}>Opening Balance</Text>
        <Text style={s.footerLineValue}>{fmtMoney(result.openingBalance)}</Text>
      </View>
      <View style={s.footerLineRow}>
        <Text style={s.footerLineLabel}>Closing Balance</Text>
        <Text style={s.footerLineValue}>{fmtMoney(result.closingBalance)}</Text>
      </View>

      <View style={s.footerDivider} />

      {/* Net Position (All) / Net (Filtered) */}
      <Text style={s.footerSectionTitle}>{netPositionLabel}</Text>
      <View style={[s.footerNetBadge, { backgroundColor: netPositionPositive ? '#fef9c3' : '#fef9c3' }]}>
        <Text style={s.footerNetValue}>
          {fmtMoney(Math.abs(netPositionValue))} {netPositionValue >= 0 ? 'DR' : 'CR'}
        </Text>
      </View>

      <Text style={s.footerLegend}>Red row = Pending (LIFO) & {OVERDUE_DAYS}+ days.</Text>
    </View>
  );
}

// ── Row card ──────────────────────────────────────────────────────
function StatementRowCard({ row }: { row: StatementRow }) {
  const isOpening = row.type === 'Opening';
  const isPayment = row.type === 'Payment';
  const isReceipt = row.type === 'Receipt';

  const cardStyle = row.overdue
    ? s.rowCardOverdue
    : isPayment
      ? s.rowCardPayment
      : isReceipt
        ? s.rowCardReceipt
        : s.rowCard;

  return (
    <View style={[s.rowCard, cardStyle]}>
      <View style={s.rowTop}>
        <Text style={s.rowType}>{typeLabel(row.type)}</Text>
        <Text style={s.rowDate}>{fmtDateHeader(row.date)}</Text>
      </View>

      {!isOpening && !!row.docNo && <Text style={s.rowDocNo}>Doc: {row.docNo}</Text>}
      {!!row.mode && <Text style={s.rowMode}>{row.mode}</Text>}

      <View style={s.rowAmountsRow}>
        <View style={s.rowAmountBox}>
          <Text style={s.rowAmountLabel}>Debit</Text>
          <Text style={[s.rowAmountValue, row.debit > 0 && { color: '#b91c1c' }]}>{fmtMoney(row.debit)}</Text>
        </View>
        <View style={s.rowAmountBox}>
          <Text style={s.rowAmountLabel}>Credit</Text>
          <Text style={[s.rowAmountValue, row.credit > 0 && { color: '#15803d' }]}>{fmtMoney(row.credit)}</Text>
        </View>
        <View style={s.rowAmountBox}>
          <Text style={s.rowAmountLabel}>Balance</Text>
          <Text style={s.rowAmountValue}>{fmtMoney(Math.abs(row.balance))} {row.balance >= 0 ? 'DR' : 'CR'}</Text>
        </View>
      </View>

      {!isOpening && (
        <View style={s.rowFooter}>
          <Text style={[s.rowDays, row.overdue && s.rowDaysOverdue]}>{row.days} days old</Text>
          {row.pending > 0 && (
            <Text style={[s.rowPending, row.overdue && s.rowDaysOverdue]}>Pending: {fmtMoney(row.pending)}</Text>
          )}
        </View>
      )}
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

  openingToggle: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  checkboxChecked: { backgroundColor: '#d97706', borderColor: '#d97706' },
  checkboxTick: { color: '#fff', fontSize: 11, fontWeight: '800' },
  openingToggleTxt: { fontSize: 13, color: '#374151', fontWeight: '600' },

  chipRow: { marginTop: 14, marginBottom: 4, flexGrow: 0 },
  chip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  chipActive: { backgroundColor: '#d97706', borderColor: '#d97706' },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  chipTxtActive: { color: '#fff' },

  list: { padding: 20, paddingTop: 12, flexGrow: 1 },

  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorTxt:   { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn:   { backgroundColor: '#d97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTxt:   { color: '#9ca3af', fontSize: 13, textAlign: 'center' },

  // Summary card
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1 },
  statLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, color: '#1f2937', fontWeight: '800', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  closingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closingLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  closingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  closingValue: { fontSize: 14, fontWeight: '800' },

  // Overdue banner
  overdueBanner: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  overdueTitle: { fontSize: 12, fontWeight: '800', color: '#b91c1c' },
  overdueLine: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: '#fee2e2',
  },
  overdueLineTxt: { flex: 1, fontSize: 11, color: '#7f1d1d', fontWeight: '600' },
  overdueLineDays: { fontSize: 11, color: '#b91c1c', fontWeight: '800', marginHorizontal: 8 },
  overdueLinePending: { fontSize: 11, color: '#b91c1c', fontWeight: '800' },

  // Row card
  rowCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  rowCardPayment: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  rowCardReceipt: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  rowCardOverdue: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },

  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowType: { fontSize: 13, fontWeight: '800', color: '#1f2937' },
  rowDate: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  rowDocNo: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginTop: 4 },
  rowMode: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },

  rowAmountsRow: { flexDirection: 'row', marginTop: 10 },
  rowAmountBox: { flex: 1 },
  rowAmountLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' },
  rowAmountValue: { fontSize: 12, color: '#374151', fontWeight: '700', marginTop: 2 },

  rowFooter: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  rowDays: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  rowDaysOverdue: { color: '#b91c1c', fontWeight: '800' },
  rowPending: { fontSize: 11, color: '#374151', fontWeight: '700' },

  // Footer summary (mirrors web's Totals/Balance Summary/Net Position block)
  footerCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 4,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  footerSectionTitle: { fontSize: 12, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  footerLineRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  footerLineLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  footerLineValue: { fontSize: 12, color: '#1f2937', fontWeight: '800' },
  footerRefLine: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginTop: 4 },
  footerDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  footerNetBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, marginTop: 4,
  },
  footerNetValue: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  footerLegend: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginTop: 14 },
});