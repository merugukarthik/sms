import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.16.24.126:8000/api'
const baseUrl = `${API_BASE_URL}/auth/`
const AUTH_SESSION_STORAGE_KEY = 'sms_auth_session'

const loadPersistedAuthState = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawState = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!rawState) {
      return null
    }

    return JSON.parse(rawState)
  } catch {
    return null
  }
}

const defaultState = {
  selectedRole: null,
  user: null,
  loginData: null,
  pendingEmail: '',
  isAuthenticated: false,
  isOtpPending: false,
  loginStatus: 'idle',
  otpStatus: 'idle',
  error: null,
  otpError: null,
}

const persistedState = loadPersistedAuthState()

const initialState = {
  ...defaultState,
  ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
  loginStatus: 'idle',
  otpStatus: 'idle',
  error: null,
  otpError: null,
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
  return `${fallbackText}`
  //  return `${fallbackText} (${response.status})`
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ username, password, role }, { rejectWithValue }) => {
    console.log(username, password)
    try {
      //  const baseUrl = ("http://172.16.24.126:8000/docs/default/login_login_post" || '').replace(/\/$/, '')
      const response = await fetch(baseUrl + 'login', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        //console.log('error res:- ', await response.json().catch(() => ({})))
        const errorMessage = await response.json().catch(() => ({}))
        console.log('details:- ', errorMessage)
        return rejectWithValue(await getErrorMessage(response, errorMessage?.detail || 'Login failed'))
      }

      const data = await response.json().catch(() => ({}))
      console.log('error data res:- ', data)
      return data
    } catch {
      return rejectWithValue('Unable to reach server. Please try again.')
    }
  },
)

export const profileData = createAsyncThunk(
  'auth/profileData',
  async ({ access_token }) => {
    console.log('profile page', access_token)
    try {
      const response = await fetch(baseUrl + 'me', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': "Bearer " + access_token
        }
      })


      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Profile failed'))
      }

      const data = await response.json().catch(() => ({}))
      console.log('profile resp"- ', data)
      return data
    } catch {
      return rejectWithValue('Unable to reach server. Please try again.')
    }
  },
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ otp }, { getState, rejectWithValue }) => {
    const state = getState()
    const email = state.auth.pendingEmail
    if (!email) {
      return rejectWithValue('Session expired. Please login again.')
    }

    try {
      const response = await fetch('http://172.16.24.126:8000/verify-otp', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'OTP verification failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to verify OTP. Please try again.')
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    selectRole(state, action) {
      state.selectedRole = action.payload
      state.user = null
      state.loginData = null
      state.pendingEmail = ''
      state.isAuthenticated = false
      state.isOtpPending = false
      state.otpStatus = 'idle'
      state.error = null
      state.otpError = null
    },
    verifyOtpSuccess(state) {
      state.isAuthenticated = true
      state.isOtpPending = false
      state.otpStatus = 'succeeded'
      state.otpError = null
      state.error = null
    },
    clearOtpPending(state) {
      state.isOtpPending = false
      state.otpStatus = 'idle'
      state.otpError = null
    },
    clearOtpError(state) {
      state.otpError = null
    },
    clearAuthError(state) {
      state.error = null
    },
    logout(state) {
      state.selectedRole = null
      state.user = null
      state.loginData = null
      state.pendingEmail = ''
      state.isAuthenticated = false
      state.isOtpPending = false
      state.loginStatus = 'idle'
      state.otpStatus = 'idle'
      state.error = null
      state.otpError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loginStatus = 'loading'
        state.error = null
        state.pendingEmail = ''
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log('token api:- ', action)
        state.loginStatus = 'succeeded'
        state.isOtpPending = true
        //  state.loginData = action.payload || null
        state.pendingEmail = action.meta.arg?.email || ''
        state.user = action.payload || null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginStatus = 'failed'
        state.isOtpPending = false
        state.loginData = null
        state.pendingEmail = ''
        state.error = action.payload || action.error.message || 'Login failed.'
      })
      .addCase(verifyOtp.pending, (state) => {
        state.otpStatus = 'loading'
        state.otpError = null
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.otpStatus = 'succeeded'
        state.otpError = null
        state.isAuthenticated = true
        state.isOtpPending = false
        state.loginData = action.payload || null
        state.user = action.payload?.user || state.user
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.otpStatus = 'failed'
        state.otpError = action.payload || action.error.message || 'OTP verification failed.'
        state.isAuthenticated = false
        state.isOtpPending = true
      })
  },
})

export const { selectRole, verifyOtpSuccess, clearOtpPending, clearOtpError, clearAuthError, logout } = authSlice.actions

export const selectAuthState = (state) => state.auth
export const selectLoginData = (state) => state.auth.loginData
export const selectLoggedInUser = (state) => state.auth.user
export const AUTH_PERSIST_FIELDS = [
  'selectedRole',
  'user',
  'loginData',
  'pendingEmail',
  'isAuthenticated',
  'isOtpPending',
]
export const AUTH_SESSION_KEY = AUTH_SESSION_STORAGE_KEY

export default authSlice.reducer
