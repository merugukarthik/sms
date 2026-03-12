import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CustomTable from '../components/CustomTable'
import { fetchStaffAttendance } from '../store/staffSlice'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const formatDate = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

const today = formatDate(new Date())
const startOfYear = today ? `${today.slice(0, 4)}-01-01` : ''

const resolveStaffName = (item) => {
  const directName = String(item?.staff_name || '').trim()
  if (directName) return directName

  const firstName = String(item?.first_name || '').trim()
  const lastName = String(item?.last_name || '').trim()
  const joinedName = `${firstName} ${lastName}`.trim()
  if (joinedName) return joinedName

  return '-'
}

function StaffAttendancePage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const [attendanceData, setAttendanceData] = useState([])
  const [attendanceMeta, setAttendanceMeta] = useState({
    total: 0,
    page: 1,
    page_size: 50,
    total_pages: 0,
  })
  const [filters, setFilters] = useState({
    date_from: startOfYear,
    date_to: today,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const getAttendance = async (payloadFilters = filters) => {
    if (!user?.access_token) return
    if (!payloadFilters?.date_from || !payloadFilters?.date_to) {
      setError('From date and To date are required.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(
        fetchStaffAttendance({
          access_token: user.access_token,
          date_from: payloadFilters.date_from,
          date_to: payloadFilters.date_to,
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
      setError(typeof err === 'string' ? err : 'Failed to fetch staff attendance.')
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

  useEffect(() => {
    getAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleApplyFilter = (event) => {
    event.preventDefault()
    getAttendance(filters)
  }

  const columns = useMemo(
    () => ([
      { key: 'id', header: 'Attendance Id' },
      { key: 'staff_id', header: 'Staff Id' },
      {
        key: 'staff_name',
        header: 'Staff Name',
        render: (item) => resolveStaffName(item),
      },
      {
        key: 'date',
        header: 'Date',
        render: (item) => {
          const rawDate = item?.date || item?.attendance_date
          return rawDate ? String(rawDate).split('T')[0] : '-'
        },
      },
      { key: 'status', header: 'Status' },
      // { key: 'check_in', header: 'Check In' },
      // { key: 'check_out', header: 'Check Out' },
      { key: 'remarks', header: 'Remarks' },
    ]),
    [],
  )

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Staff Attendance</h2>
          </div>
        </div>

        <form
          className="role-management-form"
          onSubmit={handleApplyFilter}
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="staff-attendance-date-from" className="role-management-label">From</label>
            <input id="staff-attendance-date-from" name="date_from" type="date" className="role-management-input" value={filters.date_from} onChange={handleFilterChange} required />
          </div>
          <div className="role-management-field" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label htmlFor="staff-attendance-date-to" className="role-management-label">To</label>
            <input id="staff-attendance-date-to" name="date_to" type="date" className="role-management-input" value={filters.date_to} onChange={handleFilterChange} required />
          </div>
          <div className="role-management-form-actions" style={{ marginTop: 0 }}>
            <button type="submit" className="role-management-create-btn" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </form>

        {isLoading && <p className="role-management-info">Loading staff attendance...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && attendanceData.length === 0 && (
          <p className="role-management-info">No staff attendance available for selected dates.</p>
        )}

        {!isLoading && !error && attendanceData.length > 0 && (
          <CustomTable
            columns={columns}
            data={attendanceData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No staff attendance available for selected dates."
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

export default StaffAttendancePage
