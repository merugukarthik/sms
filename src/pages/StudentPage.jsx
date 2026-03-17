import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import CustomTable from '../components/CustomTable'
import { fetchCreateStudent, fetchStudentsList } from '../store/studentsSlice'

function StudentPage() {
  const sanitizePhoneValue = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  console.log('school id:- ', user.user.school_id)

  const [studentsData, setStudentsData] = useState([])
  const [studentsMeta, setStudentsMeta] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    phone: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    class_id: 0,
    section_id: 0,
    academic_year_id: 0,
    admission_date: '',
    admission_no:''
  })

  const refreshStudents = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchStudentsList({
        access_token: user.access_token,
        page: 1,
        page_size: 20,
      })).unwrap()

      const normalized = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : []

      setStudentsData(normalized)
      setStudentsMeta({
        total: Number(resp?.total ?? normalized.length ?? 0),
        page: Number(resp?.page ?? 1),
        page_size: Number(resp?.page_size ?? 20),
        total_pages: Number(resp?.total_pages ?? 1),
      })
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch students list.')
      setStudentsData([])
      setStudentsMeta({
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.first_name.trim()) nextErrors.first_name = 'First name is required.'
    if (!values.last_name.trim()) nextErrors.last_name = 'Last name is required.'
    if (!values.date_of_birth) nextErrors.date_of_birth = 'Date of birth is required.'
    if (!values.gender.trim()) nextErrors.gender = 'Gender is required.'
    if (!values.blood_group.trim()) nextErrors.blood_group = 'Blood group is required.'
    if (!values.address.trim()) nextErrors.address = 'Address is required.'
    if (!values.phone.trim()) nextErrors.phone = 'Phone is required.'
    if (values.phone && !/^\d{1,10}$/.test(values.phone)) nextErrors.phone = 'Phone number must be up to 10 digits.'
    if (!values.parent_name.trim()) nextErrors.parent_name = 'Parent name is required.'
    if (!values.parent_phone.trim()) nextErrors.parent_phone = 'Parent phone is required.'
    if (values.parent_phone && !/^\d{1,10}$/.test(values.parent_phone)) nextErrors.parent_phone = 'Parent phone number must be up to 10 digits.'
    if (!values.parent_email.trim()) nextErrors.parent_email = 'Parent email is required.'
      if (!values.class_id && values.class_id !== 0) nextErrors.section_id = 'Section id is required.'
    if (!values.section_id && values.section_id !== 0) nextErrors.class_id = 'Class id is required.'
    if (!values.academic_year_id && values.academic_year_id !== 0) {
      nextErrors.academic_year_id = 'Academic year id is required.'
    }
     if (!values.admission_no) nextErrors.admission_no = 'Admission number is required.'
    if (!values.admission_date) nextErrors.admission_date = 'Admission date is required.'
    return nextErrors
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormError({})
    setMessage('')
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      address: '',
      phone: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      section_id: 0,
      academic_year_id: 0,
      admission_date: '',
      admission_no:''
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    const nextValue = name === 'phone' || name === 'parent_phone'
      ? sanitizePhoneValue(value)
      : type === 'number'
        ? Number(value)
        : value

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleCreateStudent = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!user?.access_token) {
      setFormError({ submit: 'Missing access token. Please login again.' })
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchCreateStudent({
          ...formData,
          school_id: user.user.school_id,
          access_token: user.access_token,
        }),
      ).unwrap()
      setMessage('Student created successfully.')
      closeCreatePopup()
      await refreshStudents()
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create student.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMakePayment = (studentId) => {
    if (!studentId) {
      navigate('/app/fees')
      return
    }
    navigate(`/app/fees?studentId=${studentId}`)
  }

  const studentColumns = [
    { key: 'id', header: 'Student Id' },
    { key: 'admission_no', header: 'Admission No' },
    {
      key: 'full_name',
      header: 'Name',
      render: (student) => `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '-',
    },
    { key: 'parent_phone', header: 'Phone' },
    { key: 'gender', header: 'Gender' },
    { key: 'class_name', header: 'Class' },
    { key: 'section_name', header: 'Section' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <button
          type="button"
          className="role-management-action-btn role-management-action-btn-edit"
          onClick={() => handleMakePayment(student?.id)}
        >
          Make Payment
        </button>
      ),
    },
  ]

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Students</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreatePopup}
            >
              Create Student
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading students...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && studentsData.length === 0 && (
          <p className="role-management-info">No students available.</p>
        )}

        {!isLoading && !error && studentsData.length > 0 && (
          <CustomTable
            columns={studentColumns}
            data={studentsData}
            rowKey={(student, index) => student?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No students available."
          />
        )}

        {!isLoading && !error && (
          <p className="role-management-info">
            Page {studentsMeta.page} of {studentsMeta.total_pages} | Total: {studentsMeta.total}
          </p>
        )}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      {isCreatePopupOpen && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-create-popup student-create-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-student-title"
          >
            <h3 id="create-student-title" className="custom-popup-title">Create Student</h3>
            <form className="role-management-form role-management-form-two-col" onSubmit={handleCreateStudent}>
              <div className="role-management-field">
                <label htmlFor="student-first_name" className="role-management-label">First Name</label>
                <input
                  id="student-first_name"
                  name="first_name"
                  type="text"
                  className="role-management-input"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                />
                {formError.first_name && <p className="role-management-field-error">{formError.first_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-last_name" className="role-management-label">Last Name</label>
                <input
                  id="student-last_name"
                  name="last_name"
                  type="text"
                  className="role-management-input"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
                {formError.last_name && <p className="role-management-field-error">{formError.last_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-date_of_birth" className="role-management-label">Date Of Birth</label>
                <input
                  id="student-date_of_birth"
                  name="date_of_birth"
                  type="date"
                  className="role-management-input"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
                {formError.date_of_birth && <p className="role-management-field-error">{formError.date_of_birth}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-gender" className="role-management-label">Gender</label>
                <input
                  id="student-gender"
                  name="gender"
                  type="text"
                  className="role-management-input"
                  value={formData.gender}
                  onChange={handleInputChange}
                  placeholder="Enter gender"
                />
                {formError.gender && <p className="role-management-field-error">{formError.gender}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-blood_group" className="role-management-label">Blood Group</label>
                <input
                  id="student-blood_group"
                  name="blood_group"
                  type="text"
                  className="role-management-input"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                  placeholder="Enter blood group"
                />
                {formError.blood_group && <p className="role-management-field-error">{formError.blood_group}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-address" className="role-management-label">Address</label>
                <input
                  id="student-address"
                  name="address"
                  type="text"
                  className="role-management-input"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                />
                {formError.address && <p className="role-management-field-error">{formError.address}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-phone" className="role-management-label">Phone</label>
                <input
                  id="student-phone"
                  name="phone"
                  type="text"
                  className="role-management-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter phone"
                />
                {formError.phone && <p className="role-management-field-error">{formError.phone}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-parent_name" className="role-management-label">Parent Name</label>
                <input
                  id="student-parent_name"
                  name="parent_name"
                  type="text"
                  className="role-management-input"
                  value={formData.parent_name}
                  onChange={handleInputChange}
                  placeholder="Enter parent name"
                />
                {formError.parent_name && <p className="role-management-field-error">{formError.parent_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-parent_phone" className="role-management-label">Parent Phone</label>
                <input
                  id="student-parent_phone"
                  name="parent_phone"
                  type="text"
                  className="role-management-input"
                  value={formData.parent_phone}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter parent phone"
                />
                {formError.parent_phone && <p className="role-management-field-error">{formError.parent_phone}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-parent_email" className="role-management-label">Parent Email</label>
                <input
                  id="student-parent_email"
                  name="parent_email"
                  type="email"
                  className="role-management-input"
                  value={formData.parent_email}
                  onChange={handleInputChange}
                  placeholder="Enter parent email"
                />
                {formError.parent_email && <p className="role-management-field-error">{formError.parent_email}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="student-class_id" className="role-management-label">Class Id</label>
                <input
                  id="student-class_id"
                  name="class_id"
                  type="number"
                  className="role-management-input"
                  value={formData.class_id}
                  onChange={handleInputChange}
                />
                {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-section_id" className="role-management-label">Section Id</label>
                <input
                  id="student-section_id"
                  name="section_id"
                  type="number"
                  className="role-management-input"
                  value={formData.section_id}
                  onChange={handleInputChange}
                />
                {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-academic_year_id" className="role-management-label">Academic Year Id</label>
                <input
                  id="student-academic_year_id"
                  name="academic_year_id"
                  type="number"
                  className="role-management-input"
                  value={formData.academic_year_id}
                  onChange={handleInputChange}
                />
                {formError.academic_year_id && <p className="role-management-field-error">{formError.academic_year_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-admission_date" className="role-management-label">Admission Date</label>
                <input
                  id="student-admission_date"
                  name="admission_date"
                  type="date"
                  className="role-management-input"
                  value={formData.admission_date}
                  onChange={handleInputChange}
                />
                {formError.admission_date && <p className="role-management-field-error">{formError.admission_date}</p>}
              </div>

               <div className="role-management-field">
                <label htmlFor="student-admission_number" className="role-management-label">Admission Number</label>
                <input
                  id="student-admission_number"
                  name="admission_no"
                  className="role-management-input"
                  value={formData.admission_no}
                  onChange={handleInputChange}
                />
                {formError.admission_no && <p className="role-management-field-error">{formError.admission_no}</p>}
              </div>

              <div className="role-management-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Create Student'}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeCreatePopup}
                >
                  Cancel
                </button>
              </div>
              {formError.submit && <p className="role-management-field-error" style={{ gridColumn: '1 / -1' }}>{formError.submit}</p>}
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default StudentPage
