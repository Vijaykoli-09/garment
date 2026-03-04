import React from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native';

const orders = [
  { id: 201, date: '14 Feb 2026', total: 5000, status: 'Accepted', items: 2 },
  { id: 202, date: '13 Feb 2026', total: 8500, status: 'Accepted', items: 4 },
  { id: 203, date: '12 Feb 2026', total: 12000, status: 'Accepted', items: 6 },
  { id: 204, date: '11 Feb 2026', total: 7200, status: 'Accepted', items: 3 },
];

export default function AcceptedOrdersScreen() {
  return (
    <>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>✅ Accepted Orders</Text>
            <Text style={styles.subtitle}>Orders ready to process</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✅ {item.status}</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardBottom}>
              <View style={styles.detail}>
                <Text style={styles.label}>Items</Text>
                <Text style={styles.value}>{item.items}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.label}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{item.total}</Text>
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
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    paddingBottom: 20,
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
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
});