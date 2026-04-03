import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getApiErrorMessage } from '../utils/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api/'
const baseUrl = `${API_BASE_URL}/auth`

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

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchDashboardStats',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${baseUrl}/dashboard`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Dashboard stats fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch dashboard stats. Please try again.'))
    }
  },
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDashboardStats.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Dashboard stats request failed.'
      })
  },
})

export default dashboardSlice.reducer
