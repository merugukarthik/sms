import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchDashboardStats } from '../store/dashboardSlice'

const statsConfig = [
  { key: 'total_students', label: 'Total Students' },
  { key: 'total_staff', label: 'Total Staff' },
  { key: 'total_users', label: 'Total Users' },
  { key: 'today_student_attendance_percentage', label: 'Today Student Attendance %', isPercent: true },
  { key: 'today_staff_attendance_percentage', label: 'Today Staff Attendance %', isPercent: true },
  { key: 'total_vehicles', label: 'Total Vehicles' },
  { key: 'total_routes', label: 'Total Routes' },
  { key: 'active_students', label: 'Active Students' },
  { key: 'active_staff', label: 'Active Staff' },
]

function HomePage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [stats, setStats] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const cards = useMemo(() => (
    statsConfig.map((item) => {
      const rawValue = stats?.[item.key]
      const value = rawValue ?? 0
      return {
        ...item,
        value: item.isPercent ? `${value}%` : value,
      }
    })
  ), [stats])

  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!user?.access_token) return

      setIsLoading(true)
      setError('')
      try {
        const response = await dispatch(fetchDashboardStats({ access_token: user.access_token })).unwrap()
        setStats(response || {})
      } catch (err) {
        setError(typeof err === 'string' ? err : 'Failed to fetch dashboard stats.')
        setStats({})
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardStats()
  }, [dispatch, user?.access_token])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">Dashboard</h2>
          </div>
        </div>

        {isLoading && <p className="role-management-info">Loading dashboard stats...</p>}
        {error && <p className="role-management-error">{error}</p>}

        {!isLoading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {cards.map((card) => (
              <div
                key={card.key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                }}
              >
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>{card.label}</p>
                <p style={{ margin: '8px 0 0 0', color: '#111827', fontSize: '28px', fontWeight: 700 }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default HomePage
