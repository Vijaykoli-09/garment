import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, View } from 'react-native';
import { AppContext } from '../context/AppContext';

import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentMethodScreen from '../screens/PaymentMethodScreen';
import CreditCheckScreen from '../screens/CreditCheckScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PendingOrdersScreen from '../screens/PendingOrdersScreen';
import AcceptedOrdersScreen from '../screens/AcceptedOrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  ProductList: undefined;
  ProductDetail: { product: any };
  Cart: undefined;
  Checkout: undefined;
  PaymentMethod: undefined;
  CreditCheck: undefined;
  OrderHistory: undefined;
  PaymentScreen: undefined;
  Profile: undefined;
  PendingOrders: undefined;
  AcceptedOrders: undefined;
  OrderDetail: { orderId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#2563EB',
  headerTitleStyle: {
    fontWeight: '700' as const,
    fontSize: 16,
    color: '#0F172A',
  },
  headerShadowVisible: true,
};

// Cart button with badge — reused across screens
function CartBtn({ navigation, totalItems }: { navigation: any; totalItems: number }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Cart')}
      style={{ marginRight: 15 }}
    >
      <Text style={{ fontSize: 18 }}>🛒</Text>
      {totalItems > 0 && (
        <View style={{
          position: 'absolute', top: -5, right: -8,
          backgroundColor: '#EF4444', borderRadius: 10,
          minWidth: 18, height: 18,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
            {totalItems}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MainNavigator() {
  const { totalItems } = useContext(AppContext);

  return (
    <Stack.Navigator screenOptions={screenOptions}>

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          headerShown: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 15, gap: 15 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </TouchableOpacity>
              <CartBtn navigation={navigation} totalItems={totalItems} />
            </View>
          ),
        })}
      />

      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={({ navigation }) => ({
          title: 'Products',
          headerRight: () => <CartBtn navigation={navigation} totalItems={totalItems} />,
        })}
      />

      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({ navigation }) => ({
          title: 'Product Details',
          headerRight: () => <CartBtn navigation={navigation} totalItems={totalItems} />,
        })}
      />

      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Shopping Cart' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen
        name="PaymentMethod"
        component={PaymentMethodScreen}
        options={{ title: 'Payment Method' }}
      />
      <Stack.Screen
        name="CreditCheck"
        component={CreditCheckScreen}
        options={{ title: 'Credit Details' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'Order History' }}
      />
      <Stack.Screen
        name="PaymentScreen"
        component={PaymentScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="PendingOrders"
        component={PendingOrdersScreen}
        options={{ title: 'Pending Orders' }}
      />
      <Stack.Screen
        name="AcceptedOrders"
        component={AcceptedOrdersScreen}
        options={{ title: 'Accepted Orders' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Detail' }}
      />

    </Stack.Navigator>
  );
}