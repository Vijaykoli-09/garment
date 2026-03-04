import React, {
  useLayoutEffect,
  useContext,
  useState,
  useEffect
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { AppContext } from '../context/AppContext';

export default function ProductListScreen({ navigation }: any) {

  const { cart } = useContext(AppContext);

  const totalItems = cart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0
  );

  const allProducts = [
    { id: '1', name: 'White Premium T-Shirt', price: 250, description: 'Classic white cotton t-shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'], minQty: 50 },
    { id: '2', name: 'Black Cotton T-Shirt', price: 280, description: 'Pure black cotton comfortable fit', sizes: ['S', 'M', 'L', 'XL', 'XXL'], minQty: 50 },
    { id: '3', name: 'Blue Premium Polo', price: 400, description: 'Royal blue polo shirt premium quality', sizes: ['S', 'M', 'L', 'XL'], minQty: 50 },
    { id: '4', name: 'Oversized White Tee', price: 320, description: 'Relaxed fit oversized white t-shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'], minQty: 50 },
    { id: '5', name: 'Red Casual Polo', price: 420, description: 'Vibrant red polo with breathable fabric', sizes: ['S', 'M', 'L', 'XL'], minQty: 50 },
    { id: '6', name: 'Grey Melange T-Shirt', price: 290, description: 'Comfortable grey melange cotton blend', sizes: ['S', 'M', 'L', 'XL', 'XXL'], minQty: 50 },
    { id: '7', name: 'Oversized Baggy Tee', price: 340, description: 'Trendy oversized baggy fit t-shirt', sizes: ['S', 'M', 'L', 'XL'], minQty: 50 },
    { id: '8', name: 'Classic Navy Polo', price: 450, description: 'Navy blue classic polo shirt premium', sizes: ['S', 'M', 'L', 'XL', 'XXL'], minQty: 50 }
  ];

  const ITEMS_PER_PAGE = 6;

  const [search, setSearch] = useState('');
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 18 }}>🛒 {totalItems}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, totalItems]);

  const filterProducts = () => {
    let filtered = allProducts;

    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  useEffect(() => {
    const filtered = filterProducts();
    setDisplayedProducts(
      filtered.slice(0, ITEMS_PER_PAGE)
    );
    setPage(1);
  }, [search]);

  const loadMore = () => {
    const filtered = filterProducts();

    if (displayedProducts.length >= filtered.length) return;

    setLoadingMore(true);

    setTimeout(() => {
      const nextPage = page + 1;
      const newItems = filtered.slice(
        0,
        nextPage * ITEMS_PER_PAGE
      );
      setDisplayedProducts(newItems);
      setPage(nextPage);
      setLoadingMore(false);
    }, 800);
  };

  const onRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('ProductDetail', { product: item })
      }
      activeOpacity={0.7}
    >
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>👕</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productDesc} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.price}</Text>
          <Text style={styles.moqBadge}>MOQ: {item.minQty}+</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Our Products</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="🔍 Search products..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {displayedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="large" style={{ marginVertical: 20 }} color="#1E3A8A" /> : null
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imagePlaceholder: {
    height: 130,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  cardContent: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  moqBadge: {
    fontSize: 10,
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: '600',
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});