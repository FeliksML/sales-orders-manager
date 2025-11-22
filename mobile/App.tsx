import React from 'react'
import { StatusBar } from 'react-native'
import { PaperProvider, MD3LightTheme } from 'react-native-paper'
import AppNavigator from './src/navigation/AppNavigator'

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb',
    secondary: '#10b981',
    error: '#ef4444',
  },
}

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <AppNavigator />
    </PaperProvider>
  )
}

export default App
