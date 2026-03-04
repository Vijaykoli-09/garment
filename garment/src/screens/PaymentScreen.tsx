import React, { useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
} from 'react-native';
import { AppContext } from '../context/AppContext';

const paymentRecords = [
  { id: '1', date: '25 Feb 2026', amount: 15000, status: 'Paid', method: 'UPI' },
  { id: '2', date: '20 Feb 2026', amount: 22000, status: 'Paid', method: 'Credit' },
  { id: '3', date: '15 Feb 2026', amount: 18500, status: 'Paid', method: 'Bank Transfer' },
  { id: '4', date: '10 Feb 2026', amount: 8000, status: 'Pending', method: 'Credit' },
  { id: '5', date: '05 Feb 2026', amount: 12000, status: 'Paid', method: 'UPI' },
];

export default function PaymentScreen() {
  const { user, creditLimit, availableCredit, duePayments } = useContext(AppContext);

  const usedCredit = creditLimit - availableCredit;
  const paymentPercentage = (usedCredit / creditLimit) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return '#10B981';
      case 'Pending':
        return '#F59E0B';
      case 'Overdue':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return '✅';
      case 'Pending':
        return '⏳';
      case 'Overdue':
        return '⚠️';
      default:
        return '📋';
    }
  };

  return (
    <>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💳 Payment Details</Text>
          <Text style={styles.subtitle}>Manage your credit & payments</Text>
        </View>

        {/* Credit Overview Section */}
        <View style={styles.creditSection}>
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <Text style={styles.creditHeaderTitle}>Credit Limit</Text>
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>Active</Text>
              </View>
            </View>

            <Text style={styles.creditAmount}>₹{creditLimit || 0}</Text>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(paymentPercentage, 100)}%`,
                      backgroundColor: paymentPercentage > 80 ? '#DC2626' : paymentPercentage > 50 ? '#F59E0B' : '#10B981'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressLabel}>
                {paymentPercentage.toFixed(0)}% Used
              </Text>
            </View>

            <View style={styles.creditDetails}>
              <View style={styles.creditDetailItem}>
                <Text style={styles.detailLabel}>Used Credit</Text>
                <Text style={styles.detailAmount}>₹{usedCredit || 0}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.creditDetailItem}>
                <Text style={styles.detailLabel}>Available</Text>
                <Text style={[styles.detailAmount, { color: '#10B981' }]}>
                  ₹{availableCredit || 0}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.creditDetailItem}>
                <Text style={styles.detailLabel}>Due Amount</Text>
                <Text style={[styles.detailAmount, { color: '#DC2626' }]}>
                  ₹{duePayments || 0}
                </Text>
              </View>
            </View>

            {duePayments > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Outstanding Amount</Text>
                  <Text style={styles.warningText}>
                    You have ₹{duePayments} pending payment
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Payment Summary Cards */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>📊</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Total Paid This Month</Text>
              <Text style={styles.summaryAmount}>₹55,000</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>✅</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Last Paid On</Text>
              <Text style={styles.summaryAmount}>25 Feb 2026</Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Payment History</Text>
          <FlatList
            data={paymentRecords}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.paymentItem}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.paymentDate}>{item.date}</Text>
                  <Text style={styles.paymentMethod}>{item.method}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>₹{item.amount}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusIcon]}>{getStatusIcon(item.status)}</Text>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  creditSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  creditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditHeaderTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  creditBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  creditBadgeText: {
    fontSize: 11,
    color: '#0B5394',
    fontWeight: '600',
  },
  creditAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  creditDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  creditDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  warningBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#991B1B',
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryIconText: {
    fontSize: 24,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  historySection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  paymentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentLeft: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusIcon: {
    fontSize: 11,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});
