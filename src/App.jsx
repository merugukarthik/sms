import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import SideNav from './components/SideNav'
import FloatingChat from './components/FloatingChat'
import AcademicsPage from './pages/AcademicsPage'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ModulePage from './pages/ModulePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import OtpPage from './pages/OtpPage'
import ProfilePage from './pages/ProfilePage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import SchoolManagementPage from './pages/SchoolManagementPage'
import ServicesPage from './pages/ServicesPage'
import TermsPage from './pages/TermsPage'
import { clearOtpPending, logout, selectRole } from './store/authSlice'
import RoleManagementPage from './pages/RoleManagementPage'
import StaffPage from './pages/StaffPage'
import StaffAttendancePage from './pages/StaffAttendancePage'
import StudentPage from './pages/StudentPage'
import StudentAttendancePage from './pages/StudentAttendancePage'
import TransportRoutesPage from './pages/TransportRoutesPage'
import TransportVehiclesPage from './pages/TransportVehiclesPage'
import TransportAttendancePage from './pages/TransportAttendancePage'
import FeesPage from './pages/FeesPage'
import OrganizationManagementPage from './pages/OrganizationManagementPage'
import UserManagementPage from './pages/UserManagementPage'

function AppLayout({ isSideNavOpen, onToggleSideNav, onCloseSideNav, onLogout }) {
  return (
    <div className="app-layout">
      <SideNav isOpen={isSideNavOpen} onToggle={onToggleSideNav} onNavigate={onCloseSideNav} onLogout={onLogout} />
      <div className="app-main">
        <Header onLogout={onLogout} />
        <main className="content">
          <Outlet />
        </main>
        {/* <FloatingChat /> */}
      </div>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isSideNavOpen, setIsSideNavOpen] = useState(() => window.innerWidth > 768)
  const { isAuthenticated, isOtpPending, selectedRole } = useSelector((state) => state.auth)

  useEffect(() => {
    const handleResize = () => {
      setIsSideNavOpen(window.innerWidth > 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleToggleSideNav = () => {
    setIsSideNavOpen((prev) => !prev)
  }

  const handleCloseSideNav = () => {
    if (window.innerWidth <= 768) {
      setIsSideNavOpen(false)
    }
  }

  const handleSelectRole = (role) => {
    dispatch(selectRole(role))
    navigate('/login')
  }

  const handleVerifyOtp = () => {
    setIsSideNavOpen(true)
    navigate('/app/home', { replace: true })
  }

  const handleBackToLogin = () => {
    dispatch(clearOtpPending())
    navigate('/login')
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/', { replace: true })
  }

  return (
    <Routes>
      <Route path="/" element={<RoleSelectionPage onSelectRole={handleSelectRole} />} />
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/app/home" replace />
            : <LoginPage selectedRole={selectedRole} />
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/otp"
        element={
          isAuthenticated
            ? <Navigate to="/app/home" replace />
            : (
              isOtpPending
                ? <OtpPage selectedRole={selectedRole} onVerifyOtp={handleVerifyOtp} onBack={handleBackToLogin} />
                : <Navigate to="/login" replace />
            )
        }
      />
      <Route
        path="/app"
        element={
          //  isAuthenticated 
          //commented for otp api not integrated
          true
            ? (
              <AppLayout
                isSideNavOpen={isSideNavOpen}
                onToggleSideNav={handleToggleSideNav}
                onCloseSideNav={handleCloseSideNav}
                onLogout={handleLogout}
              />
            )
            : <Navigate to="/" replace />
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/view-details" element={<StaffPage />} />
        <Route path="staff/list-staff" element={<StaffPage />} />
        <Route path="staff/attendance" element={<StaffAttendancePage />} />
        <Route path="staff/list-attendance" element={<StaffAttendancePage />} />
        <Route path="students" element={<StudentPage />} />
        <Route path="students/view-details" element={<StudentPage />} />
        <Route path="students/list-students" element={<StudentPage />} />
        <Route path="students/attendance" element={<StudentAttendancePage />} />
        <Route path="students/list-attendance" element={<StudentAttendancePage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="fees/structure" element={<FeesPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="users/:featureName" element={<UserManagementPage />} />
        <Route path="organization-management" element={<OrganizationManagementPage />} />
        <Route path="school-management" element={<SchoolManagementPage />} />
        <Route path="usermanagement" element={<UserManagementPage />} />
        <Route path="usermanagement/:featureName" element={<UserManagementPage />} />
        <Route path="user-management" element={<UserManagementPage />} />
        <Route path="user-management/:featureName" element={<UserManagementPage />} />
        <Route path="transport/routes" element={<TransportRoutesPage />} />
        <Route path="transport/list-routes" element={<TransportRoutesPage />} />
        <Route path="transport/transport-routes" element={<TransportRoutesPage />} />
        <Route path="transport/vehicles" element={<TransportVehiclesPage />} />
        <Route path="transport/list-vehicles" element={<TransportVehiclesPage />} />
        <Route path="transport/transport-vehicles" element={<TransportVehiclesPage />} />
        <Route path="transport/attendance" element={<TransportAttendancePage />} />
        <Route path="transport/list-attendance" element={<TransportAttendancePage />} />
        <Route path="transport/transport-attendance" element={<TransportAttendancePage />} />
        <Route path="roles" element={<RoleManagementPage />} />
        <Route path="dashboard" element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="terms-and-conditions" element={<TermsPage />} />
        <Route path=":moduleName/:featureName" element={<ModulePage />} />
        <Route path=":moduleName" element={<ModulePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
