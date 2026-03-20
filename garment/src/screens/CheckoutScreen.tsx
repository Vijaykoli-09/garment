import React, { useContext, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, StatusBar,
} from 'react-native';
import { AppContext, CartItem } from '../context/AppContext';

// ── Same grouping logic as CartScreen ────────────────────────────────
interface ProductGroup {
  productId:       number;
  name:            string;
  images:          string[];
  pcsPerBox:       number;
  pricePerPc:      number;
  pricePerBox:     number;
  sizes:           CartItem[];
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
        productId: item.productId, name: item.name,
        images: item.images, pcsPerBox: item.pcsPerBox,
        pricePerPc: item.pricePerPc, pricePerBox: item.pricePerBox,
        sizes: [], productSubtotal: 0, productGst: 0,
        productTotal: 0, totalBoxes: 0, totalPcs: 0,
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
export default function CheckoutScreen({ navigation }: any) {
  const { cart, cartTotal, cartTotalWithGst, user, creditApproved, availableCredit } = useContext(AppContext);

  const groups    = useMemo(() => groupCart(cart), [cart]);
  const gstAmount = cartTotal * 0.18;
  const canAfford = !creditApproved || cartTotalWithGst <= availableCredit;

  // ── Read-only product card — same visual as CartScreen but no controls ──
  const ProductCard = ({ group }: { group: ProductGroup }) => (
    <View style={s.productCard}>

      {/* Header */}
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
      </View>

      {/* Size table header */}
      <View style={s.tableHeader}>
        <Text style={[s.tableHdr, { flex: 1.2 }]}>SIZE</Text>
        <Text style={[s.tableHdr, { flex: 1.5, textAlign: 'center' }]}>BOXES</Text>
        <Text style={[s.tableHdr, { flex: 1.5, textAlign: 'center' }]}>PCS</Text>
        <Text style={[s.tableHdr, { flex: 2, textAlign: 'right' }]}>AMOUNT</Text>
      </View>

      {/* Size rows — read-only, no stepper */}
      {group.sizes.map(item => {
        const rowTotal = item.pricePerBox * item.boxes;
        return (
          <View key={item.selectedSize} style={s.sizeRow}>
            <View style={s.sizeChip}>
              <Text style={s.sizeChipTxt}>{item.selectedSize}</Text>
            </View>
            <Text style={s.cell}>{item.boxes} box{item.boxes !== 1 ? 'es' : ''}</Text>
            <Text style={s.cell}>{item.quantity} pcs</Text>
            <Text style={s.amtCell}>
              ₹{rowTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        );
      })}

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

  return (
    <View style={s.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <FlatList
        data={groups}
        keyExtractor={g => String(g.productId)}
        renderItem={({ item }) => <ProductCard group={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={
          <View style={s.listHeader}>
            <Text style={s.listHeaderTxt}>
              {groups.length} product{groups.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.editTxt}>✏️ Edit Cart</Text>
            </TouchableOpacity>
          </View>
        }

        ListFooterComponent={
          <View>
            {/* Delivery address */}
            <View style={s.addressCard}>
              <Text style={s.addressTitle}>📍 Delivery Address</Text>
              <Text style={s.addressName}>{user?.name}</Text>
              <Text style={s.addressText}>
                {(user as any)?.deliveryAddress ?? 'No address on file'}
              </Text>
              <Text style={s.addressPhone}>+91 {user?.phone}</Text>
            </View>

            {/* Grand total */}
            <View style={s.grandCard}>
              <Text style={s.grandTitle}>🧾 Order Total</Text>
              {groups.map(g => (
                <View key={g.productId} style={s.grandRow}>
                  <Text style={s.grandLbl} numberOfLines={1}>{g.name}</Text>
                  <Text style={s.grandVal}>
                    ₹{g.productSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}
              <View style={s.grandDivider} />
              <View style={s.grandRow}>
                <Text style={s.grandLbl}>Subtotal</Text>
                <Text style={s.grandVal}>
                  ₹{cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={s.grandRow}>
                <Text style={s.grandLbl}>GST (18%)</Text>
                <Text style={s.grandVal}>
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
                <View style={[s.creditRow, !canAfford && s.creditRowRed]}>
                  <Text style={s.creditLbl}>Available Credit</Text>
                  <Text style={[s.creditVal, { color: canAfford ? '#059669' : '#DC2626' }]}>
                    ₹{availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 110 }} />
          </View>
        }
      />

      {/* Sticky bottom bar */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomTotal}>
            ₹{cartTotalWithGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.bottomSub}>Total incl. GST</Text>
        </View>
        <TouchableOpacity
          style={[s.payBtn, !canAfford && s.payBtnOff]}
          onPress={() => navigation.navigate('PaymentMethod')}
          disabled={!canAfford}
        >
          <Text style={s.payBtnTxt}>
            {canAfford ? 'Select Payment →' : '⚠️ Credit Exceeded'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F1F5F9' },
  list:            { padding: 12 },

  listHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  listHeaderTxt:   { fontSize: 13, fontWeight: '600', color: '#475569' },
  editTxt:         { fontSize: 13, color: '#2563EB', fontWeight: '600' },

  // Product card — identical to CartScreen
  productCard:     { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  productHeader:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  productImg:      { width: 64, height: 64, borderRadius: 10 },
  productImgPh:    { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo:     { flex: 1 },
  productName:     { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4, lineHeight: 19 },
  productMeta:     { fontSize: 11, color: '#64748B', lineHeight: 16 },

  tableHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tableHdr:        { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 },

  sizeRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sizeChip:        { flex: 1.2, backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center', alignItems: 'center', marginRight: 4 },
  sizeChipTxt:     { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  cell:            { flex: 1.5, fontSize: 12, color: '#475569', textAlign: 'center' },
  amtCell:         { flex: 2, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'right' },

  productSummary:  { marginHorizontal: 12, marginTop: 10, marginBottom: 12, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryLine:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLbl:      { fontSize: 12, color: '#64748B' },
  summaryVal:      { fontSize: 12, fontWeight: '600', color: '#374151' },
  summaryTotalLine:{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 8 },
  summaryTotalLbl: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  summaryTotalVal: { fontSize: 15, fontWeight: '800', color: '#2563EB' },

  // Address
  addressCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  addressTitle:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  addressName:     { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  addressText:     { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 4 },
  addressPhone:    { fontSize: 12, color: '#6B7280' },

  // Grand total
  grandCard:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  grandTitle:      { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  grandRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  grandLbl:        { fontSize: 13, color: '#64748B', flex: 1, marginRight: 8 },
  grandVal:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  grandDivider:    { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 },
  grandTotalLbl:   { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  grandTotalVal:   { fontSize: 20, fontWeight: '900', color: '#2563EB' },

  creditRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  creditRowRed:    { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  creditLbl:       { fontSize: 13, fontWeight: '600', color: '#374151' },
  creditVal:       { fontSize: 14, fontWeight: '800' },

  // Bottom bar
  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  bottomTotal:     { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  bottomSub:       { fontSize: 11, color: '#6B7280', marginTop: 1 },
  payBtn:          { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  payBtnOff:       { backgroundColor: '#CBD5E1' },
  payBtnTxt:       { color: '#fff', fontWeight: '800', fontSize: 14 },
});