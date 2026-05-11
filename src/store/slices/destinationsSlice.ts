import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createHttpRequest } from '../../services/api';
import { DESTINATION_ENDPOINTS } from '../../services/destination/destination.service';
import type { Destination } from '../../services/destination/destination.service';

const api = createHttpRequest();

export const fetchDestinations = createAsyncThunk(
  'destinations/fetch',
  () => api.get<Destination[]>(DESTINATION_ENDPOINTS.list),
);

type DestinationsState = {
  list: Destination[];
  status: 'idle' | 'loading' | 'error';
};

const initialState: DestinationsState = {
  list: [],
  status: 'idle',
};

const destinationsSlice = createSlice({
  name: 'destinations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDestinations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDestinations.fulfilled, (state, action) => {
        state.list = action.payload?.data ?? [];
        state.status = 'idle';
      })
      .addCase(fetchDestinations.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default destinationsSlice.reducer;
