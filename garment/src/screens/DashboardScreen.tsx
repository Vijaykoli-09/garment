import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Dimensions, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../context/AppContext';
import { orderApi } from '../api/api';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const {
    user, totalItems, availableCredit, duePayments,
    refreshCredit,
  } = useContext(AppContext);

  const [refreshing, setRefreshing]               = useState(false);
  const [pendingCreditCount, setPendingCreditCount] = useState(0);

  const typeLabel      = user?.type?.replace(/_/g, ' ') ?? '';
  const typeBadgeColor =
    user?.type === 'Wholesaler'      ? '#7C3AED' :
    user?.type === 'Semi_Wholesaler' ? '#2563EB' : '#059669';
  const avatarLetter = (user?.name ?? 'U').charAt(0).toUpperCase();

  // ── Fetch pending credit count for the badge ──────────────────────
  const fetchCreditCount = useCallback(async () => {
    try {
      const res   = await orderApi.getMyOrders();
      const count = (res.data ?? []).filter((o: any) =>
        (o.paymentMethod === 'CREDIT_ORDER' || o.paymentMethod === 'ADVANCE_CREDIT')
        && o.paymentStatus !== 'PAID'
      ).length;
      setPendingCreditCount(count);
    } catch { /* badge stays at previous value */ }
  }, []);

  useEffect(() => { fetchCreditCount(); }, [fetchCreditCount]);

  // ── Pull-to-refresh ───────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshCredit(), fetchCreditCount()]);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, [refreshCredit, fetchCreditCount]);

  return (
    <LinearGradient
      colors={['#4f4fd8', '#b6492b', '#112e5e']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar backgroundColor="#4f4fd8" barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
            progressBackgroundColor="#4f4fd8"
          />
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarCircle, { backgroundColor: typeBadgeColor }]}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'User'}</Text>
          {typeLabel ? (
            <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statValue}>{totalItems ?? 0}</Text>
            <Text style={styles.statLabel}>Cart Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>
              ₹{Number(availableCredit ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Available Credit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔔</Text>
            <Text style={[styles.statValue, (duePayments ?? 0) > 0 && { color: '#DC2626' }]}>
              ₹{Number(duePayments ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Due Payments</Text>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>

          <TouchableOpacity style={[styles.cardLarge, { backgroundColor: '#EF4444' }]}
            onPress={() => navigation.navigate('Category')} activeOpacity={0.85}>
            <View style={styles.cardInner}>
              <Text style={styles.cardIcon}>🛍️</Text>
              <Text style={styles.cardTitle}>Buy Products</Text>
              <Text style={styles.cardDesc}>Browse Men, Women & Kids</Text>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cardLarge, { backgroundColor: '#3B82F6' }]}
            onPress={() => navigation.navigate('OrderHistory')} activeOpacity={0.85}>
            <View style={styles.cardInner}>
              <Text style={styles.cardIcon}>📊</Text>
              <Text style={styles.cardTitle}>Orders</Text>
              <Text style={styles.cardDesc}>View order history & details</Text>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cardLarge, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('PaymentScreen')} activeOpacity={0.85}>
            <View style={styles.cardInner}>
              <Text style={styles.cardIcon}>💳</Text>
              <Text style={styles.cardTitle}>Payments</Text>
              <Text style={styles.cardDesc}>Check credit & payment records</Text>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Credit Orders card — purple, shows pending badge */}
          <TouchableOpacity style={[styles.cardLarge, { backgroundColor: '#7C3AED' }]}
            onPress={() => navigation.navigate('CreditOrders')} activeOpacity={0.85}>
            <View style={styles.cardInner}>
              {/* Badge — only visible when there are pending orders */}
              {pendingCreditCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeTxt}>
                    {pendingCreditCount} pending
                  </Text>
                </View>
              )}
              <Text style={styles.cardIcon}>📋</Text>
              <Text style={styles.cardTitle}>Credit Orders</Text>
              <Text style={styles.cardDesc}>
                {pendingCreditCount > 0
                  ? `${pendingCreditCount} order${pendingCreditCount > 1 ? 's' : ''} due · pay within 60 days`
                  : 'All credit dues cleared ✅'
                }
              </Text>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scrollView:     { flex: 1 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  profileBtn:     { position: 'absolute', top: 18, right: 18, zIndex: 10 },
  avatarCircle:   { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  avatarLetter:   { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  greeting:       { fontSize: 14, color: '#64748B', marginBottom: 4, marginTop: 10 },
  userName:       { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 10, paddingRight: 52 },
  typeBadge:      { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText:  { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 16, marginBottom: 24, justifyContent: 'space-between' },
  statCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, width: (width - 40) / 3, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  statIcon:       { fontSize: 24, marginBottom: 6 },
  statValue:      { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4, textAlign: 'center' },
  statLabel:      { fontSize: 10, color: '#64748B', textAlign: 'center' },
  cardsContainer: { paddingHorizontal: 16, marginBottom: 32 },
  cardLarge:      { marginBottom: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  cardInner:      { padding: 20, minHeight: 140, justifyContent: 'space-between' },
  cardIcon:       { fontSize: 40, marginBottom: 8 },
  cardTitle:      { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardDesc:       { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  arrowText:      { fontSize: 20, color: '#FFFFFF', marginTop: 8, opacity: 0.9 },
  // Pending badge
  pendingBadge:   { position: 'absolute', top: 14, right: 14, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeTxt:{ fontSize: 11, fontWeight: '800', color: '#92400E' },
});