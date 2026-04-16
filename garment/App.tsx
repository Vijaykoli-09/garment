import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider, AppContext } from './src/context/AppContext';
import MainNavigator from './src/navigation/MainNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

function RootNavigator() {
  const { user, isLoading } = useContext(AppContext);

  // Show spinner while restoring token from AsyncStorage on app launch
  // Prevents flash of Login screen for already logged-in users
  if (isLoading) {
    return (
      <View style={{
        flex: 1, justifyContent: 'center',
        alignItems: 'center', backgroundColor: '#1e3a8a',
      }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}