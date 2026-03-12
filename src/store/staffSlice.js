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

export const fetchStaffList = createAsyncThunk(
  'staff/fetchStaffList',
  async ({ access_token, page = 1, page_size = 20 }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff?page=${page}&page_size=${page_size}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch staff list. Please try again.')
    }
  },
)

export const fetchCreateStaff = createAsyncThunk(
  'staff/fetchCreateStaff',
  async ({
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone,
    email,
    address,
    department_id,
    designation_id,
    date_of_joining,
    user_id,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone,
          email,
          address,
          department_id,
          designation_id,
          date_of_joining,
          user_id,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create staff. Please try again.')
    }
  },
)

export const fetchUpdateStaff = createAsyncThunk(
  'staff/fetchUpdateStaff',
  async ({
    id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone,
    email,
    address,
    department_id,
    designation_id,
    date_of_joining,
    user_id,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone,
          email,
          address,
          department_id,
          designation_id,
          date_of_joining,
          user_id,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update staff. Please try again.')
    }
  },
)

export const fetchDeleteStaff = createAsyncThunk(
  'staff/fetchDeleteStaff',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete staff. Please try again.')
    }
  },
)

export const fetchStaffAttendance = createAsyncThunk(
  'staff/fetchStaffAttendance',
  async ({ access_token, date_from, date_to, page = 1, page_size = 50 }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        date_from,
        date_to,
        page: String(page),
        page_size: String(page_size),
      })

      const response = await fetch(`${API_BASE_URL}/attendance/staff?${query.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff attendance fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch staff attendance. Please try again.')
    }
  },
)

export const fetchStaffDepartments = createAsyncThunk(
  'staff/fetchStaffDepartments',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/departments`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff departments fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch staff departments. Please try again.')
    }
  },
)

export const fetchStaffDesignations = createAsyncThunk(
  'staff/fetchStaffDesignations',
  async ({ access_token, department_id }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (department_id !== undefined && department_id !== null) {
        query.set('department_id', String(department_id))
      }

      const response = await fetch(
        `${API_BASE_URL}/staff/designations${query.toString() ? `?${query.toString()}` : ''}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + access_token,
          },
        },
      )

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff designations fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch staff designations. Please try again.')
    }
  },
)

export const fetchCreateStaffAttendance = createAsyncThunk(
  'staff/fetchCreateStaffAttendance',
  async ({ access_token, date, records }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/staff`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          date,
          records,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff attendance creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create staff attendance. Please try again.')
    }
  },
)

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffList.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStaffList.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStaffList.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Staff request failed.'
      })
      .addCase(fetchStaffAttendance.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStaffAttendance.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStaffAttendance.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Staff attendance request failed.'
      })
      .addCase(fetchStaffDepartments.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStaffDepartments.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStaffDepartments.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Staff departments request failed.'
      })
      .addCase(fetchStaffDesignations.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStaffDesignations.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStaffDesignations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Staff designations request failed.'
      })
      .addCase(fetchCreateStaffAttendance.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateStaffAttendance.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateStaffAttendance.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Staff attendance create request failed.'
      })
  },
})

export default staffSlice.reducer
