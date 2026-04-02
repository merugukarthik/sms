import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { createDepartmentWithDesignations, fetchDepartments } from '../store/staffSlice'
import { getCrudPermissions } from '../utils/permissions'

const normalizeList = (response) => (
  Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.departments)
          ? response.departments
          : []
)

const getSchoolId = (authUser) => {
  const currentUser = authUser?.user ?? authUser

  return (
    currentUser?.school_id
    ?? authUser?.school_id
    ?? currentUser?.school?.id
    ?? authUser?.school?.id
    ?? currentUser?.user?.school_id
    ?? ''
  )
}

function DepartmentPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? currentUser?.access_token ?? currentUser?.token ?? ''
  const schoolId = getSchoolId(authUser)
  const permissions = useMemo(() => {
    const permissionVariants = [
      getCrudPermissions(authUser, { moduleMatchers: ['department'], featureMatchers: ['department'] }),
      getCrudPermissions(authUser, { moduleMatchers: ['designation'], featureMatchers: ['department'] }),
      getCrudPermissions(authUser, { moduleMatchers: ['staff', 'teacher'], featureMatchers: ['department'] }),
      getCrudPermissions(authUser, { moduleMatchers: ['staff', 'teacher'] }),
    ]

    return permissionVariants.reduce((mergedPermissions, currentPermissions) => ({
      canView: Boolean(mergedPermissions.canView || currentPermissions.canView),
      canCreate: Boolean(mergedPermissions.canCreate || currentPermissions.canCreate),
      canUpdate: Boolean(mergedPermissions.canUpdate || currentPermissions.canUpdate),
      canDelete: Boolean(mergedPermissions.canDelete || currentPermissions.canDelete),
      canAdd: Boolean(mergedPermissions.canAdd || currentPermissions.canAdd),
      canEdit: Boolean(mergedPermissions.canEdit || currentPermissions.canEdit),
    }), {
      canView: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canAdd: false,
      canEdit: false,
    })
  }, [authUser])

  const [departments, setDepartments] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const loadDepartments = async (targetPage = pagination.page) => {
    if (!accessToken) {
      setError('Missing access token. Please login again.')
      setDepartments([])
      return
    }

    if (!schoolId) {
      setError('School id is not available for this user.')
      setDepartments([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await dispatch(fetchDepartments({
        access_token: accessToken,
        school_id: schoolId,
        page: targetPage,
        page_size: pagination.page_size,
      })).unwrap()

      const normalized = normalizeList(response)
      setDepartments(normalized)
      setPagination((prev) => ({
        ...prev,
        page: Number(response?.page ?? targetPage),
        page_size: Number(response?.page_size ?? prev.page_size),
        total: Number(response?.total ?? normalized.length ?? 0),
        total_pages: Number(response?.total_pages ?? 0),
      }))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch departments.')
      setDepartments([])
      setPagination((prev) => ({
        ...prev,
        page: targetPage,
        total: 0,
        total_pages: 0,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken, schoolId])

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormData({
      name: '',
      code: '',
    })
    setFormErrors({})
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      name: '',
      code: '',
    })
    setFormErrors({})
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setFormErrors((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const validateForm = (values) => {
    const nextErrors = {}
    if (!String(values.name || '').trim()) {
      nextErrors.name = 'Department name is required.'
    }
    return nextErrors
  }

  const handleCreateDepartment = async (event) => {
    event.preventDefault()

    const nextErrors = validateForm(formData)
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    if (!accessToken) {
      setFormErrors({ submit: 'Missing access token. Please login again.' })
      return
    }

    if (!schoolId) {
      setFormErrors({ submit: 'School id is required.' })
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      await dispatch(createDepartmentWithDesignations({
        access_token: accessToken,
        payload: {
          school_id: Number(schoolId),
          name: String(formData.name || '').trim(),
          code: String(formData.code || '').trim(),
          designations: [],
        },
      })).unwrap()

      closeCreatePopup()
      setMessage('Department created successfully.')
      await loadDepartments(1)
    } catch (err) {
      setFormErrors({
        submit: typeof err === 'string' ? err : 'Failed to create department.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = useMemo(() => ([
    { key: 'id', header: 'Department Id' },
    {
      key: 'name',
      header: 'Department Name',
      render: (item) => item?.name || item?.department_name || item?.display_name || '-',
    },
    {
      key: 'code',
      header: 'Code',
      render: (item) => item?.code || '-',
    },
    // {
    //   key: 'school_name',
    //   header: 'School',
    //   render: (item) => item?.school_name || item?.school?.name || '-',
    // },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        if (item?.is_active === undefined) return '-'
        return item.is_active ? 'Active' : 'Inactive'
      },
    },
  ]), [])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Department</h2>
            {permissions.canCreate && (
              <button type="button" className="role-management-open-create-btn" onClick={openCreatePopup}>
                Create Department
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading departments...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && permissions.canView && departments.length === 0 && (
          <p className="role-management-info">No departments available.</p>
        )}
        {!isLoading && !error && permissions.canView && departments.length > 0 && (
          <CustomTable
            columns={columns}
            data={departments}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No departments available."
          />
        )}
        {!permissions.canView && (
          <p className="role-management-error">You do not have view permission for departments.</p>
        )}
        {!isLoading && !error && permissions.canView && (
          <p className="role-management-info">
            Page {pagination.page} of {pagination.total_pages || 1} | Total: {pagination.total}
          </p>
        )}
      </div>

      <CustomPopup
        isOpen={isCreatePopupOpen && permissions.canCreate}
        title="Create Department"
        titleId="create-department-title"
        popupClassName="role-management-create-popup"
        onClose={closeCreatePopup}
      >
        <form className="role-management-form" onSubmit={handleCreateDepartment}>
          <div className="role-management-field">
            <label htmlFor="department-name" className="role-management-label">Department Name</label>
            <input
              id="department-name"
              name="name"
              type="text"
              className="role-management-input"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter department name"
            />
            {formErrors.name && <p className="role-management-field-error">{formErrors.name}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="department-code" className="role-management-label">Code</label>
            <input
              id="department-code"
              name="code"
              type="text"
              className="role-management-input"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="Enter department code"
            />
          </div>

          <div className="role-management-form-actions">
            <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : 'Create Department'}
            </button>
            <button type="button" className="role-management-cancel-btn" onClick={closeCreatePopup}>
              Cancel
            </button>
          </div>
          {formErrors.submit && <p className="role-management-field-error">{formErrors.submit}</p>}
        </form>
      </CustomPopup>
    </section>
  )
}

export default DepartmentPage
