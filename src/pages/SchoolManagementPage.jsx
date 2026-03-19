import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchOrganizations } from '../store/organizationsSlice'
import { rolesManagement } from '../store/roleSlice'
import { createSchool, fetchSchools } from '../store/schoolsSlice'
import { getCrudPermissions } from '../utils/permissions'

const normalizeCollection = (response, key) => (
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

const getFeatureCatalog = (modules) => {
  const featureMap = new Map()
  modules.forEach((moduleItem) => {
    const featureList = Array.isArray(moduleItem?.features)
      ? moduleItem.features
      : Array.isArray(moduleItem?.module_features)
        ? moduleItem.module_features
        : []

    featureList.forEach((item) => {
      const feature = item?.feature ?? item
      const featureId = item?.feature_id ?? feature?.id
      if (!featureId || featureMap.has(featureId)) return
      featureMap.set(featureId, {
        feature_id: featureId,
        name: feature?.name || item?.feature_name || `Feature ${featureId}`,
        module_id: feature?.module_id ?? item?.module_id ?? moduleItem?.module_id ?? moduleItem?.id,
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
  organization_id: '',
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

function SchoolManagementPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? ''
  const permissions = useMemo(
    () => getCrudPermissions(authUser, { moduleMatchers: ['school'] }),
    [authUser],
  )

  const [schools, setSchools] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const organizationMap = useMemo(() => {
    const entries = organizations.map((item) => [String(item?.id ?? ''), item?.name || '-'])
    return Object.fromEntries(entries)
  }, [organizations])
  const featureCatalog = useMemo(
    () => getFeatureCatalog(Array.isArray(currentUser?.permissions) ? currentUser.permissions : []),
    [currentUser?.permissions],
  )
  const areAllPermissionsSelected = useMemo(
    () => formData.permissions.length > 0 && formData.permissions.every(
      (item) => item.can_create && item.can_read && item.can_update && item.can_delete,
    ),
    [formData.permissions],
  )

  const loadData = async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [schoolsResponse, organizationsResponse, rolesResponse] = await Promise.all([
        dispatch(fetchSchools({ access_token: accessToken })).unwrap(),
        dispatch(fetchOrganizations({ access_token: accessToken })).unwrap(),
        dispatch(rolesManagement({ access_token: accessToken })).unwrap(),
      ])

      setSchools(normalizeCollection(schoolsResponse, 'schools'))
      setOrganizations(normalizeCollection(organizationsResponse, 'organizations'))
      setRoles(normalizeCollection(rolesResponse, 'roles'))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch school management data.')
      setSchools([])
      setOrganizations([])
      setRoles([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  useEffect(() => {
    if (!isFormOpen || formData.permissions.length > 0 || featureCatalog.length === 0) {
      return
    }

    setFormData((prev) => ({ ...prev, permissions: buildPermissions(featureCatalog, null) }))
  }, [featureCatalog, formData.permissions.length, isFormOpen])

  const validateForm = (values) => {
    const nextErrors = {}

    if (!String(values.organization_id || '').trim()) nextErrors.organization_id = 'Organization is required.'
    if (!String(values.name || '').trim()) nextErrors.name = 'Name is required.'
    if (!String(values.code || '').trim()) nextErrors.code = 'Code is required.'
    if (!String(values.address || '').trim()) nextErrors.address = 'Address is required.'
    if (!String(values.phone || '').trim()) nextErrors.phone = 'Phone is required.'
    if (!String(values.email || '').trim()) nextErrors.email = 'Email is required.'
    if (!String(values.userDetails?.username || '').trim()) nextErrors.username = 'Username is required.'
    if (!String(values.userDetails?.password || '').trim()) nextErrors.password = 'Password is required.'
    // if (!String(values.userDetails?.role_id || '').trim()) nextErrors.role_id = 'Role is required.'
    const hasPermissions = values.permissions.some((item) => item.can_create || item.can_read || item.can_update || item.can_delete)
    if (!hasPermissions) nextErrors.permissions = 'Select at least one permission.'

    return nextErrors
  }

  const openCreateModal = () => {
    setFormData({ ...emptyForm, userDetails: { ...emptyForm.userDetails }, permissions: buildPermissions(featureCatalog, null) })
    setFormErrors({})
    setMessage('')
    setIsFormOpen(true)
  }

  const closeCreateModal = () => {
    setIsFormOpen(false)
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
    try {
      await dispatch(createSchool({
        access_token: accessToken,
        payload: {
          organization_id: Number(formData.organization_id),
          name: formData.name.trim(),
          code: formData.code.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          userDetails: {
            username: formData.userDetails.username.trim(),
            password: formData.userDetails.password,
            role_id: "Admin",
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
        },
      })).unwrap()

      closeCreateModal()
      setMessage('School created successfully.')
      await loadData()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to create school.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = useMemo(() => ([
    {
      key: 'organization_id',
      header: 'Organization',
      render: (item) => organizationMap[String(item?.organization_id ?? '')] || item?.organization_name || '-',
    },
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'address', header: 'Address' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
  ]), [organizationMap])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">School Management</h2>
            {permissions.canCreate && (
              <button
                type="button"
                className="role-management-open-create-btn"
                onClick={openCreateModal}
              >
                Create School
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading schools...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && (
          <CustomTable
            columns={columns}
            data={schools}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No schools available."
          />
        )}
      </div>

      <CustomPopup
        isOpen={isFormOpen}
        title="Create School"
        titleId="create-school-title"
        popupClassName="school-create-popup"
        onClose={closeCreateModal}
      >
        {permissions.canCreate && (
        <form className="role-management-form role-management-form-two-col" onSubmit={handleSubmit}>
          <div className="organization-form-section">
            <div className="organization-form-section-title">School Information</div>

            <div className="role-management-field">
              <label htmlFor="school-organization-id" className="role-management-label">Organization</label>
              <select
                id="school-organization-id"
                name="organization_id"
                className="role-management-select"
                value={formData.organization_id}
                onChange={handleChange}
              >
                <option value="">Select organization</option>
                {organizations.map((organization, index) => (
                  <option key={organization?.id ?? index} value={organization?.id ?? ''}>
                    {organization?.name || `Organization ${index + 1}`}
                  </option>
                ))}
              </select>
              {formErrors.organization_id && <p className="role-management-field-error">{formErrors.organization_id}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="school-name" className="role-management-label">Name</label>
              <input
                id="school-name"
                name="name"
                type="text"
                className="role-management-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter school name"
              />
              {formErrors.name && <p className="role-management-field-error">{formErrors.name}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="school-code" className="role-management-label">Code</label>
              <input
                id="school-code"
                name="code"
                type="text"
                className="role-management-input"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter school code"
              />
              {formErrors.code && <p className="role-management-field-error">{formErrors.code}</p>}
            </div>

            <div className="role-management-field">
              <label htmlFor="school-address" className="role-management-label">Address</label>
              <input
                id="school-address"
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
              <label htmlFor="school-phone" className="role-management-label">Phone</label>
              <input
                id="school-phone"
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
              <label htmlFor="school-email" className="role-management-label">Email</label>
              <input
                id="school-email"
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
              <label htmlFor="school-username" className="role-management-label">Create Username</label>
              <input
                id="school-username"
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
              <label htmlFor="school-password" className="role-management-label">Create Password</label>
              <input
                id="school-password"
                name="password"
                type="password"
                className="role-management-input"
                value={formData.userDetails.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
              {formErrors.password && <p className="role-management-field-error">{formErrors.password}</p>}
            </div>

            {/* <div className="role-management-field">
              <label htmlFor="school-role-id" className="role-management-label">Role</label>
              <select
                id="school-role-id"
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
            </div> */}
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
              onClick={closeCreateModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="login-submit-btn custom-popup-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
        )}
      </CustomPopup>
    </section>
  )
}

export default SchoolManagementPage
