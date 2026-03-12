import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchCreateStaffAttendance,
  fetchCreateStaff,
  fetchDeleteStaff,
  fetchStaffDepartments,
  fetchStaffDesignations,
  fetchStaffList,
  fetchUpdateStaff,
} from '../store/staffSlice'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'

function StaffPage() {
  const sanitizePhoneValue = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10)

  const formatDate = (value) => {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const [staffData, setStaffData] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [staffMeta, setStaffMeta] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState('')
  const [deleteStaffTarget, setDeleteStaffTarget] = useState(null)
  const [attendanceDate, setAttendanceDate] = useState(formatDate(new Date()))
  const [selectedStaff, setSelectedStaff] = useState({})
  const [attendanceRemarks, setAttendanceRemarks] = useState({})
  const [attendanceError, setAttendanceError] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    department_id: 0,
    designation_id: 0,
    date_of_joining: '',
    user_id: 0,
  })
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    department_id: 0,
    designation_id: 0,
    date_of_joining: '',
    user_id: 0,
  })

  const refreshStaff = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchStaffList({
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
      setStaffData(normalized)
      setStaffMeta({
        total: Number(resp?.total ?? normalized.length ?? 0),
        page: Number(resp?.page ?? 1),
        page_size: Number(resp?.page_size ?? 20),
        total_pages: Number(resp?.total_pages ?? 1),
      })
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch staff list.')
      setStaffData([])
      setStaffMeta({
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDepartments = async () => {
    if (!user?.access_token) return

    try {
      const resp = await dispatch(fetchStaffDepartments({ access_token: user.access_token })).unwrap()
      const normalized = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : []
      setDepartments(normalized)
    } catch {
      setDepartments([])
    }
  }

  const refreshDesignations = async (departmentId) => {
    if (!user?.access_token) return

    if (!departmentId) {
      setDesignations([])
      return
    }

    try {
      const resp = await dispatch(
        fetchStaffDesignations({
          access_token: user.access_token,
          department_id: departmentId,
        }),
      ).unwrap()
      const normalized = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : []
      setDesignations(normalized)
    } catch {
      setDesignations([])
    }
  }

  useEffect(() => {
    refreshDepartments()
    refreshStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.first_name.trim()) nextErrors.first_name = 'First name is required.'
    if (!values.last_name.trim()) nextErrors.last_name = 'Last name is required.'
    if (!values.date_of_birth) nextErrors.date_of_birth = 'Date of birth is required.'
    if (!values.gender.trim()) nextErrors.gender = 'Gender is required.'
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    if (!values.phone.trim()) nextErrors.phone = 'Phone is required.'
    if (values.phone && !/^\d{1,10}$/.test(values.phone)) nextErrors.phone = 'Phone number must be up to 10 digits.'
    if (!values.address.trim()) nextErrors.address = 'Address is required.'
    if (!values.department_id && values.department_id !== 0) nextErrors.department_id = 'Department id is required.'
    if (!values.designation_id && values.designation_id !== 0) nextErrors.designation_id = 'Designation id is required.'
    if (!values.date_of_joining) nextErrors.date_of_joining = 'Date of joining is required.'
    if (!values.user_id && values.user_id !== 0) nextErrors.user_id = 'User id is required.'
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
      phone: '',
      email: '',
      address: '',
      department_id: 0,
      designation_id: 0,
      date_of_joining: '',
      user_id: 0,
    })
    setDesignations([])
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingStaffId('')
    setEditFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      department_id: 0,
      designation_id: 0,
      date_of_joining: '',
      user_id: 0,
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    const nextValue = name === 'phone'
      ? sanitizePhoneValue(value)
      : type === 'number'
        ? Number(value)
        : value

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '' }))
  }

  const handleEditInputChange = (event) => {
    const { name, value, type } = event.target
    const nextValue = name === 'phone'
      ? sanitizePhoneValue(value)
      : type === 'number'
        ? Number(value)
        : value

    setEditFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleCreateStaff = async (event) => {
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
        fetchCreateStaff({
          ...formData,
          access_token: user.access_token,
        }),
      ).unwrap()
      setMessage('Staff created successfully.')
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        department_id: 0,
        designation_id: 0,
        date_of_joining: '',
        user_id: 0,
      })
      setFormError({})
      setIsCreatePopupOpen(false)
      await refreshStaff()
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create staff.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStaff = (staff) => {
    setEditingStaffId(String(staff?.id || ''))
    setEditFormData({
      first_name: staff?.first_name || '',
      last_name: staff?.last_name || '',
      date_of_birth: staff?.date_of_birth ? String(staff.date_of_birth).split('T')[0] : '',
      gender: staff?.gender || '',
      phone: staff?.phone || '',
      email: staff?.email || '',
      address: staff?.address || '',
      department_id: Number(staff?.department_id ?? 0),
      designation_id: Number(staff?.designation_id ?? 0),
      date_of_joining: staff?.date_of_joining ? String(staff.date_of_joining).split('T')[0] : '',
      user_id: Number(staff?.user_id ?? 0),
    })
    setFormError({})
    setMessage('')
  }

  const handleUpdateStaff = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(editFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!editingStaffId || !user?.access_token) {
      setFormError((prev) => ({ ...prev, editSubmit: 'Unable to update staff.' }))
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateStaff({
          id: editingStaffId,
          ...editFormData,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeEditPopup()
      await refreshStaff()
      setMessage('Staff updated successfully.')
    } catch (err) {
      setFormError((prev) => ({
        ...prev,
        editSubmit: typeof err === 'string' ? err : 'Failed to update staff.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDeleteStaff = (staff) => {
    setDeleteStaffTarget(staff)
  }

  const toggleStaffSelection = (staffId) => {
    setSelectedStaff((prev) => ({
      ...prev,
      [staffId]: !prev[staffId],
    }))
  }

  const handleAttendanceRemarksChange = (staffId, value) => {
    setAttendanceRemarks((prev) => ({
      ...prev,
      [staffId]: value,
    }))
  }

  const handleMarkAttendance = async () => {
    if (!user?.access_token) {
      setAttendanceError('Missing access token. Please login again.')
      return
    }
    if (!attendanceDate) {
      setAttendanceError('Attendance date is required.')
      return
    }

    const records = staffData
      .filter((staff) => selectedStaff[staff?.id])
      .map((staff) => ({
        staff_id: staff?.id,
        status: 'present',
        remarks: attendanceRemarks[staff?.id] || '',
      }))

    if (records.length === 0) {
      setAttendanceError('Select at least one staff to mark attendance.')
      return
    }

    setIsMarkingAttendance(true)
    setAttendanceError('')
    setMessage('')
    try {
      await dispatch(
        fetchCreateStaffAttendance({
          access_token: user.access_token,
          date: attendanceDate,
          records,
        }),
      ).unwrap()

      setSelectedStaff({})
      setAttendanceRemarks({})
      setMessage('Staff attendance marked successfully.')
    } catch (err) {
      setAttendanceError(typeof err === 'string' ? err : 'Failed to mark staff attendance.')
    } finally {
      setIsMarkingAttendance(false)
    }
  }

  const hasSelectedStaff = Object.values(selectedStaff).some(Boolean)

  const closeDeletePopup = () => {
    setDeleteStaffTarget(null)
  }

  const handleDeleteStaff = async () => {
    const staffId = deleteStaffTarget?.id
    if (!user?.access_token || !staffId) return
    if (actionLoadingId === String(staffId)) return

    setActionLoadingId(String(staffId))
    setMessage('')
    try {
      await dispatch(
        fetchDeleteStaff({
          id: staffId,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeDeletePopup()
      await refreshStaff()
      setMessage('Staff deleted successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to delete staff.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const staffColumns = [
    {
      key: 'select',
      header: 'Select',
      render: (staff) => (
        <input
          type="checkbox"
          checked={Boolean(selectedStaff[staff?.id])}
          onChange={() => toggleStaffSelection(staff?.id)}
        />
      ),
    },
    { key: 'id', header: 'Staff Id' },
    { key: 'employee_id', header: 'Employee Id' },
    {
      key: 'full_name',
      header: 'Name',
      render: (staff) => `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim() || '-',
    },
    { key: 'phone', header: 'Phone' },
    { key: 'gender', header: 'Gender' },
    { key: 'department_name', header: 'Department' },
    { key: 'designation_name', header: 'Designation' },
    { key: 'status', header: 'Status' },
    {
      key: 'attendance_remarks',
      header: 'Remarks',
      render: (staff) => (
        <input
          type="text"
          className="role-management-input"
          value={attendanceRemarks[staff?.id] || ''}
          onChange={(event) => handleAttendanceRemarksChange(staff?.id, event.target.value)}
          placeholder="Remarks"
        />
      ),
    },
    {
      key: 'date_of_joining',
      header: 'Date Of Joining',
      render: (staff) => (staff?.date_of_joining ? String(staff.date_of_joining).split('T')[0] : '-'),
    },
    {
      key: 'action',
      header: 'Action',
      render: (staff) => (
        <div className="role-management-table-actions">
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-edit"
            onClick={() => handleEditStaff(staff)}
          >
            Edit
          </button>
          <button
            type="button"
            className="role-management-action-btn role-management-action-btn-delete"
            onClick={() => requestDeleteStaff(staff)}
            disabled={actionLoadingId === String(staff?.id)}
          >
            {actionLoadingId === String(staff?.id) ? 'Deleting...' : 'Delete'}
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
            <h2 className="role-management-title">Staff</h2>
            <button
              type="button"
              className="role-management-open-create-btn"
              onClick={openCreatePopup}
            >
              Create Staff
            </button>
          </div>
        </div>

        <div
          className="role-management-form"
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}
        >
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="staff-attendance-date" className="role-management-label">Attendance Date</label>
            <input
              id="staff-attendance-date"
              type="date"
              className="role-management-input"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </div>
          <div className="role-management-form-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="role-management-create-btn"
              onClick={handleMarkAttendance}
              disabled={!hasSelectedStaff || isMarkingAttendance || isLoading}
            >
              {isMarkingAttendance ? 'Saving...' : 'Mark Attendance'}
            </button>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading staff...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {attendanceError && <p className="role-management-field-error">{attendanceError}</p>}
        {!isLoading && !error && staffData.length === 0 && (
          <p className="role-management-info">No staff available.</p>
        )}

        {!isLoading && !error && staffData.length > 0 && (
          <CustomTable
            columns={staffColumns}
            data={staffData}
            rowKey={(staff, index) => staff?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No staff available."
          />
        )}

        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && (
          <p className="role-management-info">
            Page {staffMeta.page} of {staffMeta.total_pages} | Total: {staffMeta.total}
          </p>
        )}
      </div>

      {isCreatePopupOpen && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-create-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-staff-title"
          >
            <h3 id="create-staff-title" className="custom-popup-title">Create Staff</h3>
            <form className="role-management-form role-management-form-two-col" onSubmit={handleCreateStaff}>
              <div className="role-management-field">
                <label htmlFor="staff-first_name" className="role-management-label">First Name</label>
                <input
                  id="staff-first_name"
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
                <label htmlFor="staff-last_name" className="role-management-label">Last Name</label>
                <input
                  id="staff-last_name"
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
                <label htmlFor="staff-date_of_birth" className="role-management-label">Date Of Birth</label>
                <input
                  id="staff-date_of_birth"
                  name="date_of_birth"
                  type="date"
                  className="role-management-input"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
                {formError.date_of_birth && <p className="role-management-field-error">{formError.date_of_birth}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="staff-gender" className="role-management-label">Gender</label>
                <input
                  id="staff-gender"
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
                <label htmlFor="staff-phone" className="role-management-label">Phone</label>
                <input
                  id="staff-phone"
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
                <label htmlFor="staff-email" className="role-management-label">Email</label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  className="role-management-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                />
                {formError.email && <p className="role-management-field-error">{formError.email}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="staff-address" className="role-management-label">Address</label>
                <input
                  id="staff-address"
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
                <label htmlFor="staff-department_id" className="role-management-label">Department Id</label>
                <select
                  id="staff-department_id"
                  name="department_id"
                  className="role-management-select"
                  value={formData.department_id}
                  onChange={async (event) => {
                    const selectedDepartmentId = Number(event.target.value)
                    setFormData((prev) => ({
                      ...prev,
                      department_id: selectedDepartmentId,
                      designation_id: 0,
                    }))
                    setFormError((prev) => ({ ...prev, department_id: '', designation_id: '' }))
                    await refreshDesignations(selectedDepartmentId)
                  }}
                >
                  <option value={0}>-- Select department --</option>
                  {departments.map((department, index) => (
                    <option key={department?.id ?? index} value={Number(department?.id ?? 0)}>
                      {department?.name || department?.display_name || `Department ${index + 1}`}
                    </option>
                  ))}
                </select>
                {formError.department_id && <p className="role-management-field-error">{formError.department_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="staff-designation_id" className="role-management-label">Designation Id</label>
                <select
                  id="staff-designation_id"
                  name="designation_id"
                  className="role-management-select"
                  value={formData.designation_id}
                  onChange={(event) => {
                    setFormData((prev) => ({
                      ...prev,
                      designation_id: Number(event.target.value),
                    }))
                    setFormError((prev) => ({ ...prev, designation_id: '' }))
                  }}
                  disabled={!formData.department_id || designations.length === 0}
                >
                  <option value={0}>
                    {formData.department_id ? '-- Select designation --' : '-- Select department first --'}
                  </option>
                  {designations.map((designation, index) => (
                    <option key={designation?.id ?? index} value={Number(designation?.id ?? 0)}>
                      {designation?.name || designation?.display_name || `Designation ${index + 1}`}
                    </option>
                  ))}
                </select>
                {formError.designation_id && <p className="role-management-field-error">{formError.designation_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="staff-date_of_joining" className="role-management-label">Date Of Joining</label>
                <input
                  id="staff-date_of_joining"
                  name="date_of_joining"
                  type="date"
                  className="role-management-input"
                  value={formData.date_of_joining}
                  onChange={handleInputChange}
                />
                {formError.date_of_joining && <p className="role-management-field-error">{formError.date_of_joining}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="staff-user_id" className="role-management-label">User Id</label>
                <input
                  id="staff-user_id"
                  name="user_id"
                  type="number"
                  className="role-management-input"
                  value={formData.user_id}
                  onChange={handleInputChange}
                />
                {formError.user_id && <p className="role-management-field-error">{formError.user_id}</p>}
              </div>

              <div className="role-management-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Create Staff'}
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

      {editingStaffId && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-edit-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-staff-title"
          >
            <h3 id="edit-staff-title" className="custom-popup-title">Edit Staff</h3>
            <form className="role-management-form" onSubmit={handleUpdateStaff}>
              <div className="role-management-field">
                <label htmlFor="edit-staff-first_name" className="role-management-label">First Name</label>
                <input
                  id="edit-staff-first_name"
                  name="first_name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.first_name}
                  onChange={handleEditInputChange}
                  placeholder="Enter first name"
                />
                {formError.first_name && <p className="role-management-field-error">{formError.first_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-last_name" className="role-management-label">Last Name</label>
                <input
                  id="edit-staff-last_name"
                  name="last_name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.last_name}
                  onChange={handleEditInputChange}
                  placeholder="Enter last name"
                />
                {formError.last_name && <p className="role-management-field-error">{formError.last_name}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-date_of_birth" className="role-management-label">Date Of Birth</label>
                <input
                  id="edit-staff-date_of_birth"
                  name="date_of_birth"
                  type="date"
                  className="role-management-input"
                  value={editFormData.date_of_birth}
                  onChange={handleEditInputChange}
                />
                {formError.date_of_birth && <p className="role-management-field-error">{formError.date_of_birth}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-gender" className="role-management-label">Gender</label>
                <input
                  id="edit-staff-gender"
                  name="gender"
                  type="text"
                  className="role-management-input"
                  value={editFormData.gender}
                  onChange={handleEditInputChange}
                  placeholder="Enter gender"
                />
                {formError.gender && <p className="role-management-field-error">{formError.gender}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-phone" className="role-management-label">Phone</label>
                <input
                  id="edit-staff-phone"
                  name="phone"
                  type="text"
                  className="role-management-input"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter phone"
                />
                {formError.phone && <p className="role-management-field-error">{formError.phone}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-email" className="role-management-label">Email</label>
                <input
                  id="edit-staff-email"
                  name="email"
                  type="email"
                  className="role-management-input"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  placeholder="Enter email"
                />
                {formError.email && <p className="role-management-field-error">{formError.email}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-address" className="role-management-label">Address</label>
                <input
                  id="edit-staff-address"
                  name="address"
                  type="text"
                  className="role-management-input"
                  value={editFormData.address}
                  onChange={handleEditInputChange}
                  placeholder="Enter address"
                />
                {formError.address && <p className="role-management-field-error">{formError.address}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-department_id" className="role-management-label">Department Id</label>
                <input
                  id="edit-staff-department_id"
                  name="department_id"
                  type="number"
                  className="role-management-input"
                  value={editFormData.department_id}
                  onChange={handleEditInputChange}
                />
                {formError.department_id && <p className="role-management-field-error">{formError.department_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-designation_id" className="role-management-label">Designation Id</label>
                <input
                  id="edit-staff-designation_id"
                  name="designation_id"
                  type="number"
                  className="role-management-input"
                  value={editFormData.designation_id}
                  onChange={handleEditInputChange}
                />
                {formError.designation_id && <p className="role-management-field-error">{formError.designation_id}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-date_of_joining" className="role-management-label">Date Of Joining</label>
                <input
                  id="edit-staff-date_of_joining"
                  name="date_of_joining"
                  type="date"
                  className="role-management-input"
                  value={editFormData.date_of_joining}
                  onChange={handleEditInputChange}
                />
                {formError.date_of_joining && <p className="role-management-field-error">{formError.date_of_joining}</p>}
              </div>

              <div className="role-management-field">
                <label htmlFor="edit-staff-user_id" className="role-management-label">User Id</label>
                <input
                  id="edit-staff-user_id"
                  name="user_id"
                  type="number"
                  className="role-management-input"
                  value={editFormData.user_id}
                  onChange={handleEditInputChange}
                />
                {formError.user_id && <p className="role-management-field-error">{formError.user_id}</p>}
              </div>

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Update Staff'}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
              </div>
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteStaffTarget)}
        title="Delete Staff"
        message={`Are you sure you want to delete "${`${deleteStaffTarget?.first_name || ''} ${deleteStaffTarget?.last_name || ''}`.trim() || 'this staff'}"?`}
        onConfirm={handleDeleteStaff}
        confirmText={actionLoadingId === String(deleteStaffTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-staff-title"
      />
    </section>
  )
}

export default StaffPage
