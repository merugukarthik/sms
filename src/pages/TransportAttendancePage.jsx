import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import {
  fetchCreateTransportAttendance,
  fetchDeleteTransportAttendance,
  fetchTransportAttendance,
  fetchUpdateTransportAttendance,
} from '../store/transportSlice'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const toSlug = (value) => {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getActionValues = (moduleItem) => {
  const actions = Array.isArray(moduleItem?.actions) ? moduleItem.actions : []
  return actions
    .map((actionItem) => {
      if (typeof actionItem === 'string') return toSlug(actionItem)
      return toSlug(
        actionItem?.id
          || actionItem?.name
          || actionItem?.display_name
          || actionItem?.action
          || actionItem?.value
          || actionItem?.code
          || '',
      )
    })
    .filter(Boolean)
}

function TransportAttendancePage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [attendanceData, setAttendanceData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState(null)
  const [deleteAttendanceTarget, setDeleteAttendanceTarget] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    attendance_date: '',
    vehicle_id: 0,
    route_id: 0,
    user_id: 0,
    status: '',
    remarks: '',
  })
  const [editFormData, setEditFormData] = useState({
    attendance_date: '',
    vehicle_id: 0,
    route_id: 0,
    user_id: 0,
    status: '',
    remarks: '',
  })

  const permissions = useMemo(() => {
    const modules = Array.isArray(user?.modules) ? user.modules : []
    const transportModule = modules.find((moduleItem) => {
      const slug = toSlug(moduleItem?.name || moduleItem?.display_name || '')
      return slug === 'transport' || slug.includes('transport')
    })

    const actionValues = getActionValues(transportModule)
    if (actionValues.length === 0) {
      return { canView: true, canAdd: false, canEdit: false, canDelete: false }
    }

    const canAdd = actionValues.includes('add') || actionValues.includes('create')
    const canEdit = actionValues.includes('edit') || actionValues.includes('update')
    const canDelete = actionValues.includes('delete') || actionValues.includes('remove')
    const canView = actionValues.includes('view') || canAdd || canEdit || canDelete
    return { canView, canAdd, canEdit, canDelete }
  }, [user?.modules])

  const showActionColumn = permissions.canAdd || permissions.canEdit || permissions.canDelete

  const refreshAttendance = async () => {
    if (!user?.access_token) return
    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchTransportAttendance({ access_token: user.access_token })).unwrap()
      setAttendanceData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch transport attendance.')
      setAttendanceData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.attendance_date) nextErrors.attendance_date = 'Attendance date is required.'
    if (!values.vehicle_id || Number(values.vehicle_id) <= 0) nextErrors.vehicle_id = 'Vehicle id is required.'
    if (!values.route_id || Number(values.route_id) <= 0) nextErrors.route_id = 'Route id is required.'
    if (!values.user_id || Number(values.user_id) <= 0) nextErrors.user_id = 'User id is required.'
    if (!values.status.trim()) nextErrors.status = 'Status is required.'
    return nextErrors
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormError({})
    setMessage('')
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      attendance_date: '',
      vehicle_id: 0,
      route_id: 0,
      user_id: 0,
      status: '',
      remarks: '',
    })
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingAttendance(null)
    setEditFormData({
      attendance_date: '',
      vehicle_id: 0,
      route_id: 0,
      user_id: 0,
      status: '',
      remarks: '',
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleEditInputChange = (event) => {
    const { name, value, type } = event.target
    setEditFormData((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
    setFormError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleCreateAttendance = async (event) => {
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
      await dispatch(fetchCreateTransportAttendance({ ...formData, access_token: user.access_token })).unwrap()
      setMessage('Transport attendance created successfully.')
      closeCreatePopup()
      await refreshAttendance()
    } catch (err) {
      setFormError({ submit: typeof err === 'string' ? err : 'Failed to create transport attendance.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAttendance = (attendance) => {
    setEditingAttendance(attendance)
    setEditFormData({
      attendance_date: attendance?.attendance_date || '',
      vehicle_id: Number(attendance?.vehicle_id ?? 0),
      route_id: Number(attendance?.route_id ?? 0),
      user_id: Number(attendance?.user_id ?? 0),
      status: attendance?.status || '',
      remarks: attendance?.remarks || '',
    })
    setFormError({})
    setMessage('')
  }

  const handleUpdateAttendance = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(editFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }
    if (!editingAttendance?.id || !user?.access_token) {
      setFormError((prev) => ({ ...prev, editSubmit: 'Unable to update transport attendance.' }))
      return
    }
    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateTransportAttendance({
          id: editingAttendance.id,
          ...editFormData,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeEditPopup()
      await refreshAttendance()
      setMessage('Transport attendance updated successfully.')
    } catch (err) {
      setFormError((prev) => ({ ...prev, editSubmit: typeof err === 'string' ? err : 'Failed to update transport attendance.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDeleteAttendance = (attendance) => setDeleteAttendanceTarget(attendance)
  const closeDeletePopup = () => setDeleteAttendanceTarget(null)

  const handleDeleteAttendance = async () => {
    const attendanceId = deleteAttendanceTarget?.id
    if (!user?.access_token || !attendanceId) return
    if (actionLoadingId === String(attendanceId)) return
    setActionLoadingId(String(attendanceId))
    setMessage('')
    try {
      await dispatch(fetchDeleteTransportAttendance({ id: attendanceId, access_token: user.access_token })).unwrap()
      closeDeletePopup()
      await refreshAttendance()
      setMessage('Transport attendance deleted successfully.')
    } catch (err) {
      setFormError({ submit: typeof err === 'string' ? err : 'Failed to delete transport attendance.' })
    } finally {
      setActionLoadingId('')
    }
  }

  const attendanceColumns = [
    { key: 'id', header: 'Attendance Id' },
    { key: 'attendance_date', header: 'Attendance Date' },
    { key: 'vehicle_id', header: 'Vehicle Id' },
    { key: 'route_id', header: 'Route Id' },
    { key: 'user_id', header: 'User Id' },
    { key: 'status', header: 'Status' },
    { key: 'remarks', header: 'Remarks' },
  ]

  if (showActionColumn) {
    attendanceColumns.push({
      key: 'action',
      header: 'Action',
      render: (attendance) => (
        <div className="role-management-table-actions">
          {permissions.canEdit && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-edit"
              onClick={() => handleEditAttendance(attendance)}
            >
              Edit
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-delete"
              onClick={() => requestDeleteAttendance(attendance)}
              disabled={actionLoadingId === String(attendance?.id)}
            >
              {actionLoadingId === String(attendance?.id) ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      ),
    })
  }

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Transport Attendance</h2>
            {permissions.canAdd && (
              <button type="button" className="role-management-open-create-btn" onClick={openCreatePopup}>
                Create Attendance
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading transport attendance...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && permissions.canView && attendanceData.length === 0 && (
          <p className="role-management-info">No transport attendance available.</p>
        )}
        {!isLoading && !error && permissions.canView && attendanceData.length > 0 && (
          <CustomTable
            columns={attendanceColumns}
            data={attendanceData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No transport attendance available."
          />
        )}
        {!isLoading && !error && !permissions.canView && (
          <p className="role-management-error">You do not have view permission for transport attendance.</p>
        )}
        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      {isCreatePopupOpen && permissions.canAdd && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-create-popup" role="dialog" aria-modal="true" aria-labelledby="create-attendance-title">
            <h3 id="create-attendance-title" className="custom-popup-title">Create Attendance</h3>
            <form className="role-management-form" onSubmit={handleCreateAttendance}>
              <div className="role-management-field">
                <label htmlFor="attendance-date" className="role-management-label">Attendance Date</label>
                <input id="attendance-date" name="attendance_date" type="date" className="role-management-input" value={formData.attendance_date} onChange={handleInputChange} />
                {formError.attendance_date && <p className="role-management-field-error">{formError.attendance_date}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="attendance-vehicle-id" className="role-management-label">Vehicle Id</label>
                <input id="attendance-vehicle-id" name="vehicle_id" type="number" className="role-management-input" value={formData.vehicle_id} onChange={handleInputChange} />
                {formError.vehicle_id && <p className="role-management-field-error">{formError.vehicle_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="attendance-route-id" className="role-management-label">Route Id</label>
                <input id="attendance-route-id" name="route_id" type="number" className="role-management-input" value={formData.route_id} onChange={handleInputChange} />
                {formError.route_id && <p className="role-management-field-error">{formError.route_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="attendance-user-id" className="role-management-label">User Id</label>
                <input id="attendance-user-id" name="user_id" type="number" className="role-management-input" value={formData.user_id} onChange={handleInputChange} />
                {formError.user_id && <p className="role-management-field-error">{formError.user_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="attendance-status" className="role-management-label">Status</label>
                <input id="attendance-status" name="status" type="text" className="role-management-input" value={formData.status} onChange={handleInputChange} />
                {formError.status && <p className="role-management-field-error">{formError.status}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="attendance-remarks" className="role-management-label">Remarks</label>
                <input id="attendance-remarks" name="remarks" type="text" className="role-management-input" value={formData.remarks} onChange={handleInputChange} />
              </div>
              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : 'Create Attendance'}</button>
                <button type="button" className="role-management-cancel-btn" onClick={closeCreatePopup}>Cancel</button>
              </div>
              {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
            </form>
          </div>
        </div>
      )}

      {editingAttendance && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-edit-popup" role="dialog" aria-modal="true" aria-labelledby="edit-attendance-title">
            <h3 id="edit-attendance-title" className="custom-popup-title">Edit Attendance</h3>
            <form className="role-management-form" onSubmit={handleUpdateAttendance}>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-date" className="role-management-label">Attendance Date</label>
                <input id="edit-attendance-date" name="attendance_date" type="date" className="role-management-input" value={editFormData.attendance_date} onChange={handleEditInputChange} />
                {formError.attendance_date && <p className="role-management-field-error">{formError.attendance_date}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-vehicle-id" className="role-management-label">Vehicle Id</label>
                <input id="edit-attendance-vehicle-id" name="vehicle_id" type="number" className="role-management-input" value={editFormData.vehicle_id} onChange={handleEditInputChange} />
                {formError.vehicle_id && <p className="role-management-field-error">{formError.vehicle_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-route-id" className="role-management-label">Route Id</label>
                <input id="edit-attendance-route-id" name="route_id" type="number" className="role-management-input" value={editFormData.route_id} onChange={handleEditInputChange} />
                {formError.route_id && <p className="role-management-field-error">{formError.route_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-user-id" className="role-management-label">User Id</label>
                <input id="edit-attendance-user-id" name="user_id" type="number" className="role-management-input" value={editFormData.user_id} onChange={handleEditInputChange} />
                {formError.user_id && <p className="role-management-field-error">{formError.user_id}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-status" className="role-management-label">Status</label>
                <input id="edit-attendance-status" name="status" type="text" className="role-management-input" value={editFormData.status} onChange={handleEditInputChange} />
                {formError.status && <p className="role-management-field-error">{formError.status}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-attendance-remarks" className="role-management-label">Remarks</label>
                <input id="edit-attendance-remarks" name="remarks" type="text" className="role-management-input" value={editFormData.remarks} onChange={handleEditInputChange} />
              </div>
              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : 'Update Attendance'}</button>
                <button type="button" className="role-management-cancel-btn" onClick={closeEditPopup}>Cancel</button>
              </div>
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteAttendanceTarget)}
        title="Delete Attendance"
        message={`Are you sure you want to delete "${deleteAttendanceTarget?.id ? `attendance #${deleteAttendanceTarget.id}` : 'this attendance'}"?`}
        onConfirm={handleDeleteAttendance}
        confirmText={actionLoadingId === String(deleteAttendanceTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-attendance-title"
      />
    </section>
  )
}

export default TransportAttendancePage
