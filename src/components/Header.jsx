import { useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { selectLoginData } from '../store/authSlice'
import CustomPopup from './CustomPopup'
import useOutsideClick from './useOutsideClick'

function Header({ onLogout }) {

 const auth = useSelector((state) => state.auth.user.user)
  console.log('selectedData:- ',auth)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

  const notifications = [
    { id: 1, title: 'New admission request received', time: '2 min ago' },
    { id: 2, title: 'Fee payment confirmed for Class 8', time: '15 min ago' },
    { id: 3, title: 'Tomorrow exam schedule published', time: '1 hour ago' },
  ]
  const closePopup = useRef()
  // useOutsideClick(closePopup, () => {setIsNotificationMenuOpen(false),setIsProfileMenuOpen(false)})
  const handleToggleProfileMenu = () => {
    setIsNotificationMenuOpen(false)
    setIsProfileMenuOpen((prev) => !prev)
  }

  const handleToggleNotificationMenu = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationMenuOpen((prev) => !prev)
  }

  const handleOpenLogoutConfirm = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsLogoutConfirmOpen(true)
  }

  const handleCancelLogout = () => {
    setIsLogoutConfirmOpen(false)
  }

  const handleLogout = () => {
    setIsLogoutConfirmOpen(false)
    onLogout()
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">School Managment System</h1>
        </div>

        <div className="header-actions">
          <div className="notification-menu">
            <button
              ref={closePopup}
              type="button"
              className="notification-btn"
              aria-label="View notifications"
              aria-haspopup="menu"
              aria-expanded={isNotificationMenuOpen}
              onClick={handleToggleNotificationMenu}
            >
              <svg
                className="notification-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 3C8.96 3 6.5 5.46 6.5 8.5V11.21C6.5 11.78 6.28 12.33 5.88 12.73L4.77 13.84C4.14 14.47 4.59 15.55 5.48 15.55H18.52C19.41 15.55 19.86 14.47 19.23 13.84L18.12 12.73C17.72 12.33 17.5 11.78 17.5 11.21V8.5C17.5 5.46 15.04 3 12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9.75 17.25C10.15 18.11 11.01 18.7 12 18.7C12.99 18.7 13.85 18.11 14.25 17.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="notification-badge" aria-hidden="true" />
            </button>
            {isNotificationMenuOpen && (
              <div className="notification-dropdown" role="menu">
                <h3 className="notification-title">Notifications</h3>
                <ul className="notification-list">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="notification-item">
                      <p className="notification-text">{notification.title}</p>
                      <span className="notification-time">{notification.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p>{auth?.full_name}</p>

          <div className="profile-menu">
            <button
              ref={closePopup}
              type="button"
              className="profile-icon-btn"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              aria-label="Open profile menu"
              onClick={handleToggleProfileMenu}
            >
              <span aria-hidden="true">👤</span>
            </button>
            {isProfileMenuOpen && (
              <div className="profile-dropdown" role="menu">
                <NavLink
                  to="/app/profile"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Profile
                </NavLink>
                <button
                  type="button"
                  className="profile-menu-item profile-logout-item"
                  role="menuitem"
                  onClick={handleOpenLogoutConfirm}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CustomPopup
        isOpen={isLogoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        showCancel
        cancelText="Cancel"
        onCancel={handleCancelLogout}
        confirmText="Logout"
        isDanger
        onConfirm={handleLogout}
        titleId="logout-confirm-title"
      />
    </>
  )
}

export default Header
