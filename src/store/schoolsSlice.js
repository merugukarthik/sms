import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api/v1'
const SCHOOLS_URL = `${API_BASE_URL}/schools`

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

export const fetchSchools = createAsyncThunk(
  'schools/fetchSchools',
  async ({ access_token, organization_id, page, page_size }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (organization_id !== undefined && organization_id !== null && String(organization_id).trim()) {
        query.set('organization_id', String(organization_id))
      }
      if (page !== undefined && page !== null && String(page).trim()) {
        query.set('page', String(page))
      }
      if (page_size !== undefined && page_size !== null && String(page_size).trim()) {
        query.set('page_size', String(page_size))
      }

      const response = await fetch(`${SCHOOLS_URL}${query.toString() ? `?${query.toString()}` : ''}`, {
        method: 'GET',
        headers: getAuthHeaders(access_token),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Schools fetch failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to fetch schools. Please try again.')
    }
  },
)

export const createSchool = createAsyncThunk(
  'schools/createSchool',
  async ({ access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(SCHOOLS_URL, {
        method: 'POST',
        headers: getAuthHeaders(access_token),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'School create failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to create school. Please try again.')
    }
  },
)

export const updateSchool = createAsyncThunk(
  'schools/updateSchool',
  async ({ id, access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${SCHOOLS_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(access_token),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'School update failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to update school. Please try again.')
    }
  },
)

export const deleteSchool = createAsyncThunk(
  'schools/deleteSchool',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${SCHOOLS_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(access_token),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'School delete failed'))
      }

      return await response.json().catch(() => ({}))
    } catch {
      return rejectWithValue('Unable to delete school. Please try again.')
    }
  },
)

const schoolsSlice = createSlice({
  name: 'schools',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchools.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchSchools.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchSchools.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Schools request failed.'
      })
      .addCase(createSchool.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createSchool.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createSchool.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'School create request failed.'
      })
      .addCase(updateSchool.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(updateSchool.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(updateSchool.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'School update request failed.'
      })
      .addCase(deleteSchool.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(deleteSchool.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(deleteSchool.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'School delete request failed.'
      })
  },
})

export default schoolsSlice.reducer
