import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import {
  fetchCreateTransportVehicle,
  fetchDeleteTransportVehicle,
  fetchTransportVehicles,
  fetchUpdateTransportVehicle,
} from '../store/transportSlice'
import { getCrudPermissions } from '../utils/permissions'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp?.vehicles)
          ? resp.vehicles
          : []
)

function TransportVehiclesPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const schoolId = Number(user?.user?.school_id ?? user?.school_id ?? 0)
  const [vehiclesData, setVehiclesData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: '',
    capacity: '',
  })
  const [editFormData, setEditFormData] = useState({
    vehicle_number: '',
    vehicle_type: '',
    capacity: '',
    is_active: false,
  })

  const permissions = useMemo(() => {
    return getCrudPermissions(user, {
      moduleMatchers: ['transport'],
      featureMatchers: ['vehicle'],
    })
  }, [user])

  const showActionColumn = permissions.canAdd || permissions.canEdit || permissions.canDelete

  const refreshVehicles = async () => {
    if (!user?.access_token) return
    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchTransportVehicles({ access_token: user.access_token })).unwrap()
      setVehiclesData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch transport vehicles.')
      setVehiclesData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshVehicles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.vehicle_number.trim()) nextErrors.vehicle_number = 'Vehicle number is required.'
    if (!String(values.vehicle_type || '').trim()) nextErrors.vehicle_type = 'Vehicle type is required.'
    if (!String(values.capacity || '').trim()) nextErrors.capacity = 'Capacity is required.'
    else if (Number(values.capacity) <= 0) nextErrors.capacity = 'Capacity must be greater than 0.'
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
      vehicle_number: '',
      vehicle_type: '',
      capacity: '',
    })
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingVehicle(null)
    setEditFormData({
      vehicle_number: '',
      vehicle_type: '',
      capacity: '',
      is_active: false,
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    const nextValue = type === 'number' ? value : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleEditInputChange = (event) => {
    const { name, value, type } = event.target
    const nextValue = name === 'is_active'
      ? value === 'true'
      : type === 'number'
        ? value
        : value
    setEditFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleCreateVehicle = async (event) => {
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
    if (schoolId <= 0) {
      setFormError({ submit: 'Missing school id. Please login again.' })
      return
    }
    setIsSubmitting(true)
    try {
      await dispatch(fetchCreateTransportVehicle({
        school_id: schoolId,
        ...formData,
        capacity: Number(formData.capacity),
        access_token: user.access_token,
      })).unwrap()
      setMessage('Transport vehicle created successfully.')
      closeCreatePopup()
      await refreshVehicles()
    } catch (err) {
      setFormError({ submit: typeof err === 'string' ? err : 'Failed to create transport vehicle.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle)
    setEditFormData({
      vehicle_number: vehicle?.vehicle_number || '',
      vehicle_type: vehicle?.vehicle_type || '',
      capacity: String(vehicle?.capacity ?? ''),
      is_active: vehicle?.is_active === true || vehicle?.is_active === 'true' || vehicle?.is_active === 1,
    })
    setFormError({})
    setMessage('')
  }

  const handleUpdateVehicle = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(editFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }
    if (!editingVehicle?.id || !user?.access_token) {
      setFormError((prev) => ({ ...prev, editSubmit: 'Unable to update transport vehicle.' }))
      return
    }
    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateTransportVehicle({
          id: editingVehicle.id,
          school_id: Number(editingVehicle?.school_id ?? schoolId),
          ...editFormData,
          capacity: Number(editFormData.capacity),
          access_token: user.access_token,
        }),
      ).unwrap()
      closeEditPopup()
      await refreshVehicles()
      setMessage('Transport vehicle updated successfully.')
    } catch (err) {
      setFormError((prev) => ({ ...prev, editSubmit: typeof err === 'string' ? err : 'Failed to update transport vehicle.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDeleteVehicle = (vehicle) => setDeleteVehicleTarget(vehicle)
  const closeDeletePopup = () => setDeleteVehicleTarget(null)

  const handleDeleteVehicle = async () => {
    const vehicleId = deleteVehicleTarget?.id
    if (!user?.access_token || !vehicleId) return
    if (actionLoadingId === String(vehicleId)) return
    setActionLoadingId(String(vehicleId))
    setMessage('')
    try {
      await dispatch(fetchDeleteTransportVehicle({ id: vehicleId, access_token: user.access_token })).unwrap()
      closeDeletePopup()
      await refreshVehicles()
      setMessage('Transport vehicle deleted successfully.')
    } catch (err) {
      setFormError({ submit: typeof err === 'string' ? err : 'Failed to delete transport vehicle.' })
    } finally {
      setActionLoadingId('')
    }
  }

  const vehicleColumns = [
    { key: 'id', header: 'Vehicle Id' },
    { key: 'vehicle_number', header: 'Vehicle Number' },
    { key: 'vehicle_type', header: 'Vehicle Type' },
    { key: 'capacity', header: 'Capacity' },
  ]

  if (showActionColumn) {
    vehicleColumns.push({
      key: 'action',
      header: 'Action',
      render: (vehicle) => (
        <div className="role-management-table-actions">
          {permissions.canEdit && (
              <button
                type="button"
                className="role-management-action-btn role-management-action-btn-edit"
                onClick={() => handleEditVehicle(vehicle)}
                aria-label={`Edit ${vehicle?.vehicle_number || 'vehicle'}`}
                title="Edit"
              >
                <EditActionIcon />
              </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
                className="role-management-action-btn role-management-action-btn-delete"
                onClick={() => requestDeleteVehicle(vehicle)}
                disabled={actionLoadingId === String(vehicle?.id)}
                aria-label={`Delete ${vehicle?.vehicle_number || 'vehicle'}`}
                title="Delete"
              >
                <DeleteActionIcon />
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
            <h2 className="role-management-title">Transport Vehicles</h2>
            {permissions.canAdd && (
              <button type="button" className="role-management-open-create-btn" onClick={openCreatePopup}>
                Create Vehicle
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading transport vehicles...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && permissions.canView && vehiclesData.length === 0 && (
          <p className="role-management-info">No transport vehicles available.</p>
        )}
        {!isLoading && !error && permissions.canView && vehiclesData.length > 0 && (
          <CustomTable
            columns={vehicleColumns}
            data={vehiclesData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No transport vehicles available."
          />
        )}
        {!isLoading && !error && !permissions.canView && (
          <p className="role-management-error">You do not have view permission for transport vehicles.</p>
        )}
        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      {isCreatePopupOpen && permissions.canAdd && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-create-popup" role="dialog" aria-modal="true" aria-labelledby="create-vehicle-title">
            <h3 id="create-vehicle-title" className="custom-popup-title">Create Vehicle</h3>
            <form className="role-management-form" onSubmit={handleCreateVehicle}>
              <div className="role-management-field">
                <label htmlFor="vehicle-number" className="role-management-label">Vehicle Number</label>
                <input id="vehicle-number" name="vehicle_number" type="text" className="role-management-input" value={formData.vehicle_number} onChange={handleInputChange} />
                {formError.vehicle_number && <p className="role-management-field-error">{formError.vehicle_number}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="vehicle-type" className="role-management-label">Vehicle Type</label>
                <input id="vehicle-type" name="vehicle_type" type="text" className="role-management-input" value={formData.vehicle_type} onChange={handleInputChange} />
                {formError.vehicle_type && <p className="role-management-field-error">{formError.vehicle_type}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="vehicle-capacity" className="role-management-label">Capacity</label>
                <input id="vehicle-capacity" name="capacity" type="number" className="role-management-input" value={formData.capacity} onChange={handleInputChange} min="1" />
                {formError.capacity && <p className="role-management-field-error">{formError.capacity}</p>}
              </div>
              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : 'Create Vehicle'}</button>
                <button type="button" className="role-management-cancel-btn" onClick={closeCreatePopup}>Cancel</button>
              </div>
              {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
            </form>
          </div>
        </div>
      )}

      {editingVehicle && permissions.canEdit && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-edit-popup" role="dialog" aria-modal="true" aria-labelledby="edit-vehicle-title">
            <h3 id="edit-vehicle-title" className="custom-popup-title">Edit Vehicle</h3>
            <form className="role-management-form" onSubmit={handleUpdateVehicle}>
              <div className="role-management-field">
                <label htmlFor="edit-vehicle-number" className="role-management-label">Vehicle Number</label>
                <input id="edit-vehicle-number" name="vehicle_number" type="text" className="role-management-input" value={editFormData.vehicle_number} onChange={handleEditInputChange} />
                {formError.vehicle_number && <p className="role-management-field-error">{formError.vehicle_number}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-vehicle-type" className="role-management-label">Vehicle Type</label>
                <input id="edit-vehicle-type" name="vehicle_type" type="text" className="role-management-input" value={editFormData.vehicle_type} onChange={handleEditInputChange} />
                {formError.vehicle_type && <p className="role-management-field-error">{formError.vehicle_type}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-vehicle-capacity" className="role-management-label">Capacity</label>
                <input id="edit-vehicle-capacity" name="capacity" type="number" className="role-management-input" value={editFormData.capacity} onChange={handleEditInputChange} min="1" />
                {formError.capacity && <p className="role-management-field-error">{formError.capacity}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="edit-vehicle-is-active" className="role-management-label">Is Active</label>
                <select
                  id="edit-vehicle-is-active"
                  name="is_active"
                  className="role-management-input"
                  value={String(editFormData.is_active)}
                  onChange={handleEditInputChange}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </div>
              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : 'Update Vehicle'}</button>
                <button type="button" className="role-management-cancel-btn" onClick={closeEditPopup}>Cancel</button>
              </div>
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteVehicleTarget)}
        title="Delete Vehicle"
        message={`Are you sure you want to delete "${deleteVehicleTarget?.vehicle_number || deleteVehicleTarget?.name || 'this vehicle'}"?`}
        onConfirm={handleDeleteVehicle}
        confirmText={actionLoadingId === String(deleteVehicleTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-vehicle-title"
      />
    </section>
  )
}

export default TransportVehiclesPage
