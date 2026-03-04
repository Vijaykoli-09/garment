import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function ProfileScreen({ navigation }: any) {
  const {
    user,
    logout,
    creditLimit,
    usedCredit,
    duePayments,
    availableCredit,
    creditApproved
  } = useContext(AppContext);

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyText}>No user logged in</Text>
        </View>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      '🚪 Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Logout',
          onPress: () => {
            logout();
            navigation.replace('Login');
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 My Profile</Text>
        <Text style={styles.headerSubtitle}>Account details and settings</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Text style={styles.profileEmoji}>🏢</Text>
          <View style={styles.profileInfo}>
            <Text style={styles.companyName}>{user.name}</Text>
            <Text style={styles.role}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
          </View>
        </View>

        <View style={styles.profileDivider} />

        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📱 Phone</Text>
            <Text style={styles.detailValue}>+91 {user.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📍 Status</Text>
            <View style={[styles.statusBadge, user.accountApproved ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, user.accountApproved ? styles.statusTextApproved : styles.statusTextPending]}>
                {user.accountApproved ? '✅ Approved' : '⏳ Pending'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Credit Status Section */}
      <Text style={styles.sectionTitle}>💰 Credit Status</Text>

      <View style={[styles.creditStatusCard, !creditApproved && styles.creditDisabled]}>
        <View style={styles.creditStatusHeader}>
          <Text style={styles.creditStatusEmoji}>💳</Text>
          <View style={styles.creditStatusContent}>
            <Text style={styles.creditStatusTitle}>
              {creditApproved ? 'Credit Approved ✅' : 'Credit Pending ⏳'}
            </Text>
            <Text style={styles.creditStatusDesc}>
              {creditApproved ? 'Your account can use credit' : 'Awaiting admin approval'}
            </Text>
          </View>
        </View>
      </View>

      {/* Credit Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Limit</Text>
          <Text style={styles.metricValue}>₹{creditLimit}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Used</Text>
          <Text style={[styles.metricValue, { color: '#DC2626' }]}>₹{usedCredit}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Due</Text>
          <Text style={[styles.metricValue, { color: '#F59E0B' }]}>₹{duePayments}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Available</Text>
          <Text style={[styles.metricValue, { color: '#10B981' }]}>₹{availableCredit}</Text>
        </View>
      </View>

      {/* Credit Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Credit Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Credit Limit</Text>
          <Text style={styles.summaryValue}>₹{creditLimit}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Used Credit</Text>
          <Text style={[styles.summaryValue, { color: '#DC2626' }]}>-₹{usedCredit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Due Payments</Text>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>-₹{duePayments}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRowTotal}>
          <Text style={styles.summaryLabelTotal}>Available Credit</Text>
          <Text style={[styles.summaryValueTotal, { color: '#10B981' }]}>₹{availableCredit}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <Text style={styles.sectionTitle}>⚙️ Actions</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('CreditCheck')}
      >
        <Text style={styles.actionButtonEmoji}>💰</Text>
        <View style={styles.actionButtonContent}>
          <Text style={styles.actionButtonTitle}>Credit Details</Text>
          <Text style={styles.actionButtonDesc}>View detailed credit information</Text>
        </View>
        <Text style={styles.actionButtonArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('OrderHistory')}
      >
        <Text style={styles.actionButtonEmoji}>📦</Text>
        <View style={styles.actionButtonContent}>
          <Text style={styles.actionButtonTitle}>Order History</Text>
          <Text style={styles.actionButtonDesc}>View all your orders</Text>
        </View>
        <Text style={styles.actionButtonArrow}>→</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  role: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  profileDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  creditStatusCard: {
    backgroundColor: '#DBEAFE',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0369A1',
  },
  creditDisabled: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#DC2626',
  },
  creditStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditStatusEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  creditStatusContent: {
    flex: 1,
  },
  creditStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 2,
  },
  creditStatusDesc: {
    fontSize: 12,
    color: '#0369A1',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryLabelTotal: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  actionButton: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionButtonDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtonArrow: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});