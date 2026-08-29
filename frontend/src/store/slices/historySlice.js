import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addHistoryItem: (state, action) => {
      state.items = [action.payload, ...state.items];
    },
    replaceHistoryItems: (state, action) => {
      state.items = action.payload;
    },
  },
});

export const { addHistoryItem, replaceHistoryItems } = historySlice.actions;
export default historySlice.reducer;
