import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { rolesManagement } from '../store/roleSlice'
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization,
} from '../store/organizationsSlice'

const normalizeOrganizations = (response) => (
  Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.organizations)
          ? response.organizations
          : []
)

const normalizeList = (response, key) => (
  Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.[key])
          ? response[key]
          : []
)

const getFeatureCatalog = (roles) => {
  const featureMap = new Map()
  roles.forEach((role) => {
    ;(Array.isArray(role?.role_features) ? role.role_features : []).forEach((item) => {
      const feature = item?.feature
      const featureId = item?.feature_id ?? feature?.id
      if (!featureId || featureMap.has(featureId)) return
      featureMap.set(featureId, {
        feature_id: featureId,
        name: feature?.name || item?.feature_name || `Feature ${featureId}`,
        module_id: feature?.module_id ?? item?.module_id,
        sort_order: feature?.sort_order ?? item?.sort_order ?? 0,
      })
    })
  })

  return [...featureMap.values()].sort((a, b) =>
    Number(a.module_id || 0) - Number(b.module_id || 0)
    || Number(a.sort_order || 0) - Number(b.sort_order || 0)
    || String(a.name || '').localeCompare(String(b.name || '')),
  )
}

const buildPermissions = (catalog, sourcePermissions) => {
  const assigned = new Map(
    (Array.isArray(sourcePermissions) ? sourcePermissions : []).map((item) => [item?.feature_id, item]),
  )

  return catalog.map((feature) => {
    const current = assigned.get(feature.feature_id)
    return {
      feature_id: feature.feature_id,
      feature_name: feature.name,
      can_create: Boolean(current?.can_create),
      can_read: Boolean(current?.can_read),
      can_update: Boolean(current?.can_update),
      can_delete: Boolean(current?.can_delete),
    }
  })
}

const emptyForm = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  userDetails: {
    username: '',
    password: '',
    role_id: '',
  },
  permissions: [],
}

function OrganizationManagementPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const accessToken = authUser?.access_token ?? authUser?.token ?? ''

  const [organizations, setOrganizations] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const featureCatalog = useMemo(() => getFeatureCatalog(roles), [roles])
  const areAllPermissionsSelected = useMemo(
    () => formData.permissions.length > 0 && formData.permissions.every(
      (item) => item.can_create && item.can_read && item.can_update && item.can_delete,
    ),
    [formData.permissions],
  )

  const loadOrganizations = async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await dispatch(fetchOrganizations({ access_token: accessToken })).unwrap()
      setOrganizations(normalizeOrganizations(response))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch organizations.')
      setOrganizations([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadRoles = async () => {
    if (!accessToken) {
      return
    }

    try {
      const response = await dispatch(rolesManagement({ access_token: accessToken })).unwrap()
      setRoles(normalizeList(response, 'roles'))
    } catch {
      setRoles([])
    }
  }

  useEffect(() => {
    loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  useEffect(() => {
    loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  const validateForm = (values) => {
    const nextErrors = {}

    if (!String(values.name || '').trim()) nextErrors.name = 'Name is required.'
    if (!String(values.code || '').trim()) nextErrors.code = 'Code is required.'
    if (!String(values.address || '').trim()) nextErrors.address = 'Address is required.'
    if (!String(values.phone || '').trim()) nextErrors.phone = 'Phone is required.'
    if (!String(values.email || '').trim()) {
      nextErrors.email = 'Email is required.'
    }
    if (!String(values.userDetails?.username || '').trim()) nextErrors.username = 'Username is required.'
    if (!editingOrganization && !String(values.userDetails?.password || '').trim()) nextErrors.password = 'Password is required.'
    if (!String(values.userDetails?.role_id || '').trim()) nextErrors.role_id = 'Role is required.'

    const hasPermissions = values.permissions.some((item) => item.can_create || item.can_read || item.can_update || item.can_delete)
    if (!hasPermissions) nextErrors.permissions = 'Select at least one permission.'

    return nextErrors
  }

  const openCreateModal = () => {
    setEditingOrganization(null)
    setFormData({ ...emptyForm, userDetails: { ...emptyForm.userDetails }, permissions: buildPermissions(featureCatalog, null) })
    setFormErrors({})
    setMessage('')
    setIsFormOpen(true)
  }

  const openEditModal = (organization) => {
    setEditingOrganization(organization)
    setFormData({
      name: organization?.name || '',
      code: organization?.code || '',
      address: organization?.address || '',
      phone: organization?.phone || '',
      email: organization?.email || '',
      userDetails: {
        username: organization?.userDetails?.username || organization?.user_details?.username || '',
        password: '',
        role_id: String(organization?.userDetails?.role_id || organization?.user_details?.role_id || ''),
      },
      permissions: buildPermissions(featureCatalog, organization?.permissions),
    })
    setFormErrors({})
    setMessage('')
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingOrganization(null)
    setFormData({ ...emptyForm, userDetails: { ...emptyForm.userDetails }, permissions: buildPermissions(featureCatalog, null) })
    setFormErrors({})
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'username' || name === 'password' || name === 'role_id') {
      setFormData((prev) => ({
        ...prev,
        userDetails: {
          ...prev.userDetails,
          [name]: value,
        },
      }))
      setFormErrors((prev) => ({ ...prev, [name]: '', permissions: '' }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const togglePermission = (featureId, permissionKey) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((item) =>
        item.feature_id === featureId ? { ...item, [permissionKey]: !item[permissionKey] } : item),
    }))
    setFormErrors((prev) => ({ ...prev, permissions: '' }))
  }

  const toggleAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((item) => ({
        ...item,
        can_create: !areAllPermissionsSelected,
        can_read: !areAllPermissionsSelected,
        can_update: !areAllPermissionsSelected,
        can_delete: !areAllPermissionsSelected,
      })),
    }))
    setFormErrors((prev) => ({ ...prev, permissions: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    if (!accessToken) {
      setError('Missing access token. Please login again.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      userDetails: {
        username: formData.userDetails.username.trim(),
        password: formData.userDetails.password,
        role_id: formData.userDetails.role_id,
      },
      permissions: formData.permissions
        .filter((item) => item.can_create || item.can_read || item.can_update || item.can_delete)
        .map((item) => ({
          feature_id: item.feature_id,
          can_create: item.can_create,
          can_read: item.can_read,
          can_update: item.can_update,
          can_delete: item.can_delete,
        })),
    }

    try {
      if (editingOrganization?.id) {
        await dispatch(updateOrganization({
          id: editingOrganization.id,
          access_token: accessToken,
          payload,
        })).unwrap()
        setMessage('Organization updated successfully.')
      } else {
        await dispatch(createOrganization({
          access_token: accessToken,
          payload,
        })).unwrap()
        setMessage('Organization created successfully.')
      }

      closeFormModal()
      await loadOrganizations()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save organization.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id || !accessToken) {
      return
    }

    setIsDeleting(true)
    setError('')
    setMessage('')
    try {
      await dispatch(deleteOrganization({
        id: deleteTarget.id,
        access_token: accessToken,
      })).unwrap()
      setDeleteTarget(null)
      setMessage('Organization deleted successfully.')
      await loadOrganizations()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete organization.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'address', header: 'Address' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    {
      key: 'actions',
      header: 'Action',
      render: (item) => (
        <div className="role-management-table-actions">
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-edit"
            onClick={() => openEditModal(item)}
          >
            Edit
          </button>
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-delete"
            onClick={() => setDeleteTarget(item)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Organization Management</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreateModal}
            >
              Add Organization
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading organizations...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && organizations.length === 0 && (
          <p className="role-management-info">No organizations available.</p>
        )}
        {!isLoading && (
          <CustomTable
            columns={columns}
            data={organizations}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No organizations available."
          />
        )}
      </div>

      <CustomPopup
        isOpen={isFormOpen}
        title={editingOrganization ? 'Edit Organization' : 'Add Organization'}
        titleId="organization-form-title"
        popupClassName="organization-create-popup"
        onClose={closeFormModal}
      >
        <form className="role-management-form role-management-form-two-col" onSubmit={handleSubmit}>
          <div className="organization-form-section">
            <div className="organization-form-section-title">Organization Information</div>

            <div className="role-management-field">
              <label htmlFor="organization-name" className="role-management-label">Name</label>
              <input
                id="organization-name"
                name="name"
                type="text"
                className="role-management-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter organization name"
              />
              {formErrors.name && <p className="role-management-field-error">{formErrors.name}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-code" className="role-management-label">Code</label>
              <input
                id="organization-code"
                name="code"
                type="text"
                className="role-management-input"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter organization code"
              />
              {formErrors.code && <p className="role-management-field-error">{formErrors.code}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-address" className="role-management-label">Address</label>
              <input
                id="organization-address"
                name="address"
                type="text"
                className="role-management-input"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
              />
              {formErrors.address && <p className="role-management-field-error">{formErrors.address}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-phone" className="role-management-label">Phone</label>
              <input
                id="organization-phone"
                name="phone"
                type="text"
                className="role-management-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
              {formErrors.phone && <p className="role-management-field-error">{formErrors.phone}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-email" className="role-management-label">Email</label>
              <input
                id="organization-email"
                name="email"
                type="email"
                className="role-management-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
              {formErrors.email && <p className="role-management-field-error">{formErrors.email}</p>}
            </div>
          </div>

          <div className="organization-form-section">
            <div className="organization-form-section-title">Login Information</div>

            <div className="role-management-field">
              <label htmlFor="organization-username" className="role-management-label">Create Username</label>
              <input
                id="organization-username"
                name="username"
                type="text"
                className="role-management-input"
                value={formData.userDetails.username}
                onChange={handleChange}
                placeholder="Enter username"
              />
              {formErrors.username && <p className="role-management-field-error">{formErrors.username}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-password" className="role-management-label">Create Password</label>
              <input
                id="organization-password"
                name="password"
                type="password"
                className="role-management-input"
                value={formData.userDetails.password}
                onChange={handleChange}
                placeholder={editingOrganization ? 'Enter new password (optional)' : 'Enter password'}
              />
              {formErrors.password && <p className="role-management-field-error">{formErrors.password}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="organization-role-id" className="role-management-label">Role</label>
              <select
                id="organization-role-id"
                name="role_id"
                className="role-management-select"
                value={formData.userDetails.role_id}
                onChange={handleChange}
              >
                <option value="">Select role</option>
                {roles.map((role, index) => (
                  <option key={role?.id ?? index} value={role?.role_id ?? role?.id ?? ''}>
                    {role?.name || `Role ${index + 1}`}
                  </option>
                ))}
              </select>
              {formErrors.role_id && <p className="role-management-field-error">{formErrors.role_id}</p>}
            </div>
          </div>

          <div className="organization-form-section organization-form-section-full">
            <div className="organization-form-section-head">
              <div className="organization-form-section-title">Permissions</div>
              <button
                type="button"
                className="organization-permission-toggle-btn"
                onClick={toggleAllPermissions}
                disabled={formData.permissions.length === 0}
              >
                {areAllPermissionsSelected ? 'Clear All' : 'Select All'}
              </button>
            </div>

            <div className="role-management-field">
              <div className="role-permission-grid">
                {formData.permissions.map((permission) => (
                  <div key={permission.feature_id} className="role-permission-card">
                    <p className="role-permission-title">{permission.feature_name}</p>
                    <div className="role-permission-actions">
                      <button
                        type="button"
                        className={`role-permission-chip role-permission-chip-create ${permission.can_create ? 'role-permission-chip-active' : ''}`}
                        onClick={() => togglePermission(permission.feature_id, 'can_create')}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        className={`role-permission-chip role-permission-chip-read ${permission.can_read ? 'role-permission-chip-active' : ''}`}
                        onClick={() => togglePermission(permission.feature_id, 'can_read')}
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className={`role-permission-chip role-permission-chip-update ${permission.can_update ? 'role-permission-chip-active' : ''}`}
                        onClick={() => togglePermission(permission.feature_id, 'can_update')}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className={`role-permission-chip role-permission-chip-delete ${permission.can_delete ? 'role-permission-chip-active' : ''}`}
                        onClick={() => togglePermission(permission.feature_id, 'can_delete')}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {formErrors.permissions && <p className="role-management-field-error">{formErrors.permissions}</p>}
            </div>
          </div>

          <div className="custom-popup-actions" style={{ gridColumn: '1 / -1' }}>
            <button
              type="button"
              className="otp-back-btn custom-popup-btn"
              onClick={closeFormModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="login-submit-btn custom-popup-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingOrganization ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </CustomPopup>

      <CustomPopup
        isOpen={Boolean(deleteTarget)}
        title="Delete Organization"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'this organization'}"?`}
        showCancel
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onClose={() => setDeleteTarget(null)}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        isDanger
        onConfirm={handleDelete}
        titleId="organization-delete-title"
      />
    </section>
  )
}

export default OrganizationManagementPage
