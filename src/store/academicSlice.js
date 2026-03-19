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

export const fetchAcademicYears = createAsyncThunk(
  'academic/fetchAcademicYears',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/years`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Academic years fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch academic years. Please try again.')
    }
  },
)

export const fetchCreateAcademicYear = createAsyncThunk(
  'academic/fetchCreateAcademicYear',
  async ({ name, academic_year, start_date, end_date, is_current, school_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/years`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name, academic_year, start_date, end_date, is_current, school_id }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Academic year creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create academic year. Please try again.')
    }
  },
)

export const fetchUpdateAcademicYear = createAsyncThunk(
  'academic/fetchUpdateAcademicYear',
  async ({ id, name, start_date, end_date, is_current, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/years/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name, start_date, end_date, is_current }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Academic year update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update academic year. Please try again.')
    }
  },
)

export const fetchDeleteAcademicYear = createAsyncThunk(
  'academic/fetchDeleteAcademicYear',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/years/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Academic year delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete academic year. Please try again.')
    }
  },
)

export const fetchClasses = createAsyncThunk(
  'academic/fetchClasses',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/classes`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Classes fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch classes. Please try again.')
    }
  },
)

export const fetchCreateClass = createAsyncThunk(
  'academic/fetchCreateClass',
  async ({
    //class_id,
    school_id,
    class_name,
    class_code,
    sort_order,
    section_id,
    academic_year_id,
    subjects,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/classes`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
         // class_id,
          school_id,
          class_name,
          class_code,
          sort_order,
          section_id,
          academic_year_id,
          subjects,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Class creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create class. Please try again.')
    }
  },
)

export const fetchUpdateClass = createAsyncThunk(
  'academic/fetchUpdateClass',
  async ({ id, name, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/classes/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Class update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update class. Please try again.')
    }
  },
)

export const fetchDeleteClass = createAsyncThunk(
  'academic/fetchDeleteClass',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/classes/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Class delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete class. Please try again.')
    }
  },
)

export const fetchSections = createAsyncThunk(
  'academic/fetchSections',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/sections`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Sections fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch sections. Please try again.')
    }
  },
)

export const fetchSubjects = createAsyncThunk(
  'academic/fetchSubjects',
  async ({ access_token, page = 1, page_size = 10 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      })

      const response = await fetch(`${API_BASE_URL}/academics/subjects?${params.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Subjects fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch subjects. Please try again.')
    }
  },
)

export const fetchCreateSubject = createAsyncThunk(
  'academic/fetchCreateSubject',
  async ({ class_id, section_id, name, code, description, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/subjects`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          class_id,
          section_id,
          name,
          code,
          description,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Subject creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create subject. Please try again.')
    }
  },
)

export const fetchUpdateSubject = createAsyncThunk(
  'academic/fetchUpdateSubject',
  async ({ subject_id, class_id, section_id, name, code, description, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/subjects/${subject_id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({
          class_id,
          section_id,
          name,
          code,
          description,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Subject update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update subject. Please try again.')
    }
  },
)

export const fetchDeleteSubject = createAsyncThunk(
  'academic/fetchDeleteSubject',
  async ({ subject_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/subjects/${subject_id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Subject delete failed'))
      }

      return { subject_id }
    } catch {
      return rejectWithValue('Unable to delete subject. Please try again.')
    }
  },
)

export const fetchCreateSection = createAsyncThunk(
  'academic/fetchCreateSection',
  async ({ school_id, name, code, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/sections`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ school_id, name, code }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Section creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create section. Please try again.')
    }
  },
)

export const fetchUpdateSection = createAsyncThunk(
  'academic/fetchUpdateSection',
  async ({ id, name, class_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/sections/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
        body: JSON.stringify({ name, class_id }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Section update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update section. Please try again.')
    }
  },
)

export const fetchDeleteSection = createAsyncThunk(
  'academic/fetchDeleteSection',
  async ({ id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/sections/${id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + access_token,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Section delete failed'))
      }

      return { id }
    } catch {
      return rejectWithValue('Unable to delete section. Please try again.')
    }
  },
)

const academicSlice = createSlice({
  name: 'academic',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAcademicYears.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAcademicYears.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchAcademicYears.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Academic years request failed.'
      })
  },
})

export default academicSlice.reducer
