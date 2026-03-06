import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { AppContext } from '../context/AppContext';
import { productApi } from '../api/api';

interface Pricing { wholeSeller: number; semiWholeSeller: number; retailer: number; }
interface Product {
  id: number; name: string; description: string;
  images: string[]; sizes: string[]; boxQuantity: number; pricing: Pricing;
}

export default function ProductListScreen({ navigation }: any) {
  const { user } = useContext(AppContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [search, setSearch]     = useState('');
  const [error, setError]       = useState('');

  const getPrice = useCallback((p: Pricing) => {
    if (user?.type === 'Wholesaler')      return p.wholeSeller;
    if (user?.type === 'Semi_Wholesaler') return p.semiWholeSeller;
    return p.retailer;
  }, [user]);

  const fetchProducts = useCallback(async (q = '') => {
    setError('');
    try {
      const res = await productApi.getAll(q || undefined);
      setProducts(res.data);
    } catch {
      setError('Failed to load products. Pull down to retry.');
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

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={s.loadTxt}>Loading products...</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Pricing tier banner */}
      {user?.type && (
        <View style={s.tierBanner}>
          <Text style={s.tierTxt}>
            💰 Showing <Text style={{ fontWeight: '800' }}>{user.type.replace('_', ' ')}</Text> prices
          </Text>
        </View>
      )}

      {/* Search bar */}
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

      {error ? (
        <View style={s.errBanner}><Text style={s.errTxt}>{error}</Text></View>
      ) : null}

      {products.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 52 }}>📦</Text>
          <Text style={s.emptyTxt}>
            {search ? `No results for "${search}"` : 'No products available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
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
                <View style={s.info}>
                  <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.desc} numberOfLines={1}>{item.description}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>₹{price}<Text style={s.perPc}>/pc</Text></Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { marginTop: 12, color: '#64748B', fontSize: 14 },
  tierBanner: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  tierTxt: { fontSize: 13, color: '#1D4ED8' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  errBanner: { backgroundColor: '#FEE2E2', padding: 10, marginHorizontal: 12, borderRadius: 8 },
  errTxt: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: 'space-between', paddingHorizontal: 4 },
  card: {
    width: '48%', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  img: { width: '100%', height: 140 },
  imgPlaceholder: { width: '100%', height: 140, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  info: { padding: 10 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  desc: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  perPc: { fontSize: 10, color: '#6B7280', fontWeight: '400' },
  moq: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  moqTxt: { fontSize: 10, color: '#1D4ED8', fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTxt: { fontSize: 15, color: '#6B7280', marginTop: 12, fontWeight: '500' },
});