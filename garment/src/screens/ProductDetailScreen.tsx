import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, Modal, Dimensions, Image,
} from 'react-native';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');
const GST = 0.18;

function getMyPrice(pricing: any, type?: string): number {
  if (type === 'Wholesaler')      return pricing?.wholeSeller     ?? 0;
  if (type === 'Semi_Wholesaler') return pricing?.semiWholeSeller ?? 0;
  return pricing?.retailer ?? 0;
}

function getVisiblePrices(pricing: any, type?: string) {
  const tiers = [];
  if (type === 'Wholesaler') {
    tiers.push({ label: 'Wholesaler',      price: pricing?.wholeSeller     ?? 0 });
    tiers.push({ label: 'Semi Wholesaler', price: pricing?.semiWholeSeller ?? 0 });
    tiers.push({ label: 'Retailer',        price: pricing?.retailer        ?? 0 });
  } else if (type === 'Semi_Wholesaler') {
    tiers.push({ label: 'Semi Wholesaler', price: pricing?.semiWholeSeller ?? 0 });
    tiers.push({ label: 'Retailer',        price: pricing?.retailer        ?? 0 });
  } else {
    tiers.push({ label: 'Retailer',        price: pricing?.retailer        ?? 0 });
  }
  return tiers;
}

function getMyMinBox(minBox: any, type?: string): number {
  if (type === 'Wholesaler')      return minBox?.wholeSeller     ?? 10;
  if (type === 'Semi_Wholesaler') return minBox?.semiWholeSeller ?? 8;
  return minBox?.retailer ?? 5;
}

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product } = route.params;
  const { addToCart, remainingCredit, creditApproved, user } = useContext(AppContext);

  const pricePerBox = getMyPrice(product.pricing, user?.type);
  const minBoxes    = getMyMinBox(product.minBox,  user?.type);
  const pcsPerBox   = product.boxQuantity ?? 12;

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] ?? '');
  const [boxes, setBoxes]               = useState(minBoxes);
  const [activeImg, setActiveImg]       = useState(0);
  const [fullScreen, setFullScreen]     = useState(false);
const visiblePrices = getVisiblePrices(product.pricing, user?.type);
  const totalPcs   = boxes * pcsPerBox;
  const subtotal   = pricePerBox * boxes;
  const gstAmt     = subtotal * GST;
  const total      = subtotal + gstAmt;
  const pricePerPc = pcsPerBox > 0 ? (pricePerBox / pcsPerBox) : 0;

  const canAfford  = !creditApproved || total <= remainingCredit;
  const typeLabel  = user?.type?.replace('_', ' ') ?? 'Retailer';

  const decrement = () => { if (boxes > minBoxes) setBoxes(b => b - 1); };
  const increment = () => setBoxes(b => b + 1);

  const handleAddToCart = useCallback(() => {
    if (!canAfford) {
      Alert.alert('⚠️ Insufficient Credit',
        `Order total ₹${total.toFixed(0)} exceeds your available credit ₹${remainingCredit.toFixed(0)}.`);
      return;
    }
    addToCart({ ...product, selectedSize }, boxes, pcsPerBox, pricePerBox);
    Alert.alert(
      '✅ Added to Cart',
      `${product.name} (${selectedSize})\n${boxes} box${boxes > 1 ? 'es' : ''} · ${totalPcs} pcs`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart →', onPress: () => navigation.navigate('Cart') },
      ]
    );
  }, [canAfford, total, boxes, totalPcs, selectedSize]);

  return (
    <>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <Modal visible={fullScreen} transparent animationType="fade"
        onRequestClose={() => setFullScreen(false)}>
        <View style={s.fsOverlay}>
          <TouchableOpacity style={s.fsClose} onPress={() => setFullScreen(false)}>
            <Text style={s.fsCloseTxt}>✕</Text>
          </TouchableOpacity>
          {product.images?.length > 0
            ? <Image source={{ uri: product.images[activeImg] }}
                style={{ width, height: width }} resizeMode="contain" />
            : <Text style={{ fontSize: 80, color: '#fff' }}>👕</Text>
          }
        </View>
      </Modal>

      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => product.images?.length > 0 && setFullScreen(true)}>
          {product.images?.length > 0
            ? <Image source={{ uri: product.images[activeImg] }} style={s.mainImg} resizeMode="cover" />
            : <View style={s.imgPh}><Text style={{ fontSize: 80 }}>👕</Text></View>
          }
          {product.images?.length > 0 && (
            <View style={s.zoomHint}><Text style={s.zoomTxt}>🔍 Tap to enlarge</Text></View>
          )}
        </TouchableOpacity>

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

          {/* ── PRICE CARD — piece is now the hero number ── */}
         {/* ── PRICE CARD ── */}
