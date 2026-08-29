import { createSlice } from '@reduxjs/toolkit';

const MAX_HISTORY_ITEMS = 50;

const normalizeItem = item => {
  const safeShot = {
    id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    uri: item.uri,
    title: item.title || 'Scanned image',
    time: item.time || 'Just now',
    createdAt: item.createdAt || Date.now(),
  };

  return safeShot;
};

const initialState = {
  items: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addHistoryItem: (state, action) => {
      const item = normalizeItem(action.payload);
      const filtered = state.items.filter(existing => existing.uri !== item.uri);
      state.items = [item, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    },
    replaceHistoryItems: (state, action) => {
      state.items = (Array.isArray(action.payload) ? action.payload : []).map(normalizeItem).slice(0, MAX_HISTORY_ITEMS);
    },
    clearHistory: state => {
      state.items = [];
    },
  },
});

export const { addHistoryItem, replaceHistoryItems, clearHistory } = historySlice.actions;
export default historySlice.reducer;
