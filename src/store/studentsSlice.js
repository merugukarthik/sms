import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api/v1'

const initialState = {
  status: 'idle',
  error: null,
}

const toReadableError = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => toReadableError(item))
      .filter(Boolean)

    return messages.length > 0 ? messages.join(', ') : ''
  }

  if (value && typeof value === 'object') {
    if (typeof value.msg === 'string' && value.msg.trim()) {
      return value.msg
    }

    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message
    }

    if (typeof value.detail === 'string' && value.detail.trim()) {
      return value.detail
    }
  }

  return ''
}

const getErrorMessage = async (response, fallbackText = 'Request failed') => {
  try {
    const data = await response.json()

    const errorMessage = toReadableError(data?.message)
      || toReadableError(data?.detail)
      || toReadableError(data?.error)
      || toReadableError(data)

    if (errorMessage) {
      return errorMessage
    }
  } catch {
    // Fall back to response status when body is not JSON.
  }

  return `${fallbackText} (${response.status})`
}

export const fetchStudentsList = createAsyncThunk(
  'students/fetchStudentsList',
  async ({ access_token, page = 1, page_size = 20 }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students?page=${page}&page_size=${page_size}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Students fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch students list. Please try again.')
    }
  },
)

export const fetchCreateStudent = createAsyncThunk(
  'students/fetchCreateStudent',
  async ({
    first_name,
    last_name,
    username,
    password,
    role_id,
    date_of_birth,
    gender,
    blood_group,
    address,
    phone,
    guardian_name,
    guardian_phone,
    email,
    class_id,
    section_id,
    academic_year_id,
    admission_date,
    admission_no,
    access_token,
   // school_id
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          first_name,
          last_name,
          userDetails: {
            username,
            password,
            role_id,
          },
          date_of_birth,
          gender,
          blood_group,
          address,
          phone,
          guardian_name,
          guardian_phone,
          email,
          class_id,
          section_id,
          academic_year_id,
          admission_date,
         // school_id,
          admission_no
        }),
      })
      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Student creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create student. Please try again.')
    }
  },
)

export const fetchStudentAttendance = createAsyncThunk(
  'students/fetchStudentAttendance',
  async ({
    access_token,
    section_id,
    student_id,
    date_from,
    date_to,
    page = 1,
    page_size = 50,
  }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (Number(section_id) > 0) query.set('section_id', String(section_id))
      if (Number(student_id) > 0) query.set('student_id', String(student_id))
      if (date_from) query.set('date_from', date_from)
      if (date_to) query.set('date_to', date_to)
      query.set('page', String(page))
      query.set('page_size', String(page_size))

      const response = await fetch(`${API_BASE_URL}/attendance/students?${query.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Student attendance fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch student attendance. Please try again.')
    }
  },
)

export const fetchCreateStudentAttendance = createAsyncThunk(
  'students/fetchCreateStudentAttendance',
  async ({ access_token, date, records, section_id }, { rejectWithValue }) => {
    try {
      const payload = {
        date,
        records,
        ...(Number(section_id) > 0 ? { section_id: Number(section_id) } : {}),
      }

      const response = await fetch(`${API_BASE_URL}/attendance/students`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Student attendance creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create student attendance. Please try again.')
    }
  },
)

export const fetchPromoteStudent = createAsyncThunk(
  'students/fetchPromoteStudent',
  async ({ access_token, student_id, remarks }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/promote`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          student_id: Number(student_id),
          remarks,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Student promotion failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to promote student. Please try again.')
    }
  },
)

const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentsList.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStudentsList.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStudentsList.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Students request failed.'
      })
      .addCase(fetchStudentAttendance.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchStudentAttendance.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchStudentAttendance.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Student attendance request failed.'
      })
      .addCase(fetchCreateStudentAttendance.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateStudentAttendance.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateStudentAttendance.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Student attendance create request failed.'
      })
      .addCase(fetchPromoteStudent.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPromoteStudent.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchPromoteStudent.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Student promote request failed.'
      })
  },
})

export default studentsSlice.reducer
