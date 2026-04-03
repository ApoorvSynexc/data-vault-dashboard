import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createHttpRequest } from '../../services/api';
import { PLATFORM_ENDPOINTS } from '../../services/platform/platform.service';
import type { ConnectedPlatform } from '../../services/platform/platform.service';

const api = createHttpRequest();

export const fetchPlatforms = createAsyncThunk(
  'platforms/fetch',
  () => api.get<ConnectedPlatform[]>(PLATFORM_ENDPOINTS.list),
);

type PlatformsState = {
  list: ConnectedPlatform[];
  status: 'idle' | 'loading' | 'error';
};

const initialState: PlatformsState = {
  list: [],
  status: 'idle',
};

const platformsSlice = createSlice({
  name: 'platforms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatforms.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPlatforms.fulfilled, (state, action) => {
        state.list = action.payload?.data ?? [];
        state.status = 'idle';
      })
      .addCase(fetchPlatforms.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default platformsSlice.reducer;
