import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import schoolImage from '../assets/school.svg'
import schoolBackground from '../assets/schoolbg.jpg'
import CustomPopup from '../components/CustomPopup'
import FloatingChat from '../components/FloatingChat'
import { clearAuthError, loginUser } from '../store/authSlice'

function LoginPage({ selectedRole }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loginStatus, error } = useSelector((state) => state.auth)
  const [username, setUserName] = useState('')
  const [isEmailTouched, setIsEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isOtpPopupOpen, setIsOtpPopupOpen] = useState(false)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = emailRegex.test(username.trim())
  const showEmailError = isEmailTouched && username.trim() !== '' && !isEmailValid
  const isLoginDisabled = !selectedRole || loginStatus === 'loading' || isOtpPopupOpen

  useEffect(() => () => {
    dispatch(clearAuthError())
  }, [dispatch])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (loginStatus === 'loading' || isOtpPopupOpen) {
      return
    }

    setIsEmailTouched(true)

    // if (!isEmailValid) {
    //   return
    // }

    try {
      await dispatch(loginUser({
        username,
        password,
        //role: selectedRole?.id ?? selectedRole?.name,
      })).unwrap()
      setIsOtpPopupOpen(true)
    } catch {
      // Error message is already stored in Redux state.
    }
  }

  const handleOtpPopupClose = () => {
    setIsOtpPopupOpen(false)
    navigate('/otp', { replace: true })
  }

  return (
    <section
      className="public-page login-page"
      style={{ backgroundImage: `url(${schoolBackground})` }}
    >
      
       
      
        <div className="bg-yellow-100 p-1 rounded-2xl">
          <div className="login-section">
            <div className='text-center'>
              <h2 className='text-3xl font-medium'>Login</h2>
              <p className='text-gray-500'>
                {selectedRole
                  ? `Sign in as ${selectedRole.name}.`
                  : 'Please choose a role first and then sign in.'}
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-label" htmlFor="username">User Name</label>
              <input
                id="username"
                name="username"
              //  type="email"
                className="login-input"
                placeholder="Enter User name"
                value={username}
                onChange={(event) => setUserName(event.target.value)}
                //onBlur={() => setIsEmailTouched(true)}
                disabled={isOtpPopupOpen}
                required
              />
              {/* {showEmailError && (
                <p className="login-error-text">Please enter a valid email address.</p>
              )} */}

              <label className="login-label" htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isOtpPopupOpen}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isOtpPopupOpen}
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

              {error && <p className="login-error-text">{error}</p>}

              <Link to="/forgot-password" className="login-forgot-link">
                Forgot password?
              </Link>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoginDisabled}
              >
                {loginStatus === 'loading' ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>

        </div>
     
      <CustomPopup
        isOpen={isOtpPopupOpen}
        title="OTP Sent"
        message="OTP sent to your email address."
        confirmText="Continue"
        onConfirm={handleOtpPopupClose}
        titleId="otp-popup-title"
      />
      {/* <FloatingChat /> */}
    </section>
  )
}

export default LoginPage
