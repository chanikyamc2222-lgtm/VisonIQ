import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveJson = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[storage] saveJson error:', e);
  }
};

export const loadJson = async key => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('[storage] loadJson error:', e);
    return null;
  }
};
