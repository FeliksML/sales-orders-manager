# Sales Order Manager - Mobile App

React Native mobile application for managing sales orders with offline support.

## Features

- **Cross-Platform**: Runs on both iOS and Android
- **Offline-First**: Full offline support with background sync  
- **Shared Business Logic**: Uses shared package with web app
- **Modern UI**: Material Design with React Native Paper
- **Navigation**: React Navigation with tab and stack navigators
- **Type-Safe**: TypeScript support

## Prerequisites

- Node.js >= 20
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

## Installation

```bash
npm install
```

### iOS Setup

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### Android Setup

Make sure you have Android Studio installed and configured.

## Running the App

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

## API Configuration

Update the API URL in `src/config/api.js`:

```javascript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'  // Use 10.0.2.2:8000 for Android emulator
  : 'https://your-production-api.com'
```

## License

Proprietary
