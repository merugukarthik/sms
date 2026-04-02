import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { createDesignation, fetchDepartments, fetchDesignationList } from '../store/staffSlice'
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

function DesignationPage() {
  const dispatch = useDispatch()
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const accessToken = authUser?.access_token ?? authUser?.token ?? currentUser?.access_token ?? currentUser?.token ?? ''
  const schoolId = getSchoolId(authUser)
  const permissions = useMemo(() => {
    const permissionVariants = [
      getCrudPermissions(authUser, { moduleMatchers: ['designation'], featureMatchers: ['designation', 'department'] }),
      getCrudPermissions(authUser, { moduleMatchers: ['designation'] }),
      getCrudPermissions(authUser, { moduleMatchers: ['staff', 'teacher'], featureMatchers: ['designation', 'department'] }),
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

  const [designations, setDesignations] = useState([])
  const [schools, setSchools] = useState([])
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
    school_id: schoolId ? String(schoolId) : '',
    department_id: '',
    name: '',
    code: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const loadDesignations = async (targetSchoolId = schoolId, targetPage = 1) => {
    if (!accessToken) {
      setError('Missing access token. Please login again.')
      setDesignations([])
      return
    }

    if (!targetSchoolId) {
      setError('School id is not available for this user.')
      setDesignations([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await dispatch(
        fetchDesignationList({
          access_token: accessToken,
          school_id: targetSchoolId,
          page: targetPage,
          page_size: pagination.page_size,
        }),
      ).unwrap()

      setDesignations(normalizeList(response, 'designations'))
      setPagination((prev) => ({
        ...prev,
        page: Number(response?.page ?? targetPage),
        page_size: Number(response?.page_size ?? prev.page_size),
        total: Number(response?.total ?? normalizeList(response, 'designations').length ?? 0),
        total_pages: Number(response?.total_pages ?? 0),
      }))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch designations.')
      setDesignations([])
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
    loadDesignations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, accessToken, schoolId])

  useEffect(() => {
    const loadSchools = async () => {
      if (!accessToken) {
        setSchools([])
        return
      }

      try {
        const response = await dispatch(
          fetchSchools({
            access_token: accessToken,
            page: 1,
            page_size: 100,
          }),
        ).unwrap()

        setSchools(normalizeList(response, 'schools'))
      } catch {
        setSchools([])
      }
    }

    loadSchools()
  }, [dispatch, accessToken])

  useEffect(() => {
    const loadDepartmentOptions = async () => {
      if (!accessToken) {
        setDepartments([])
        return
      }

      try {
        const response = await dispatch(
          fetchDepartments({
            access_token: accessToken,
            school_id: schoolId,
            page: 1,
            page_size: 100,
          }),
        ).unwrap()

        setDepartments(normalizeList(response, 'departments'))
      } catch {
        setDepartments([])
      }
    }

    loadDepartmentOptions()
  }, [dispatch, accessToken, schoolId])

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormData({
      school_id: schoolId ? String(schoolId) : '',
      department_id: '',
      name: '',
      code: '',
    })
    setFormErrors({})
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      school_id: schoolId ? String(schoolId) : '',
      department_id: '',
      name: '',
      code: '',
    })
    setFormErrors({})
  }

  const handleNameChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      name: event.target.value,
    }))
    setFormErrors((prev) => ({ ...prev, name: '', submit: '' }))
  }

  const handleCodeChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      code: event.target.value,
    }))
    setFormErrors((prev) => ({ ...prev, code: '', submit: '' }))
  }

  const handleSchoolChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      school_id: event.target.value,
    }))
    setFormErrors((prev) => ({ ...prev, school_id: '', submit: '' }))
  }

  const handleDepartmentChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      department_id: event.target.value,
    }))
    setFormErrors((prev) => ({ ...prev, department_id: '', submit: '' }))
  }

  const validateForm = (values) => {
    const nextErrors = {}
    if (!String(values.school_id ?? '').trim()) {
      nextErrors.school_id = 'School id is required.'
    }

    if (!String(values.department_id ?? '').trim()) {
      nextErrors.department_id = 'Department is required.'
    }

    if (!String(values.name ?? '').trim()) {
      nextErrors.name = 'Designation name is required.'
    }

    return nextErrors
  }

  const handleCreateDesignation = async (event) => {
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

    if (!String(formData.school_id ?? '').trim()) {
      setFormErrors({ submit: 'School id is required.' })
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      await dispatch(createDesignation({
        access_token: accessToken,
        payload: {
          school_id: Number(formData.school_id),
          department_id: Number(formData.department_id),
          name: String(formData.name || '').trim(),
          code: String(formData.code || '').trim(),
        },
      })).unwrap()

      closeCreatePopup()
      setMessage('Designation created successfully.')
      await loadDesignations(formData.school_id, 1)
    } catch (err) {
      setFormErrors({
        submit: typeof err === 'string' ? err : 'Failed to create designation.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = useMemo(() => ([
    { key: 'id', header: 'Designation Id' },
    {
      key: 'name',
      header: 'Designation Name',
      render: (item) => item?.name || item?.display_name || item?.designation_name || '-',
    },
    {
      key: 'department_name',
      header: 'Department',
      render: (item) => item?.department_name || item?.department?.name || '-',
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
            <h2 className="role-management-title">Designation</h2>
            {permissions.canCreate && (
              <button type="button" className="role-management-open-create-btn" onClick={openCreatePopup}>
                Create Designation
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading designations...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && (
          <CustomTable
            columns={columns}
            data={designations}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No designations available."
          />
        )}
        {!isLoading && !error && (
          <p className="role-management-info">
            Page {pagination.page} of {pagination.total_pages || 1} | Total: {pagination.total}
          </p>
        )}
      </div>

      <CustomPopup
        isOpen={isCreatePopupOpen}
        title="Create Designation"
        titleId="designation-form-title"
        popupClassName="role-management-create-popup"
        onClose={closeCreatePopup}
      >
        <form className="role-management-form" onSubmit={handleCreateDesignation}>
          <div className="role-management-field">
            <label htmlFor="designation-school-id" className="role-management-label">School Id</label>
            <select
              id="designation-school-id"
              className="role-management-select"
              value={formData.school_id}
              onChange={handleSchoolChange}
            >
              <option value="">Select school</option>
              {schools.map((school, index) => (
                <option key={school?.id ?? index} value={school?.id ?? ''}>
                  {school?.name || school?.school_name || `School ${index + 1}`}
                </option>
              ))}
            </select>
            {formErrors.school_id && <p className="role-management-field-error">{formErrors.school_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="designation-department-id" className="role-management-label">Department</label>
            <select
              id="designation-department-id"
              className="role-management-select"
              value={formData.department_id}
              onChange={handleDepartmentChange}
            >
              <option value="">Select department</option>
              {departments.map((department, index) => (
                <option key={department?.id ?? index} value={department?.id ?? ''}>
                  {department?.name || department?.department_name || `Department ${index + 1}`}
                </option>
              ))}
            </select>
            {formErrors.department_id && <p className="role-management-field-error">{formErrors.department_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="designation-name" className="role-management-label">Designation Name</label>
            <input
              id="designation-name"
              type="text"
              className="role-management-input"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter designation name"
            />
            {formErrors.name && <p className="role-management-field-error">{formErrors.name}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="designation-code" className="role-management-label">Code</label>
            <input
              id="designation-code"
              type="text"
              className="role-management-input"
              value={formData.code}
              onChange={handleCodeChange}
              placeholder="Enter designation code"
            />
            {formErrors.code && <p className="role-management-field-error">{formErrors.code}</p>}
          </div>

          <div className="custom-popup-actions">
            <button type="button" className="otp-back-btn custom-popup-btn" onClick={closeCreatePopup} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="login-submit-btn custom-popup-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create'}
            </button>
          </div>
          {formErrors.submit && <p className="role-management-field-error">{formErrors.submit}</p>}
        </form>
      </CustomPopup>
    </section>
  )
}

export default DesignationPage
