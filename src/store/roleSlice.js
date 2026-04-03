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

export const rolesManagement = createAsyncThunk(
  'role/rolesManagement',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Roles management failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to get the roles. Please try again.'))
    }
  },
)

export const fetchCreateRole = createAsyncThunk(
  'role/fetchCreateRole',
  async ({ payload, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Role creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create role. Please try again.'))
    }
  },
)

export const fetchUpdateRole = createAsyncThunk(
  'role/fetchUpdateRole',
  async ({ id, payload, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Role update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to update role. Please try again.'))
    }
  },
)

export const fetchDeleteRole = createAsyncThunk(
  'role/fetchDeleteRole',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Role delete failed'))
      }

      return { id }
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to delete role. Please try again.'))
    }
  },
)

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(rolesManagement.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(rolesManagement.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(rolesManagement.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Roles request failed.'
      })
  },
})

export default roleSlice.reducer
