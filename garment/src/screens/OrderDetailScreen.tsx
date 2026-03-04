import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';

export default function OrderDetailScreen({ route }: any) {
  const { order } = route.params;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Order Details</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>#{order.id}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: '#10B981' }]}>{order.status}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{order.date || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Summary</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Items</Text>
          <Text style={styles.value}>{order.items || 'N/A'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>₹{order.total}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>GST (18%)</Text>
          <Text style={styles.value}>₹{(order.total * 0.18).toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRowTotal}>
          <Text style={styles.labelTotal}>Total Amount</Text>
          <Text style={styles.valueTotal}>₹{(order.total * 1.18).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Shipping Information</Text>
        <Text style={styles.infoText}>Your order will be shipped to your registered delivery address. You will receive a tracking notification once your order is dispatched.</Text>
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
  headerTitle: {
    fontSize: 24,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  labelTotal: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  valueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
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