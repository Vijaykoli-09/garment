import React, { useContext, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert, StatusBar,
} from 'react-native';
import { AppContext, CartItem } from '../context/AppContext';

// ── Group flat cart array by productId ───────────────────────────────
interface ProductGroup {
  productId:   number;
  name:        string;
  images:      string[];
  pcsPerBox:   number;
  pricePerPc:  number;
  pricePerBox: number;
  sizes:       CartItem[];
  productSubtotal: number;
  productGst:      number;
  productTotal:    number;
  totalBoxes:      number;
  totalPcs:        number;
}

function groupCart(cart: CartItem[]): ProductGroup[] {
  const map = new Map<number, ProductGroup>();

  for (const item of cart) {
    if (!map.has(item.productId)) {
      map.set(item.productId, {
        productId:       item.productId,
        name:            item.name,
        images:          item.images,
        pcsPerBox:       item.pcsPerBox,
        pricePerPc:      item.pricePerPc,
        pricePerBox:     item.pricePerBox,
        sizes:           [],
        productSubtotal: 0,
        productGst:      0,
        productTotal:    0,
        totalBoxes:      0,
        totalPcs:        0,
      });
    }
    const g = map.get(item.productId)!;
    g.sizes.push(item);
    g.productSubtotal += item.pricePerBox * item.boxes;
    g.totalBoxes      += item.boxes;
    g.totalPcs        += item.quantity;
  }

  for (const g of map.values()) {
    g.productGst   = g.productSubtotal * 0.18;
    g.productTotal = g.productSubtotal + g.productGst;
  }

  return Array.from(map.values());
}

