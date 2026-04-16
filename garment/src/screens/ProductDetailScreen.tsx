import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, Modal, Dimensions, Image,
} from 'react-native';
import { AppContext } from '../context/AppContext';
import { ShadeInfo } from './ProductListScreen';

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
    tiers.push({ label: 'Retailer', price: pricing?.retailer ?? 0 });
  }
  return tiers;
}

function getMyMinBox(minBox: any, type?: string): number {
  if (type === 'Wholesaler')      return minBox?.wholeSeller     ?? 10;
  if (type === 'Semi_Wholesaler') return minBox?.semiWholeSeller ?? 8;
  return minBox?.retailer ?? 5;
}

// Simple heuristic color for shade swatches
function getSwatchColor(name: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('red'))    return '#ef4444';
  if (n.includes('blue'))   return '#3b82f6';
  if (n.includes('green'))  return '#22c55e';
  if (n.includes('yellow')) return '#eab308';
  if (n.includes('black'))  return '#111827';
  if (n.includes('white'))  return '#e5e7eb';
  if (n.includes('grey') || n.includes('gray')) return '#9ca3af';
  if (n.includes('pink'))   return '#ec4899';
  if (n.includes('orange')) return '#f97316';
  if (n.includes('purple')) return '#a855f7';
  if (n.includes('brown'))  return '#92400e';
  if (n.includes('navy'))   return '#1e3a8a';
  if (n.includes('maroon')) return '#881337';
  return '#94a3b8';
}

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product } = route.params;
  const { addToCart, remainingCredit, creditApproved, user } = useContext(AppContext);

  const pricePerBox = getMyPrice(product.pricing, user?.type);
  const minBoxes    = getMyMinBox(product.minBox, user?.type);
  const pcsPerBox   = product.boxQuantity ?? 12;
  const shades: ShadeInfo[] = product.shades ?? [];

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] ?? '');
  const [selectedShade, setSelectedShade] = useState<ShadeInfo | null>(
    shades.length === 1 ? shades[0] : null   // auto-select if only one shade
  );
  const [boxes, setBoxes]         = useState(minBoxes);
  const [activeImg, setActiveImg] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);

  const visiblePrices = getVisiblePrices(product.pricing, user?.type);
  const totalPcs   = boxes * pcsPerBox;
  const subtotal   = pricePerBox * boxes;
  const gstAmt     = subtotal * GST;
  const total      = subtotal + gstAmt;
  const pricePerPc = pcsPerBox > 0 ? (pricePerBox / pcsPerBox) : 0;

  const canAfford  = !creditApproved || total <= remainingCredit;
  const typeLabel  = user?.type?.replace('_', ' ') ?? 'Retailer';

  // Validate: size must be selected + shade must be selected (if shades exist)
  const shadeRequired = shades.length > 0;
  const canAddToCart  = !!selectedSize && (!shadeRequired || !!selectedShade) && canAfford;

  const decrement = () => { if (boxes > minBoxes) setBoxes(b => b - 1); };
  const increment = () => setBoxes(b => b + 1);

  const handleAddToCart = useCallback(() => {
    if (!selectedSize) {
      Alert.alert('Select Size', 'Please select a size before adding to cart.');
      return;
    }
    if (shadeRequired && !selectedShade) {
      Alert.alert('Select Shade', 'Please select a shade/color before adding to cart.');
      return;
    }
    if (!canAfford) {
      Alert.alert(
        '⚠️ Insufficient Credit',
        `Order total ₹${total.toFixed(0)} exceeds your available credit ₹${remainingCredit.toFixed(0)}.`
      );
      return;
    }

    const shade = selectedShade ?? { shadeName: '', shadeCode: '' };

    addToCart(
      { ...product, selectedSize },
      boxes,
      pcsPerBox,
      pricePerBox,
      shade,
    );

    Alert.alert(
      '✅ Added to Cart',
      `${product.name}\nSize: ${selectedSize}${shade.shadeName ? `  ·  Shade: ${shade.shadeName}` : ''}\n${boxes} box${boxes > 1 ? 'es' : ''} · ${totalPcs} pcs`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart →', onPress: () => navigation.navigate('Cart') },
      ]
    );
  }, [canAfford, total, boxes, totalPcs, selectedSize, selectedShade, shadeRequired]);

  return (
    <>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Full-screen image modal */}
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

        {/* Product image */}
        <TouchableOpacity onPress={() => product.images?.length > 0 && setFullScreen(true)}>
          {product.images?.length > 0
            ? <Image source={{ uri: product.images[activeImg] }} style={s.mainImg} resizeMode="cover" />
            : <View style={s.imgPh}><Text style={{ fontSize: 80 }}>👕</Text></View>
          }
          {product.images?.length > 0 && (
            <View style={s.zoomHint}><Text style={s.zoomTxt}>🔍 Tap to enlarge</Text></View>
          )}
        </TouchableOpacity>

        {/* Thumbnail strip */}
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

          {/* Price card */}
          <View style={s.myPriceCard}>
            <View style={s.myPriceLeft}>
              <Text style={s.myPriceTier}>Your Price ({typeLabel})</Text>
              <Text style={s.myPriceBox}>
                ₹{pricePerPc.toFixed(2)}
                <Text style={s.myPriceUnit}> / piece</Text>
              </Text>
              <Text style={s.myPricePc}>
                ₹{pricePerBox.toLocaleString()} per box  ·  {pcsPerBox} pcs per box
              </Text>
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
          </View>

          {/* ── Size selector ── */}
          {product.sizes && product.sizes.length > 0 && (
            <View style={s.section}>
              <Text style={s.secTitle}>Select Size *</Text>
              <View style={s.sizes}>
                {product.sizes.map((sz: string) => (
                  <TouchableOpacity
                    key={sz}
                    style={[s.sizeChip, selectedSize === sz && s.sizeChipActive]}
                    onPress={() => setSelectedSize(sz)}
                  >
                    <Text style={[s.sizeTxt, selectedSize === sz && s.sizeTxtActive]}>{sz}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedSize ? (
                <View style={s.boxInfoBadge}>
                  <Text style={s.boxInfoTxt}>📦 {pcsPerBox} pcs per box for size {selectedSize}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>⚠️ Please select a size</Text>
              )}
            </View>
          )}

          {/* ── Shade selector ── */}
          {shades.length > 0 && (
            <View style={s.section}>
              <Text style={s.secTitle}>Select Shade / Color *</Text>

              {selectedShade && (
                <View style={s.selectedShadeBar}>
                  <View style={[s.selectedSwatch, { backgroundColor: getSwatchColor(selectedShade.shadeName) }]} />
                  <Text style={s.selectedShadeName}>{selectedShade.shadeName}</Text>
                  <Text style={s.selectedShadeCode}>({selectedShade.shadeCode})</Text>
                </View>
              )}

              <View style={s.shadeGrid}>
                {shades.map((sh: ShadeInfo) => {
                  const isActive = selectedShade?.shadeCode === sh.shadeCode;
                  const swatch   = getSwatchColor(sh.shadeName);
                  return (
                    <TouchableOpacity
                      key={sh.shadeCode}
                      style={[s.shadeChip, isActive && s.shadeChipActive]}
                      onPress={() => setSelectedShade(sh)}
                      activeOpacity={0.75}
                    >
                      <View style={[
                        s.shadeSwatch,
                        { backgroundColor: swatch },
                        swatch === '#e5e7eb' && { borderWidth: 1, borderColor: '#d1d5db' },
                        isActive && { shadowColor: swatch, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
                      ]} />
                      <Text style={[s.shadeChipTxt, isActive && s.shadeChipTxtActive]} numberOfLines={1}>
                        {sh.shadeName}
                      </Text>
                      {isActive && (
                        <View style={s.shadeCheckBadge}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {shadeRequired && !selectedShade && (
                <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>⚠️ Please select a shade</Text>
              )}
            </View>
          )}

          {/* ── Box quantity selector ── */}
          <View style={s.section}>
            <Text style={s.secTitle}>Quantity</Text>
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

          {/* ── Price breakdown ── */}
          <View style={s.section}>
            <Text style={s.secTitle}>Price Breakdown</Text>
            {([
              ['Price per piece',  `₹${pricePerPc.toFixed(2)}`],
              ['Price per box',    `₹${pricePerBox.toLocaleString()}`],
              ['Boxes ordered',    `${boxes} boxes`],
              ['Total pieces',     `${totalPcs} pcs`],
              ['Subtotal',         `₹${subtotal.toLocaleString()}`],
              ['GST (18%)',        `₹${gstAmt.toFixed(2)}`],
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

          {/* Credit warning */}
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

      {/* Sticky bottom bar */}
      <View style={s.sticky}>
        <View style={s.stickyLeft}>
          <Text style={s.stickyTotal}>
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.stickyPcs}>{boxes} boxes · {totalPcs} pcs</Text>
        </View>
        <TouchableOpacity
          style={[s.cartBtn, !canAddToCart && s.cartBtnOff]}
          onPress={handleAddToCart}
          disabled={!canAddToCart}
        >
          <Text style={s.cartBtnTxt}>
            {!canAfford
              ? '⚠️  Insufficient Credit'
              : shadeRequired && !selectedShade
              ? '🎨  Select Shade'
              : !selectedSize
              ? '📏  Select Size'
              : '🛒  Add to Cart'
            }
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

  // Price card
  myPriceCard:    { flexDirection: 'row', backgroundColor: '#1e3a8a', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  myPriceLeft:    { flex: 1 },
  myPriceTier:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  myPriceBox:     { fontSize: 30, fontWeight: '900', color: '#fff' },
  myPriceUnit:    { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.65)' },
  myPricePc:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  otherTiers:     { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 8 },
  otherTierTxt:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 3 },

  section:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  secTitle:       { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },

  // Sizes
  sizes:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F9FAFB' },
  sizeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sizeTxt:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  sizeTxtActive:  { color: '#fff' },
  boxInfoBadge:   { marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  boxInfoTxt:     { fontSize: 12, color: '#2563EB', fontWeight: '600' },

  // Shades
  selectedShadeBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, backgroundColor: '#F5F3FF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#C4B5FD' },
  selectedSwatch:     { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  selectedShadeName:  { fontSize: 13, fontWeight: '700', color: '#5B21B6' },
  selectedShadeCode:  { fontSize: 11, color: '#8B5CF6' },

  shadeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shadeChip:      { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F9FAFB', minWidth: 70, position: 'relative' },
  shadeChipActive:{ borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  shadeSwatch:    { width: 26, height: 26, borderRadius: 13, marginBottom: 5 },
  shadeChipTxt:   { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center', maxWidth: 64 },
  shadeChipTxtActive: { color: '#5B21B6', fontWeight: '700' },
  shadeCheckBadge:{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },

  // Quantity
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

  // Price breakdown
  bRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bLbl:           { fontSize: 13, color: '#6B7280' },
  bVal:           { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLbl:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalVal:       { fontSize: 20, fontWeight: '800', color: '#2563EB' },

  // Credit
  creditBox:      { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  creditBoxRed:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  creditLbl:      { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  creditAmt:      { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  creditWarn:     { fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 6 },

  // Sticky bottom
  sticky:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  stickyLeft:     { flex: 1 },
  stickyTotal:    { fontSize: 20, fontWeight: '800', color: '#111827' },
  stickyPcs:      { fontSize: 12, color: '#6B7280', marginTop: 1 },
  cartBtn:        { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
  cartBtnOff:     { backgroundColor: '#CBD5E1' },
  cartBtnTxt:     { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Full-screen image
  fsOverlay:      { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsClose:        { position: 'absolute', top: 44, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  fsCloseTxt:     { color: '#fff', fontSize: 20, fontWeight: '700' },
});