import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Image,
  ScrollView,
} from 'react-native';
import { AppContext } from '../context/AppContext';
import { productApi } from '../api/api';

interface Pricing { wholeSeller: number; semiWholeSeller: number; retailer: number; }
interface Product {
  id: number; name: string; description: string;
  categories: string[]; subCategory: string;
  images: string[]; sizes: string[]; boxQuantity: number; pricing: Pricing;
}

// ── Must mirror the backend / admin CATEGORY_MAP exactly ─────────────────────
const CATEGORY_MAP: Record<string, string[]> = {
  MEN: [
    'T-Shirt', 'Pouch Gents', 'Gents Sweet Shirt',
    'Gents Pajama', 'Track Suit', 'Night Suit', 'Boys Suit',
  ],
  WOMEN: [
    'Ladies Pouch', 'Girly Pouch', 'Girlyish Tees',
    'Ladies Sweet', 'Ladies Pajama', 'Girl Suit', 'Night Suit', 'Track Suit',
  ],
  KIDS: [
    'Kit T-Shirt', 'Kids Pouch', 'Kids Sweet Shirt',
    'Kid Pajama', 'Boys Suit', 'Girl Suit', 'Track Suit', 'Night Suit',
  ],
};
const ALL_CATEGORIES = Object.keys(CATEGORY_MAP); // ['MEN','WOMEN','KIDS']

const CAT_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  MEN:   { bg: '#EFF6FF', text: '#1D4ED8', activeBg: '#1D4ED8', activeText: '#fff' },
  WOMEN: { bg: '#FDF2F8', text: '#BE185D', activeBg: '#BE185D', activeText: '#fff' },
  KIDS:  { bg: '#F0FDF4', text: '#065F46', activeBg: '#065F46', activeText: '#fff' },
};
const CAT_EMOJI: Record<string, string> = { MEN: '👔', WOMEN: '👗', KIDS: '🧒' };

