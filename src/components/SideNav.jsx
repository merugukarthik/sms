import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import CustomPopup from './CustomPopup'
import { useSelector } from 'react-redux'

const MODULE_ROUTE_MAP = {
  user_mgmt: '/app/users',
  role_mgmt: '/app/roles',
  school_mgmt: '/app/school-management',
  org_mgmt: '/app/organization-management',
  student_mgmt: '/app/students',
  teacher_mgmt: '/app/staff',
  class_mgmt: '/app/academics',
  transport_mgmt: '/app/transport/routes',
  reports: '/app/reports',
  designation_mgmt: '/app/designations',
  department_mgmt: '/app/departments',
}

const getModuleIcon = (moduleItem) => {
  const moduleCode = moduleItem?.module_code || moduleItem?.code || ''
  const moduleName = String(moduleItem?.module_name || moduleItem?.name || '').toLowerCase()

  if (moduleCode === 'user_mgmt' || moduleName.includes('user')) return 'users'
  if (moduleCode === 'role_mgmt' || moduleName.includes('role')) return 'roles'
  if (moduleCode === 'school_mgmt' || moduleName.includes('school')) return 'school'
  if (moduleCode === 'org_mgmt' || moduleName.includes('organization')) return 'organization'
  if (moduleCode === 'student_mgmt' || moduleName.includes('student')) return 'students'
  if (moduleCode === 'teacher_mgmt' || moduleName.includes('teacher') || moduleName.includes('staff')) return 'staff'
  if (moduleName.includes('designation')) return 'designation'
  if (moduleName.includes('department')) return 'designation'
  if (moduleName.includes('finance') || moduleName.includes('fee')) return 'finance'
  if (moduleName.includes('transport')) return 'transport'
  if (moduleCode === 'class_mgmt' || moduleName.includes('class') || moduleName.includes('academic')) return 'academics'
  if (moduleCode === 'reports' || moduleName.includes('report')) return 'reports'

  return 'services'
}

const toSlug = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getModulePath = (moduleItem) => {
  const moduleCode = moduleItem?.module_code || moduleItem?.code || ''
  const rawPath = moduleItem?.module_name || moduleItem?.display_name || moduleItem?.name || ''

  if (MODULE_ROUTE_MAP[moduleCode]) {
    return MODULE_ROUTE_MAP[moduleCode]
  }

  if (typeof rawPath !== 'string') {
    return '/app/home'
  }

  const trimmedPath = rawPath.trim()
  if (!trimmedPath) {
    return '/app/home'
  }

  const normalizedPath = toSlug(trimmedPath)
  if (normalizedPath === 'dashboard') {
    return '/app/home'
  }

  if (normalizedPath === 'designation' || normalizedPath === 'designations') {
    return '/app/designations'
  }

  if (normalizedPath === 'department' || normalizedPath === 'departments') {
    return '/app/departments'
  }

  if (normalizedPath === 'transport') {
    return '/app/transport/routes'
  }

  return `/app/${normalizedPath}`
}

function NavIcon({ type }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.8V20h13V9.8" />
      </svg>
    )
  }

  if (type === 'about') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6" />
        <circle cx="12" cy="7.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (type === 'services') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h14" />
      </svg>
    )
  }

  if (type === 'terms') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    )
  }

  if (type === 'users') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M16 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" />
        <circle cx="9.5" cy="7" r="3.25" />
        <path d="M17 11a3 3 0 0 1 0 6" />
        <path d="M21 21v-1a3.5 3.5 0 0 0-3-3.46" />
      </svg>
    )
  }

  if (type === 'roles') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l7 4v5c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V7l7-4Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.4" />
      </svg>
    )
  }

  if (type === 'school') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 10.5 12 5l9 5.5-9 5.5-9-5.5Z" />
        <path d="M6 12.5V18h12v-5.5" />
        <path d="M10 18v-3h4v3" />
      </svg>
    )
  }

  if (type === 'organization') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-3 7 3v14" />
        <path d="M9 10h.01M9 13h.01M9 16h.01M15 10h.01M15 13h.01M15 16h.01" />
      </svg>
    )
  }

  if (type === 'students') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
        <path d="M7 11.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
      </svg>
    )
  }

  if (type === 'staff') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M18.5 10.5 21 13l-2.5 2.5" />
      </svg>
    )
  }

  if (type === 'academics') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 6.5h10a3 3 0 0 1 3 3V20H7a3 3 0 0 0-3 3V6.5Z" />
        <path d="M17 20h3V4H8" />
      </svg>
    )
  }

  if (type === 'reports') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 20V10" />
        <path d="M12 20V4" />
        <path d="M19 20v-7" />
      </svg>
    )
  }

  if (type === 'transport') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 17h12" />
        <path d="M7 17V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8" />
        <path d="M9 7V5h6v2" />
        <circle cx="9" cy="18.5" r="1.5" />
        <circle cx="15" cy="18.5" r="1.5" />
      </svg>
    )
  }

  if (type === 'finance') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v10" />
        <path d="M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1 1.7 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2" />
      </svg>
    )
  }

  if (type === 'designation') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3 5 7v5c0 4.2 2.5 7.6 7 9 4.5-1.4 7-4.8 7-9V7l-7-4Z" />
        <path d="M9 12h6" />
        <path d="M10 15h4" />
      </svg>
    )
  }

  if (type === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 6 3 12l6 6" />
      <path d="M3 12h12a6 6 0 0 0 0-12h-1" />
    </svg>
  )
}

