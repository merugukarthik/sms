import { useState } from 'react'
import schoolBackground from '../assets/schoolbg.jpg'
import { useDispatch, useSelector } from 'react-redux'
import { clearOtpError, verifyOtp, selectLoginData } from '../store/authSlice'
import CustomPopup from '../components/CustomPopup'



function OtpPage({ selectedRole, onVerifyOtp, onBack }) {
  const dispatch = useDispatch()
  const { otpStatus, otpError,user } = useSelector((state) => state.auth)
  const [otp, setOtp] = useState('')
  const [otpData, setOtpData] = useState('')
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
     onVerifyOtp()
    try {
      // const otpResp = await dispatch(verifyOtp({ otp })).unwrap()
      // console.log('otp res',otpError)
      // setOtpData(otpResp)
     
    } catch (error) {
      console.log('error otp:- ',error)
      // Error message is already stored in Redux state.
    }
  }
  const handleCancelLogout = () => {
    setIsLogoutConfirmOpen(false)
  }


  return (

    <section
      className="public-page login-page"
      style={{ backgroundImage: `url(${schoolBackground})` }}
    >
      <div className="bg-yellow-100 p-1 rounded-2xl">
        <div className="login-section">
          <h2>OTP Verification</h2>
          <p>
            {selectedRole
              ? `Enter the OTP sent for ${selectedRole.name} access.`
              : 'Enter the one-time password to continue.'}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="otp">One-Time Password</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="login-input otp-input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              required
            />

            <div className="otp-actions">
              <button type="submit" className="login-submit-btn" disabled={otp.length !== 6 || otpStatus === 'loading'}>
                {otpStatus === 'loading' ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" className="otp-back-btn" onClick={() => {
                dispatch(clearOtpError())
                onBack()
              }}>
                Back to Login
              </button>
            </div>
            {otpError &&
              <CustomPopup
                isOpen={isLogoutConfirmOpen}
                title="OTP"
                message={otpData?.message}
                showCancel
                cancelText="Cancel"
                onCancel={handleCancelLogout}
                confirmText="Ok"
                isDanger
                //  onConfirm={handleConfirmLogout}
                titleId="sidenav-logout-confirm-title"
              />
            }
            {/* {otpError && <p className="login-error-text">{otpError}</p>} */}
          </form>
        </div>
      </div>
    </section>

  )
}

export default OtpPage
