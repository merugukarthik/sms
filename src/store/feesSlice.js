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

export const fetchFeeStructure = createAsyncThunk(
  'fees/fetchFeeStructure',
  async ({ access_token, school_id, class_id, fee_type_id }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams()
      if (school_id !== undefined && school_id !== null) {
        query.set('school_id', String(school_id))
      }
      if (class_id !== undefined && class_id !== null) {
        query.set('class_id', String(class_id))
      }
      if (fee_type_id !== undefined && fee_type_id !== null) {
        query.set('fee_type_id', String(fee_type_id))
      }

      const response = await fetch(`${API_BASE_URL}/finance/fee-structures?${query.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee structure fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch fee structure. Please try again.')
    }
  },
)

export const fetchFeeTypes = createAsyncThunk(
  'fees/fetchFeeTypes',
  async ({ access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/fee-types`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee types fetch failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to fetch fee types. Please try again.')
    }
  },
)

export const fetchCreateFeeStructure = createAsyncThunk(
  'fees/fetchCreateFeeStructure',
  async ({
    name,
    fee_type,
    class_id,
    section_id,
    amount,
    due_day,
    fine_type,
    fine_amount,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/fee-structures`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          name,
          fee_type,
          class_id,
          section_id,
          amount,
          due_day,
          fine_type,
          fine_amount,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee structure creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create fee structure. Please try again.')
    }
  },
)

export const fetchCreateFeeType = createAsyncThunk(
  'fees/fetchCreateFeeType',
  async ({ school_id, code, name, description, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/fee-types`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          school_id,
          code,
          name,
          description,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee type creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create fee type. Please try again.')
    }
  },
)

export const fetchUpdateFeeType = createAsyncThunk(
  'fees/fetchUpdateFeeType',
  async ({ fee_type_id, code, name, description, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/fee-types/${fee_type_id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          code,
          name,
          description,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee type update failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to update fee type. Please try again.')
    }
  },
)

export const fetchDeleteFeeType = createAsyncThunk(
  'fees/fetchDeleteFeeType',
  async ({ fee_type_id, access_token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/fee-types/${fee_type_id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Fee type delete failed'))
      }

      return { fee_type_id }
    } catch {
      return rejectWithValue('Unable to delete fee type. Please try again.')
    }
  },
)

export const fetchCreateFinanceAssignment = createAsyncThunk(
  'fees/fetchCreateFinanceAssignment',
  async ({
    student_id,
    school_id,
    amount,
    fee_type_id,
    due_date,
    paid_amount,
    paid_date,
    payment_mode,
    status,
    academic_year,
    month,
    remarks,
    access_token,
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/finance/assignments`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          student_id,
          school_id,
          amount,
          fee_type_id,
          due_date,
          paid_amount,
          paid_date,
          payment_mode,
          status,
          academic_year,
          month,
          remarks,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Finance assignment creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create finance assignment. Please try again.')
    }
  },
)

export const createRazorpayOrder = createAsyncThunk(
  'fees/createRazorpayOrder',
  async ({key, access_token, amount, currency = 'INR', receipt }, { rejectWithValue }) => {
    try {
      const response = await fetch(`http://172.16.24.126:8000/api/v1/fee-payments/create-order`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          key,
          amount,
          currency,
          receipt,
        }),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Razorpay order creation failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to create Razorpay order. Please try again.')
    }
  },
)

export const verifyRazorpayPayment = createAsyncThunk(
  'fees/verifyRazorpayPayment',
  async ({ access_token, payload }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/razorpay/verify`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response, 'Razorpay payment verification failed'))
      }

      const data = await response.json().catch(() => ({}))
      return data
    } catch {
      return rejectWithValue('Unable to verify Razorpay payment. Please try again.')
    }
  },
)

const feesSlice = createSlice({
  name: 'fees',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeeStructure.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchFeeStructure.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchFeeStructure.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee structure request failed.'
      })
      .addCase(fetchCreateFeeStructure.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateFeeStructure.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateFeeStructure.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee structure create request failed.'
      })
      .addCase(fetchFeeTypes.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchFeeTypes.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchFeeTypes.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee types request failed.'
      })
      .addCase(fetchCreateFeeType.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateFeeType.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateFeeType.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee type create request failed.'
      })
      .addCase(fetchUpdateFeeType.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchUpdateFeeType.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchUpdateFeeType.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee type update request failed.'
      })
      .addCase(fetchDeleteFeeType.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDeleteFeeType.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchDeleteFeeType.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Fee type delete request failed.'
      })
      .addCase(fetchCreateFinanceAssignment.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCreateFinanceAssignment.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(fetchCreateFinanceAssignment.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Finance assignment create request failed.'
      })
      .addCase(createRazorpayOrder.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createRazorpayOrder.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createRazorpayOrder.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Razorpay order request failed.'
      })
      .addCase(verifyRazorpayPayment.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(verifyRazorpayPayment.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(verifyRazorpayPayment.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Razorpay verification request failed.'
      })
  },
})

export default feesSlice.reducer
