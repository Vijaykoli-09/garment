import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, StatusBar,
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function ProfileScreen({ navigation }: any) {
  const {
    user, logout,
    creditLimit, usedCredit, duePayments, availableCredit, creditApproved,
  } = useContext(AppContext);

  const handleLogout = () => {
    Alert.alert('🚪 Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };

  if (!user) return (
    <View style={s.center}>
      <Text style={{ fontSize: 48 }}>👤</Text>
      <Text style={s.emptyTxt}>Not logged in</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={s.header}>
        <Text style={s.headerTitle}>My Profile</Text>
        <Text style={s.headerSub}>Account details & credit info</Text>
      </View>

      {/* Profile card */}
      <View style={s.card}>
        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{user.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user.name}</Text>
            <Text style={s.userType}>{user.type?.replace('_', ' ')}</Text>
            <View style={[s.badge, user.accountApproved ? s.badgeGreen : s.badgeYellow]}>
              <Text style={[s.badgeTxt, user.accountApproved ? s.badgeTxtGreen : s.badgeTxtYellow]}>
                {user.accountApproved ? '✅ Approved' : '⏳ Pending'}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.divider} />
        {[
          ['📱 Phone', `+91 ${user.phone}`],
          ['📧 Email', user.email],
        ].map(([lbl, val]) => (
          <View key={lbl} style={s.detailRow}>
            <Text style={s.detailLbl}>{lbl}</Text>
            <Text style={s.detailVal}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Credit status */}
      <Text style={s.secTitle}>💳 Credit Status</Text>
      <View style={[s.creditCard, !creditApproved && s.creditCardOff]}>
        <Text style={[s.creditCardTitle, !creditApproved && s.creditCardTitleOff]}>
          {creditApproved ? '✅ Credit Approved' : '❌ Credit Not Enabled'}
        </Text>
        <Text style={[s.creditCardSub, !creditApproved && s.creditCardSubOff]}>
          {creditApproved ? 'You can place orders on credit' : 'Contact admin to enable credit'}
        </Text>
      </View>

      {/* Credit grid */}
      <View style={s.grid}>
        {[
          { lbl: 'Credit Limit', val: `₹${creditLimit.toLocaleString()}`,                                             color: '#1D4ED8' },
          { lbl: 'Used',         val: `₹${usedCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,         color: '#DC2626' },
          { lbl: 'Due',          val: `₹${duePayments.toLocaleString()}`,                                             color: '#D97706' },
          { lbl: 'Available',    val: `₹${availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,    color: '#059669' },
        ].map(({ lbl, val, color }) => (
          <View key={lbl} style={s.gridCard}>
            <Text style={s.gridLbl}>{lbl}</Text>
            <Text style={[s.gridVal, { color }]}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Credit summary */}
      <View style={s.card}>
        <Text style={s.summaryTitle}>📊 Credit Summary</Text>
        {[
          { lbl: 'Total Limit',  val: `₹${creditLimit.toLocaleString()}`,                                           color: '#111827' },
          { lbl: 'Used Credit',  val: `-₹${usedCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,      color: '#DC2626' },
          { lbl: 'Due Payments', val: `-₹${duePayments.toLocaleString()}`,                                          color: '#D97706' },
        ].map(({ lbl, val, color }) => (
          <View key={lbl} style={s.sRow}>
            <Text style={s.sLbl}>{lbl}</Text>
            <Text style={[s.sVal, { color }]}>{val}</Text>
          </View>
        ))}
        <View style={s.divider} />
        <View style={s.sRow}>
          <Text style={[s.sLbl, { fontWeight: '700', color: '#111827' }]}>Available</Text>
          <Text style={[s.sVal, { color: '#059669', fontSize: 16 }]}>
            ₹{availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={s.secTitle}>⚙️ Quick Actions</Text>
      {[
        { emoji: '💳', title: 'Credit Details',  sub: 'View credit usage & limits',  screen: 'CreditCheck' },
        { emoji: '📦', title: 'Order History',   sub: 'View all your past orders',   screen: 'OrderHistory' },
        { emoji: '💰', title: 'Payments',        sub: 'View pending payments',       screen: 'PaymentScreen' },

      ].map(({ emoji, title, sub, screen }) => (
        <TouchableOpacity
          key={screen}
          style={s.actionRow}
          onPress={() => navigation.navigate(screen)}
        >
          <Text style={s.actionEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>{title}</Text>
            <Text style={s.actionSub}>{sub}</Text>
          </View>
          <Text style={s.actionArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutTxt}>🚪  Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTxt: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '800', color: '#1D4ED8' },
  userName: { fontSize: 17, fontWeight: '800', color: '#111827' },
  userType: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeYellow: { backgroundColor: '#FEF3C7' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  badgeTxtGreen: { color: '#065F46' },
  badgeTxtYellow: { color: '#92400E' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLbl: { fontSize: 13, color: '#6B7280' },
  detailVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  creditCard: { marginHorizontal: 12, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  creditCardOff: { backgroundColor: '#FEF2F2', borderLeftColor: '#DC2626' },
  creditCardTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 },
  creditCardTitleOff: { color: '#DC2626' },
  creditCardSub: { fontSize: 12, color: '#3B82F6' },
  creditCardSubOff: { color: '#EF4444' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, marginVertical: 4 },
  gridCard: { width: '46%', margin: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  gridLbl: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
  gridVal: { fontSize: 17, fontWeight: '800' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  sLbl: { fontSize: 13, color: '#6B7280' },
  sVal: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  actionEmoji: { fontSize: 26, marginRight: 12 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  actionSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionArrow: { fontSize: 22, color: '#CBD5E1' },
  logoutBtn: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FECACA' },
  logoutTxt: { color: '#DC2626', fontSize: 15, fontWeight: '800' },
});