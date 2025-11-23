import React from 'react'
import { StatusBar } from 'react-native'
import { PaperProvider, MD3DarkTheme } from 'react-native-paper'
import AppNavigator from './src/navigation/AppNavigator'

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00c8ff',
    primaryContainer: '#2563eb',
    secondary: '#059669',
    secondaryContainer: '#10b981',
    error: '#ef4444',
    background: '#0a1628',
    surface: '#0f1f33',
    surfaceVariant: '#1a2942',
    onSurface: '#e5e7eb',
    onSurfaceVariant: '#9ca3af',
  },
}

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
      <AppNavigator />
    </PaperProvider>
  )
}

export default App
