import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { AppContext } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

// Each size has a fixed qty per box
const SIZE_BOX_QTY: Record<string, number> = {
  S: 12,
  M: 12,
  L: 12,
  XL: 12,
  XXL: 6,
  '3XL': 6,
  '4XL': 6,
};

const DEFAULT_BOX_QTY = 12;

export default function ProductDetailScreen({ route }: any) {
  const { product } = route.params;
  const { addToCart, remainingCredit } = useContext(AppContext);

  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [boxes, setBoxes] = useState(1);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  const gstRate = 0.18;

  const pcsPerBox = SIZE_BOX_QTY[selectedSize] ?? DEFAULT_BOX_QTY;
  const totalPcs = boxes * pcsPerBox;
  const subtotal = product.price * totalPcs;
  const gstAmount = subtotal * gstRate;
  const total = subtotal + gstAmount;

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setBoxes(1);
  };

  const handleAddToCart = () => {
    if (total > remainingCredit) {
      Alert.alert('⚠️ Credit Limit', 'Insufficient credit balance for this order.');
      return;
    }

    addToCart(
      { ...product, selectedSize },
      totalPcs,
      product.price
    );

    Alert.alert('✅ Success', `${boxes} box(es) — ${totalPcs} pcs added to cart!`);
  };

  return (
    <>
      <StatusBar backgroundColor="#1F2937" barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Full Screen Image Modal */}
        <Modal
          visible={fullScreenImageVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullScreenImageVisible(false)}
        >
          <View style={styles.fullScreenImageContainer}>
            <StatusBar backgroundColor="#000000" barStyle="light-content" />
            <TouchableOpacity
              style={styles.fullScreenCloseButton}
              onPress={() => setFullScreenImageVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.fullScreenImageBox}>
              <Text style={styles.fullScreenImageEmoji}>👕</Text>
            </View>
          </View>
        </Modal>

        {/* Product Image */}
        <TouchableOpacity
          style={styles.imageBox}
          onPress={() => setFullScreenImageVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.imageEmoji}>👕</Text>
          <Text style={styles.fullScreenTapText}>Tap for fullscreen</Text>
        </TouchableOpacity>

        <View style={styles.content}>

          {/* Title & Description */}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Size Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Size</Text>
            <View style={styles.sizeContainer}>
              {product.sizes.map((size: string) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeChip,
                    selectedSize === size && styles.activeSizeChip
                  ]}
                  onPress={() => handleSizeChange(size)}
                >
                  <Text style={[
                    styles.sizeText,
                    selectedSize === size && styles.activeSizeText
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.boxInfoBadge}>
              <Text style={styles.boxInfoText}>
                📦 1 box = {pcsPerBox} pcs ({selectedSize})
              </Text>
            </View>
          </View>

          {/* Box Quantity Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select No. of Boxes</Text>
            <View style={styles.qtyContainer}>
              <TouchableOpacity
                style={[styles.qtyButton, boxes <= 1 && styles.qtyButtonDisabled]}
                onPress={() => boxes > 1 && setBoxes(boxes - 1)}
                disabled={boxes <= 1}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>

              <View style={styles.qtyMiddle}>
                <Text style={styles.qtyBoxValue}>{boxes}</Text>
                <Text style={styles.qtyBoxLabel}>boxes</Text>
              </View>

              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setBoxes(boxes + 1)}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Pcs Summary */}
            <View style={styles.pcsSummaryRow}>
              <Text style={styles.pcsSummaryText}>
                {boxes} box{boxes > 1 ? 'es' : ''} × {pcsPerBox} pcs =
              </Text>
              <Text style={styles.pcsSummaryValue}>{totalPcs} pcs</Text>
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.breakdownBox}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Price per pc</Text>
              <Text style={styles.breakdownValue}>₹{product.price}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total pcs</Text>
              <Text style={styles.breakdownValue}>{totalPcs} pcs</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>₹{subtotal.toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>GST (18%)</Text>
              <Text style={styles.breakdownValue}>₹{gstAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Credit Info */}
          <View style={styles.creditBox}>
            <Text style={styles.creditLabel}>Remaining Credit Balance</Text>
            <Text style={styles.creditAmount}>₹{remainingCredit.toFixed(2)}</Text>
            {total > remainingCredit && (
              <Text style={styles.warningText}>⚠ Credit limit exceeded!</Text>
            )}
          </View>

        </View>

        {/* Add to Cart */}
        <TouchableOpacity
          style={[styles.cartButton, total > remainingCredit && styles.cartButtonDisabled]}
          onPress={handleAddToCart}
          disabled={total > remainingCredit}
        >
          <Text style={styles.cartButtonText}>🛒 Add to Cart — {totalPcs} pcs</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageBox: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  fullScreenImageEmoji: {
    fontSize: width * 0.5,
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  imageBox: {
    height: 280,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  imageEmoji: {
    fontSize: 80,
  },
  fullScreenTapText: {
    position: 'absolute',
    bottom: 14,
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  description: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  activeSizeChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sizeText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  activeSizeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  boxInfoBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  boxInfoText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  qtyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  qtyButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  qtyButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  qtyMiddle: {
    alignItems: 'center',
  },
  qtyBoxValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  qtyBoxLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  pcsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pcsSummaryText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  pcsSummaryValue: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '800',
  },
  breakdownBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 17,
    color: '#2563EB',
    fontWeight: '800',
  },
  creditBox: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  creditLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  creditAmount: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '600',
  },
  cartButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginBottom: 28,
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cartButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  cartButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});