<View style={s.myPriceCard}>
  <View style={s.myPriceLeft}>
    <Text style={s.myPriceTier}>Your Price  ({typeLabel})</Text>

    {/* BIG: your own price per piece */}
    <Text style={s.myPriceBox}>
      ₹{pricePerPc.toFixed(2)}
      <Text style={s.myPriceUnit}> / piece</Text>
    </Text>
    <Text style={s.myPricePc}>
      ₹{pricePerBox.toLocaleString()} per box  ·  {pcsPerBox} pcs per box
    </Text>

    {/* Other visible tiers */}
    {visiblePrices.length > 1 && (
      <View style={s.otherTiers}>
        {visiblePrices.slice(1).map(tier => (
          <Text key={tier.label} style={s.otherTierTxt}>
            {tier.label}: ₹{(tier.price / pcsPerBox).toFixed(2)}/pc
            {'  '}(₹{tier.price.toLocaleString()}/box)
          </Text>
        ))}
      </View>
    )}
  </View>

  <View style={s.myPriceRight}>
    <Text style={s.myMinLabel}>Min Order</Text>
    <Text style={s.myMinNum}>{minBoxes}</Text>
    <Text style={s.myMinUnit}>boxes</Text>
  </View>
</View>

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
              <View style={s.boxInfoBadge}>
                <Text style={s.boxInfoTxt}>📦 1 box = {pcsPerBox} pcs</Text>
              </View>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.secTitle}>Number of Boxes</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={[s.qtyBtn, boxes <= minBoxes && s.qtyBtnOff]}
                onPress={decrement}
                disabled={boxes <= minBoxes}
              >
                <Text style={s.qtyBtnTxt}>−</Text>
              </TouchableOpacity>
              <View style={s.qtyMid}>
                <Text style={s.qtyNum}>{boxes}</Text>
                <Text style={s.qtyLbl}>boxes</Text>
              </View>
              <TouchableOpacity style={s.qtyBtn} onPress={increment}>
                <Text style={s.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={s.minHint}>
              <Text style={s.minHintTxt}>
                ⚡ Minimum order: <Text style={{ fontWeight: '800' }}>{minBoxes} boxes</Text>
                {'  '}({minBoxes * pcsPerBox} pcs)
              </Text>
            </View>
            <View style={s.pcsSummary}>
              <Text style={s.pcsTxt}>{boxes} box{boxes > 1 ? 'es' : ''} × {pcsPerBox} pcs</Text>
              <Text style={s.pcsTotal}>{totalPcs} pcs total</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.secTitle}>Price Breakdown</Text>
            {([
              ['Price per piece', `₹${pricePerPc.toFixed(2)}`],
              ['Price per box',   `₹${pricePerBox.toLocaleString()}`],
              ['Boxes ordered',   `${boxes} boxes`],
              ['Total pieces',    `${totalPcs} pcs`],
              ['Subtotal',        `₹${subtotal.toLocaleString()}`],
              ['GST (18%)',       `₹${gstAmt.toFixed(2)}`],
            ] as [string, string][]).map(([lbl, val]) => (
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

          {creditApproved && (
            <View style={[s.creditBox, !canAfford && s.creditBoxRed]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[s.creditLbl, !canAfford && { color: '#DC2626' }]}>Available Credit</Text>
                <Text style={[s.creditAmt, !canAfford && { color: '#DC2626' }]}>
                  ₹{remainingCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              {!canAfford && (
                <Text style={s.creditWarn}>⚠️ Order amount exceeds your available credit</Text>
              )}
            </View>
          )}

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.sticky}>
        <View style={s.stickyLeft}>
          <Text style={s.stickyTotal}>
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.stickyPcs}>{boxes} boxes · {totalPcs} pcs</Text>
        </View>
        <TouchableOpacity
          style={[s.cartBtn, !canAfford && s.cartBtnOff]}
          onPress={handleAddToCart}
          disabled={!canAfford}
        >
          <Text style={s.cartBtnTxt}>
            {canAfford ? '🛒  Add to Cart' : '⚠️  Insufficient Credit'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAFC' },
  mainImg:        { width, height: 280 },
  imgPh:          { width, height: 280, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  zoomHint:       { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  zoomTxt:        { color: '#fff', fontSize: 11 },
  thumbRow:       { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  thumb:          { width: 58, height: 58, borderRadius: 8, borderWidth: 2.5 },
  content:        { padding: 16 },
  name:           { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  desc:           { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 14 },
  myPriceCard:    { flexDirection: 'row', backgroundColor: '#1e3a8a', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  myPriceLeft:    { flex: 1 },
  myPriceTier:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  myPriceBox:     { fontSize: 30, fontWeight: '900', color: '#fff' },        // ← now shows pricePerPc
  myPriceUnit:    { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.65)' },
  myPricePc:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }, // ← now shows pricePerBox
  myPriceRight:   { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, minWidth: 72 },
  myMinLabel:     { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  myMinNum:       { fontSize: 30, fontWeight: '900', color: '#fff' },
  myMinUnit:      { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  section:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  secTitle:       { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sizes:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F9FAFB' },
  sizeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sizeTxt:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  sizeTxtActive:  { color: '#fff' },
  boxInfoBadge:   { marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  boxInfoTxt:     { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  qtyRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyBtn:         { width: 46, height: 46, backgroundColor: '#2563EB', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyBtnOff:      { backgroundColor: '#CBD5E1' },
  qtyBtnTxt:      { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  qtyMid:         { alignItems: 'center' },
  qtyNum:         { fontSize: 30, fontWeight: '800', color: '#111827' },
  qtyLbl:         { fontSize: 12, color: '#6B7280' },
  minHint:        { marginTop: 8, backgroundColor: '#FFF7ED', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#FED7AA' },
  minHintTxt:     { fontSize: 12, color: '#92400E' },
  pcsSummary:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  pcsTxt:         { fontSize: 13, color: '#374151' },
  pcsTotal:       { fontSize: 14, fontWeight: '800', color: '#059669' },
  bRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bLbl:           { fontSize: 13, color: '#6B7280' },
  bVal:           { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLbl:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalVal:       { fontSize: 20, fontWeight: '800', color: '#2563EB' },
  creditBox:      { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  creditBoxRed:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  creditLbl:      { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  creditAmt:      { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  creditWarn:     { fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 6 },
  sticky:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  stickyLeft:     { flex: 1 },
  stickyTotal:    { fontSize: 20, fontWeight: '800', color: '#111827' },
  stickyPcs:      { fontSize: 12, color: '#6B7280', marginTop: 1 },
  cartBtn:        { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
  cartBtnOff:     { backgroundColor: '#CBD5E1' },
  cartBtnTxt:     { color: '#fff', fontSize: 14, fontWeight: '800' },
  fsOverlay:      { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsClose:        { position: 'absolute', top: 44, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  fsCloseTxt:     { color: '#fff', fontSize: 20, fontWeight: '700' },
  otherTiers:   { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 8 },
  otherTierTxt: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 3 },
});