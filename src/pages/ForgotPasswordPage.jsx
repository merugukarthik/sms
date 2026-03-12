import { useState } from 'react'
import { Link } from 'react-router-dom'
import schoolImage from '../assets/school.svg'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsSubmitted(true)
  }

  return (

    <section className="public-page">
      <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-2">
        <div className="w-100 flex justify-center items-center p-4">
          <div>
            <img
              src={schoolImage}
              alt="School building"
              className="login-school-image"
            />
          </div>
        </div>

        <div className="bg-yellow-100 p-1 rounded-2xl">

          <div className="login-section">
            <h2>Forgot Password</h2>
            <p>Enter your email to receive a reset link.</p>

            {isSubmitted ? (
              <div className="forgot-success">
                <p>If an account exists for {email}, a reset link has been sent.</p>
                <Link to="/login" className="login-submit-btn">
                  Back to Login
                </Link>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit}>
                <label className="login-label" htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  name="reset-email"
                  type="email"
                  className="login-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <div className="forgot-actions">
                  <button type="submit" className="login-submit-btn">
                    Send Reset Link
                  </button>
                  <Link to="/login" className="otp-back-btn forgot-back-link">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>

    </section>

  )
}

export default ForgotPasswordPage
