import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api/v1'

const initialState = {
  status: 'idle',
  error: null,
}

const getErrorMessage = async (response, fallbackText = 'Request failed') => {
  try {
    const data = await response.json()
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message
    }
  } catch {
    // Fall back to response status when body is not JSON.
  }

  return `${fallbackText} (${response.status})`
}

export const fetchFeeStructure = createAsyncThunk(
  'fees/fetchFeeStructure',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/structure`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee structure fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch fee structure. Please try again.')
    }
  },
)

export const fetchCreateFeeStructure = createAsyncThunk(
  'fees/fetchCreateFeeStructure',
  async ({
    name,
    fee_type,
    class_id,
    section_id,
    amount,
    due_day,
    fine_type,
    fine_amount,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/structure`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          name,
          fee_type,
          class_id,
          section_id,
          amount,
          due_day,
          fine_type,
          fine_amount,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee structure creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create fee structure. Please try again.')
    }
  },
)

const feesSlice = createSlice({
  name: 'fees',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeeStructure.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchFeeStructure.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchFeeStructure.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee structure request failed.'
      })
      .addCase(fetchCreateFeeStructure.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateFeeStructure.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateFeeStructure.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee structure create request failed.'
      })
  },
})

export default feesSlice.reducer
