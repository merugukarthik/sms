import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomTable from '../components/CustomTable'
import { fetchCreateFeeStructure, fetchFeeStructure } from '../store/feesSlice'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const toHeader = (key) => (
  String(key || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
)

function FeesPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [feeData, setFeeData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    fee_type: 'school',
    class_id: 0,
    section_id: 0,
    amount: 0,
    due_day: 0,
    fine_type: 'fixed',
    fine_amount: 0,
  })

  const refreshFeeStructure = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchFeeStructure({ access_token: user.access_token })).unwrap()
      setFeeData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch fee structure.')
      setFeeData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshFeeStructure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Name is required.'
    if (!values.fee_type.trim()) nextErrors.fee_type = 'Fee type is required.'
    if (Number(values.class_id) < 0) nextErrors.class_id = 'Class id cannot be negative.'
    if (Number(values.section_id) < 0) nextErrors.section_id = 'Section id cannot be negative.'
    if (Number(values.amount) < 0) nextErrors.amount = 'Amount cannot be negative.'
    if (Number(values.due_day) < 0) nextErrors.due_day = 'Due day cannot be negative.'
    if (!values.fine_type.trim()) nextErrors.fine_type = 'Fine type is required.'
    if (Number(values.fine_amount) < 0) nextErrors.fine_amount = 'Fine amount cannot be negative.'
    return nextErrors
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormError({})
    setMessage('')
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormError({})
    setFormData({
      name: '',
      fee_type: 'school',
      class_id: 0,
      section_id: 0,
      amount: 0,
      due_day: 0,
      fine_type: 'fixed',
      fine_amount: 0,
    })
  }

  const handleCreateFee = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!user?.access_token) {
      setFormError({ submit: 'Missing access token. Please login again.' })
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchCreateFeeStructure({
          ...formData,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeCreatePopup()
      await refreshFeeStructure()
      setMessage('Fee structure created successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create fee structure.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = useMemo(() => {
    const sample = feeData[0]
    if (!sample || typeof sample !== 'object') return []
    return Object.keys(sample).map((key) => ({
      key,
      header: toHeader(key),
    }))
  }, [feeData])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Fee Structure</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreatePopup}
            >
              Create Fee
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading fee structure...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && feeData.length === 0 && (
          <p className="role-management-info">No fee structure available.</p>
        )}

        {!isLoading && !error && feeData.length > 0 && (
          <CustomTable
            columns={columns}
            data={feeData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No fee structure available."
          />
        )}
      </div>

      {isCreatePopupOpen && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-create-popup" role="dialog" aria-modal="true" aria-labelledby="create-fee-title">
            <h3 id="create-fee-title" className="custom-popup-title">Create Fee</h3>
            <form className="role-management-form" onSubmit={handleCreateFee}>
              <div className="role-management-field">
                <label htmlFor="fee-name" className="role-management-label">Name</label>
                <input id="fee-name" name="name" type="text" className="role-management-input" value={formData.name} onChange={handleInputChange} />
                {formError.name && <p className="role-management-field-error">{formError.name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-fee_type" className="role-management-label">Fee Type</label>
                <input id="fee-fee_type" name="fee_type" type="text" className="role-management-input" value={formData.fee_type} onChange={handleInputChange} />
                {formError.fee_type && <p className="role-management-field-error">{formError.fee_type}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-class_id" className="role-management-label">Class Id</label>
                <input id="fee-class_id" name="class_id" type="number" className="role-management-input" value={formData.class_id} onChange={handleInputChange} />
                {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-section_id" className="role-management-label">Section Id</label>
                <input id="fee-section_id" name="section_id" type="number" className="role-management-input" value={formData.section_id} onChange={handleInputChange} />
                {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-amount" className="role-management-label">Amount</label>
                <input id="fee-amount" name="amount" type="number" className="role-management-input" value={formData.amount} onChange={handleInputChange} />
                {formError.amount && <p className="role-management-field-error">{formError.amount}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-due_day" className="role-management-label">Due Day</label>
                <input id="fee-due_day" name="due_day" type="number" className="role-management-input" value={formData.due_day} onChange={handleInputChange} />
                {formError.due_day && <p className="role-management-field-error">{formError.due_day}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-fine_type" className="role-management-label">Fine Type</label>
                <input id="fee-fine_type" name="fine_type" type="text" className="role-management-input" value={formData.fine_type} onChange={handleInputChange} />
                {formError.fine_type && <p className="role-management-field-error">{formError.fine_type}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="fee-fine_amount" className="role-management-label">Fine Amount</label>
                <input id="fee-fine_amount" name="fine_amount" type="number" className="role-management-input" value={formData.fine_amount} onChange={handleInputChange} />
                {formError.fine_amount && <p className="role-management-field-error">{formError.fine_amount}</p>}
              </div>

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Create Fee'}
                </button>
                <button type="button" className="role-management-cancel-btn" onClick={closeCreatePopup}>Cancel</button>
              </div>
              {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default FeesPage
