import React, { useState } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { Text, TextInput, Button, HelperText } from 'react-native-paper'
import { validateEmail, validatePassword } from '@sales-order-manager/shared'

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    // Validate inputs
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!emailValidation.valid || !passwordValidation.valid) {
      setErrors({
        email: emailValidation.error,
        password: passwordValidation.error,
      })
      return
    }

    try {
      setLoading(true)
      setErrors({})

      // TODO: Implement actual login API call
      // const response = await authService.login(email, password)
      // await AsyncStorage.setItem('auth_token', response.token)

      // For now, just navigate to main app
      navigation.replace('Main')
    } catch (error) {
      setErrors({ general: error.message || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Sales Order Manager
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.email}>
          {errors.email}
        </HelperText>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          error={!!errors.password}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <HelperText type="error" visible={!!errors.password}>
          {errors.password}
        </HelperText>

        {errors.general && (
          <HelperText type="error" visible={!!errors.general}>
            {errors.general}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Signup')}
          style={styles.signupButton}
        >
          Don't have an account? Sign Up
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  signupButton: {
    marginTop: 16,
  },
})

export default LoginScreen
