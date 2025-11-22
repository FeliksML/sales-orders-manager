import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, List, Button, Divider, Avatar } from 'react-native-paper'

const ProfileScreen = ({ navigation }) => {
  const handleLogout = () => {
    // TODO: Clear auth token
    // await AsyncStorage.removeItem('auth_token')
    navigation.replace('Auth')
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text size={80} label="JD" />
        <Text variant="headlineSmall" style={styles.name}>
          John Doe
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          john.doe@example.com
        </Text>
      </View>

      <Divider />

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Edit Profile"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          onPress={() => {}}
        />
        <List.Item
          title="Notification Settings"
          left={(props) => <List.Icon {...props} icon="bell" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <List.Item
          title="Security"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        <List.Item
          title="Theme"
          description="Light"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          onPress={() => {}}
        />
        <List.Item
          title="Language"
          description="English"
          left={(props) => <List.Icon {...props} icon="translate" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          onPress={() => {}}
        />
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          onPress={() => {}}
        />
      </List.Section>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor="#ef4444"
      >
        Sign Out
      </Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  name: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    margin: 24,
    paddingVertical: 8,
  },
})

export default ProfileScreen
