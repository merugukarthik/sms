import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCreateRole, fetchDeleteRole, fetchUpdateRole, rolesManagement } from '../store/roleSlice'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'

const RoleManagement = () => {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const accessToken = authUser?.access_token ?? authUser?.token ?? ''
  const [rolesData, setRolesData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState('')
  const [deleteRoleTarget, setDeleteRoleTarget] = useState(null)
  const [displayNameSearch, setDisplayNameSearch] = useState('')
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState({})
  const [createMessage, setCreateMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  })

  const refreshRoles = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(rolesManagement({ access_token: accessToken })).unwrap()
      const normalizedRoles = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.items)
          ? resp.items
          : Array.isArray(resp?.data)
            ? resp.data
            : Array.isArray(resp?.roles)
              ? resp.roles
              : []
      setRolesData(normalizedRoles)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch roles')
      setRolesData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!values.display_name.trim()) {
      nextErrors.display_name = 'Display name is required.'
    }

    if (!values.description.trim()) {
      nextErrors.description = 'Description is required.'
    }

    return nextErrors
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setCreateError((prev) => ({ ...prev, [name]: '' }))
    setCreateMessage('')
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setCreateError({})
    setCreateMessage('')
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      name: '',
      display_name: '',
      description: '',
    })
    setCreateError({})
  }

  const closeEditPopup = () => {
    setEditingRoleId('')
    setEditFormData({
      name: '',
      display_name: '',
      description: '',
    })
    setCreateError({})
  }

  const handleEditInputChange = (event) => {
    const { name, value } = event.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
    setCreateError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleEditRole = (role) => {
    setEditingRoleId(String(role?.id || ''))
    setEditFormData({
      name: role?.name || '',
      display_name: role?.display_name || '',
      description: role?.description || '',
    })
    setCreateError({})
    setCreateMessage('')
  }

  const requestDeleteRole = (role) => {
    setDeleteRoleTarget(role)
  }

  const closeDeletePopup = () => {
    setDeleteRoleTarget(null)
  }

  const handleDeleteRole = async () => {
    const roleId = deleteRoleTarget?.id
    if (!accessToken) return
    if (!roleId) return
    if (actionLoadingId === String(roleId)) return

    setActionLoadingId(String(roleId))
    setCreateError({})
    setCreateMessage('')
    try {
      await dispatch(
        fetchDeleteRole({
          id: roleId,
          access_token: accessToken,
        }),
      ).unwrap()
      if (String(editingRoleId) === String(roleId)) {
        closeEditPopup()
      }
      await refreshRoles()
      setCreateMessage('Role deleted successfully.')
      closeDeletePopup()
    } catch (err) {
      setCreateError({
        submit: typeof err === 'string' ? err : 'Failed to delete role.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const handleCreateRole = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(formData)

    if (Object.keys(validationErrors).length > 0) {
      setCreateError(validationErrors)
      setCreateMessage('')
      return
    }

    if (!accessToken) {
      setCreateError({
        submit: 'Missing access token. Please login again.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchCreateRole({
          ...formData,
          access_token: accessToken,
        }),
      ).unwrap()
      setCreateMessage('Role created successfully.')
      setCreateError({})
      setFormData({
        name: '',
        display_name: '',
        description: '',
      })
      await refreshRoles()
      setIsCreatePopupOpen(false)
    } catch (err) {
      setCreateMessage('')
      setCreateError({
        submit: typeof err === 'string' ? err : 'Failed to create role.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(editFormData)

    if (Object.keys(validationErrors).length > 0) {
      setCreateError(validationErrors)
      return
    }

    if (!editingRoleId || !accessToken) {
      setCreateError((prev) => ({ ...prev, editSubmit: 'Unable to update role.' }))
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateRole({
          id: editingRoleId,
          ...editFormData,
          access_token: accessToken,
        }),
      ).unwrap()
      closeEditPopup()
      await refreshRoles()
      setCreateMessage('Role updated successfully.')
      setCreateError({})
    } catch (err) {
      setCreateError((prev) => ({
        ...prev,
        editSubmit: typeof err === 'string' ? err : 'Failed to update role.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleColumns = [
    { key: 'id', header: 'Role Id' },
    {
      key: 'display_name',
      header: 'Name',
    },
    { key: 'description', header: 'Description' },
    {
      key: 'action',
      header: 'Action',
      render: (role) => (
        <div className="role-management-table-actions">
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-edit"
              onClick={() => handleEditRole(role)}
              aria-label={`Edit ${role?.name || 'role'}`}
              title="Edit"
            >
              <EditActionIcon />
            </button>
            <button
              type="button"
              className="role-management-action-btn role-management-action-btn-delete"
              onClick={() => requestDeleteRole(role)}
              disabled={actionLoadingId === String(role?.id)}
              aria-label={`Delete ${role?.name || 'role'}`}
              title="Delete"
            >
              <DeleteActionIcon />
            </button>
        </div>
      ),
    },
  ]

  const filteredRoles = rolesData.filter((role) =>
    String(role?.display_name || '')
      .toLowerCase()
      .includes(displayNameSearch.trim().toLowerCase()),
  )

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Role Management</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreatePopup}
            >
              Create Role
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading roles...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && rolesData.length === 0 && (
          <p className="role-management-info">No roles available.</p>
        )}

        {!isLoading && !error && rolesData.length > 0 && (
          <>
            <div className="role-management-field">
              <label htmlFor="role-display-search" className="role-management-label">Search by Display Name</label>
              <input
                id="role-display-search"
                type="text"
                className="role-management-input"
                value={displayNameSearch}
                onChange={(event) => setDisplayNameSearch(event.target.value)}
                placeholder="Type display name..."
              />
            </div>
            <CustomTable
              columns={roleColumns}
              data={filteredRoles}
              rowKey={(role, index) => role?.id ?? index}
              wrapperClassName="role-management-table-wrap"
              tableClassName="role-management-table"
              emptyMessage="No roles found for this display name."
            />
          </>
        )}


        {createMessage && <p className="role-management-success">{createMessage}</p>}
      </div>
      {isCreatePopupOpen && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-create-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-role-title"
          >
            <h3 id="create-role-title" className="custom-popup-title">Create Role</h3>
            <form className="role-management-form" onSubmit={handleCreateRole}>
              <div className="role-management-field">
                <label htmlFor="name" className="role-management-label">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="role-management-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
                {createError.name && <p className="role-management-field-error">{createError.name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="display_name" className="role-management-label">Display Name</label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  className="role-management-input"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                />
                {createError.display_name && <p className="role-management-field-error">{createError.display_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="description" className="role-management-label">Description</label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  className="role-management-input"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                />
                {createError.description && <p className="role-management-field-error">{createError.description}</p>}
              </div>

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Create Role'}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeCreatePopup}
                >
                  Cancel
                </button>
              </div>
              {createError.submit && <p className="role-management-field-error">{createError.submit}</p>}
            </form>
          </div>
        </div>
      )}
      {editingRoleId && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-edit-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-role-title"
          >
            <h3 id="edit-role-title" className="custom-popup-title">Edit Role</h3>
            <form className="role-management-form" onSubmit={handleUpdateRole}>
              <div className="role-management-field">
                <label htmlFor="edit-name" className="role-management-label">Name</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter name"
                />
                {createError.name && <p className="role-management-field-error">{createError.name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-display_name" className="role-management-label">Display Name</label>
                <input
                  id="edit-display_name"
                  name="display_name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.display_name}
                  onChange={handleEditInputChange}
                  placeholder="Enter display name"
                />
                {createError.display_name && <p className="role-management-field-error">{createError.display_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-description" className="role-management-label">Description</label>
                <input
                  id="edit-description"
                  name="description"
                  type="text"
                  className="role-management-input"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Enter description"
                />
                {createError.description && <p className="role-management-field-error">{createError.description}</p>}
              </div>

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Update Role'}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
              </div>
              {createError.editSubmit && <p className="role-management-field-error">{createError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}
      <CustomPopup
        isOpen={Boolean(deleteRoleTarget)}
        title="Delete Role"
        message={`Are you sure you want to delete "${deleteRoleTarget?.display_name || deleteRoleTarget?.name || 'this role'}"?`}
        onConfirm={handleDeleteRole}
        confirmText={actionLoadingId === String(deleteRoleTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-role-title"
      />
    </section>
  )
}

export default RoleManagement
