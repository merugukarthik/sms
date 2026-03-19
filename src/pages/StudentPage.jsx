import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchCreateFinanceAssignment } from '../store/feesSlice'
import { fetchCreateStudent, fetchPromoteStudent, fetchStudentsList } from '../store/studentsSlice'
import { getCrudPermissions } from '../utils/permissions'

const FEE_TYPE_OPTIONS = [
  { value: '1', label: 'Tuition Fee' },
  { value: '2', label: 'Transport Fee' },
  { value: '3', label: 'Hostel Fee' },
  { value: '4', label: 'Exam Fee' },
]

function StudentPage() {
  const sanitizePhoneValue = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10)

  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const permissions = useMemo(
    () => getCrudPermissions(user, { moduleMatchers: ['student'] }),
    [user],
  )
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
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [isAddFeePopupOpen, setIsAddFeePopupOpen] = useState(false)
  const [isPromotePopupOpen, setIsPromotePopupOpen] = useState(false)
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null)
  const [selectedStudentForPromotion, setSelectedStudentForPromotion] = useState(null)
  const [formError, setFormError] = useState({})
  const [feeFormError, setFeeFormError] = useState({})
  const [promoteFormError, setPromoteFormError] = useState({})
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
    admission_no: ''
  })
  const [feeFormData, setFeeFormData] = useState({
    amount: '',
    fee_type_id: '',
    due_date: '',
    paid_amount: '',
    paid_date: '',
    payment_mode: 'cash',
    status: 'success',
    academic_year: '',
    month: 'march',
    remarks: '',
  })
  const [promoteFormData, setPromoteFormData] = useState({
    student_id: '',
    remarks: '',
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
      admission_no: ''
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

  const openAddFeePopup = (student) => {
    setSelectedStudentForFee(student)
    setFeeFormData({
      amount: '',
      fee_type_id: '',
      due_date: '',
      paid_amount: '',
      paid_date: '',
      payment_mode: 'cash',
      status: 'success',
      academic_year: '',
      month: 'march',
      remarks: '',
    })
    setFeeFormError({})
    setMessage('')
    setIsAddFeePopupOpen(true)
  }

  const closeAddFeePopup = () => {
    setIsAddFeePopupOpen(false)
    setSelectedStudentForFee(null)
    setFeeFormData({
      amount: '',
      fee_type_id: '',
      due_date: '',
      paid_amount: '',
      paid_date: '',
      payment_mode: 'cash',
      status: 'success',
      academic_year: '',
      month: 'march',
      remarks: '',
    })
    setFeeFormError({})
  }

  const handleFeeInputChange = (event) => {
    const { name, value, type } = event.target
    setFeeFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
    setFeeFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleAddFee = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!String(feeFormData.amount ?? '').trim()) nextErrors.amount = 'Amount is required.'
    else if (Number(feeFormData.amount) <= 0) nextErrors.amount = 'Amount must be greater than 0.'
    if (!String(feeFormData.fee_type_id ?? '').trim()) nextErrors.fee_type_id = 'Fee type is required.'
    if (!String(feeFormData.due_date ?? '').trim()) nextErrors.due_date = 'Due date is required.'
    if (!String(feeFormData.paid_amount ?? '').trim()) nextErrors.paid_amount = 'Paid amount is required.'
    else if (Number(feeFormData.paid_amount) < 0) nextErrors.paid_amount = 'Paid amount cannot be negative.'
    if (!String(feeFormData.paid_date ?? '').trim()) nextErrors.paid_date = 'Paid date is required.'
    if (!String(feeFormData.payment_mode ?? '').trim()) nextErrors.payment_mode = 'Payment mode is required.'
    if (!String(feeFormData.status ?? '').trim()) nextErrors.status = 'Status is required.'
    if (!String(feeFormData.academic_year ?? '').trim()) nextErrors.academic_year = 'Academic year is required.'
    if (!String(feeFormData.month ?? '').trim()) nextErrors.month = 'Month is required.'
    if (!String(feeFormData.remarks ?? '').trim()) nextErrors.remarks = 'Remarks are required.'

    if (Object.keys(nextErrors).length > 0) {
      setFeeFormError(nextErrors)
      return
    }

    if (!user?.access_token) {
      setFeeFormError({ submit: 'Missing access token. Please login again.' })
      return
    }

    if (!selectedStudentForFee?.id) {
      setFeeFormError({ submit: 'Student is required.' })
      return
    }

    setIsSavingFee(true)
    try {
      await dispatch(fetchCreateFinanceAssignment({
        student_id: Number(selectedStudentForFee.id),
        school_id: Number(user?.user?.school_id ?? user?.school_id ?? 0),
        amount: Number(feeFormData.amount),
        fee_type_id: Number(feeFormData.fee_type_id),
        due_date: feeFormData.due_date,
        paid_amount: Number(feeFormData.paid_amount),
        paid_date: feeFormData.paid_date,
        payment_mode: feeFormData.payment_mode,
        status: feeFormData.status,
        academic_year: feeFormData.academic_year,
        month: feeFormData.month,
        remarks: feeFormData.remarks,
        access_token: user.access_token,
      })).unwrap()

      setMessage(`Fee added for ${selectedStudentForFee?.first_name || 'student'}${selectedStudentForFee?.last_name ? ` ${selectedStudentForFee.last_name}` : ''}.`)
      closeAddFeePopup()
    } catch (err) {
      setFeeFormError({
        submit: typeof err === 'string' ? err : 'Failed to add fee.',
      })
    } finally {
      setIsSavingFee(false)
    }
  }

  const handlePromoteStudent = (student) => {
    const studentId = student?.id
    if (!studentId) return

    setSelectedStudentForPromotion(student)
    setPromoteFormData({
      student_id: String(studentId),
      remarks: '',
    })
    setPromoteFormError({})
    setMessage('')
    setIsPromotePopupOpen(true)
  }

  const closePromotePopup = () => {
    setIsPromotePopupOpen(false)
    setSelectedStudentForPromotion(null)
    setPromoteFormData({
      student_id: '',
      remarks: '',
    })
    setPromoteFormError({})
  }

  const handlePromoteInputChange = (event) => {
    const { name, value } = event.target
    setPromoteFormData((prev) => ({
      ...prev,
      [name]: name === 'student_id' ? value.replace(/\D/g, '') : value,
    }))
    setPromoteFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleSubmitPromoteStudent = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!String(promoteFormData.student_id || '').trim()) nextErrors.student_id = 'Student id is required.'
    if (!String(promoteFormData.remarks || '').trim()) nextErrors.remarks = 'Remarks are required.'

    if (Object.keys(nextErrors).length > 0) {
      setPromoteFormError(nextErrors)
      return
    }

    if (!user?.access_token) {
      setPromoteFormError({ submit: 'Missing access token. Please login again.' })
      return
    }

    setIsPromoting(true)
    try {
     const response =  await dispatch(fetchPromoteStudent({
        student_id: Number(promoteFormData.student_id),
        remarks: String(promoteFormData.remarks || '').trim(),
        access_token: user.access_token,
      })).unwrap()

      const displayName = `${selectedStudentForPromotion?.first_name || 'student'}${selectedStudentForPromotion?.last_name ? ` ${selectedStudentForPromotion.last_name}` : ''}`
      closePromotePopup()
      alert(`Student promoted successfully for ${displayName}.`)
      await refreshStudents()
    } catch (err) {
       alert(err)
      setPromoteFormError({
        submit: typeof err === 'string' ? err : 'Failed to promote student.',
      })
    } finally {
      setIsPromoting(false)
    }
  }

  const studentColumns = [
    { key: 'id', header: 'Student Id' },
    { key: 'admission_no', header: 'Admission No' },
    {
      key: 'full_name',
      header: 'Name',
      render: (student) => `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '-',
    },
    { key: 'phone', header: 'Phone' },
    { key: 'gender', header: 'Gender' },
    { key: 'class_id', header: 'Class Id' },
    { key: 'section_id', header: 'Section Id' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-edit"
            onClick={() => openAddFeePopup(student)}
          >
            Add Fee
          </button>
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-edit"
            onClick={() => handlePromoteStudent(student)}
          >
            Promote
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Students</h2>
            {permissions.canCreate && (
              <button
                type="button"
                className="role-management-open-create-btn"
                onClick={openCreatePopup}
              >
                Create Student
              </button>
            )}
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

      {isCreatePopupOpen && permissions.canCreate && (
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
      <CustomPopup
        isOpen={isAddFeePopupOpen}
        title="Add Fee"
        titleId="student-add-fee-title"
        popupClassName="role-management-create-popup"
        onClose={closeAddFeePopup}
      >
        <form className="role-management-form" onSubmit={handleAddFee}>
          <div className="role-management-field">
            <label htmlFor="student-fee-amount" className="role-management-label">Amount</label>
            <input
              id="student-fee-amount"
              name="amount"
              type="number"
              className="role-management-input"
              value={feeFormData.amount}
              onChange={handleFeeInputChange}
              min="1"
              placeholder="Enter amount"
            />
            {feeFormError.amount && <p className="role-management-field-error">{feeFormError.amount}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-type" className="role-management-label">Fee Type</label>
            <select
              id="student-fee-type"
              name="fee_type_id"
              className="role-management-select"
              value={feeFormData.fee_type_id}
              onChange={handleFeeInputChange}
            >
              <option value="">Select fee type</option>
              {FEE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {feeFormError.fee_type_id && <p className="role-management-field-error">{feeFormError.fee_type_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-due-date" className="role-management-label">Due Date</label>
            <input
              id="student-fee-due-date"
              name="due_date"
              type="date"
              className="role-management-input"
              value={feeFormData.due_date}
              onChange={handleFeeInputChange}
            />
            {feeFormError.due_date && <p className="role-management-field-error">{feeFormError.due_date}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-paid-amount" className="role-management-label">Paid Amount</label>
            <input
              id="student-fee-paid-amount"
              name="paid_amount"
              type="number"
              className="role-management-input"
              value={feeFormData.paid_amount}
              onChange={handleFeeInputChange}
              min="0"
              placeholder="Enter paid amount"
            />
            {feeFormError.paid_amount && <p className="role-management-field-error">{feeFormError.paid_amount}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-paid-date" className="role-management-label">Paid Date</label>
            <input
              id="student-fee-paid-date"
              name="paid_date"
              type="date"
              className="role-management-input"
              value={feeFormData.paid_date}
              onChange={handleFeeInputChange}
            />
            {feeFormError.paid_date && <p className="role-management-field-error">{feeFormError.paid_date}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-payment-mode" className="role-management-label">Payment Mode</label>
            <input
              id="student-fee-payment-mode"
              name="payment_mode"
              type="text"
              className="role-management-input"
              value={feeFormData.payment_mode}
              onChange={handleFeeInputChange}
              placeholder="Enter payment mode"
            />
            {feeFormError.payment_mode && <p className="role-management-field-error">{feeFormError.payment_mode}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-status" className="role-management-label">Status</label>
            <input
              id="student-fee-status"
              name="status"
              type="text"
              className="role-management-input"
              value={feeFormData.status}
              onChange={handleFeeInputChange}
              placeholder="Enter status"
            />
            {feeFormError.status && <p className="role-management-field-error">{feeFormError.status}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-academic-year" className="role-management-label">Academic Year</label>
            <input
              id="student-fee-academic-year"
              name="academic_year"
              type="text"
              className="role-management-input"
              value={feeFormData.academic_year}
              onChange={handleFeeInputChange}
              placeholder="Enter academic year"
            />
            {feeFormError.academic_year && <p className="role-management-field-error">{feeFormError.academic_year}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-month" className="role-management-label">Month</label>
            <input
              id="student-fee-month"
              name="month"
              type="text"
              className="role-management-input"
              value={feeFormData.month}
              onChange={handleFeeInputChange}
              placeholder="Enter month"
            />
            {feeFormError.month && <p className="role-management-field-error">{feeFormError.month}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-remarks" className="role-management-label">Remarks</label>
            <input
              id="student-fee-remarks"
              name="remarks"
              type="text"
              className="role-management-input"
              value={feeFormData.remarks}
              onChange={handleFeeInputChange}
              placeholder="Enter remarks"
            />
            {feeFormError.remarks && <p className="role-management-field-error">{feeFormError.remarks}</p>}
          </div>

          <div className="role-management-form-actions">
            <button type="submit" className="role-management-create-btn" disabled={isSavingFee}>
              {isSavingFee ? 'Saving...' : 'Save Fee'}
            </button>
            <button
              type="button"
              className="role-management-cancel-btn"
              onClick={closeAddFeePopup}
              disabled={isSavingFee}
            >
              Cancel
            </button>
          </div>
          {feeFormError.submit && <p className="role-management-field-error">{feeFormError.submit}</p>}
        </form>
      </CustomPopup>
      <CustomPopup
        isOpen={isPromotePopupOpen}
        title="Promote Student"
        titleId="student-promote-title"
        popupClassName="role-management-create-popup"
        onClose={closePromotePopup}
      >
        <form className="role-management-form" onSubmit={handleSubmitPromoteStudent}>
          <div className="role-management-field">
            <label htmlFor="student-promote-id" className="role-management-label">Student Id</label>
            <input
              id="student-promote-id"
              name="student_id"
              type="text"
              className="role-management-input"
              value={promoteFormData.student_id}
              onChange={handlePromoteInputChange}
              inputMode="numeric"
              placeholder="Enter student id"
            />
            {promoteFormError.student_id && <p className="role-management-field-error">{promoteFormError.student_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-promote-remarks" className="role-management-label">Remarks</label>
            <textarea
              id="student-promote-remarks"
              name="remarks"
              className="role-management-input"
              value={promoteFormData.remarks}
              onChange={handlePromoteInputChange}
              rows={4}
              placeholder="Enter remarks"
            />
            {promoteFormError.remarks && <p className="role-management-field-error">{promoteFormError.remarks}</p>}
          </div>

          <div className="role-management-form-actions">
            <button type="submit" className="role-management-create-btn" disabled={isPromoting}>
              {isPromoting ? 'Promoting...' : 'Promote Student'}
            </button>
            <button
              type="button"
              className="role-management-cancel-btn"
              onClick={closePromotePopup}
              disabled={isPromoting}
            >
              Cancel
            </button>
          </div>
          {promoteFormError.submit && <p className="role-management-field-error">{promoteFormError.submit}</p>}
        </form>
      </CustomPopup>
    </section>
  )
}

export default StudentPage
