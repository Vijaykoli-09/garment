import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider, AppContext } from './src/context/AppContext';
import MainNavigator from './src/navigation/MainNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

function RootNavigator() {
  const { user } = useContext(AppContext);

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