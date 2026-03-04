import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#FFFFFF',
  },
  headerTintColor: '#2563EB',
  headerTitleStyle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
  },
  headerShadowVisible: true,
};

export default function MainNavigator() {
  const { totalItems } = useContext(AppContext);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 15, gap: 15 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={{ fontSize: 18 }}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Cart')}
              >
                <Text style={{ fontSize: 16, fontWeight: '600' }}>🛒 {totalItems}</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      />

      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={({ navigation }) => ({
          title: 'Products',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={{ marginRight: 15 }}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '600' }}>🛒 {totalItems}</Text>
            </TouchableOpacity>
          )
        })}
      />

      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
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
        options={{ title: 'Credit Check' }}
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
    </Stack.Navigator>
  );
}