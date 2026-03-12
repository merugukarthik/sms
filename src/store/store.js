import { configureStore } from '@reduxjs/toolkit'
import authReducer, { AUTH_PERSIST_FIELDS, AUTH_SESSION_KEY } from './authSlice'
import roleReducer from './roleSlice'
import academicReducer from './academicSlice'
import staffReducer from './staffSlice'
import studentsReducer from './studentsSlice'
import transportReducer from './transportSlice'
import feesReducer from './feesSlice'
import dashboardReducer from './dashboardSlice'
import organizationsReducer from './organizationsSlice'
import schoolsReducer from './schoolsSlice'
import usersReducer from './usersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    role: roleReducer,
    academic: academicReducer,
    staff: staffReducer,
    students: studentsReducer,
    transport: transportReducer,
    fees: feesReducer,
    dashboard: dashboardReducer,
    organizations: organizationsReducer,
    schools: schoolsReducer,
    users: usersReducer,
  },
})

if (typeof window !== 'undefined') {
  store.subscribe(() => {
    const authState = store.getState().auth
    const persistedAuthState = AUTH_PERSIST_FIELDS.reduce((accumulator, key) => {
      accumulator[key] = authState[key]
      return accumulator
    }, {})

    try {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(persistedAuthState))
    } catch {
      // Ignore storage write failures.
    }
  })
}
