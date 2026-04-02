import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchOrganizations } from '../store/organizationsSlice'
import { fetchCreateRole, fetchDeleteRole, fetchUpdateRole, rolesManagement } from '../store/roleSlice'
import { fetchSchools } from '../store/schoolsSlice'
import { getCrudPermissions } from '../utils/permissions'

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

const emptyForm = {
  name: '',
  description: '',
  scope: 'platform',
  organization_id: '',
  school_id: '',
  permissions: [],
}

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

const buildPermissions = (catalog, role) => {
  const assigned = new Map(
    (Array.isArray(role?.role_features) ? role.role_features : []).map((item) => [item?.feature_id, item]),
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

function RoleManagementPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? currentUser?.access_token ?? currentUser?.token ?? ''
  const permissions = useMemo(
    () => getCrudPermissions(authUser, { moduleMatchers: ['role'] }),
    [authUser],
  )
  const [roles, setRoles] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [schools, setSchools] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoadingId, setDeleteLoadingId] = useState('')
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

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
  const organizationMap = useMemo(() => Object.fromEntries(organizations.map((item) => [String(item?.id ?? ''), item?.name || '-'])), [organizations])
  const schoolMap = useMemo(() => Object.fromEntries(schools.map((item) => [String(item?.id ?? ''), item?.name || '-'])), [schools])

  const loadData = async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError('')
    try {
      const [rolesResp, orgResp, schoolResp] = await Promise.all([
        dispatch(rolesManagement({ access_token: accessToken })).unwrap(),
        dispatch(fetchOrganizations({ access_token: accessToken })).unwrap(),
        dispatch(fetchSchools({ access_token: accessToken })).unwrap(),
      ])
      setRoles(normalizeList(rolesResp, 'roles'))
      setOrganizations(normalizeList(orgResp, 'organizations'))
      setSchools(normalizeList(schoolResp, 'schools'))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch roles.')
      setRoles([])
      setOrganizations([])
      setSchools([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  const filteredRoles = useMemo(() => roles.filter((role) => {
    const haystack = `${role?.name || ''} ${role?.description || ''} ${role?.scope || ''}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  }), [roles, search])

  const roleColumns = useMemo(() => {
    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'description', header: 'Description' },
      { key: 'scope', header: 'Scope' },
      {
        key: 'organization_id',
        header: 'Organization',
        render: (role) => organizationMap[String(role?.organization_id ?? '')] || '-',
      },
      {
        key: 'school_id',
        header: 'School',
        render: (role) => schoolMap[String(role?.school_id ?? '')] || '-',
      },
      {
        key: 'permissions',
        header: 'Permissions',
        render: (role) => Array.isArray(role?.role_features) ? role.role_features.length : 0,
      },
      {
        key: 'status',
        header: 'Status',
        render: (role) => (
          <span className={`role-management-status-pill ${role?.is_active ? 'role-management-status-pill-active' : 'role-management-status-pill-inactive'}`}>
            {role?.is_active ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ]

    if (permissions.canUpdate || permissions.canDelete) {
      columns.push({
        key: 'action',
        header: 'Action',
        render: (role) => (
          <div className="role-management-table-actions">
            {permissions.canUpdate && (
              <button type="button" className="role-management-action-btn role-management-action-btn-edit" onClick={() => openEdit(role)} aria-label={`Edit ${role?.name || 'role'}`} title="Edit"><EditActionIcon /></button>
            )}
            {permissions.canDelete && (
              <button
                type="button"
                className="role-management-action-btn role-management-action-btn-delete"
                onClick={() => setDeleteTarget(role)}
                disabled={deleteLoadingId === String(role?.id)}
                aria-label={`Delete ${role?.name || 'role'}`}
                title="Delete"
              >
                <DeleteActionIcon />
              </button>
            )}
          </div>
        ),
      })
    }

    return columns
  }, [deleteLoadingId, openEdit, organizationMap, permissions.canDelete, permissions.canUpdate, schoolMap])

  const openCreate = () => {
    setEditingRole(null)
    setFormErrors({})
    setFormData({ ...emptyForm, permissions: buildPermissions(featureCatalog, null) })
    setPopupOpen(true)
  }

  function openEdit(role) {
    setEditingRole(role)
    setFormErrors({})
    setFormData({
      name: role?.name || '',
      description: role?.description || '',
      scope: role?.scope || 'platform',
      organization_id: role?.organization_id ? String(role.organization_id) : '',
      school_id: role?.school_id ? String(role.school_id) : '',
      permissions: buildPermissions(featureCatalog, role),
    })
    setPopupOpen(true)
  }

  const closePopup = () => {
    setPopupOpen(false)
    setEditingRole(null)
    setFormData(emptyForm)
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'scope' && value !== 'organization' ? { organization_id: '' } : {}),
      ...(name === 'scope' && value !== 'school' ? { school_id: '' } : {}),
    }))
    setFormErrors((prev) => ({ ...prev, [name]: '', permissions: '' }))
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

  const validateForm = () => {
    const nextErrors = {}
    if (!formData.name.trim()) nextErrors.name = 'Name is required.'
    if (!formData.description.trim()) nextErrors.description = 'Description is required.'
    if (!formData.scope.trim()) nextErrors.scope = 'Scope is required.'
    if (formData.scope === 'organization' && !formData.organization_id) nextErrors.organization_id = 'Organization is required.'
    if (formData.scope === 'school' && !formData.school_id) nextErrors.school_id = 'School is required.'
    const hasPermissions = formData.permissions.some((item) => item.can_create || item.can_read || item.can_update || item.can_delete)
    if (!hasPermissions) nextErrors.permissions = 'Select at least one permission.'
    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm()
    // if (Object.keys(nextErrors).length > 0) {
    //   setFormErrors(nextErrors)
    //   return
    // }
    if (!accessToken) {
      setError('Missing access token. Please login again.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      scope: formData.scope,
      organization_id: formData.organization_id ? Number(formData.organization_id) : null,
      school_id: formData.school_id ? Number(formData.school_id) : null,
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

    setIsSubmitting(true)
    setError('')
    setMessage('')
    try {
      if (editingRole?.id) {
        await dispatch(fetchUpdateRole({ id: editingRole.id, payload, access_token: accessToken })).unwrap()
        setMessage('Role updated successfully.')
      } else {
        await dispatch(fetchCreateRole({ payload, access_token: accessToken })).unwrap()
        setMessage('Role created successfully.')
      }
      closePopup()
      await loadData()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save role.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id || !accessToken) return
    setDeleteLoadingId(String(deleteTarget.id))
    setError('')
    setMessage('')
    try {
      await dispatch(fetchDeleteRole({ id: deleteTarget.id, access_token: accessToken })).unwrap()
      setDeleteTarget(null)
      setMessage('Role deleted successfully.')
      await loadData()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete role.')
    } finally {
      setDeleteLoadingId('')
    }
  }

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Role Management</h2>
            {permissions.canCreate && <button type="button" className="role-management-open-create-btn" onClick={openCreate}>Create Role</button>}
          </div>
        </div>

        <div className="role-management-field">
          <label htmlFor="role-search" className="role-management-label">Search Roles</label>
          <input id="role-search" type="text" className="role-management-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, description, or scope" />
        </div>

        {isLoading && <p className="role-management-info">Loading roles...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && filteredRoles.length === 0 && <p className="role-management-info">No roles available.</p>}

        {!isLoading && filteredRoles.length > 0 && (
          <CustomTable
            columns={roleColumns}
            data={filteredRoles}
            rowKey={(role, index) => role?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No roles available."
          />
        )}
      </div>

      <CustomPopup isOpen={popupOpen} title={editingRole ? 'Edit Role' : 'Create Role'} titleId="role-form-title" popupClassName="role-management-create-popup" onClose={closePopup}>
        {(permissions.canCreate || (editingRole && permissions.canUpdate)) && (
        <form className="role-management-form" onSubmit={handleSubmit}>
          <div className="role-management-form role-management-form-two-col">
          <div className="role-management-field">
            <label htmlFor="role-name" className="role-management-label">Name</label>
            <input id="role-name" name="name" type="text" className="role-management-input" value={formData.name} onChange={handleFieldChange} placeholder="Enter role name" />
            {formErrors.name && <p className="role-management-field-error">{formErrors.name}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="role-description" className="role-management-label">Description</label>
            <input id="role-description" name="description" type="text" className="role-management-input" value={formData.description} onChange={handleFieldChange} placeholder="Enter description" />
            {formErrors.description && <p className="role-management-field-error">{formErrors.description}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="role-scope" className="role-management-label">Scope</label>
            <select id="role-scope" name="scope" className="role-management-select" value={formData.scope} onChange={handleFieldChange}>
              <option value="platform">Platform</option>
              <option value="organization">Organization</option>
              <option value="school">School</option>
            </select>
            {formErrors.scope && <p className="role-management-field-error">{formErrors.scope}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="role-organization" className="role-management-label">Organization</label>
            <select id="role-organization" name="organization_id" className="role-management-select" value={formData.organization_id} onChange={handleFieldChange}>
              <option value="">Select organization</option>
              {organizations.map((organization, index) => <option key={organization?.id ?? index} value={organization?.id ?? ''}>{organization?.name || `Organization ${index + 1}`}</option>)}
            </select>
            {formErrors.organization_id && <p className="role-management-field-error">{formErrors.organization_id}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="role-school" className="role-management-label">School</label>
            <select id="role-school" name="school_id" className="role-management-select" value={formData.school_id} onChange={handleFieldChange}>
              <option value="">Select school</option>
              {schools.map((school, index) => <option key={school?.id ?? index} value={school?.id ?? ''}>{school?.name || `School ${index + 1}`}</option>)}
            </select>
            {/* {formErrors.school_id && <p className="role-management-field-error">{formErrors.school_id}</p>} */}
          </div>
          </div>
          <div className="role-management-field">
            <div className="organization-form-section-head">
              <label className="role-management-label">Permissions</label>
              <button
                type="button"
                className="organization-permission-toggle-btn"
                onClick={toggleAllPermissions}
                disabled={formData.permissions.length === 0}
              >
                {areAllPermissionsSelected ? 'Clear All' : 'Select All'}
              </button>
            </div>
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
          <div className="custom-popup-actions">
            <button type="button" className="otp-back-btn custom-popup-btn" onClick={closePopup} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="login-submit-btn custom-popup-btn" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}</button>
          </div>
        </form>
        )}
      </CustomPopup>

      <CustomPopup
        isOpen={Boolean(deleteTarget)}
        title="Delete Role"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'this role'}"?`}
        showCancel
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        confirmText={deleteLoadingId === String(deleteTarget?.id) ? 'Deleting...' : 'Delete'}
        isDanger
        onConfirm={handleDelete}
        titleId="delete-role-title"
      />
    </section>
  )
}

export default RoleManagementPage
