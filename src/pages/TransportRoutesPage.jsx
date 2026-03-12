import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

function TransportRoutesPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
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
    description: '',
    vehicle_id: 0,
    driver_user_id: 0,
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    vehicle_id: 0,
    driver_user_id: 0,
  })

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

  const permissions = useMemo(() => {
    const modules = Array.isArray(user?.modules) ? user.modules : []
    const transportModule = modules.find((moduleItem) => {
      const slug = toSlug(moduleItem?.name || moduleItem?.display_name || '')
      return slug === 'transport' || slug.includes('transport')
    })

    const actionValues = getActionValues(transportModule)
    if (actionValues.length === 0) {
      return {
        canView: true,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      }
    }

    const canAdd = actionValues.includes('add') || actionValues.includes('create')
    const canEdit = actionValues.includes('edit') || actionValues.includes('update')
    const canDelete = actionValues.includes('delete') || actionValues.includes('remove')
    const canView = actionValues.includes('view') || canAdd || canEdit || canDelete
    return { canView, canAdd, canEdit, canDelete }
  }, [user?.modules])

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
        const [vehiclesResp, staffResp] = await Promise.all([
          dispatch(fetchTransportVehicles({ access_token: user.access_token })).unwrap(),
          dispatch(fetchStaffList({ access_token: user.access_token, page: 1, page_size: 200 })).unwrap(),
        ])

        const normalizedVehicles = normalizeList(vehiclesResp)
        const normalizedStaff = normalizeList(staffResp)

        setVehicleOptions(normalizedVehicles)
        setDriverOptions(normalizedStaff)
      } catch {
        setVehicleOptions([])
        setDriverOptions([])
      }
    }

    loadDropdownData()
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Route name is required.'
    if (!values.description.trim()) nextErrors.description = 'Description is required.'
    if (!values.vehicle_id || Number(values.vehicle_id) <= 0) nextErrors.vehicle_id = 'Vehicle id is required.'
    if (!values.driver_user_id || Number(values.driver_user_id) <= 0) nextErrors.driver_user_id = 'Driver user id is required.'
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
      description: '',
      vehicle_id: 0,
      driver_user_id: 0,
    })
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingRoute(null)
    setEditFormData({
      name: '',
      description: '',
      vehicle_id: 0,
      driver_user_id: 0,
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
          ...formData,
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
      description: route?.description || '',
      vehicle_id: Number(route?.vehicle_id ?? 0),
      driver_user_id: Number(route?.driver_user_id ?? 0),
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
          ...editFormData,
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
    { key: 'description', header: 'Description' },
    { key: 'vehicle_number', header: 'Vehicle Number' },
    { key: 'driver_name', header: 'Driver Name' },
    { key: 'is_active', header: 'Is Active' },
    { key: 'stops_count', header: 'Stops Count' },
    { key: 'students_count', header: 'Students Count' },
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
            >
              Edit
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-delete"
              onClick={() => requestDeleteRoute(route)}
              disabled={actionLoadingId === String(route?.id)}
            >
              {actionLoadingId === String(route?.id) ? 'Deleting...' : 'Delete'}
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

      {isCreatePopupOpen && (
        <CustomPopup
          isOpen={isCreatePopupOpen}
          title="Create Route"
          titleId="create-route-title"
          popupClassName="role-management-create-popup"
        >
          <form className="role-management-form" onSubmit={handleCreateRoute}>
            <div className="role-management-field">
              <label htmlFor="route-name" className="role-management-label">Route Name</label>
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
              <label htmlFor="route-description" className="role-management-label">Description</label>
              <input
                id="route-description"
                name="description"
                type="text"
                className="role-management-input"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter description"
              />
              {formError.description && <p className="role-management-field-error">{formError.description}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-vehicle_id" className="role-management-label">Vehicle Id</label>
              <select
                id="route-vehicle_id"
                name="vehicle_id"
                className="role-management-input"
                value={formData.vehicle_id}
                onChange={handleInputChange}
              >
                <option value={0}>Select vehicle</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle?.id} value={Number(vehicle?.id ?? 0)}>
                    {vehicle?.vehicle_number || vehicle?.name || `Vehicle #${vehicle?.id}`}
                  </option>
                ))}
              </select>
              {formError.vehicle_id && <p className="role-management-field-error">{formError.vehicle_id}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="route-driver_user_id" className="role-management-label">Driver User Id</label>
              <select
                id="route-driver_user_id"
                name="driver_user_id"
                className="role-management-input"
                value={formData.driver_user_id}
                onChange={handleInputChange}
              >
                <option value={0}>Select driver</option>
                {driverOptions.map((staff) => (
                  <option key={staff?.id} value={Number(staff?.user_id ?? 0)}>
                    {staff?.first_name || staff?.last_name
                      ? `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim()
                      : staff?.name || `User #${staff?.user_id ?? staff?.id}`}
                  </option>
                ))}
              </select>
              {formError.driver_user_id && <p className="role-management-field-error">{formError.driver_user_id}</p>}
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

      {editingRoute && (
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
                <label htmlFor="edit-route-name" className="role-management-label">Route Name</label>
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
                <label htmlFor="edit-route-description" className="role-management-label">Description</label>
                <input
                  id="edit-route-description"
                  name="description"
                  type="text"
                  className="role-management-input"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Enter description"
                />
                {formError.description && <p className="role-management-field-error">{formError.description}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-vehicle_id" className="role-management-label">Vehicle Id</label>
                <select
                  id="edit-route-vehicle_id"
                  name="vehicle_id"
                  className="role-management-input"
                  value={editFormData.vehicle_id}
                  onChange={handleEditInputChange}
                >
                  <option value={0}>Select vehicle</option>
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle?.id} value={Number(vehicle?.id ?? 0)}>
                      {vehicle?.vehicle_number || vehicle?.name || `Vehicle #${vehicle?.id}`}
                    </option>
                  ))}
                </select>
                {formError.vehicle_id && <p className="role-management-field-error">{formError.vehicle_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-route-driver_user_id" className="role-management-label">Driver User Id</label>
                <select
                  id="edit-route-driver_user_id"
                  name="driver_user_id"
                  className="role-management-input"
                  value={editFormData.driver_user_id}
                  onChange={handleEditInputChange}
                >
                  <option value={0}>Select driver</option>
                  {driverOptions.map((staff) => (
                    <option key={staff?.id} value={Number(staff?.user_id ?? 0)}>
                      {staff?.first_name || staff?.last_name
                        ? `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim()
                        : staff?.name || `User #${staff?.user_id ?? staff?.id}`}
                    </option>
                  ))}
                </select>
                {formError.driver_user_id && <p className="role-management-field-error">{formError.driver_user_id}</p>}
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
