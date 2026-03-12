import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomTable from '../components/CustomTable'
import { fetchCreateStudentAttendance, fetchStudentAttendance, fetchStudentsList } from '../store/studentsSlice'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const resolveStudentName = (item) => {
  const directName = String(item?.student_name || '').trim()
  if (directName) return directName

  const firstName = String(item?.first_name || '').trim()
  const lastName = String(item?.last_name || '').trim()
  const joinedName = `${firstName} ${lastName}`.trim()
  if (joinedName) return joinedName

  return '-'
}

const getTodayDate = () => {
  const d = new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

function StudentAttendancePage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const [studentsData, setStudentsData] = useState([])
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate())
  const [selectedStudents, setSelectedStudents] = useState({})
  const [attendanceRemarks, setAttendanceRemarks] = useState({})
  const [attendanceData, setAttendanceData] = useState([])
  const [attendanceMeta, setAttendanceMeta] = useState({
    total: 0,
    page: 1,
    page_size: 50,
    total_pages: 0,
  })
  const [filters, setFilters] = useState({
    section_id: '',
    date_from: '',
    date_to: '',
    student_id: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [message, setMessage] = useState('')

  const getStudents = async () => {
    if (!user?.access_token) return

    setIsLoadingStudents(true)
    try {
      const resp = await dispatch(
        fetchStudentsList({
          access_token: user.access_token,
          page: 1,
          page_size: 20,
        }),
      ).unwrap()
      setStudentsData(normalizeList(resp))
    } catch {
      setStudentsData([])
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const getAttendance = async (payloadFilters = filters) => {
    if (!user?.access_token) return

    const studentId = Number(payloadFilters?.student_id)
    const sectionId = Number(payloadFilters?.section_id)
    const hasStudentFilter = Number.isFinite(studentId) && studentId > 0
    const hasSectionDateFilter = sectionId > 0 && payloadFilters?.date_from && payloadFilters?.date_to

    if (!hasStudentFilter && !hasSectionDateFilter) {
      setError('Enter either Student Id, or Section Id with From Date and To Date.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(
        fetchStudentAttendance({
          access_token: user.access_token,
          student_id: hasStudentFilter ? studentId : undefined,
          section_id: hasStudentFilter ? undefined : sectionId,
          date_from: hasStudentFilter ? undefined : payloadFilters.date_from,
          date_to: hasStudentFilter ? undefined : payloadFilters.date_to,
          page: 1,
          page_size: 50,
        }),
      ).unwrap()

      const normalized = normalizeList(resp)
      setAttendanceData(normalized)
      setAttendanceMeta({
        total: Number(resp?.total ?? normalized.length ?? 0),
        page: Number(resp?.page ?? 1),
        page_size: Number(resp?.page_size ?? 50),
        total_pages: Number(resp?.total_pages ?? 1),
      })
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch student attendance.')
      setAttendanceData([])
      setAttendanceMeta({
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleApplyFilter = (event) => {
    event.preventDefault()
    getAttendance(filters)
  }

  const handleLoadStudents = () => {
    getStudents()
  }

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }))
  }

  const handleAttendanceRemarksChange = (studentId, value) => {
    setAttendanceRemarks((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  const sectionStudents = useMemo(() => (
    studentsData.filter((student) => Number(student?.section_id) === Number(filters.section_id))
  ), [studentsData, filters.section_id])
  const displayedStudents = sectionStudents.length > 0 ? sectionStudents : studentsData

  const hasSelectedStudents = displayedStudents.some((student) => Boolean(selectedStudents[student?.id]))
  const allSectionStudentsSelected = displayedStudents.length > 0
    && displayedStudents.every((student) => Boolean(selectedStudents[student?.id]))
  const someSectionStudentsSelected = displayedStudents.some((student) => Boolean(selectedStudents[student?.id]))

  const toggleSelectAllStudents = useCallback(() => {
    setSelectedStudents((prev) => {
      const next = { ...prev }
      const shouldSelectAll = displayedStudents.some((student) => !next[student?.id])

      displayedStudents.forEach((student) => {
        if (shouldSelectAll) {
          next[student?.id] = true
        } else {
          delete next[student?.id]
        }
      })

      return next
    })
  }, [displayedStudents])

  useEffect(() => {
    setSelectedStudents({})
    setAttendanceRemarks({})
  }, [filters.section_id])

  const markAttendanceColumns = useMemo(
    () => ([
      {
        key: 'select',
        header: (
          <label className="attendance-select-all-label">
            <input
              type="checkbox"
              className="attendance-select-checkbox"
              checked={allSectionStudentsSelected}
              ref={(node) => {
                if (node) {
                  node.indeterminate = !allSectionStudentsSelected && someSectionStudentsSelected
                }
              }}
              onChange={toggleSelectAllStudents}
              aria-label="Select all students"
            />
            <span>Select All</span>
          </label>
        ),
        render: (student) => (
          <input
            type="checkbox"
            className="attendance-select-checkbox"
            checked={Boolean(selectedStudents[student?.id])}
            onChange={() => toggleStudentSelection(student?.id)}
          />
        ),
      },
      { key: 'id', header: 'Student Id' },
      {
        key: 'student_name',
        header: 'Student Name',
        render: (student) => resolveStudentName(student),
      },
      { key: 'class_name', header: 'Class' },
      { key: 'section_name', header: 'Section' },
      {
        key: 'attendance_remarks',
        header: 'Remarks',
        render: (student) => (
          <input
            type="text"
            className="role-management-input"
            value={attendanceRemarks[student?.id] || ''}
            onChange={(event) => handleAttendanceRemarksChange(student?.id, event.target.value)}
            placeholder="Remarks"
          />
        ),
      },
    ]),
    [allSectionStudentsSelected, attendanceRemarks, selectedStudents, someSectionStudentsSelected, toggleSelectAllStudents],
  )

  const handleMarkAttendance = async () => {
    if (!user?.access_token) {
      setSubmitError('Missing access token. Please login again.')
      return
    }
    if (!attendanceDate) {
      setSubmitError('Attendance date is required.')
      return
    }

    const records = displayedStudents
      .filter((student) => selectedStudents[student?.id])
      .map((student) => ({
        student_id: student?.id,
        section_id: Number(student?.section_id ?? filters.section_id ?? 0),
        status: 'present',
        remarks: attendanceRemarks[student?.id] || '',
      }))

    if (records.length === 0) {
      setSubmitError('Select at least one student to mark attendance.')
      return
    }

    setIsSubmittingAttendance(true)
    setSubmitError('')
    setMessage('')
    try {
      await dispatch(
        fetchCreateStudentAttendance({
          access_token: user.access_token,
          date: attendanceDate,
          section_id: Number(filters.section_id),
          records,
        }),
      ).unwrap()

      setSelectedStudents({})
      setAttendanceRemarks({})
      setMessage('Student attendance marked successfully.')
      await getAttendance(filters)
    } catch (err) {
      setSubmitError(typeof err === 'string' ? err : 'Failed to mark student attendance.')
    } finally {
      setIsSubmittingAttendance(false)
    }
  }

  const columns = useMemo(
    () => ([
      // { key: 'id', header: 'Attendance Id' },
      { key: 'student_id', header: 'Student Id' },
      {
        key: 'student_name',
        header: 'Student Name',
        render: (item) => resolveStudentName(item),
      },
      { key: 'section_id', header: 'Section Id' },
      {
        key: 'date',
        header: 'Date',
        render: (item) => {
          const rawDate = item?.date || item?.attendance_date
          return rawDate ? String(rawDate).split('T')[0] : '-'
        },
      },
      { key: 'status', header: 'Status' },
      { key: 'remarks', header: 'Remarks' },
    ]),
    [],
  )

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Student Attendance</h2>
          </div>
        </div>

        <form
          className="role-management-form"
          onSubmit={handleApplyFilter}
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 0 }}
        >
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '170px' }}>
            <label htmlFor="student-attendance-section-id" className="role-management-label">Section Id</label>
            <input
              id="student-attendance-section-id"
              name="section_id"
              type="number"
              min="1"
              className="role-management-input"
              value={filters.section_id}
              onChange={handleFilterChange}
              placeholder="Section Id"
            />
          </div>
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="student-attendance-date-from" className="role-management-label">From Date</label>
            <input id="student-attendance-date-from" name="date_from" type="date" className="role-management-input" value={filters.date_from} onChange={handleFilterChange} />
          </div>
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="student-attendance-date-to" className="role-management-label">To Date</label>
            <input id="student-attendance-date-to" name="date_to" type="date" className="role-management-input" value={filters.date_to} onChange={handleFilterChange} />
          </div>
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '170px' }}>
            <label htmlFor="student-attendance-student-id" className="role-management-label">Student Id</label>
            <input
              id="student-attendance-student-id"
              name="student_id"
              type="number"
              min="1"
              className="role-management-input"
              value={filters.student_id}
              onChange={handleFilterChange}
              placeholder="Student Id"
            />
          </div>
          <div className="role-management-form-actions" style={{ marginTop: 0 }}>
            <button type="submit" className="role-management-create-btn" disabled={isLoading}>
              {isLoading ? 'Filtering...' : 'Get Details'}
            </button>
          </div>
        </form>

        <div
          className="role-management-form"
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 0 }}
        >
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="student-attendance-date" className="role-management-label">Attendance Date</label>
            <input
              id="student-attendance-date"
              type="date"
              className="role-management-input"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </div>
          <div className="role-management-form-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="role-management-cancel-btn"
              onClick={handleLoadStudents}
              disabled={isLoadingStudents}
            >
              {isLoadingStudents ? 'Loading...' : 'Load Students'}
            </button>
            <button
              type="button"
              className="role-management-create-btn"
              onClick={handleMarkAttendance}
              disabled={!hasSelectedStudents || isSubmittingAttendance || isLoadingStudents}
            >
              {isSubmittingAttendance ? 'Saving...' : 'Mark Attendance'}
            </button>
          </div>
        </div>

        {submitError && <p className="role-management-field-error">{submitError}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {isLoadingStudents && <p className="role-management-info">Loading students...</p>}
        {!isLoadingStudents && studentsData.length === 0 && (
          <p className="role-management-info">No students found for the selected section.</p>
        )}

        {!isLoadingStudents && displayedStudents.length > 0 && (
          <CustomTable
            columns={markAttendanceColumns}
            data={displayedStudents}
            rowKey={(student, index) => student?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No students found for the selected section."
          />
        )}

        {isLoading && <p className="role-management-info">Loading student attendance...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && attendanceData.length === 0 && (
          <p className="role-management-info">No student attendance available for selected filters.</p>
        )}

        {!isLoading && !error && attendanceData.length > 0 && (
          <CustomTable
            columns={columns}
            data={attendanceData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No student attendance available for selected filters."
          />
        )}

        {!isLoading && !error && (
          <p className="role-management-info">
            Page {attendanceMeta.page} of {attendanceMeta.total_pages} | Total: {attendanceMeta.total}
          </p>
        )}
      </div>
    </section>
  )
}

export default StudentAttendancePage