export default function ProductListScreen({ navigation }: any) {
  const { user } = useContext(AppContext);

  const [allProducts, setAllProducts] = useState<Product[]>([]);   // raw from API
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefresh]      = useState(false);
  const [search, setSearch]           = useState('');
  const [error, setError]             = useState('');

  // Filter state
  const [selectedCat, setSelectedCat]   = useState<string>('');    // '' = ALL
  const [selectedSub, setSelectedSub]   = useState<string>('');    // '' = all subs

  // ── Derived: sub-category options for the selected category ──────────────
  const subOptions: string[] = selectedCat ? CATEGORY_MAP[selectedCat] ?? [] : [];

  // ── Derived: products after applying category + sub-category filter ───────
  const filteredProducts = allProducts.filter(p => {
    if (selectedCat) {
      // product must include the selected category
      if (!p.categories?.includes(selectedCat)) return false;
    }
    if (selectedSub) {
      if (p.subCategory !== selectedSub) return false;
    }
    return true;
  });

  const getPrice = useCallback((p: Pricing) => {
    if (user?.type === 'Wholesaler')      return p.wholeSeller;
    if (user?.type === 'Semi_Wholesaler') return p.semiWholeSeller;
    return p.retailer;
  }, [user]);

  const fetchProducts = useCallback(async (q = '') => {
    setError('');
    try {
      const res = await productApi.getAll(q || undefined);
      setAllProducts(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg    = e?.response?.data || e?.message;
      console.log('❌ Product fetch error:', status, msg);
      setError(`Error ${status}: ${JSON.stringify(msg)}`);
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchProducts(); setLoading(false); })();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = async () => {
    setRefresh(true); await fetchProducts(search); setRefresh(false);
  };

  // When user picks a category, reset sub-category
  const handleCatPress = (cat: string) => {
    if (selectedCat === cat) {
      // tap again → deselect (show ALL)
      setSelectedCat('');
      setSelectedSub('');
    } else {
      setSelectedCat(cat);
      setSelectedSub('');
    }
  };

  const handleSubPress = (sub: string) => {
    setSelectedSub(prev => prev === sub ? '' : sub); // tap again → deselect
  };

  const clearFilters = () => { setSelectedCat(''); setSelectedSub(''); };
  const hasFilter    = selectedCat !== '' || selectedSub !== '';

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={s.loadTxt}>Loading products...</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* ── Search bar ── */}
      <View style={s.searchBar}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: '#9CA3AF', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category filter row ── */}
      <View style={s.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>

          {/* ALL pill */}
          <TouchableOpacity
            onPress={clearFilters}
            style={[s.catPill, !selectedCat && s.catPillAllActive]}
          >
            <Text style={[s.catPillTxt, !selectedCat && s.catPillAllActiveTxt]}>
              🏷 All
            </Text>
          </TouchableOpacity>

          {/* MEN / WOMEN / KIDS pills */}
          {ALL_CATEGORIES.map(cat => {
            const active  = selectedCat === cat;
            const colors  = CAT_COLORS[cat];
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCatPress(cat)}
                style={[
                  s.catPill,
                  { backgroundColor: active ? colors.activeBg : colors.bg,
                    borderColor:      active ? colors.activeBg : colors.bg },
                ]}
              >
                <Text style={[s.catPillTxt, { color: active ? colors.activeText : colors.text }]}>
                  {CAT_EMOJI[cat]} {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Sub-category row — only shown when a category is selected ── */}
        {selectedCat !== '' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subRow}>
            {subOptions.map(sub => {
              const active = selectedSub === sub;
              return (
                <TouchableOpacity
                  key={sub}
                  onPress={() => handleSubPress(sub)}
                  style={[s.subPill, active && s.subPillActive]}
                >
                  <Text style={[s.subPillTxt, active && s.subPillActiveTxt]}>{sub}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Active filter summary + clear ── */}
        {hasFilter && (
          <View style={s.filterSummary}>
            <Text style={s.filterSummaryTxt} numberOfLines={1}>
              {selectedCat ? `${CAT_EMOJI[selectedCat]} ${selectedCat}` : ''}
              {selectedCat && selectedSub ? '  ›  ' : ''}
              {selectedSub || ''}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={s.clearBtn}>
              <Text style={s.clearBtnTxt}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <View style={s.errBanner}><Text style={s.errTxt}>{error}</Text></View>
      ) : null}

      {filteredProducts.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 52 }}>📦</Text>
          <Text style={s.emptyTxt}>
            {hasFilter
              ? `No products for ${selectedCat}${selectedSub ? ' › ' + selectedSub : ''}`
              : search
              ? `No results for "${search}"`
              : 'No products available'}
          </Text>
          {hasFilter && (
            <TouchableOpacity onPress={clearFilters} style={s.clearBtn}>
              <Text style={s.clearBtnTxt}>✕ Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={i => i.id.toString()}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const price = getPrice(item.pricing);
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                activeOpacity={0.85}
              >
                {item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={s.img} resizeMode="cover" />
                ) : (
                  <View style={s.imgPlaceholder}>
                    <Text style={{ fontSize: 40 }}>👕</Text>
                  </View>
                )}

                {/* Category badges on card */}
                {item.categories?.length > 0 && (
                  <View style={s.cardBadgeRow}>
                    {item.categories.map(cat => (
                      <View key={cat} style={[s.cardBadge, { backgroundColor: CAT_COLORS[cat]?.bg ?? '#F3F4F6' }]}>
                        <Text style={[s.cardBadgeTxt, { color: CAT_COLORS[cat]?.text ?? '#374151' }]}>
                          {CAT_EMOJI[cat]} {cat}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.info}>
                  <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                  {item.subCategory ? (
                    <Text style={s.subCatTxt} numberOfLines={1}>{item.subCategory}</Text>
                  ) : (
                    <Text style={s.desc} numberOfLines={1}>{item.description}</Text>
                  )}
                  <View style={s.priceRow}>
                    <Text style={s.price}>₹{price}<Text style={s.perPc}>/box</Text></Text>
                    <View style={s.moq}>
                      <Text style={s.moqTxt}>Box:{item.boxQuantity}pc</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadTxt:    { marginTop: 12, color: '#64748B', fontSize: 14 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, marginBottom: 6, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },

  // Filter
  filterSection: { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterRow:     { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  subRow:        { paddingHorizontal: 12, paddingBottom: 6, gap: 8 },

  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC',
  },
  catPillTxt:          { fontSize: 13, fontWeight: '700', color: '#64748B' },
  catPillAllActive:    { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  catPillAllActiveTxt: { color: '#fff' },

  subPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9',
  },
  subPillTxt:       { fontSize: 12, fontWeight: '600', color: '#475569' },
  subPillActive:    { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  subPillActiveTxt: { color: '#fff' },

  filterSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: '#EEF2FF', marginHorizontal: 12,
    borderRadius: 8, marginBottom: 4,
  },
  filterSummaryTxt: { fontSize: 12, fontWeight: '700', color: '#4338CA', flex: 1 },
  clearBtn:         { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' },
  clearBtnTxt:      { fontSize: 11, fontWeight: '700', color: '#6366F1' },

  // Errors / empty
  errBanner: { backgroundColor: '#FEE2E2', padding: 10, marginHorizontal: 12, borderRadius: 8 },
  errTxt:    { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTxt:  { fontSize: 15, color: '#6B7280', marginTop: 12, fontWeight: '500', marginBottom: 12 },

  // List
  list: { paddingHorizontal: 8, paddingBottom: 20, paddingTop: 8 },
  row:  { justifyContent: 'space-between', paddingHorizontal: 4 },

  // Card
  card: {
    width: '48%', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  img:            { width: '100%', height: 140 },
  imgPlaceholder: { width: '100%', height: 140, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  cardBadgeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 8, paddingTop: 6 },
  cardBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  cardBadgeTxt:   { fontSize: 9, fontWeight: '700' },
  info:           { padding: 10, paddingTop: 6 },
  name:           { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subCatTxt:      { fontSize: 11, color: '#6366F1', fontWeight: '600', marginBottom: 6 },
  desc:           { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  priceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price:          { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  perPc:          { fontSize: 10, color: '#6B7280', fontWeight: '400' },
  moq:            { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  moqTxt:         { fontSize: 10, color: '#1D4ED8', fontWeight: '700' },
});