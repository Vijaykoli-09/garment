import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { user, totalItems, availableCredit, duePayments } = useContext(AppContext);

  const handleBuyProducts = () => {
    navigation.navigate('ProductList');
  };

  const handleStatements = () => {
    navigation.navigate('OrderHistory');
  };

  const handlePayments = () => {
    navigation.navigate('PaymentScreen');
  };

  return (
    <LinearGradient
      colors={['#4f4fd8', '#b6492b', '#112e5e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar backgroundColor="#4f4fd8" barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.userType}>{user?.type ?? ''}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statValue}>{totalItems ?? 0}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{availableCredit ?? 0}</Text>
            <Text style={styles.statLabel}>Available Credit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔔</Text>
            <Text style={styles.statValue}>{duePayments ?? 0}</Text>
            <Text style={styles.statLabel}>Due Payments</Text>
          </View>
        </View>

        {/* Main Action Cards */}
        <View style={styles.cardsContainer}>
          {/* Buy Product Card */}
          <TouchableOpacity
            style={[styles.cardLarge, styles.buyProductCard]}
            onPress={handleBuyProducts}
            activeOpacity={0.85}
          >
            <View style={styles.cardGradient}>
              <Text style={styles.cardIcon}>🛍️</Text>
              <Text style={styles.cardTitle}>Buy Products</Text>
              <Text style={styles.cardDesc}>Browse & purchase garments</Text>
              <View style={styles.cardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Statements Card */}
          <TouchableOpacity
            style={[styles.cardLarge, styles.statementsCard]}
            onPress={handleStatements}
            activeOpacity={0.85}
          >
            <View style={styles.cardGradient}>
              <Text style={styles.cardIcon}>📊</Text>
              <Text style={styles.cardTitle}>Statements</Text>
              <Text style={styles.cardDesc}>View order history & details</Text>
              <View style={styles.cardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Payments Card */}
          <TouchableOpacity
            style={[styles.cardLarge, styles.paymentsCard]}
            onPress={handlePayments}
            activeOpacity={0.85}
          >
            <View style={styles.cardGradient}>
              <Text style={styles.cardIcon}>💳</Text>
              <Text style={styles.cardTitle}>Payments</Text>
              <Text style={styles.cardDesc}>Check credit & payment records</Text>
              <View style={styles.cardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    paddingTop: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  userType: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: (width - 40) / 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  cardLarge: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  buyProductCard: {
    backgroundColor: '#EF4444',
  },
  statementsCard: {
    backgroundColor: '#3B82F6',
  },
  paymentsCard: {
    backgroundColor: '#10B981',
  },
  cardGradient: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardArrow: {
    marginTop: 8,
    opacity: 0.9,
  },
  arrowText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  spacer: {
    height: 20,
  },
});