function SideNav({ isOpen, onToggle, onNavigate, onLogout }) {
  const location = useLocation()
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const authUser = useSelector((state) => state.auth.user)
  const currentUser = authUser?.user ?? authUser
  const modules = Array.isArray(currentUser?.permissions) ? currentUser.permissions : []

  const navItems = useMemo(() => {
    const orderedModules = [...modules].sort((first, second) => {
      const firstOrder = Number.isFinite(first?.sort_order) ? first.sort_order : Number.MAX_SAFE_INTEGER
      const secondOrder = Number.isFinite(second?.sort_order) ? second.sort_order : Number.MAX_SAFE_INTEGER

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder
      }

      return String(first?.module_name || '').localeCompare(String(second?.module_name || ''))
    })

    const moduleItems = orderedModules.map((moduleItem, index) => {
      const modulePath = getModulePath(moduleItem)
      return {
        key: `${modulePath}-module-${moduleItem?.module_id ?? moduleItem?.id ?? index}`,
        label: moduleItem?.module_name || moduleItem?.display_name || moduleItem?.name || `Module ${index + 1}`,
        path: modulePath,
        icon: moduleItem?.icon || getModuleIcon(moduleItem),
      }
    })

    return [
      {
        key: 'dashboard-home',
        label: 'Dashboard',
        path: '/app/home',
        icon: 'home',
      },
      ...moduleItems,
    ]
  }, [modules])

  const sidebarClassName = `sidebar ${isOpen ? 'sidebar-open' : 'sidebar-collapsed'}`

  const handleOpenLogoutConfirm = () => {
    setIsLogoutConfirmOpen(true)
  }

  const handleCancelLogout = () => {
    setIsLogoutConfirmOpen(false)
  }

  const handleConfirmLogout = () => {
    setIsLogoutConfirmOpen(false)
    onNavigate()
    onLogout()
  }

  return (
    <>
      <aside className={sidebarClassName}>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse side navigation' : 'Expand side navigation'}
        >
          <span aria-hidden="true">{isOpen ? '\u2039' : '\u203A'}</span>
        </button>

        <div className="sidebar-brand">
          {/* <span className="sidebar-brand-mark" aria-hidden="true">S</span> */}
          <span className="sidebar-brand-text">SMS Portal</span>
        </div>

        <nav>
          <ul className="sidebar-list">
            {navItems.map((item) => (
              <li key={item.key} className="sidebar-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive || location.pathname.startsWith(`${item.path}/`) ? 'sidebar-link-active' : ''}`}
                  onClick={onNavigate}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="sidebar-link-icon">
                    <NavIcon type={item.icon} />
                  </span>
                  <span className="sidebar-link-text">{item.label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="sidebar-link sidebar-link-btn"
                onClick={handleOpenLogoutConfirm}
                title={!isOpen ? 'Logout' : undefined}
              >
                <span className="sidebar-link-icon">
                  <NavIcon type="logout" />
                </span>
                <span className="sidebar-link-text">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <CustomPopup
        isOpen={isLogoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        showCancel
        cancelText="Cancel"
        onCancel={handleCancelLogout}
        confirmText="Logout"
        isDanger
        onConfirm={handleConfirmLogout}
        titleId="sidenav-logout-confirm-title"
      />
    </>
  )
}

export default SideNav
