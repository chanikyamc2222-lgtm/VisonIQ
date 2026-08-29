module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-redux|redux-persist|@reduxjs/toolkit|react-native-safe-area-context|react-native-screens|react-native-mmkv|react-native-permissions|react-native-vision-camera|react-native-gesture-handler)/)',
  ],
};
