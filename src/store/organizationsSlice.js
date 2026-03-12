import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api/v1'
const ORGANIZATIONS_URL = `${API_BASE_URL}/organizations`

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
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
    }
  } catch {
    // Fall back to generic text when response is not JSON.
  }

  return `${fallbackText} (${response.status})`
}

const getAuthHeaders = (access_token) => ({
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${access_token}`,
})

export const fetchOrganizations = createAsyncThunk(
  'organizations/fetchOrganizations',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(ORGANIZATIONS_URL, {
        method: 'GET',
        headers: getAuthHeaders(access_token),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Organizations fetch failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to fetch organizations. Please try again.')
    }
  },
)

export const createOrganization = createAsyncThunk(
  'organizations/createOrganization',
  async ({ access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(ORGANIZATIONS_URL, {
        method: 'POST',
        headers: getAuthHeaders(access_token),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Organization create failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to create organization. Please try again.')
    }
  },
)

export const updateOrganization = createAsyncThunk(
  'organizations/updateOrganization',
  async ({ id, access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(access_token),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Organization update failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to update organization. Please try again.')
    }
  },
)

export const deleteOrganization = createAsyncThunk(
  'organizations/deleteOrganization',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(access_token),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Organization delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete organization. Please try again.')
    }
  },
)

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrganizations.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchOrganizations.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Organizations request failed.'
      })
      .addCase(createOrganization.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createOrganization.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Organization create request failed.'
      })
      .addCase(updateOrganization.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(updateOrganization.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(updateOrganization.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Organization update request failed.'
      })
      .addCase(deleteOrganization.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(deleteOrganization.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(deleteOrganization.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Organization delete request failed.'
      })
  },
})

export default organizationsSlice.reducer
