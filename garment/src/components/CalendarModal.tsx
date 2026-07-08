/**
 * CalendarModal.tsx
 *
 * Small pure-JS calendar modal (no native module) — works in Expo Go
 * and doesn't need a native rebuild. Extracted from PartyOrdersScreen
 * so PartyStatementScreen can reuse the exact same date picker UX.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['S','M','T','W','T','F','S'];

export default function CalendarModal({
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

// helper exports other screens may want
export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function formatDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function defaultFromDate(daysBack = 29) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d;
}