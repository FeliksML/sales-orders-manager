import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, HelperText } from 'react-native-paper'
import LinearGradient from 'react-native-linear-gradient'
import { validateEmail, validatePassword } from '@sales-order-manager/shared'

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSignup = async () => {
    // Validate inputs
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    const newErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error
    }

    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      setErrors({})

      // TODO: Implement actual signup API call
      // const response = await authService.signup(name, email, password)
      // await AsyncStorage.setItem('auth_token', response.token)

      // For now, just navigate to main app
      navigation.replace('Main')
    } catch (error) {
      setErrors({ general: error.message || 'Signup failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1e40af', '#0d4f8b', '#067a5b', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header - Top Left */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text variant="displaySmall" style={styles.headerTitle}>
                Sales Order
              </Text>
              {/* Triangle decoration */}
              <View style={styles.triangle} />
            </View>
            <Text variant="headlineSmall" style={styles.headerSubtitle}>
              MANAGER
            </Text>
          </View>

          {/* Signup Card with Glassmorphism */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text variant="headlineLarge" style={styles.title}>
                Sign Up
              </Text>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Full Name
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    autoCapitalize="words"
                    error={!!errors.name}
                    style={styles.input}
                    outlineColor="rgba(0, 200, 255, 0.3)"
                    activeOutlineColor="#00c8ff"
                    textColor="#e5e7eb"
                    placeholder="Enter your full name"
                    placeholderTextColor="#6b7280"
                    autoFocus
                  />
                </View>
                {!!errors.name && (
                  <HelperText type="error" visible={!!errors.name} style={styles.helperText}>
                    {errors.name}
                  </HelperText>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Email Address
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={!!errors.email}
                    style={styles.input}
                    outlineColor="rgba(0, 200, 255, 0.3)"
                    activeOutlineColor="#00c8ff"
                    textColor="#e5e7eb"
                    placeholder="Enter your email"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                {!!errors.email && (
                  <HelperText type="error" visible={!!errors.email} style={styles.helperText}>
                    {errors.email}
                  </HelperText>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Password
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    error={!!errors.password}
                    style={styles.input}
                    outlineColor="rgba(0, 200, 255, 0.3)"
                    activeOutlineColor="#00c8ff"
                    textColor="#e5e7eb"
                    placeholder="Enter your password"
                    placeholderTextColor="#6b7280"
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                        color="#9ca3af"
                      />
                    }
                  />
                </View>
                {!!errors.password && (
                  <HelperText type="error" visible={!!errors.password} style={styles.helperText}>
                    {errors.password}
                  </HelperText>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Confirm Password
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    mode="outlined"
                    secureTextEntry={!showConfirmPassword}
                    error={!!errors.confirmPassword}
                    style={styles.input}
                    outlineColor="rgba(0, 200, 255, 0.3)"
                    activeOutlineColor="#00c8ff"
                    textColor="#e5e7eb"
                    placeholder="Confirm your password"
                    placeholderTextColor="#6b7280"
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        color="#9ca3af"
                      />
                    }
                  />
                </View>
                {!!errors.confirmPassword && (
                  <HelperText type="error" visible={!!errors.confirmPassword} style={styles.helperText}>
                    {errors.confirmPassword}
                  </HelperText>
                )}
              </View>

              {errors.general && (
                <HelperText type="error" visible={!!errors.general} style={styles.helperText}>
                  {errors.general}
                </HelperText>
              )}

              <LinearGradient
                colors={['#2563eb', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Button
                  mode="contained"
                  onPress={handleSignup}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  buttonColor="transparent"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </LinearGradient>

              <Text variant="bodyMedium" style={styles.loginText}>
                Already have an account?{' '}
                <Text
                  style={styles.loginLink}
                  onPress={() => navigation.navigate('Auth')}
                >
                  Login
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    position: 'absolute',
    top: 32,
    left: 24,
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#059669',
    marginLeft: 12,
    transform: [{ rotate: '0deg' }],
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 120,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(0, 15, 33, 0.25)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.37,
    shadowRadius: 32,
    elevation: 10,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#d1d5db',
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: 'visible',
  },
  input: {
    backgroundColor: '#0a1628',
    borderRadius: 10,
  },
  helperText: {
    color: '#ef4444',
    paddingLeft: 4,
  },
  buttonGradient: {
    marginTop: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    margin: 0,
    borderRadius: 0,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loginText: {
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loginLink: {
    color: '#60a5fa',
    textDecorationLine: 'underline',
  },
})

export default SignupScreen
