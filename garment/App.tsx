import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider, AppContext } from './src/context/AppContext';
import { BrokerProvider, BrokerContext } from './src/context/BrokerContext';
import MainNavigator from './src/navigation/MainNavigator';
import BrokerNavigator from './src/navigation/BrokerNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

function RootNavigator() {
  const { user, isLoading }         = useContext(AppContext);
  const { broker, isLoadingBroker } = useContext(BrokerContext);

  // Show spinner while restoring customer token AND broker session from
  // AsyncStorage on app launch. Prevents flash of Login screen for
  // already logged-in users (customer, party, or broker).
  if (isLoading || isLoadingBroker) {
    return (
      <View style={{
        flex: 1, justifyContent: 'center',
        alignItems: 'center', backgroundColor: '#1e3a8a',
      }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Customer/party session takes priority if somehow both exist
  // (e.g. someone logged in as customer on the same device previously).
  if (user)   return <MainNavigator />;
  if (broker) return <BrokerNavigator />;
  return <AuthNavigator />;
}

export default function App() {
  return (
    <AppProvider>
      <BrokerProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </BrokerProvider>
    </AppProvider>
  );
}