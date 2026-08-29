import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveJson = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const loadJson = async key => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
