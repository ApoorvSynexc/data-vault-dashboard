import { configureStore } from '@reduxjs/toolkit';
import platformsReducer from './slices/platformsSlice';

export const store = configureStore({
  reducer: {
    platforms: platformsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
