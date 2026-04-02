import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import {
  fetchCreateTransportRoute,
  fetchDeleteTransportRoute,
  fetchTransportRoutes,
  fetchTransportVehicles,
  fetchUpdateTransportRoute,
} from '../store/transportSlice'
import { fetchStaffList } from '../store/staffSlice'
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
          : Array.isArray(resp?.staff)
            ? resp.staff
            : []
)

function TransportRoutesPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const schoolId = Number(user?.user?.school_id ?? user?.school_id ?? 0)
  const [routesData, setRoutesData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [deleteRouteTarget, setDeleteRouteTarget] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [driverOptions, setDriverOptions] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    fare: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    fare: '',
  })

  const permissions = useMemo(() => {
    return getCrudPermissions(user, {
      moduleMatchers: ['transport'],
      featureMatchers: ['route'],
    })
  }, [user])

  const showActionColumn = permissions.canAdd || permissions.canEdit || permissions.canDelete

  const refreshRoutes = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchTransportRoutes({
        access_token: user.access_token,
      })).unwrap()
      setRoutesData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch transport routes.')
      setRoutesData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  useEffect(() => {
    const loadDropdownData = async () => {
      if (!user?.access_token) return
      try {
         console.log('vehiclesResp:- ', user)
        const [vehiclesResp, staffResp] = await Promise.all([
          dispatch(fetchTransportVehicles({ access_token: user.access_token })).unwrap(),
          //dispatch(fetchStaffList({ access_token: user.access_token, page: 1, page_size: 200 })).unwrap(),
        ])
        console.log('vehiclesResp:- ', vehiclesResp)
        const normalizedVehicles = normalizeList(vehiclesResp)
       // const normalizedStaff = normalizeList(staffResp)

        setVehicleOptions(normalizedVehicles)
     //   setDriverOptions(normalizedStaff)
      } catch {
        setVehicleOptions([])
        // setDriverOptions([])
      }
    }

    loadDropdownData()
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Name is required.'
    if (!values.code.trim()) nextErrors.code = 'Code is required.'
    if (!values.vehicle_number.trim()) nextErrors.vehicle_number = 'Vehicle number is required.'
    if (!values.driver_name.trim()) nextErrors.driver_name = 'Driver name is required.'
    if (!String(values.driver_phone || '').trim()) nextErrors.driver_phone = 'Driver phone is required.'
    if (!/^\d{1,10}$/.test(String(values.driver_phone || ''))) nextErrors.driver_phone = 'Driver phone must be up to 10 digits.'
    if (!String(values.fare || '').trim()) nextErrors.fare = 'Fare is required.'
    else if (Number(values.fare) < 0) nextErrors.fare = 'Fare cannot be negative.'
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
      name: '',
      code: '',
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      fare: '',
    })
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingRoute(null)
    setEditFormData({
      name: '',
      code: '',
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      fare: '',
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    if (name === 'vehicle_number') {
      const selectedVehicle = vehicleOptions.find((vehicle) => String(vehicle?.vehicle_number || '') === String(value || ''))
      setFormData((prev) => ({
        ...prev,
        vehicle_number: value,
        code: selectedVehicle?.code || prev.code,
        driver_name: selectedVehicle?.driver_name || prev.driver_name,
        driver_phone: String(selectedVehicle?.driver_phone || prev.driver_phone || ''),
        fare: selectedVehicle?.fare !== undefined && selectedVehicle?.fare !== null
          ? String(selectedVehicle.fare)
          : prev.fare,
      }))
      setFormError((prev) => ({
        ...prev,
        vehicle_number: '',
        code: '',
        driver_name: '',
        driver_phone: '',
        fare: '',
        submit: '',
      }))
      return
    }

    const nextValue = name === 'driver_phone'
      ? String(value ?? '').replace(/\D/g, '').slice(0, 10)
      : type === 'number'
        ? value
        : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleEditInputChange = (event) => {
    const { name, value, type } = event.target
    if (name === 'vehicle_number') {
      const selectedVehicle = vehicleOptions.find((vehicle) => String(vehicle?.vehicle_number || '') === String(value || ''))
      setEditFormData((prev) => ({
        ...prev,
        vehicle_number: value,
        code: selectedVehicle?.code || prev.code,
        driver_name: selectedVehicle?.driver_name || prev.driver_name,
        driver_phone: String(selectedVehicle?.driver_phone || prev.driver_phone || ''),
        fare: selectedVehicle?.fare !== undefined && selectedVehicle?.fare !== null
          ? String(selectedVehicle.fare)
          : prev.fare,
      }))
      setFormError((prev) => ({
        ...prev,
        vehicle_number: '',
        code: '',
        driver_name: '',
        driver_phone: '',
        fare: '',
        editSubmit: '',
      }))
      return
    }

    const nextValue = name === 'driver_phone'
      ? String(value ?? '').replace(/\D/g, '').slice(0, 10)
      : type === 'number'
        ? value
        : value
    setEditFormData((prev) => ({ ...prev, [name]: nextValue }))
    setFormError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleCreateRoute = async (event) => {
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
        fetchCreateTransportRoute({
          school_id: schoolId,
          ...formData,
          fare: Number(formData.fare),
          access_token: user.access_token,
        }),
      ).unwrap()
      setMessage('Transport route created successfully.')
      closeCreatePopup()
      await refreshRoutes()
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create transport route.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRoute = (route) => {
    setEditingRoute(route)
    setEditFormData({
      name: route?.name || '',
      code: route?.code || '',
      vehicle_number: route?.vehicle_number || '',
      driver_name: route?.driver_name || '',
      driver_phone: String(route?.driver_phone || ''),
      fare: String(route?.fare ?? ''),
    })
    setFormError({})
    setMessage('')
  }

  const handleUpdateRoute = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(editFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!editingRoute?.id || !user?.access_token) {
      setFormError((prev) => ({ ...prev, editSubmit: 'Unable to update transport route.' }))
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateTransportRoute({
          id: editingRoute.id,
          school_id: Number(editingRoute?.school_id ?? schoolId),
          ...editFormData,
          fare: Number(editFormData.fare),
          access_token: user.access_token,
        }),
      ).unwrap()
      closeEditPopup()
      await refreshRoutes()
      setMessage('Transport route updated successfully.')
    } catch (err) {
      setFormError((prev) => ({
        ...prev,
        editSubmit: typeof err === 'string' ? err : 'Failed to update transport route.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDeleteRoute = (route) => {
    setDeleteRouteTarget(route)
  }

  const closeDeletePopup = () => {
    setDeleteRouteTarget(null)
  }

  const handleDeleteRoute = async () => {
    const routeId = deleteRouteTarget?.id
    if (!user?.access_token || !routeId) return
    if (actionLoadingId === String(routeId)) return

    setActionLoadingId(String(routeId))
    setMessage('')
    try {
      await dispatch(
        fetchDeleteTransportRoute({
          id: routeId,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeDeletePopup()
      await refreshRoutes()
      setMessage('Transport route deleted successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to delete transport route.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const routeColumns = [
    { key: 'id', header: 'Route Id' },
    { key: 'name', header: 'Route Name' },
    { key: 'vehicle_number', header: 'Vehicle Number' },
    { key: 'driver_name', header: 'Driver Name' },
  ]

  if (showActionColumn) {
    routeColumns.push({
      key: 'action',
      header: 'Action',
      render: (route) => (
        <div className="role-management-table-actions">
          {permissions.canEdit && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-edit"
              onClick={() => handleEditRoute(route)}
              aria-label={`Edit ${route?.name || 'route'}`}
              title="Edit"
            >
              <EditActionIcon />
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-delete"
              onClick={() => requestDeleteRoute(route)}
              disabled={actionLoadingId === String(route?.id)}
              aria-label={`Delete ${route?.name || 'route'}`}
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
            <h2 className="role-management-title">Transport Routes</h2>
            {permissions.canAdd && (
              <button
                type="button"
                className="role-management-open-create-btn"
                onClick={openCreatePopup}
              >
                Create Route
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading transport routes...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && permissions.canView && routesData.length === 0 && (
          <p className="role-management-info">No transport routes available.</p>
        )}

        {!isLoading && !error && permissions.canView && routesData.length > 0 && (
          <CustomTable
            columns={routeColumns}
            data={routesData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No transport routes available."
          />
        )}

        {!isLoading && !error && !permissions.canView && (
          <p className="role-management-error">You do not have view permission for transport routes.</p>
        )}
        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      {isCreatePopupOpen && permissions.canAdd && (
        <CustomPopup
          isOpen={isCreatePopupOpen}
          title="Create Route"
          titleId="create-route-title"
          popupClassName="role-management-create-popup"
        >
          <form className="role-management-form" onSubmit={handleCreateRoute}>
            <div className="role-management-field">
              <label htmlFor="route-name" className="role-management-label">Name</label>
              <input
                id="route-name"
                name="name"
                type="text"
                className="role-management-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter route name"
              />
              {formError.name && <p className="role-management-field-error">{formError.name}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-code" className="role-management-label">Code</label>
              <input
                id="route-code"
                name="code"
                type="text"
                className="role-management-input"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="Enter code"
              />
              {formError.code && <p className="role-management-field-error">{formError.code}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-vehicle-number" className="role-management-label">Vehicle Number</label>
              <select
                id="route-vehicle-number"
                name="vehicle_number"
                className="role-management-input"
                value={formData.vehicle_number}
                onChange={handleInputChange}
              >
                <option value="">Select vehicle number</option>
                {vehicleOptions.map((vehicle, index) => {
                  const optionValue = String(vehicle?.vehicle_number || '')
                  if (!optionValue) return null

                  return (
                    <option key={vehicle?.id ?? `${optionValue}-${index}`} value={optionValue}>
                      {optionValue}
                    </option>
                  )
                })}
              </select>
              {formError.vehicle_number && <p className="role-management-field-error">{formError.vehicle_number}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-driver-name" className="role-management-label">Driver Name</label>
              <input
                id="route-driver-name"
                name="driver_name"
                type="text"
                className="role-management-input"
                value={formData.driver_name}
                onChange={handleInputChange}
                placeholder="Enter driver name"
              />
              {formError.driver_name && <p className="role-management-field-error">{formError.driver_name}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-driver-phone" className="role-management-label">Driver Phone</label>
              <input
                id="route-driver-phone"
                name="driver_phone"
                type="text"
                className="role-management-input"
                value={formData.driver_phone}
                onChange={handleInputChange}
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter driver phone"
              />
              {formError.driver_phone && <p className="role-management-field-error">{formError.driver_phone}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-fare" className="role-management-label">Fare</label>
              <input
                id="route-fare"
                name="fare"
                type="number"
                className="role-management-input"
                value={formData.fare}
                onChange={handleInputChange}
                min="0"
                placeholder="Enter fare"
              />
              {formError.fare && <p className="role-management-field-error">{formError.fare}</p>}
            </div>

            <div className="role-management-form-actions">
              <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Create Route'}
              </button>
              <button
                type="button"
                className="role-management-cancel-btn"
                onClick={closeCreatePopup}
              >
                Cancel
              </button>
            </div>
            {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
          </form>
        </CustomPopup>
      )}

      {editingRoute && permissions.canEdit && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-edit-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-route-title"
          >
            <h3 id="edit-route-title" className="custom-popup-title">Edit Route</h3>
            <form className="role-management-form" onSubmit={handleUpdateRoute}>
              <div className="role-management-field">
                <label htmlFor="edit-route-name" className="role-management-label">Name</label>
                <input
                  id="edit-route-name"
                  name="name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter route name"
                />
                {formError.name && <p className="role-management-field-error">{formError.name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-code" className="role-management-label">Code</label>
                <input
                  id="edit-route-code"
                  name="code"
                  type="text"
                  className="role-management-input"
                  value={editFormData.code}
                  onChange={handleEditInputChange}
                  placeholder="Enter code"
                />
                {formError.code && <p className="role-management-field-error">{formError.code}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-vehicle-number" className="role-management-label">Vehicle Number</label>
                <select
                  id="edit-route-vehicle-number"
                  name="vehicle_number"
                  className="role-management-input"
                  value={editFormData.vehicle_number}
                  onChange={handleEditInputChange}
                >
                  <option value="">Select vehicle number</option>
                  {vehicleOptions.map((vehicle, index) => {
                    const optionValue = String(vehicle?.vehicle_number || '')
                    if (!optionValue) return null

                    return (
                      <option key={vehicle?.id ?? `${optionValue}-${index}`} value={optionValue}>
                        {optionValue}
                      </option>
                    )
                  })}
                </select>
                {formError.vehicle_number && <p className="role-management-field-error">{formError.vehicle_number}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-driver-name" className="role-management-label">Driver Name</label>
                <input
                  id="edit-route-driver-name"
                  name="driver_name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.driver_name}
                  onChange={handleEditInputChange}
                  placeholder="Enter driver name"
                />
                {formError.driver_name && <p className="role-management-field-error">{formError.driver_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-driver-phone" className="role-management-label">Driver Phone</label>
                <input
                  id="edit-route-driver-phone"
                  name="driver_phone"
                  type="text"
                  className="role-management-input"
                  value={editFormData.driver_phone}
                  onChange={handleEditInputChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter driver phone"
                />
                {formError.driver_phone && <p className="role-management-field-error">{formError.driver_phone}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-fare" className="role-management-label">Fare</label>
                <input
                  id="edit-route-fare"
                  name="fare"
                  type="number"
                  className="role-management-input"
                  value={editFormData.fare}
                  onChange={handleEditInputChange}
                  min="0"
                  placeholder="Enter fare"
                />
                {formError.fare && <p className="role-management-field-error">{formError.fare}</p>}
              </div>

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Update Route'}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
              </div>
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteRouteTarget)}
        title="Delete Route"
        message={`Are you sure you want to delete "${deleteRouteTarget?.name || 'this route'}"?`}
        onConfirm={handleDeleteRoute}
        confirmText={actionLoadingId === String(deleteRouteTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-route-title"
      />
    </section>
  )
}

export default TransportRoutesPage
