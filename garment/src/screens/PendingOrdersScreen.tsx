import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';

const orders = [
  { id: 101, date: '16 Feb 2026', total: 2000, status: 'Pending', items: 1 },
  { id: 102, date: '15 Feb 2026', total: 5500, status: 'Pending', items: 3 },
  { id: 103, date: '14 Feb 2026', total: 3200, status: 'Pending', items: 2 },
];

export default function PendingOrdersScreen({ navigation }: any) {
  return (
    <>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>⏳ Pending Orders</Text>
            <Text style={styles.subtitle}>Orders awaiting confirmation</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderDetail', { order: item })}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>⏳ {item.status}</Text>
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
              <View style={styles.detailRight}>
                <Text style={styles.viewText}>View →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.acceptedButton}
            onPress={() => navigation.navigate('AcceptedOrders')}
          >
            <Text style={styles.acceptedButtonText}>View Accepted Orders ✅</Text>
          </TouchableOpacity>
        }
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  detail: {
    flex: 1,
  },
  detailRight: {
    alignItems: 'flex-end',
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
  viewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  acceptedButton: {
    backgroundColor: '#D1FAE5',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  acceptedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
});