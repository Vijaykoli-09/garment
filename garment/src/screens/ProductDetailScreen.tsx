import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, Image, Dimensions, Modal,
} from 'react-native';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');
const GST = 0.18;

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product } = route.params;
  const { addToCart, remainingCredit, user } = useContext(AppContext);

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] ?? '');
  const [boxes, setBoxes]               = useState(1);
  const [activeImg, setActiveImg]       = useState(0);
  const [fullScreen, setFullScreen]     = useState(false);

  const getPrice = useCallback(() => {
    if (user?.type === 'Wholesaler')      return product.pricing.wholeSeller;
    if (user?.type === 'Semi_Wholesaler') return product.pricing.semiWholeSeller;
    return product.pricing.retailer;
  }, [user, product]);

  const pricePerPc = getPrice();
  const pcsPerBox  = product.boxQuantity ?? 12;
  const totalPcs   = boxes * pcsPerBox;
  const subtotal   = pricePerPc * totalPcs;
  const gstAmt     = subtotal * GST;
  const total      = subtotal + gstAmt;
  const canAfford  = !user?.creditEnabled || total <= remainingCredit;

  const handleAddToCart = () => {
    if (!canAfford) {
      Alert.alert('⚠️ Insufficient Credit',
        `This order (₹${total.toFixed(0)}) exceeds your available credit (₹${remainingCredit.toFixed(0)}).`);
      return;
    }
    addToCart({ ...product, selectedSize }, totalPcs, pricePerPc);
    Alert.alert(
      '✅ Added to Cart',
      `${product.name} (${selectedSize}) — ${totalPcs} pcs added!`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart →', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  return (
    <>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Fullscreen image modal */}
      <Modal visible={fullScreen} transparent animationType="fade"
        onRequestClose={() => setFullScreen(false)}>
        <View style={s.fsOverlay}>
          <TouchableOpacity style={s.fsClose} onPress={() => setFullScreen(false)}>
            <Text style={s.fsCloseTxt}>✕</Text>
          </TouchableOpacity>
          {product.images?.length > 0
            ? <Image source={{ uri: product.images[activeImg] }}
                style={{ width, height: width }} resizeMode="contain" />
            : <Text style={{ fontSize: 80 }}>👕</Text>
          }
        </View>
      </Modal>

      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

        {/* Main image */}
        <TouchableOpacity onPress={() => product.images?.length > 0 && setFullScreen(true)}>
          {product.images?.length > 0
            ? <Image source={{ uri: product.images[activeImg] }} style={s.mainImg} resizeMode="cover" />
            : <View style={s.imgPlaceholder}><Text style={{ fontSize: 70 }}>👕</Text></View>
          }
          {product.images?.length > 0 && (
            <View style={s.zoomHint}><Text style={s.zoomTxt}>🔍 Tap to enlarge</Text></View>
          )}
        </TouchableOpacity>

        {/* Thumbnails */}
        {product.images?.length > 1 && (
          <View style={s.thumbRow}>
            {product.images.map((uri: string, i: number) => (
              <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                <Image source={{ uri }}
                  style={[s.thumb, { borderColor: i === activeImg ? '#2563EB' : 'transparent' }]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.content}>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.desc}>{product.description}</Text>

          {/* My price tier */}
          <View style={s.tierChip}>
            <Text style={s.tierTxt}>
              {user?.type?.replace('_', ' ')} price:{' '}
              <Text style={{ fontWeight: '800' }}>₹{pricePerPc}/pc</Text>
            </Text>
          </View>

          {/* All 3 tier prices */}
          <View style={s.allPrices}>
            {[
              { lbl: 'Wholesaler',    val: product.pricing.wholeSeller,     me: user?.type === 'Wholesaler' },
              { lbl: 'Semi Wholesale', val: product.pricing.semiWholeSeller, me: user?.type === 'Semi_Wholesaler' },
              { lbl: 'Retailer',      val: product.pricing.retailer,        me: !user?.type || user.type === 'Retailer' },
            ].map(({ lbl, val, me }) => (
              <View key={lbl} style={[s.pc, me && s.pcActive]}>
                <Text style={[s.pcLbl, me && s.pcLblActive]}>{lbl}</Text>
                <Text style={[s.pcVal, me && s.pcValActive]}>₹{val}</Text>
              </View>
            ))}
          </View>

          {/* Size selector */}
          {product.sizes?.length > 0 && (
            <View style={s.section}>
              <Text style={s.secTitle}>Select Size</Text>
              <View style={s.sizes}>
                {product.sizes.map((sz: string) => (
                  <TouchableOpacity key={sz}
                    style={[s.sizeChip, selectedSize === sz && s.sizeChipActive]}
                    onPress={() => setSelectedSize(sz)}>
                    <Text style={[s.sizeTxt, selectedSize === sz && s.sizeTxtActive]}>{sz}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Box qty */}
          <View style={s.section}>
            <Text style={s.secTitle}>Number of Boxes</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={[s.qtyBtn, boxes <= 1 && s.qtyBtnOff]}
                onPress={() => boxes > 1 && setBoxes(b => b - 1)}
                disabled={boxes <= 1}
              >
                <Text style={s.qtyBtnTxt}>−</Text>
              </TouchableOpacity>
              <View style={s.qtyMid}>
                <Text style={s.qtyNum}>{boxes}</Text>
                <Text style={s.qtyLbl}>boxes</Text>
              </View>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setBoxes(b => b + 1)}>
                <Text style={s.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={s.pcsSummary}>
              <Text style={s.pcsTxt}>{boxes} box{boxes > 1 ? 'es' : ''} × {pcsPerBox} pcs</Text>
              <Text style={s.pcsTotal}>{totalPcs} pcs total</Text>
            </View>
          </View>

          {/* Price breakdown */}
          <View style={s.section}>
            <Text style={s.secTitle}>Price Breakdown</Text>
            {[
              ['Price per pc', `₹${pricePerPc}`],
              ['Total pieces', `${totalPcs} pcs`],
              ['Subtotal',     `₹${subtotal.toLocaleString()}`],
              ['GST (18%)',    `₹${gstAmt.toFixed(2)}`],
            ].map(([lbl, val]) => (
              <View key={lbl} style={s.bRow}>
                <Text style={s.bLbl}>{lbl}</Text>
                <Text style={s.bVal}>{val}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLbl}>Total Amount</Text>
              <Text style={s.totalVal}>
                ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Credit status */}
          {user?.creditEnabled && (
            <View style={[s.creditBox, !canAfford && s.creditBoxRed]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[s.creditLbl, !canAfford && { color: '#DC2626' }]}>
                  Available Credit
                </Text>
                <Text style={[s.creditAmt, !canAfford && { color: '#DC2626' }]}>
                  ₹{remainingCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              {!canAfford && (
                <Text style={s.creditWarn}>⚠️ Order amount exceeds available credit</Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Add to Cart */}
      <View style={s.sticky}>
        <TouchableOpacity
          style={[s.cartBtn, !canAfford && s.cartBtnOff]}
          onPress={handleAddToCart}
          disabled={!canAfford}
        >
          <Text style={s.cartBtnTxt}>
            {canAfford ? `🛒  Add ${totalPcs} pcs to Cart` : '⚠️  Insufficient Credit'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mainImg: { width, height: 280 },
  imgPlaceholder: { width, height: 280, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  zoomHint: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  zoomTxt: { color: '#fff', fontSize: 11 },
  thumbRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  thumb: { width: 58, height: 58, borderRadius: 8, borderWidth: 2.5 },
  content: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  desc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  tierChip: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  tierTxt: { fontSize: 13, color: '#1D4ED8' },
  allPrices: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pc: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  pcActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  pcLbl: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  pcLblActive: { color: '#1D4ED8' },
  pcVal: { fontSize: 14, fontWeight: '800', color: '#374151' },
  pcValActive: { color: '#2563EB' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  secTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F9FAFB' },
  sizeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sizeTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sizeTxtActive: { color: '#fff' },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyBtn: { width: 44, height: 44, backgroundColor: '#2563EB', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyBtnOff: { backgroundColor: '#CBD5E1' },
  qtyBtnTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
  qtyMid: { alignItems: 'center' },
  qtyNum: { fontSize: 28, fontWeight: '800', color: '#111827' },
  qtyLbl: { fontSize: 12, color: '#6B7280' },
  pcsSummary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  pcsTxt: { fontSize: 13, color: '#374151' },
  pcsTotal: { fontSize: 14, fontWeight: '800', color: '#059669' },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bLbl: { fontSize: 13, color: '#6B7280' },
  bVal: { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLbl: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalVal: { fontSize: 18, fontWeight: '800', color: '#2563EB' },
  creditBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  creditBoxRed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  creditLbl: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  creditAmt: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  creditWarn: { fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 6 },
  sticky: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  cartBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cartBtnOff: { backgroundColor: '#CBD5E1' },
  cartBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  fsOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsClose: { position: 'absolute', top: 44, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  fsCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
});