// ════════════════════════════════════════════════════════════════════
export default function CartScreen({ navigation }: any) {
  const {
    cart, removeFromCart, updateCartItem, clearCart,
    cartTotal, cartTotalWithGst,
    creditApproved, availableCredit,
  } = useContext(AppContext);

  const groups     = useMemo(() => groupCart(cart), [cart]);
  const gstAmount  = cartTotal * 0.18;
  const totalBoxes = cart.reduce((s, i) => s + i.boxes, 0);

  const confirmClear = () =>
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearCart },
    ]);

  const confirmRemoveRow = (item: CartItem) =>
    Alert.alert(
      'Remove Item',
      `Remove ${item.selectedSize}${item.shade ? ` · ${item.shade}` : ''} from ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          // Pass shadeCode as third arg — new signature
          onPress: () => removeFromCart(item.productId, item.selectedSize, item.shadeCode),
        },
      ]
    );

  // ── Size/shade row inside product card ──────────────────────────
  const SizeRow = ({ item }: { item: CartItem }) => {
    const rowSubtotal = item.pricePerBox * item.boxes;

    return (
      <View style={s.sizeRow}>
        {/* Size + shade chip */}
        <View style={s.sizeShadeCol}>
          <View style={s.sizeChip}>
            <Text style={s.sizeChipTxt}>{item.selectedSize}</Text>
          </View>
          {item.shade ? (
            <Text style={s.shadeLabel} numberOfLines={1}>{item.shade}</Text>
          ) : null}
        </View>

        {/* Boxes stepper */}
        <View style={s.stepper}>
          <TouchableOpacity
            style={[s.stepBtn, item.boxes <= 1 && s.stepBtnDim]}
            onPress={() => {
              if (item.boxes <= 1) confirmRemoveRow(item);
              // Pass shadeCode as third arg — new signature
              else updateCartItem(item.productId, item.selectedSize, item.shadeCode, item.boxes - 1);
            }}
          >
            <Text style={s.stepBtnTxt}>{item.boxes <= 1 ? '🗑' : '−'}</Text>
          </TouchableOpacity>
          <Text style={s.stepVal}>{item.boxes}</Text>
          <TouchableOpacity
            style={s.stepBtn}
            onPress={() => updateCartItem(item.productId, item.selectedSize, item.shadeCode, item.boxes + 1)}
          >
            <Text style={s.stepBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Pcs */}
        <Text style={s.pcsCell}>{item.quantity} pcs</Text>

        {/* Subtotal */}
        <Text style={s.subtotalCell}>
          ₹{rowSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
    );
  };

  // ── Product card ─────────────────────────────────────────────────
  const ProductCard = ({ group }: { group: ProductGroup }) => (
    <View style={s.productCard}>

      <View style={s.productHeader}>
        {group.images?.[0]
          ? <Image source={{ uri: group.images[0] }} style={s.productImg} />
          : <View style={s.productImgPh}><Text style={{ fontSize: 28 }}>👕</Text></View>
        }
        <View style={s.productInfo}>
          <Text style={s.productName} numberOfLines={2}>{group.name}</Text>
          <Text style={s.productMeta}>
            ₹{group.pricePerPc.toFixed(2)}/pc  ·  ₹{group.pricePerBox.toLocaleString()}/box
          </Text>
          <Text style={s.productMeta}>{group.pcsPerBox} pcs per box</Text>
        </View>
        <TouchableOpacity
          style={s.removeAllBtn}
          onPress={() =>
            Alert.alert('Remove Product', `Remove all rows of "${group.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove All', style: 'destructive',
                onPress: () => group.sizes.forEach(i =>
                  removeFromCart(i.productId, i.selectedSize, i.shadeCode)
                ),
              },
            ])
          }
        >
          <Text style={s.removeAllTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Table header */}
      <View style={s.tableHeader}>
        <Text style={[s.tableHdrCell, { flex: 1.5 }]}>SIZE / SHADE</Text>
        <Text style={[s.tableHdrCell, { flex: 2.2, textAlign: 'center' }]}>BOXES</Text>
        <Text style={[s.tableHdrCell, { flex: 1.5, textAlign: 'center' }]}>PCS</Text>
        <Text style={[s.tableHdrCell, { flex: 2, textAlign: 'right' }]}>AMOUNT</Text>
      </View>

      {group.sizes.map(item => <SizeRow key={`${item.selectedSize}-${item.shadeCode}`} item={item} />)}

      {/* Product summary */}
      <View style={s.productSummary}>
        <View style={s.summaryLine}>
          <Text style={s.summaryLbl}>
            {group.totalBoxes} box{group.totalBoxes !== 1 ? 'es' : ''}  ·  {group.totalPcs} pcs
          </Text>
        </View>
        <View style={s.summaryLine}>
          <Text style={s.summaryLbl}>Subtotal</Text>
          <Text style={s.summaryVal}>
            ₹{group.productSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={s.summaryLine}>
          <Text style={s.summaryLbl}>GST (18%)</Text>
          <Text style={s.summaryVal}>
            ₹{group.productGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[s.summaryLine, s.summaryTotalLine]}>
          <Text style={s.summaryTotalLbl}>Product Total</Text>
          <Text style={s.summaryTotalVal}>
            ₹{group.productTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!cart.length) {
    return (
      <View style={s.emptyWrap}>
        <Text style={{ fontSize: 64 }}>🛒</Text>
        <Text style={s.emptyTitle}>Cart is Empty</Text>
        <Text style={s.emptySub}>Add products from the catalog to start an order</Text>
        <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate('ProductList')}>
          <Text style={s.browseBtnTxt}>Browse Products →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar backgroundColor="#F1F5F9" barStyle="dark-content" />
      <FlatList
        data={groups}
        keyExtractor={g => String(g.productId)}
        renderItem={({ item }) => <ProductCard group={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={
          <View style={s.listHeader}>
            <Text style={s.listHeaderTxt}>
              {groups.length} product{groups.length !== 1 ? 's' : ''}  ·  {totalBoxes} boxes
            </Text>
            <TouchableOpacity onPress={confirmClear}>
              <Text style={s.clearTxt}>Clear All</Text>
            </TouchableOpacity>
          </View>
        }

        ListFooterComponent={
          <View>
            <View style={s.grandSummary}>
              <Text style={s.grandSummaryTitle}>🧾 Order Summary</Text>

              {groups.map(g => (
                <View key={g.productId} style={s.grandRow}>
                  <Text style={s.grandRowLbl} numberOfLines={1}>{g.name}</Text>
                  <Text style={s.grandRowVal}>
                    ₹{g.productSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}

              <View style={s.grandDivider} />
              <View style={s.grandRow}>
                <Text style={s.grandRowLbl}>Subtotal</Text>
                <Text style={s.grandRowVal}>
                  ₹{cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={s.grandRow}>
                <Text style={s.grandRowLbl}>GST (18%)</Text>
                <Text style={s.grandRowVal}>
                  ₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={s.grandDivider} />
              <View style={s.grandRow}>
                <Text style={s.grandTotalLbl}>Grand Total</Text>
                <Text style={s.grandTotalVal}>
                  ₹{cartTotalWithGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>

              {creditApproved && (
                <View style={[s.creditRow, cartTotalWithGst > availableCredit && s.creditRowRed]}>
                  <Text style={s.creditLbl}>Available Credit</Text>
                  <Text style={[s.creditVal, { color: cartTotalWithGst <= availableCredit ? '#059669' : '#DC2626' }]}>
                    ₹{availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ height: 110 }} />
          </View>
        }
      />

      {/* Sticky checkout bar */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomTotal}>
            ₹{cartTotalWithGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.bottomSub}>Total incl. GST</Text>
        </View>
        <TouchableOpacity style={s.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
          <Text style={s.checkoutTxt}>Proceed to Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F1F5F9' },
  emptyWrap:       { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  emptyTitle:      { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  emptySub:        { fontSize: 14, color: '#64748B', textAlign: 'center' },
  browseBtn:       { marginTop: 6, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  browseBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  list:            { padding: 12 },
  listHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  listHeaderTxt:   { fontSize: 13, fontWeight: '600', color: '#475569' },
  clearTxt:        { fontSize: 13, color: '#DC2626', fontWeight: '600' },

  productCard:     { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  productHeader:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  productImg:      { width: 64, height: 64, borderRadius: 10 },
  productImgPh:    { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo:     { flex: 1 },
  productName:     { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4, lineHeight: 19 },
  productMeta:     { fontSize: 11, color: '#64748B', lineHeight: 16 },
  removeAllBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  removeAllTxt:    { fontSize: 13, color: '#DC2626', fontWeight: '800' },

  tableHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tableHdrCell:    { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 },

  sizeRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  // Size + shade stacked
  sizeShadeCol:    { flex: 1.5, gap: 3 },
  sizeChip:        { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', alignItems: 'center' },
  sizeChipTxt:     { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  shadeLabel:      { fontSize: 10, color: '#7C3AED', fontWeight: '600', paddingLeft: 2 },

  stepper:         { flex: 2.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stepBtn:         { width: 28, height: 28, borderRadius: 7, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  stepBtnDim:      { backgroundColor: '#FCA5A5' },
  stepBtnTxt:      { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  stepVal:         { fontSize: 15, fontWeight: '800', color: '#0F172A', minWidth: 22, textAlign: 'center' },
  pcsCell:         { flex: 1.5, fontSize: 12, color: '#475569', textAlign: 'center' },
  subtotalCell:    { flex: 2, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'right' },

  productSummary:  { marginHorizontal: 12, marginTop: 10, marginBottom: 12, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryLine:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLbl:      { fontSize: 12, color: '#64748B' },
  summaryVal:      { fontSize: 12, fontWeight: '600', color: '#374151' },
  summaryTotalLine:{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 8 },
  summaryTotalLbl: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  summaryTotalVal: { fontSize: 15, fontWeight: '800', color: '#2563EB' },

  grandSummary:     { backgroundColor: '#fff', borderRadius: 16, marginTop: 4, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  grandSummaryTitle:{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  grandRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  grandRowLbl:      { fontSize: 13, color: '#64748B', flex: 1, marginRight: 8 },
  grandRowVal:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  grandDivider:     { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 },
  grandTotalLbl:    { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  grandTotalVal:    { fontSize: 20, fontWeight: '900', color: '#2563EB' },
  creditRow:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  creditRowRed:     { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  creditLbl:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  creditVal:        { fontSize: 14, fontWeight: '800' },

  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  bottomTotal:     { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  bottomSub:       { fontSize: 11, color: '#6B7280', marginTop: 1 },
  checkoutBtn:     { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  checkoutTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },
});