import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { createDepartmentWithDesignations, fetchDesignationsBySchool } from '../store/staffSlice'

const normalizeList = (response) => (
  Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.designations)
          ? response.designations
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

  const [designations, setDesignations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [formData, setFormData] = useState({
    department_name: '',
    designations: [''],
  })
  const [formErrors, setFormErrors] = useState({})

  const loadDesignations = async () => {
    if (!accessToken) {
      setError('Missing access token. Please login again.')
      setDesignations([])
      return
    }

    if (!schoolId) {
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
          school_id: schoolId,
        }),
      ).unwrap()

      setDesignations(normalizeList(response))
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

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormData({
      department_name: '',
      designations: [''],
    })
    setFormErrors({})
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      department_name: '',
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

    if (!schoolId) {
      setFormErrors({ submit: 'School id is not available for this user.' })
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
            school_id: Number(schoolId),
            name: formData.department_name.trim(),
            designations: formData.designations
              .map((item) => item.trim())
              .filter(Boolean)
              .map((name) => ({ name })),
          },
        }),
      ).unwrap()

      closeCreatePopup()
      setMessage('Department and designations created successfully.')
      await loadDesignations()
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
            <button type="button" className="role-management-open-create-btn" onClick={openCreatePopup}>
              Create Department
            </button>
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
