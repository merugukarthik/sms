import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getApiErrorMessage } from '../utils/api'

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

export const fetchUsersList = createAsyncThunk(
  'users/fetchUsersList',
  async ({ access_token, page = 1, page_size = 20 }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?page=${page}&page_size=${page_size}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Users fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch users list. Please try again.'))
    }
  },
)

export const fetchUpdateUserStatus = createAsyncThunk(
  'users/fetchUpdateUserStatus',
  async ({ id,role_id, is_active, access_token }, { rejectWithValue }) => {
    try {
      const statusPayload = JSON.stringify({role_id, is_active: Boolean(is_active) })
      const authHeaders = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + access_token,
      }

      let response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: statusPayload,
      })

      // Fallback for APIs that update status through generic user update endpoint.
      if (!response.ok && (response.status === 404 || response.status === 405)) {
        response = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: statusPayload,
        })
      }

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'User status update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return { id, is_active: Boolean(is_active), data }
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to update user status. Please try again.'))
    }
  },
)

export const fetchCreateUser = createAsyncThunk(
  'users/fetchCreateUser',
  async ({ payload, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'User create failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create user. Please try again.'))
    }
  },
)

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersList.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchUsersList.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchUsersList.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Users request failed.'
      })
      .addCase(fetchUpdateUserStatus.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchUpdateUserStatus.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchUpdateUserStatus.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'User status update request failed.'
      })
      .addCase(fetchCreateUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateUser.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'User create request failed.'
      })
  },
})

export default usersSlice.reducer
