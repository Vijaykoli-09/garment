import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BrokerDashboardScreen from '../screens/BrokerDashboardScreen';
import PartyOrdersScreen from '../screens/PartyOrdersScreen';
import PartyStatementScreen from '../screens/PartyStatementScreen';

export type BrokerStackParamList = {
  BrokerDashboard: undefined;
  PartyOrders: { partyId: number; partyName: string };
  PartyStatement: { partyId: number; partyName: string };
  // add more broker-only screens here as you build them, e.g.:
  // BrokerCommission: undefined;
};

const Stack = createNativeStackNavigator<BrokerStackParamList>();

export default function BrokerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrokerDashboard" component={BrokerDashboardScreen} />
      <Stack.Screen name="PartyOrders" component={PartyOrdersScreen} />
      <Stack.Screen name="PartyStatement" component={PartyStatementScreen} />
    </Stack.Navigator>
  );
}