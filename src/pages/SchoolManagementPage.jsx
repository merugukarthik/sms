import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchOrganizations } from '../store/organizationsSlice'
import { rolesManagement } from '../store/roleSlice'
import { createSchool, deleteSchool, fetchSchools, updateSchool } from '../store/schoolsSlice'
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

const normalizeRoleName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_')

const extractRoleNames = (...sources) => {
  const names = []

  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return

    const candidates = [
      source?.role,
      source?.roles,
      source?.user?.role,
      source?.user?.roles,
      source?.loginData?.role,
      source?.loginData?.roles,
    ]

    candidates.forEach((candidate) => {
      if (Array.isArray(candidate)) {
        candidate.forEach((item) => {
          if (typeof item === 'string') names.push(item)
          if (item && typeof item === 'object') {
            names.push(item?.name, item?.display_name, item?.role, item?.role_name)
          }
        })
        return
      }

      if (typeof candidate === 'string') {
        names.push(candidate)
        return
      }

      if (candidate && typeof candidate === 'object') {
        names.push(candidate?.name, candidate?.display_name, candidate?.role, candidate?.role_name)
      }
    })
  })

  return names.filter(Boolean).map(normalizeRoleName)
}

const emptyForm = {
  organization_id: '',
  hasOrganization: true,
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
  const loginData = useSelector((state) => state.auth.loginData)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? ''
  const permissions = useMemo(
    () => getCrudPermissions(authUser, { moduleMatchers: ['school'] }),
    [authUser],
  )
  const isPlatformOwner = useMemo(() => {
    const roleNames = extractRoleNames(authUser, currentUser, loginData, loginData?.user)
    return roleNames.includes('platform_owner')
  }, [authUser, currentUser, loginData])

  const [schools, setSchools] = useState([])
  const [schoolsMeta, setSchoolsMeta] = useState({
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  })
  const [organizations, setOrganizations] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingSchool, setEditingSchool] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
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

  const loadData = async (page = schoolsMeta.page, pageSize = schoolsMeta.page_size) => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [schoolsResponse, organizationsResponse, rolesResponse] = await Promise.all([
        dispatch(fetchSchools({
          access_token: accessToken,
          page,
          page_size: pageSize,
        })).unwrap(),
        dispatch(fetchOrganizations({ access_token: accessToken })).unwrap(),
        dispatch(rolesManagement({ access_token: accessToken })).unwrap(),
      ])

      const normalizedSchools = normalizeCollection(schoolsResponse, 'schools')

      setSchools(normalizedSchools)
      setSchoolsMeta({
        total: Number(schoolsResponse?.total ?? normalizedSchools.length ?? 0),
        page: Number(schoolsResponse?.page ?? page ?? 1),
        page_size: Number(schoolsResponse?.page_size ?? pageSize ?? 10),
        total_pages: Number(schoolsResponse?.total_pages ?? 1),
      })
      setOrganizations(normalizeCollection(organizationsResponse, 'organizations'))
      setRoles(normalizeCollection(rolesResponse, 'roles'))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch school management data.')
      setSchools([])
      setSchoolsMeta({
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      })
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

    if (values.hasOrganization && !String(values.organization_id || '').trim()) {
      nextErrors.organization_id = 'Organization is required.'
    }
    if (!String(values.name || '').trim()) nextErrors.name = 'Name is required.'
    if (!String(values.code || '').trim()) nextErrors.code = 'Code is required.'
    if (!String(values.address || '').trim()) nextErrors.address = 'Address is required.'
    if (!String(values.phone || '').trim()) nextErrors.phone = 'Phone is required.'
    if (!String(values.email || '').trim()) nextErrors.email = 'Email is required.'
    if (!String(values.userDetails?.username || '').trim()) nextErrors.username = 'Username is required.'
    if (!editingSchool && !String(values.userDetails?.password || '').trim()) nextErrors.password = 'Password is required.'
    // if (!String(values.userDetails?.role_id || '').trim()) nextErrors.role_id = 'Role is required.'
    const hasPermissions = values.permissions.some((item) => item.can_create || item.can_read || item.can_update || item.can_delete)
    if (!hasPermissions) nextErrors.permissions = 'Select at least one permission.'

    return nextErrors
  }

  const openCreateModal = () => {
    setEditingSchool(null)
    setShowPassword(false)
    setFormData({ ...emptyForm, userDetails: { ...emptyForm.userDetails }, permissions: buildPermissions(featureCatalog, null) })
    setFormErrors({})
    setMessage('')
    setIsFormOpen(true)
  }

  const openEditModal = (school) => {
    setEditingSchool(school)
    setShowPassword(false)
    setFormData({
      organization_id: String(school?.organization_id ?? ''),
      hasOrganization: Boolean(school?.organization_id),
      name: school?.name || '',
      code: school?.code || '',
      address: school?.address || '',
      phone: school?.phone || '',
      email: school?.email || '',
      userDetails: {
        username: school?.userDetails?.username || school?.user_details?.username || '',
        password: '',
        role_id: String(school?.userDetails?.role_id || school?.user_details?.role_id || ''),
      },
      permissions: buildPermissions(featureCatalog, school?.permissions),
    })
    setFormErrors({})
    setMessage('')
    setIsFormOpen(true)
  }

  const closeCreateModal = () => {
    setIsFormOpen(false)
    setEditingSchool(null)
    setShowPassword(false)
    setFormData({ ...emptyForm, userDetails: { ...emptyForm.userDetails }, permissions: buildPermissions(featureCatalog, null) })
    setFormErrors({})
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
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

    if (name === 'hasOrganization') {
      setFormData((prev) => ({
        ...prev,
        hasOrganization: checked,
        organization_id: checked ? prev.organization_id : '',
      }))
      setFormErrors((prev) => ({ ...prev, organization_id: '' }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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
      organization_id: formData.hasOrganization ? Number(formData.organization_id) || 0 : 0,
      name: formData.name.trim(),
      code: formData.code.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      userDetails: {
        username: formData.userDetails.username.trim(),
        password: formData.userDetails.password,
        role_id: 'Admin',
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
      if (editingSchool?.id) {
        await dispatch(updateSchool({
          id: editingSchool.id,
          access_token: accessToken,
          payload,
        })).unwrap()
        setMessage('School updated successfully.')
      } else {
        await dispatch(createSchool({
          access_token: accessToken,
          payload,
        })).unwrap()
        setMessage('School created successfully.')
      }

      closeCreateModal()
      await loadData(editingSchool ? schoolsMeta.page : 1, schoolsMeta.page_size)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save school.')
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
      await dispatch(deleteSchool({
        id: deleteTarget.id,
        access_token: accessToken,
      })).unwrap()
      setDeleteTarget(null)
      setMessage('School deleted successfully.')
      await loadData(schoolsMeta.page, schoolsMeta.page_size)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete school.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
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
  ]

  if (permissions.canUpdate || permissions.canDelete) {
    columns.push({
      key: 'actions',
      header: 'Action',
      render: (item) => (
        <div className="role-management-table-actions">
            {permissions.canUpdate && (
              <button
                type="button"
                className="role-management-action-btn role-management-action-btn-edit"
                onClick={() => openEditModal(item)}
                aria-label={`Edit ${item?.name || 'school'}`}
                title="Edit"
              >
                <EditActionIcon />
              </button>
            )}
          {permissions.canDelete && (
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-delete"
              onClick={() => setDeleteTarget(item)}
              aria-label={`Delete ${item?.name || 'school'}`}
              title="Delete"
            >
              <DeleteActionIcon />
            </button>
          )}
        </div>
      ),
    })
  }

  const handlePreviousPage = () => {
    if (schoolsMeta.page <= 1 || isLoading) return
    loadData(schoolsMeta.page - 1, schoolsMeta.page_size)
  }

  const handlePageSelect = (page) => {
    if (page === schoolsMeta.page || isLoading) return
    loadData(page, schoolsMeta.page_size)
  }

  const handleNextPage = () => {
    if (schoolsMeta.page >= schoolsMeta.total_pages || isLoading) return
    loadData(schoolsMeta.page + 1, schoolsMeta.page_size)
  }

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
          <>
            <CustomTable
              columns={columns}
              data={schools}
              rowKey={(item, index) => item?.id ?? index}
              wrapperClassName="role-management-table-wrap"
              tableClassName="role-management-table"
              emptyMessage="No schools available."
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginTop: '1rem',
                flexWrap: 'wrap',
              }}
            >
              {!error && (
                <p className="role-management-info" style={{ margin: 0 }}>
                  Page {schoolsMeta.page} of {schoolsMeta.total_pages || 1} | Total: {schoolsMeta.total}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="otp-back-btn custom-popup-btn"
                  onClick={handlePreviousPage}
                  disabled={isLoading || schoolsMeta.page <= 1}
                >
                  Previous
                </button>
                {Array.from({ length: schoolsMeta.total_pages }, (_, index) => {
                  const pageNumber = index + 1
                  const isActivePage = pageNumber === schoolsMeta.page

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className="custom-popup-btn"
                      onClick={() => handlePageSelect(pageNumber)}
                      disabled={isLoading || isActivePage}
                      style={{
                        minWidth: '2.5rem',
                        border: isActivePage ? '1px solid #0f172a' : undefined,
                        background: isActivePage ? '#0f172a' : undefined,
                        color: isActivePage ? '#ffffff' : undefined,
                      }}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="login-submit-btn custom-popup-btn"
                  onClick={handleNextPage}
                  disabled={isLoading || schoolsMeta.page >= schoolsMeta.total_pages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CustomPopup
        isOpen={isFormOpen}
        title={editingSchool ? 'Edit School' : 'Create School'}
        titleId="create-school-title"
        popupClassName="school-create-popup"
        onClose={closeCreateModal}
      >
        {(permissions.canCreate || (editingSchool && permissions.canUpdate)) && (
        <form className="role-management-form role-management-form-two-col" onSubmit={handleSubmit}>
          <div className="organization-form-section">
            <div className="organization-form-section-title">School Information</div>

            {isPlatformOwner && (
              <div className="role-management-field" style={{ gridColumn: '1 / -1' }}>
                <label className="role-management-label">School Type</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label className="attendance-select-all-label" htmlFor="school-with-organization">
                    <input
                      id="school-with-organization"
                      type="checkbox"
                      className="attendance-select-checkbox"
                      checked={formData.hasOrganization}
                      onChange={() => {
                        setFormData((prev) => ({ ...prev, hasOrganization: true }))
                        setFormErrors((prev) => ({ ...prev, organization_id: '' }))
                      }}
                    />
                    With Organization
                  </label>
                  <label className="attendance-select-all-label" htmlFor="school-without-organization">
                    <input
                      id="school-without-organization"
                      type="checkbox"
                      className="attendance-select-checkbox"
                      checked={!formData.hasOrganization}
                      onChange={() => {
                        setFormData((prev) => ({ ...prev, hasOrganization: false, organization_id: '' }))
                        setFormErrors((prev) => ({ ...prev, organization_id: '' }))
                      }}
                    />
                    Without Organization
                  </label>
                </div>
              </div>
            )}

            {(!isPlatformOwner || formData.hasOrganization) && (
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
            )}

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
              <div className="password-input-wrapper">
                <input
                  id="school-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="role-management-input"
                  value={formData.userDetails.password}
                  onChange={handleChange}
                  placeholder={editingSchool ? 'Enter new password (optional)' : 'Enter password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.83 11.83 0 0 1-2.17 3.31" />
                      <path d="M6.61 6.61A13.53 13.53 0 0 0 1 11.5C2.73 15.89 7 19 12 19a11 11 0 0 0 5.39-1.39" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
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
              {isSubmitting ? 'Saving...' : editingSchool ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
        )}
      </CustomPopup>

      <CustomPopup
        isOpen={Boolean(deleteTarget)}
        title="Delete School"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'this school'}"?`}
        showCancel
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onClose={() => setDeleteTarget(null)}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        isDanger
        onConfirm={handleDelete}
        titleId="delete-school-title"
      />
    </section>
  )
}

export default SchoolManagementPage
