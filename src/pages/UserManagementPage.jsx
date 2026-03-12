import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchOrganizations } from '../store/organizationsSlice'
import { rolesManagement } from '../store/roleSlice'
import { fetchSchools } from '../store/schoolsSlice'
import { fetchCreateUser, fetchUpdateUserStatus, fetchUsersList } from '../store/usersSlice'

const normalizeUsers = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const getUserDisplayName = (user) => {
  const fullName = String(user?.full_name || '').trim()
  if (fullName) return fullName

  const firstName = String(user?.first_name || '').trim()
  const lastName = String(user?.last_name || '').trim()
  const joinedName = `${firstName} ${lastName}`.trim()
  if (joinedName) return joinedName

  return '-'
}

const getUserRole = (user) => {
  if (Array.isArray(user?.role) && user.role.length > 0) {
    const roleLabels = user.role
      .map((rolename) => rolename?.display_name || rolename?.name || '')
      .filter(Boolean)
    return roleLabels.length > 0 ? roleLabels.join(', ') : '-'
  }

  return user?.role?.display_name || user?.role?.name || '-'
}

const getStatus = (status) => (status === true ? 'Active' : 'Inactive')
const normalizeList = (resp, key) => (
  Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.items)
      ? resp.items
      : Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp?.[key])
          ? resp[key]
          : []
)

function UserManagementPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? currentUser?.access_token ?? currentUser?.token ?? ''

  const [usersData, setUsersData] = useState([])
  const [rolesData, setRolesData] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [schools, setSchools] = useState([])
  const [usersMeta, setUsersMeta] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [statusEditTarget, setStatusEditTarget] = useState(null)
  const [statusDraft, setStatusDraft] = useState('active')
  const [createUserError, setCreateUserError] = useState({})
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    organization_id: '',
    school_id: '',
    student_id: '',
    staff_id: '',
    is_platform_owner: false,
    role_id: '',
  })

  const refreshUsers = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const resp = await dispatch(fetchUsersList({
        access_token: accessToken,
        page: 1,
        page_size: 20,
      })).unwrap()

      const normalized = normalizeUsers(resp)
      setUsersData(normalized)
      setUsersMeta({
        total: Number(resp?.total ?? normalized.length ?? 0),
        page: Number(resp?.page ?? 1),
        page_size: Number(resp?.page_size ?? 20),
        total_pages: Number(resp?.total_pages ?? 1),
      })
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch users list.')
      setUsersData([])
      setUsersMeta({
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadCreateUserOptions = async () => {
    if (!accessToken) return
    try {
      const [rolesResp, organizationsResp, schoolsResp] = await Promise.all([
        dispatch(rolesManagement({ access_token: accessToken })).unwrap(),
        dispatch(fetchOrganizations({ access_token: accessToken })).unwrap(),
        dispatch(fetchSchools({ access_token: accessToken })).unwrap(),
      ])
      setRolesData(normalizeList(rolesResp, 'roles'))
      setOrganizations(normalizeList(organizationsResp, 'organizations'))
      setSchools(normalizeList(schoolsResp, 'schools'))
    } catch {
      // Keep existing lists; page-level errors are surfaced through create submit if needed.
    }
  }

  useEffect(() => {
    refreshUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  useEffect(() => {
    loadCreateUserOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken])

  const handleOpenStatusEdit = (item) => {
    setStatusEditTarget(item)
    setStatusDraft(item?.is_active ? 'active' : 'inactive')
  }

  const handleCloseStatusEdit = () => {
    setStatusEditTarget(null)
  }

  const handleConfirmStatusEdit = async () => {
    const targetUserId = statusEditTarget?.id
    if (!targetUserId || !accessToken) return

    setIsUpdatingStatus(true)
    setError('')
    setMessage('')
    try {
      await dispatch(fetchUpdateUserStatus({
        id: targetUserId,
        role_id:8,
        is_active: statusDraft === 'active',
        access_token: accessToken,
      })).unwrap()
      setMessage('User status updated successfully.')
      handleCloseStatusEdit()
      await refreshUsers()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to update user status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const openCreateUserPopup = () => {
    setCreateUserError({})
    setMessage('')
    setIsCreatePopupOpen(true)
  }

  const closeCreateUserPopup = () => {
    setIsCreatePopupOpen(false)
    setCreateUserForm({
      username: '',
      email: '',
      full_name: '',
      password: '',
      organization_id: '',
      school_id: '',
      student_id: '',
      staff_id: '',
      is_platform_owner: false,
      role_id: '',
    })
    setCreateUserError({})
  }

  const handleCreateUserInputChange = (event) => {
    const { name, value, type, checked } = event.target
    setCreateUserForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setCreateUserError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const validateCreateUser = (values) => {
    const nextErrors = {}
    if (!values.username.trim()) nextErrors.username = 'Username is required.'
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    if (!values.full_name.trim()) nextErrors.full_name = 'Full name is required.'
    if (!values.password.trim()) nextErrors.password = 'Password is required.'
    if (!values.role_id.trim()) nextErrors.role_id = 'Role is required.'
    return nextErrors
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    const validationErrors = validateCreateUser(createUserForm)
    // if (Object.keys(validationErrors).length > 0) {
    //   setCreateUserError(validationErrors)
    //   return
    // }

    if (!accessToken) {
      setCreateUserError({ submit: 'Missing access token. Please login again.' })
      return
    }

    setIsCreatingUser(true)
    setError('')
    setMessage('')
    try {
      await dispatch(fetchCreateUser({
        access_token: accessToken,
        payload: {
          username: createUserForm.username.trim(),
          email: createUserForm.email.trim(),
          full_name: createUserForm.full_name.trim(),
          password: createUserForm.password,
          organization_id: createUserForm.organization_id ? Number(createUserForm.organization_id) : null,
          school_id: createUserForm.school_id ? Number(createUserForm.school_id) : null,
          student_id: createUserForm.student_id ? Number(createUserForm.student_id) : null,
          staff_id: createUserForm.staff_id ? Number(createUserForm.staff_id) : null,
          is_platform_owner: Boolean(createUserForm.is_platform_owner),
          role_id: createUserForm.role_id,
        },
      })).unwrap()
      setMessage('User created successfully.')
      closeCreateUserPopup()
      await refreshUsers()
    } catch (err) {
      setCreateUserError({
        submit: typeof err === 'string' ? err : 'Failed to create user.',
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const userColumns = [
    { key: 'id', header: 'Role ID' },
    {
      key: 'full_name',
      header: 'Name',
      render: (item) => getUserDisplayName(item),
    },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'role',
      header: 'Role',
      render: (item) => getUserRole(item),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const isActive = item?.is_active === true
        return (
          <span className={`role-management-status-pill ${isActive ? 'role-management-status-pill-active' : 'role-management-status-pill-inactive'}`}>
            {getStatus(isActive)}
          </span>
        )
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (item) => (
        <button
          type="button"
          className="role-management-action-btn role-management-action-btn-edit"
          onClick={() => handleOpenStatusEdit(item)}
          aria-label="Edit user status"
          title="Edit user status"
        >
          Edit
        </button>
      ),
    },
  ]

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">User Management</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreateUserPopup}
            >
              Create User
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading users...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && usersData.length === 0 && (
          <p className="role-management-info">No users available.</p>
        )}

        {!isLoading && !error && usersData.length > 0 && (
          <CustomTable
            columns={userColumns}
            data={usersData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No users available."
          />
        )}

        {!isLoading && !error && (
          <p className="role-management-info">
            Page {usersMeta.page} of {usersMeta.total_pages} | Total: {usersMeta.total}
          </p>
        )}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      <CustomPopup
        isOpen={isCreatePopupOpen}
        title="Create User"
        titleId="create-user-title"
        popupClassName="user-create-popup"
      >
        <form className="role-management-form role-management-form-two-col" onSubmit={handleCreateUser}>
          <div className="role-management-field">
            <label htmlFor="user-username" className="role-management-label">Username</label>
            <input id="user-username" name="username" type="text" className="role-management-input" value={createUserForm.username} onChange={handleCreateUserInputChange} placeholder="Enter username" />
            {createUserError.username && <p className="role-management-field-error">{createUserError.username}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="user-email" className="role-management-label">Email</label>
            <input id="user-email" name="email" type="email" className="role-management-input" value={createUserForm.email} onChange={handleCreateUserInputChange} placeholder="Enter email" />
            {createUserError.email && <p className="role-management-field-error">{createUserError.email}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="user-full-name" className="role-management-label">Full Name</label>
            <input id="user-full-name" name="full_name" type="text" className="role-management-input" value={createUserForm.full_name} onChange={handleCreateUserInputChange} placeholder="Enter full name" />
            {createUserError.full_name && <p className="role-management-field-error">{createUserError.full_name}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="user-password" className="role-management-label">Password</label>
            <input id="user-password" name="password" type="password" className="role-management-input" value={createUserForm.password} onChange={handleCreateUserInputChange} placeholder="Enter password" />
            {createUserError.password && <p className="role-management-field-error">{createUserError.password}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="user-role-id" className="role-management-label">Role</label>
            <select id="user-role-id" name="role_id" className="role-management-select" value={createUserForm.role_id} onChange={handleCreateUserInputChange}>
              <option value="">Select role</option>
              {rolesData.map((role, index) => (
                <option key={role?.id ?? index} value={role?.role_id ?? role?.id ?? ''}>
                  {role?.name || `Role ${index + 1}`}
                </option>
              ))}
            </select>
            {createUserError.role_id && <p className="role-management-field-error">{createUserError.role_id}</p>}
          </div>
          <div className="role-management-field">
            <label htmlFor="user-organization-id" className="role-management-label">Organization</label>
            <select id="user-organization-id" name="organization_id" className="role-management-select" value={createUserForm.organization_id} onChange={handleCreateUserInputChange}>
              <option value="">Select organization</option>
              {organizations.map((organization, index) => (
                <option key={organization?.id ?? index} value={organization?.id ?? ''}>
                  {organization?.name || `Organization ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div className="role-management-field">
            <label htmlFor="user-school-id" className="role-management-label">School</label>
            <select id="user-school-id" name="school_id" className="role-management-select" value={createUserForm.school_id} onChange={handleCreateUserInputChange}>
              <option value="">Select school</option>
              {schools.map((school, index) => (
                <option key={school?.id ?? index} value={school?.id ?? ''}>
                  {school?.name || `School ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div className="role-management-field">
            <label htmlFor="user-student-id" className="role-management-label">Student Id</label>
            <input id="user-student-id" name="student_id" type="number" className="role-management-input" value={createUserForm.student_id} onChange={handleCreateUserInputChange} placeholder="Enter student id" />
          </div>
          <div className="role-management-field">
            <label htmlFor="user-staff-id" className="role-management-label">Staff Id</label>
            <input id="user-staff-id" name="staff_id" type="number" className="role-management-input" value={createUserForm.staff_id} onChange={handleCreateUserInputChange} placeholder="Enter staff id" />
          </div>
          <div className="role-management-field" style={{ gridColumn: '1 / -1' }}>
            <label className="attendance-select-all-label" htmlFor="user-platform-owner">
              <input id="user-platform-owner" name="is_platform_owner" type="checkbox" className="attendance-select-checkbox" checked={createUserForm.is_platform_owner} onChange={handleCreateUserInputChange} />
              Is Platform Owner
            </label>
          </div>
          <div className="custom-popup-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="otp-back-btn custom-popup-btn" onClick={closeCreateUserPopup} disabled={isCreatingUser}>Cancel</button>
            <button type="submit" className="login-submit-btn custom-popup-btn" disabled={isCreatingUser}>
              {isCreatingUser ? 'Creating...' : 'Create User'}
            </button>
          </div>
          {createUserError.submit && <p className="role-management-field-error" style={{ gridColumn: '1 / -1' }}>{createUserError.submit}</p>}
        </form>
      </CustomPopup>

      <CustomPopup
        isOpen={Boolean(statusEditTarget)}
        title="Update User Status"
        confirmText={isUpdatingStatus ? 'Updating...' : 'Update'}
        onCancel={handleCloseStatusEdit}
        cancelText="Cancel"
        titleId="update-user-status-title"
      >
        <div className="role-management-form">
          <div className="role-management-field">
            <label htmlFor="user-status-select" className="role-management-label">Status</label>
            <select
              id="user-status-select"
              className="role-management-select"
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="custom-popup-actions">
            <button
              type="button"
              className="otp-back-btn custom-popup-btn"
              onClick={handleCloseStatusEdit}
              disabled={isUpdatingStatus}
            >
              Cancel
            </button>
            <button
              type="button"
              className="login-submit-btn custom-popup-btn"
              onClick={handleConfirmStatusEdit}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </CustomPopup>
    </section>
  )
}

export default UserManagementPage
