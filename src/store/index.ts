import { configureStore } from '@reduxjs/toolkit';
import platformsReducer from './slices/platformsSlice';
import destinationsReducer from './slices/destinationsSlice';

export const store = configureStore({
  reducer: {
    platforms: platformsReducer,
    destinations: destinationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
