import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function CreditCheckScreen() {
  const {
    creditLimit,
    usedCredit,
    duePayments,
    availableCredit,
    creditApproved
  } = useContext(AppContext);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>💰 Credit Overview</Text>
        <Text style={styles.subtitle}>Your credit account details</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusContent}>
          <Text style={styles.statusLabel}>Account Status</Text>
          <Text style={[styles.statusBadge, creditApproved ? styles.approved : styles.pending]}>
            {creditApproved ? '✅ Approved' : '⏳ Pending Approval'}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Total Credit Limit</Text>
          <Text style={styles.gridValue}>₹{creditLimit}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Used Credit</Text>
          <Text style={[styles.gridValue, { color: '#DC2626' }]}>₹{usedCredit}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Due Payments</Text>
          <Text style={[styles.gridValue, { color: '#F59E0B' }]}>₹{duePayments}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Available Credit</Text>
          <Text style={[styles.gridValue, { color: '#10B981' }]}>₹{availableCredit}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Credit Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Limit:</Text>
          <Text style={styles.summaryValue}>₹{creditLimit}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Used:</Text>
          <Text style={[styles.summaryValue, { color: '#DC2626' }]}>-₹{usedCredit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pending:</Text>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>-₹{duePayments}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelBold}>Available:</Text>
          <Text style={[styles.summaryValueBold, { color: '#10B981' }]}>₹{availableCredit}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Credit Information</Text>
        <Text style={styles.infoText}>Your credit limit is awarded based on your account status and payment history. Use your credit wisely to maintain a healthy account.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusCard: {
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
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approved: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  pending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'white',
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  gridLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  card: {
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
  cardTitle: {
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
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryLabelBold: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  infoBox: {
    backgroundColor: '#DBEAFE',
    marginHorizontal: 12,
    marginVertical: 12,
    marginBottom: 24,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0369A1',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
});