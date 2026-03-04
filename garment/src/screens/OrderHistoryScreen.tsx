import React from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native';

const orders = [
  { id: '1', date: '15 Feb 2026', total: 25000, status: 'Delivered', items: 5 },
  { id: '2', date: '10 Feb 2026', total: 40000, status: 'Pending Payment', items: 8 },
  { id: '3', date: '05 Feb 2026', total: 18500, status: 'Delivered', items: 3 },
  { id: '4', date: '01 Feb 2026', total: 32000, status: 'Processing', items: 6 },
];

export default function OrderHistoryScreen() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return '#10B981';
      case 'Processing':
        return '#F59E0B';
      case 'Pending Payment':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'Delivered':
        return '✅';
      case 'Processing':
        return '⏳';
      case 'Pending Payment':
        return '⚠️';
      default:
        return '📦';
    }
  };

  return (
    <>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>📦 Order History</Text>
            <Text style={styles.subtitle}>Your past orders</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusEmoji]}>
                  {getStatusEmoji(item.status)}
                </Text>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardFooter}>
              <View style={styles.cardDetail}>
                <Text style={styles.label}>Items: {item.items}</Text>
              </View>
              <View style={styles.cardDetail}>
                <Text style={styles.label}>Total:</Text>
                <Text style={styles.amount}>₹{item.total}</Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        style={styles.container}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardDetail: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
});