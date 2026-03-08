import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function CartScreen({ navigation }: any) {
  const { cart, removeFromCart, cartTotal, cartTotalWithGst, updateCartItem } = useContext(AppContext);

  const gstAmount = cartTotalWithGst - cartTotal;
  const grandTotal = cartTotalWithGst;

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before checkout');
      return;
    }
    navigation.navigate('Checkout');
  };

  return (
    <View style={styles.container}>
      {cart.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Add products from our catalog to get started</Text>
          <TouchableOpacity style={styles.continueBrowsingBtn}>
            <Text style={styles.continueBrowsingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <Text style={styles.itemCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(item) => `${item.productId}-${item.selectedSize}`}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imageEmoji}>👕</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.size}>Size: {item.selectedSize}</Text>
                    <Text style={styles.price}>₹{item.pricePerBox?.toFixed(2) ?? '0.00'}/box  ·  ₹{item.pricePerPc?.toFixed(2) ?? '0.00'}/pc</Text>
                  </View>
                </View>

                <View style={styles.qtySection}>
                  <Text style={styles.label}>Quantity (Boxes)</Text>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => {
                        if (item.boxes > 1) {
                          updateCartItem(item.productId, item.selectedSize, item.boxes - 1);
                        }
                      }}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.boxes} box{item.boxes > 1 ? 'es' : ''}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateCartItem(item.productId, item.selectedSize, item.boxes + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
                    {item.boxes} box{item.boxes > 1 ? 'es' : ''} × {item.pcsPerBox} pcs = {item.quantity} pcs total
                  </Text>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Item Total</Text>
                  <Text style={styles.totalPrice}>₹{(item.pricePerBox * item.boxes).toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => removeFromCart(item.productId, item.selectedSize)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>🗑️ Remove</Text>
                </TouchableOpacity>
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

                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                  <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                </TouchableOpacity>
              </>
            }
          />
        </>
      )}
    </View>
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
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemCount: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  continueBrowsingBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBrowsingText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
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
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageEmoji: {
    fontSize: 36,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  size: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  qtySection: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  qtyBtn: {
    backgroundColor: '#F3F4F6',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  removeBtn: {
    backgroundColor: '#FEE2E230',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  checkoutBtn: {
    backgroundColor: '#10B981',
    marginHorizontal: 12,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});