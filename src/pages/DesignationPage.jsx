import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { createDepartmentWithDesignations, fetchDesignationsBySchool } from '../store/staffSlice'
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [formData, setFormData] = useState({
    school_id: schoolId ? String(schoolId) : '',
    department_name: '',
    code: '',
    designations: [''],
  })
  const [formErrors, setFormErrors] = useState({})

  const loadDesignations = async (targetSchoolId = schoolId) => {
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
        fetchDesignationsBySchool({
          access_token: accessToken,
          school_id: targetSchoolId,
        }),
      ).unwrap()

      setDesignations(normalizeList(response, 'designations'))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch designations.')
      setDesignations([])
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
          fetchSchools({ access_token: accessToken }),
        ).unwrap()

        setSchools(normalizeList(response, 'schools'))
      } catch {
        setSchools([])
      }
    }

    loadSchools()
  }, [dispatch, accessToken])

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormData({
      school_id: schoolId ? String(schoolId) : '',
      department_name: '',
      code: '',
      designations: [''],
    })
    setFormErrors({})
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      school_id: schoolId ? String(schoolId) : '',
      department_name: '',
      code: '',
      designations: [''],
    })
    setFormErrors({})
  }

  const handleDepartmentChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      department_name: event.target.value,
    }))
    setFormErrors((prev) => ({ ...prev, department_name: '', submit: '' }))
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

  const handleDesignationChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      designations: prev.designations.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }))
    setFormErrors((prev) => ({ ...prev, designations: '', submit: '' }))
  }

  const addDesignationField = () => {
    setFormData((prev) => ({
      ...prev,
      designations: [...prev.designations, ''],
    }))
  }

  const removeDesignationField = (index) => {
    setFormData((prev) => ({
      ...prev,
      designations: prev.designations.length === 1
        ? ['']
        : prev.designations.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const validateForm = (values) => {
    const nextErrors = {}
    if (!String(values.school_id ?? '').trim()) {
      nextErrors.school_id = 'School id is required.'
    }

    if (!values.department_name.trim()) {
      nextErrors.department_name = 'Department name is required.'
    }

    const validDesignations = values.designations.map((item) => item.trim()).filter(Boolean)
    if (validDesignations.length === 0) {
      nextErrors.designations = 'Add at least one designation.'
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

    if (!String(formData.school_id ?? '').trim()) {
      setFormErrors({ submit: 'School id is required.' })
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      await dispatch(
        createDepartmentWithDesignations({
          access_token: accessToken,
          payload: {
            school_id: Number(formData.school_id),
            name: formData.department_name.trim(),
            code: String(formData.code || '').trim(),
            designations: formData.designations
              .map((item) => item.trim())
              .filter(Boolean)
              .map((name) => ({ name })),
          },
        }),
      ).unwrap()

      closeCreatePopup()
      setMessage('Department and designations created successfully.')
      await loadDesignations(formData.school_id)
    } catch (err) {
      setFormErrors({
        submit: typeof err === 'string' ? err : 'Failed to create department.',
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
    {
      key: 'school_name',
      header: 'School',
      render: (item) => item?.school_name || item?.school?.name || '-',
    },
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
                Create Department
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
      </div>

      <CustomPopup
        isOpen={isCreatePopupOpen}
        title="Create Department"
        titleId="designation-form-title"
        popupClassName="role-management-create-popup"
        onClose={closeCreatePopup}
      >
        <form className="role-management-form" onSubmit={handleCreateDepartment}>
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
                  {school?.name || `School ${index + 1}`}
                </option>
              ))}
            </select>
            {formErrors.school_id && <p className="role-management-field-error">{formErrors.school_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="designation-department-name" className="role-management-label">Department</label>
            <input
              id="designation-department-name"
              type="text"
              className="role-management-input"
              value={formData.department_name}
              onChange={handleDepartmentChange}
              placeholder="Enter department name"
            />
            {formErrors.department_name && <p className="role-management-field-error">{formErrors.department_name}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="designation-department-code" className="role-management-label">Code</label>
            <input
              id="designation-department-code"
              type="text"
              className="role-management-input"
              value={formData.code}
              onChange={handleCodeChange}
              placeholder="Enter department code"
            />
            {formErrors.code && <p className="role-management-field-error">{formErrors.code}</p>}
          </div>

          <div className="role-management-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <label htmlFor="designation-name-0" className="role-management-label">Designations</label>
              <button
                type="button"
                className="role-management-open-create-btn"
                onClick={addDesignationField}
                style={{ minWidth: 'auto', padding: '8px 12px' }}
                aria-label="Add designation"
              >
                +
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {formData.designations.map((designation, index) => (
                <div key={`designation-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id={`designation-name-${index}`}
                    type="text"
                    className="role-management-input"
                    value={designation}
                    onChange={(event) => handleDesignationChange(index, event.target.value)}
                    placeholder={`Enter designation ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="role-management-cancel-btn"
                    onClick={() => removeDesignationField(index)}
                    aria-label={`Remove designation ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {formErrors.designations && <p className="role-management-field-error">{formErrors.designations}</p>}
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
