import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TransportAssignmentsPage from './TransportAssignmentsPage'
import TransportRoutesPage from './TransportRoutesPage'
import TransportVehiclesPage from './TransportVehiclesPage'

const TRANSPORT_TABS = [
  { key: 'vehicles', label: 'Vehicles', path: '/app/transport/vehicles' },
  { key: 'routes', label: 'Routes', path: '/app/transport/routes' },
  { key: 'assignments', label: 'Assignments', path: '/app/transport/assignments' },
]

function TransportPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = useMemo(() => {
    if (location.pathname.includes('/transport/vehicles')) return 'vehicles'
    if (location.pathname.includes('/transport/assignments')) return 'assignments'
    return 'routes'
  }, [location.pathname])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-tabs">
          {TRANSPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`role-management-tab-btn ${activeTab === tab.key ? 'role-management-tab-btn-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'vehicles' && <TransportVehiclesPage />}
        {activeTab === 'routes' && <TransportRoutesPage />}
        {activeTab === 'assignments' && <TransportAssignmentsPage />}
      </div>
    </section>
  )
}

export default TransportPage
