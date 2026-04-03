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
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
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
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch staff list. Please try again.'))
    }
  },
)

export const fetchCreateStaff = createAsyncThunk(
  'staff/fetchCreateStaff',
  async ({
    school_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone,
    email,
    address,
    qualification,
    experience_years,
    salary,
    department_id,
    designation_id,
    joining_date,
    employee_id,
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
          school_id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone,
          email,
          address,
          qualification,
          experience_years,
          salary,
          department_id,
          designation_id,
          joining_date,
          employee_id,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create staff. Please try again.'))
    }
  },
)

export const fetchUpdateStaff = createAsyncThunk(
  'staff/fetchUpdateStaff',
  async ({
    id,
    school_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone,
    email,
    address,
    department_id,
    designation_id,
    joining_date,
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
          school_id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone,
          email,
          address,
          department_id,
          designation_id,
          joining_date,
          user_id,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to update staff. Please try again.'))
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
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to delete staff. Please try again.'))
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
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch staff attendance. Please try again.'))
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
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch staff departments. Please try again.'))
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
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch staff designations. Please try again.'))
    }
  },
)

export const fetchDesignationList = createAsyncThunk(
  'staff/fetchDesignationList',
  async ({ access_token, school_id, page = 1, page_size = 10 }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (school_id !== undefined && school_id !== null && String(school_id).trim()) {
        query.set('school_id', String(school_id))
      }
      query.set('page', String(page))
      query.set('page_size', String(page_size))

      const response = await fetch(`${API_BASE_URL}/designations?${query.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Designation fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch designations. Please try again.'))
    }
  },
)

export const fetchDesignationsBySchool = createAsyncThunk(
  'staff/fetchDesignationsBySchool',
  async ({ access_token, school_id }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (school_id !== undefined && school_id !== null && String(school_id).trim()) {
        query.set('school_id', String(school_id))
      }

      const response = await fetch(
        `${API_BASE_URL}/departments${query.toString() ? `?${query.toString()}` : ''}`,
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
        return rejectWithValue(await getErrorMessage(response, 'Designation fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch designations. Please try again.'))
    }
  },
)

export const fetchDepartments = createAsyncThunk(
  'staff/fetchDepartments',
  async ({ access_token, school_id, page = 1, page_size = 10 }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (school_id !== undefined && school_id !== null && String(school_id).trim()) {
        query.set('school_id', String(school_id))
      }
      query.set('page', String(page))
      query.set('page_size', String(page_size))

      const response = await fetch(`${API_BASE_URL}/departments?${query.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Department fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to fetch departments. Please try again.'))
    }
  },
)

export const createDepartmentWithDesignations = createAsyncThunk(
  'staff/createDepartmentWithDesignations',
  async ({ access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Department creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create department. Please try again.'))
    }
  },
)

export const createDesignation = createAsyncThunk(
  'staff/createDesignation',
  async ({ access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/designations`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Designation creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create designation. Please try again.'))
    }
  },
)

export const fetchCreateStaffAttendance = createAsyncThunk(
  'staff/fetchCreateStaffAttendance',
  async ({ access_token, school_id, date, records }, { rejectWithValue }) => {
    try {
      const isBulk = Array.isArray(records) && records.length > 1
      const endpoint = isBulk
        ? `${API_BASE_URL}/attendance/staff/bulk`
        : `${API_BASE_URL}/attendance/staff`
      const singleRecord = Array.isArray(records) ? records[0] : null
      const payload = isBulk
        ? {
            school_id,
            date,
            records,
          }
        : {
            school_id,
            staff_id: Number(singleRecord?.staff_id ?? 0),
            date,
            status: singleRecord?.status || 'present',
            check_in_time: String(singleRecord?.check_in_time ?? ''),
            check_out_time: String(singleRecord?.check_out_time ?? ''),
            remarks: String(singleRecord?.remarks ?? ''),
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Staff attendance creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Unable to create staff attendance. Please try again.'))
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
      .addCase(fetchDesignationList.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDesignationList.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchDesignationList.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Designation request failed.'
      })
      .addCase(fetchDesignationsBySchool.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDesignationsBySchool.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchDesignationsBySchool.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Designation request failed.'
      })
      .addCase(fetchDepartments.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDepartments.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Department request failed.'
      })
      .addCase(createDepartmentWithDesignations.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createDepartmentWithDesignations.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createDepartmentWithDesignations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Department creation request failed.'
      })
      .addCase(createDesignation.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createDesignation.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createDesignation.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Designation creation request failed.'
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
