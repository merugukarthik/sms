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

export const fetchTransportRoutes = createAsyncThunk(
  'transport/fetchTransportRoutes',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/routes`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport routes fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch transport routes. Please try again.')
    }
  },
)

export const fetchCreateTransportRoute = createAsyncThunk(
  'transport/fetchCreateTransportRoute',
  async ({ name, description, vehicle_id, driver_user_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/routes`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name, description, vehicle_id, driver_user_id }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport route creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create transport route. Please try again.')
    }
  },
)

export const fetchUpdateTransportRoute = createAsyncThunk(
  'transport/fetchUpdateTransportRoute',
  async ({ id, name, description, vehicle_id, driver_user_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/routes/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name, description, vehicle_id, driver_user_id }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport route update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update transport route. Please try again.')
    }
  },
)

export const fetchDeleteTransportRoute = createAsyncThunk(
  'transport/fetchDeleteTransportRoute',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/routes/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport route delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete transport route. Please try again.')
    }
  },
)

export const fetchTransportVehicles = createAsyncThunk(
  'transport/fetchTransportVehicles',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/vehicles`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport vehicles fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch transport vehicles. Please try again.')
    }
  },
)

export const fetchCreateTransportVehicle = createAsyncThunk(
  'transport/fetchCreateTransportVehicle',
  async ({ vehicle_number, vehicle_type, capacity, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/vehicles`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          vehicle_number,
          vehicle_type,
          capacity,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport vehicle creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create transport vehicle. Please try again.')
    }
  },
)

export const fetchUpdateTransportVehicle = createAsyncThunk(
  'transport/fetchUpdateTransportVehicle',
  async ({ id, vehicle_number, vehicle_type, capacity, is_active, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          vehicle_number,
          vehicle_type,
          capacity,
          is_active,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport vehicle update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update transport vehicle. Please try again.')
    }
  },
)

export const fetchDeleteTransportVehicle = createAsyncThunk(
  'transport/fetchDeleteTransportVehicle',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport vehicle delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete transport vehicle. Please try again.')
    }
  },
)

export const fetchTransportAttendance = createAsyncThunk(
  'transport/fetchTransportAttendance',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/attendance`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport attendance fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch transport attendance. Please try again.')
    }
  },
)

export const fetchCreateTransportAttendance = createAsyncThunk(
  'transport/fetchCreateTransportAttendance',
  async ({ attendance_date, vehicle_id, route_id, user_id, status, remarks, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/attendance`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          attendance_date,
          vehicle_id,
          route_id,
          user_id,
          status,
          remarks,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport attendance creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create transport attendance. Please try again.')
    }
  },
)

export const fetchUpdateTransportAttendance = createAsyncThunk(
  'transport/fetchUpdateTransportAttendance',
  async ({ id, attendance_date, vehicle_id, route_id, user_id, status, remarks, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/attendance/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          attendance_date,
          vehicle_id,
          route_id,
          user_id,
          status,
          remarks,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport attendance update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update transport attendance. Please try again.')
    }
  },
)

export const fetchDeleteTransportAttendance = createAsyncThunk(
  'transport/fetchDeleteTransportAttendance',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transport/attendance/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Transport attendance delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete transport attendance. Please try again.')
    }
  },
)

const transportSlice = createSlice({
  name: 'transport',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransportRoutes.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTransportRoutes.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchTransportRoutes.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Transport routes request failed.'
      })
  },
})

export default transportSlice.reducer
