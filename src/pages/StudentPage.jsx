import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchAcademicYears, fetchClasses, fetchSections } from '../store/academicSlice'
import { fetchCreateFinanceAssignment } from '../store/feesSlice'
import { rolesManagement } from '../store/roleSlice'
import { fetchCreateStudent, fetchPromoteStudent, fetchStudentsList } from '../store/studentsSlice'
import { getCrudPermissions } from '../utils/permissions'

const FEE_TYPE_OPTIONS = [
  { value: '1', label: 'Tuition Fee' },
  { value: '2', label: 'Transport Fee' },
  { value: '3', label: 'Hostel Fee' },
  { value: '4', label: 'Exam Fee' },
]

const PAYMENT_MODE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cheque', label: 'Cheque' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const getNormalizedList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const getSectionClassId = (section) => (
  Number(
    section?.class_id
    ?? section?.class?.id
    ?? section?.class?.class_id
    ?? section?.class_details?.id
    ?? section?.class_details?.class_id
    ?? 0
  )
)

function StudentPage() {
  const sanitizePhoneValue = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10)

  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const loginData = useSelector((state) => state.auth.loginData)
  const permissions = useMemo(
    () => getCrudPermissions(user, { moduleMatchers: ['student'] }),
    [user],
  )
  const hasStudentLogin = useMemo(() => (
    Number(
      user?.student_id
      ?? user?.user?.student_id
      ?? loginData?.student_id
      ?? loginData?.user?.student_id
      ?? 0
    ) > 0
  ), [loginData, user])
  console.log('school id:- ', user.user.school_id)

  const [studentsData, setStudentsData] = useState([])
  const [studentsMeta, setStudentsMeta] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  })
  const [classesData, setClassesData] = useState([])
  const [sectionsData, setSectionsData] = useState([])
  const [academicYearsData, setAcademicYearsData] = useState([])
  const [rolesData, setRolesData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [isAddFeePopupOpen, setIsAddFeePopupOpen] = useState(false)
  const [isPromotePopupOpen, setIsPromotePopupOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null)
  const [selectedStudentForPromotion, setSelectedStudentForPromotion] = useState(null)
  const [formError, setFormError] = useState({})
  const [feeFormError, setFeeFormError] = useState({})
  const [promoteFormError, setPromoteFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    role_id: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    phone: '',
    guardian_name: '',
    guardian_phone: '',
    email: '',
    class_id: '',
    section_id: '',
    academic_year_id: '',
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
  const academicYearOptions = useMemo(() => (
    academicYearsData.map((year, index) => ({
      value: String(year?.id ?? ''),
      label: year?.name || year?.academic_year || `Academic Year ${index + 1}`,
    })).filter((option) => option.value)
  ), [academicYearsData])
  const classOptions = useMemo(() => (
    classesData.map((item, index) => ({
      value: String(item?.id ?? ''),
      label: item?.name || item?.class_name || `Class ${index + 1}`,
    })).filter((option) => option.value)
  ), [classesData])
  const sectionOptions = useMemo(() => {
    const selectedClassId = Number(formData.class_id)
    const normalizedSections = sectionsData.map((item, index) => ({
      value: String(item?.id ?? item?.section_id ?? ''),
      label: item?.name || item?.section_name || `Section ${index + 1}`,
      classId: getSectionClassId(item),
    })).filter((option) => option.value)

    if (selectedClassId > 0) {
      const matchingSections = normalizedSections.filter((option) => option.classId === selectedClassId)
      return matchingSections.length > 0 ? matchingSections : normalizedSections
    }

    return normalizedSections
  }, [formData.class_id, sectionsData])

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

  useEffect(() => {
    const loadAcademicYears = async () => {
      if (!user?.access_token) return

      try {
        const resp = await dispatch(fetchAcademicYears({
          access_token: user.access_token,
        })).unwrap()

        setAcademicYearsData(getNormalizedList(resp))
      } catch {
        setAcademicYearsData([])
      }
    }

    loadAcademicYears()
  }, [dispatch, user?.access_token])

  useEffect(() => {
    const loadClassAndSectionOptions = async () => {
      if (!user?.access_token) return

      try {
        const [classesResp, sectionsResp] = await Promise.all([
          dispatch(fetchClasses({ access_token: user.access_token })).unwrap(),
          dispatch(fetchSections({ access_token: user.access_token })).unwrap(),
        ])

        setClassesData(getNormalizedList(classesResp))
        setSectionsData(getNormalizedList(sectionsResp))
      } catch {
        setClassesData([])
        setSectionsData([])
      }
    }

    loadClassAndSectionOptions()
  }, [dispatch, user?.access_token])

  useEffect(() => {
    const loadRoles = async () => {
      if (!user?.access_token) return

      try {
        const resp = await dispatch(rolesManagement({
          access_token: user.access_token,
        })).unwrap()

        setRolesData(getNormalizedList(resp))
      } catch {
        setRolesData([])
      }
    }

    loadRoles()
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.first_name.trim()) nextErrors.first_name = 'First name is required.'
    if (!values.last_name.trim()) nextErrors.last_name = 'Last name is required.'
    if (!values.username.trim()) nextErrors.username = 'Username is required.'
    if (!values.password.trim()) nextErrors.password = 'Password is required.'
    if (!String(values.role_id || '').trim()) nextErrors.role_id = 'Role is required.'
    if (!values.date_of_birth) nextErrors.date_of_birth = 'Date of birth is required.'
    if (!values.gender.trim()) nextErrors.gender = 'Gender is required.'
    if (!values.blood_group.trim()) nextErrors.blood_group = 'Blood group is required.'
    if (!values.address.trim()) nextErrors.address = 'Address is required.'
    if (!values.phone.trim()) nextErrors.phone = 'Phone is required.'
    if (values.phone && !/^\d{1,10}$/.test(values.phone)) nextErrors.phone = 'Phone number must be up to 10 digits.'
    if (!values.guardian_name.trim()) nextErrors.guardian_name = 'Parent name is required.'
    if (!values.guardian_phone.trim()) nextErrors.guardian_phone = 'Parent phone is required.'
    if (values.guardian_phone && !/^\d{1,10}$/.test(values.guardian_phone)) nextErrors.guardian_phone = 'Parent phone number must be up to 10 digits.'
    if (!values.email.trim()) nextErrors.email = 'Parent email is required.'
    if (!String(values.class_id ?? '').trim()) nextErrors.class_id = 'Class is required.'
    if (!String(values.section_id ?? '').trim()) nextErrors.section_id = 'Section is required.'
    if (!String(values.academic_year_id ?? '').trim()) nextErrors.academic_year_id = 'Academic year is required.'
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
    setShowPassword(false)
    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      password: '',
      role_id: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      address: '',
      phone: '',
      guardian_name: '',
      guardian_phone: '',
      email: '',
      class_id: '',
      section_id: '',
      academic_year_id: '',
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
      ...(name === 'class_id' ? { section_id: '' } : {}),
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleCreateStudent = async (event) => {
    event.preventDefault()
    console.log('user data:- ',user)
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
          username: formData.username.trim(),
          role_id: formData.role_id,
          class_id: Number(formData.class_id),
          section_id: Number(formData.section_id),
          academic_year_id: Number(formData.academic_year_id),
          //school_id: 0 ,
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
    // { key: 'status', header: 'Status' },
    ...(!hasStudentLogin ? [{
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
    }] : []),
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
            <button
              type="button"
              className="custom-popup-close-btn"
              onClick={closeCreatePopup}
              aria-label="Close popup"
            >
              x
            </button>
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
                <select
                  id="student-gender"
                  name="gender"
                  className="role-management-select"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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
                <label htmlFor="student-guardian_name" className="role-management-label">Parent Name</label>
                <input
                  id="student-guardian_name"
                  name="guardian_name"
                  type="text"
                  className="role-management-input"
                  value={formData.guardian_name}
                  onChange={handleInputChange}
                  placeholder="Enter Guardian name"
                />
                {formError.guardian_name && <p className="role-management-field-error">{formError.guardian_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-guardian_phone" className="role-management-label">Parent Phone</label>
                <input
                  id="student-guardian_phone"
                  name="guardian_phone"
                  type="text"
                  className="role-management-input"
                  value={formData.guardian_phone}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter parent phone"
                />
                {formError.guardian_phone && <p className="role-management-field-error">{formError.guardian_phone}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-email" className="role-management-label">Parent Email</label>
                <input
                  id="student-email"
                  name="email"
                  type="email"
                  className="role-management-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter parent email"
                />
                {formError.email && <p className="role-management-field-error">{formError.email}</p>}
              </div>
              <div className="role-management-field">
                <label htmlFor="student-class_id" className="role-management-label">Class Id</label>
                <select
                  id="student-class_id"
                  name="class_id"
                  className="role-management-select"
                  value={formData.class_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select class</option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-section_id" className="role-management-label">Section Id</label>
                <select
                  id="student-section_id"
                  name="section_id"
                  className="role-management-select"
                  value={formData.section_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select section</option>
                  {sectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-academic_year_id" className="role-management-label">Academic Year</label>
                <select
                  id="student-academic_year_id"
                  name="academic_year_id"
                  className="role-management-select"
                  value={formData.academic_year_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select academic year</option>
                  {academicYearOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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

              <div className="organization-form-section-title" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                Login Information
              </div>

              <div className="role-management-field">
                <label htmlFor="student-username" className="role-management-label">Username</label>
                <input
                  id="student-username"
                  name="username"
                  type="text"
                  className="role-management-input"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                />
                {formError.username && <p className="role-management-field-error">{formError.username}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-password" className="role-management-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="student-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="role-management-input"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
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
                {formError.password && <p className="role-management-field-error">{formError.password}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="student-role_id" className="role-management-label">Role</label>
                <select
                  id="student-role_id"
                  name="role_id"
                  className="role-management-select"
                  value={formData.role_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select role</option>
                  {rolesData.map((role, index) => (
                    <option key={role?.id ?? index} value={role?.role_id ?? role?.id ?? ''}>
                      {role?.name || `Role ${index + 1}`}
                    </option>
                  ))}
                </select>
                {formError.role_id && <p className="role-management-field-error">{formError.role_id}</p>}
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
            <select
              id="student-fee-payment-mode"
              name="payment_mode"
              className="role-management-select"
              value={feeFormData.payment_mode}
              onChange={handleFeeInputChange}
            >
              <option value="">Select payment mode</option>
              {PAYMENT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {feeFormError.payment_mode && <p className="role-management-field-error">{feeFormError.payment_mode}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-status" className="role-management-label">Status</label>
            <select
              id="student-fee-status"
              name="status"
              className="role-management-select"
              value={feeFormData.status}
              onChange={handleFeeInputChange}
            >
              <option value="">Select status</option>
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {feeFormError.status && <p className="role-management-field-error">{feeFormError.status}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="student-fee-academic-year" className="role-management-label">Academic Year</label>
            <select
              id="student-fee-academic-year"
              name="academic_year"
              className="role-management-select"
              value={feeFormData.academic_year}
              onChange={handleFeeInputChange}
            >
              <option value="">Select academic year</option>
              {academicYearOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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
