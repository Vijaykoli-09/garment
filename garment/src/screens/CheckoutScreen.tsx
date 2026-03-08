import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function CheckoutScreen({ navigation }: any) {
  const { cart, cartTotal, cartTotalWithGst } = useContext(AppContext);
  const gstAmount = cartTotalWithGst - cartTotal;
  const grandTotal = cartTotalWithGst;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <Text style={styles.itemCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.productId}-${item.selectedSize}`}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imageEmoji}>👕</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productSize}>Size: {item.selectedSize}</Text>
                <Text style={styles.productQty}>Qty: {item.quantity}</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>₹{item.pricePerPc} × {item.quantity}</Text>
              <Text style={styles.priceValue}>₹{(item.pricePerPc * item.quantity).toFixed(2)}</Text>
            </View>
          </View>
        )}
        scrollEnabled={true}
        ListFooterComponent={
          <>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{cartTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (18%)</Text>
                <Text style={styles.summaryValue}>₹{gstAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => navigation.navigate('PaymentMethod')}
            >
              <Text style={styles.payText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </>
        }
      />
    </View>
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
  itemCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageEmoji: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productQty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  summaryBox: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  payBtn: {
    backgroundColor: '#10B981',
    marginHorizontal: 12,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  }
});