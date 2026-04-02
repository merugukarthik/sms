import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { fetchAcademicYears } from '../store/academicSlice'
import { fetchStudentsList } from '../store/studentsSlice'
import {
  fetchCreateTransportStudentAssignment,
  fetchTransportRoutes,
  fetchTransportStudentAssignments,
} from '../store/transportSlice'
import { getCrudPermissions } from '../utils/permissions'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const getStudentName = (item) => (
  item?.student_name
  || item?.full_name
  || item?.student?.full_name
  || `${item?.student?.first_name || ''} ${item?.student?.last_name || ''}`.trim()
  || '-'
)

const getRouteName = (item) => (
  item?.route_name
  || item?.route?.name
  || item?.transport_route?.name
  || '-'
)

const getVehicleNumber = (item) => (
  item?.vehicle_number
  || item?.vehicle?.vehicle_number
  || item?.transport_vehicle?.vehicle_number
  || '-'
)

function TransportAssignmentsPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const schoolId = Number(user?.user?.school_id ?? user?.school_id ?? 0)
  const permissions = useMemo(() => getCrudPermissions(user, {
    moduleMatchers: ['transport'],
    featureMatchers: ['assignment'],
  }), [user])
  const [assignmentsData, setAssignmentsData] = useState([])
  const [studentsData, setStudentsData] = useState([])
  const [routesData, setRoutesData] = useState([])
  const [academicYearsData, setAcademicYearsData] = useState([])
  const [assignmentsMeta, setAssignmentsMeta] = useState({
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    student_id: '',
    route_id: '',
    stop_id: '',
    academic_year_id: '',
    transport_type: 'both',
  })

  const refreshAssignments = async (page = 1, pageSize = 10) => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchTransportStudentAssignments({
        access_token: user.access_token,
        page,
        page_size: pageSize,
      })).unwrap()

      const normalized = normalizeList(resp)
      setAssignmentsData(normalized)
      setAssignmentsMeta({
        total: Number(resp?.total ?? normalized.length ?? 0),
        page: Number(resp?.page ?? page),
        page_size: Number(resp?.page_size ?? pageSize),
        total_pages: Number(resp?.total_pages ?? 1),
      })
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch transport assignments.')
      setAssignmentsData([])
      setAssignmentsMeta({
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  useEffect(() => {
    const loadCreateOptions = async () => {
      if (!user?.access_token) return

      try {
        const [studentsResp, routesResp, academicYearsResp] = await Promise.all([
          dispatch(fetchStudentsList({
            access_token: user.access_token,
            page: 1,
            page_size: 10,
          })).unwrap(),
          dispatch(fetchTransportRoutes({
            access_token: user.access_token,
          })).unwrap(),
          dispatch(fetchAcademicYears({
            access_token: user.access_token,
          })).unwrap(),
        ])

        setStudentsData(normalizeList(studentsResp))
        setRoutesData(normalizeList(routesResp))
        setAcademicYearsData(normalizeList(academicYearsResp))
      } catch {
        setStudentsData([])
        setRoutesData([])
        setAcademicYearsData([])
      }
    }

    loadCreateOptions()
  }, [dispatch, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!String(values.student_id || '').trim()) nextErrors.student_id = 'Student is required.'
    if (!String(values.route_id || '').trim()) nextErrors.route_id = 'Route is required.'
    if (!String(values.stop_id || '').trim()) nextErrors.stop_id = 'Stop is required.'
    else if (Number(values.stop_id) <= 0) nextErrors.stop_id = 'Stop id must be greater than 0.'
    if (!String(values.academic_year_id || '').trim()) nextErrors.academic_year_id = 'Academic year is required.'
    if (!String(values.transport_type || '').trim()) nextErrors.transport_type = 'Transport type is required.'
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
      student_id: '',
      route_id: '',
      stop_id: '',
      academic_year_id: '',
      transport_type: 'both',
    })
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'stop_id' ? value.replace(/\D/g, '') : value,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleCreateAssignment = async (event) => {
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
      await dispatch(fetchCreateTransportStudentAssignment({
        access_token: user.access_token,
        payload: {
          school_id: schoolId,
          student_id: Number(formData.student_id),
          route_id: Number(formData.route_id),
          stop_id: Number(formData.stop_id),
          academic_year_id: Number(formData.academic_year_id),
          transport_type: formData.transport_type,
        },
      })).unwrap()

      setMessage('Transport assignment created successfully.')
      closeCreatePopup()
      await refreshAssignments()
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create transport assignment.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const assignmentColumns = [
    { key: 'id', header: 'Assignment Id' },
    {
      key: 'student_name',
      header: 'Student',
      render: (item) => getStudentName(item),
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (item) => getRouteName(item),
    },
    {
      key: 'vehicle_number',
      header: 'Vehicle',
      render: (item) => getVehicleNumber(item),
    },
    { key: 'pickup_point', header: 'Pickup Point' },
    { key: 'drop_point', header: 'Drop Point' },
    { key: 'status', header: 'Status' },
  ]

  const handlePreviousPage = () => {
    if (assignmentsMeta.page <= 1 || isLoading) return
    refreshAssignments(assignmentsMeta.page - 1, assignmentsMeta.page_size)
  }

  const handleNextPage = () => {
    if (assignmentsMeta.page >= assignmentsMeta.total_pages || isLoading) return
    refreshAssignments(assignmentsMeta.page + 1, assignmentsMeta.page_size)
  }

  if (!permissions.canView) {
    return <p className="role-management-error">You do not have view permission for transport assignments.</p>
  }

  return (
    <>
      <div className="role-management-head" style={{ marginBottom: '1rem' }}>
        <div className="role-management-head-row">
          <h2 className="role-management-title">Transport Assignments</h2>
          <button
            type="button"
            className="role-management-open-create-btn"
            onClick={openCreatePopup}
          >
            Create Assignment
          </button>
        </div>
      </div>

      {isLoading && <p className="role-management-info">Loading transport assignments...</p>}
      {error && <p className="role-management-error">{error}</p>}
      {message && <p className="role-management-success">{message}</p>}
      {!isLoading && !error && (
        <>
          <CustomTable
            columns={assignmentColumns}
            data={assignmentsData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No transport assignments available."
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <p className="role-management-info" style={{ margin: 0 }}>
              Page {assignmentsMeta.page} of {assignmentsMeta.total_pages || 1} | Total: {assignmentsMeta.total}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="otp-back-btn custom-popup-btn"
                onClick={handlePreviousPage}
                disabled={isLoading || assignmentsMeta.page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="login-submit-btn custom-popup-btn"
                onClick={handleNextPage}
                disabled={isLoading || assignmentsMeta.page >= assignmentsMeta.total_pages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <CustomPopup
        isOpen={isCreatePopupOpen}
        title="Create Assignment"
        titleId="create-transport-assignment-title"
        popupClassName="role-management-create-popup"
        onClose={closeCreatePopup}
      >
        <form className="role-management-form" onSubmit={handleCreateAssignment}>
          <div className="role-management-field">
            <label htmlFor="assignment-student-id" className="role-management-label">Student</label>
            <select
              id="assignment-student-id"
              name="student_id"
              className="role-management-input"
              value={formData.student_id}
              onChange={handleInputChange}
            >
              <option value="">Select student</option>
              {studentsData.map((student, index) => (
                <option key={student?.id ?? index} value={String(student?.id ?? '')}>
                  {`${student?.first_name || ''} ${student?.last_name || ''}`.trim() || `Student ${index + 1}`}
                </option>
              ))}
            </select>
            {formError.student_id && <p className="role-management-field-error">{formError.student_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="assignment-route-id" className="role-management-label">Route</label>
            <select
              id="assignment-route-id"
              name="route_id"
              className="role-management-input"
              value={formData.route_id}
              onChange={handleInputChange}
            >
              <option value="">Select route</option>
              {routesData.map((route, index) => (
                <option key={route?.id ?? index} value={String(route?.id ?? '')}>
                  {route?.name || `Route ${index + 1}`}
                </option>
              ))}
            </select>
            {formError.route_id && <p className="role-management-field-error">{formError.route_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="assignment-stop-id" className="role-management-label">Stop Id</label>
            <input
              id="assignment-stop-id"
              name="stop_id"
              type="text"
              className="role-management-input"
              value={formData.stop_id}
              onChange={handleInputChange}
              inputMode="numeric"
              placeholder="Enter stop id"
            />
            {formError.stop_id && <p className="role-management-field-error">{formError.stop_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="assignment-academic-year-id" className="role-management-label">Academic Year</label>
            <select
              id="assignment-academic-year-id"
              name="academic_year_id"
              className="role-management-input"
              value={formData.academic_year_id}
              onChange={handleInputChange}
            >
              <option value="">Select academic year</option>
              {academicYearsData.map((item, index) => (
                <option key={item?.id ?? index} value={String(item?.id ?? '')}>
                  {item?.name || item?.academic_year || `Academic Year ${index + 1}`}
                </option>
              ))}
            </select>
            {formError.academic_year_id && <p className="role-management-field-error">{formError.academic_year_id}</p>}
          </div>

          <div className="role-management-field">
            <label htmlFor="assignment-transport-type" className="role-management-label">Transport Type</label>
            <select
              id="assignment-transport-type"
              name="transport_type"
              className="role-management-input"
              value={formData.transport_type}
              onChange={handleInputChange}
            >
              <option value="both">both</option>
              <option value="pickup">pickup</option>
              <option value="drop">drop</option>
            </select>
            {formError.transport_type && <p className="role-management-field-error">{formError.transport_type}</p>}
          </div>

          <div className="custom-popup-actions">
            <button
              type="submit"
              className="login-submit-btn custom-popup-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Please wait...' : 'Create Assignment'}
            </button>
            <button
              type="button"
              className="otp-back-btn custom-popup-btn"
              onClick={closeCreatePopup}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
          {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        </form>
      </CustomPopup>
    </>
  )
}

export default TransportAssignmentsPage
