import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { EditActionIcon } from '../components/ActionIcons'

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} item(s)` : '0 item(s)'
  if (typeof value === 'object') return 'Object'
  return String(value)
}

function ProfilePage() {
  const auth = useSelector((state) => state.auth)
  const user = auth?.user || null
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftMobile, setDraftMobile] = useState('')
  const [profileView, setProfileView] = useState({ name: '', mobile: '' })

  const profileData = useMemo(() => {
    const sourceUser = user && typeof user === 'object' ? user : {}
    const userData = sourceUser?.user && typeof sourceUser.user === 'object' ? sourceUser.user : sourceUser

    const roleValue = Array.isArray(userData?.role)
      ? userData.role.map((item) => item?.name || item?.display_name || item).filter(Boolean).join(', ')
      : userData?.role?.name || userData?.role?.display_name || userData?.role || auth?.selectedRole
    const mobileValue = userData?.mobile || userData?.phone || userData?.mobile_number || userData?.phone_number
    const nameValue = userData?.full_name || userData?.name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()

    return {
      name: nameValue,
      role: roleValue,
      mobile: mobileValue,
    }
  }, [auth?.selectedRole, user])

  useEffect(() => {
    setDraftName(profileData.name || '')
    setDraftMobile(profileData.mobile || '')
    setProfileView({
      name: profileData.name || '',
      mobile: profileData.mobile || '',
    })
  }, [profileData.name, profileData.mobile])

  const displayInitial = String(isEditing ? draftName : profileView.name || '')
    .trim()
    .charAt(0)
    .toUpperCase() || 'U'

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <h2 className="role-management-title">Profile</h2>
          {/* <p className="role-management-subtitle">User details</p> */}
        </div>

        {!user && (
          <p className="role-management-info">No details available.</p>
        )}

        {user && (
          <>
            <div
              className="role-management-details"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.9rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {displayInitial}
                </div>
                <div>
                  <p className="role-management-detail-label">Name</p>
                  <p className="role-management-detail-value" style={{ fontSize: '1rem' }}>
                    {formatValue(isEditing ? draftName : profileView.name)}
                  </p>
                </div>
              </div>
              <div className="role-management-table-actions">
                {!isEditing && (
                  <button
                    type="button"
                    className="role-management-action-btn role-management-action-btn-edit"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit profile"
                    title="Edit"
                  >
                    <EditActionIcon />
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                    type="button"
                    className="role-management-action-btn role-management-action-btn-edit"
                    onClick={() => {
                      setProfileView({
                        name: draftName,
                        mobile: draftMobile,
                      })
                      setIsEditing(false)
                    }}
                  >
                    Save
                  </button>
                    <button
                      type="button"
                      className="role-management-action-btn"
                      onClick={() => {
                        setDraftName(profileData.name || '')
                        setDraftMobile(profileData.mobile || '')
                        setIsEditing(false)
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className="role-management-details"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}
            >
              <div>
                <p className="role-management-detail-label">Role</p>
                <p className="role-management-detail-value" style={{ fontSize: '0.98rem' }}>
                  {formatValue(profileData.role)}
                </p>
              </div>
              <div>
                <p className="role-management-detail-label">Mobile Number</p>
                {!isEditing && (
                  <p className="role-management-detail-value" style={{ fontSize: '0.98rem' }}>
                    {formatValue(profileView.mobile)}
                  </p>
                )}
                {isEditing && (
                  <input
                    type="text"
                    className="role-management-input"
                    value={draftMobile}
                    onChange={(event) => setDraftMobile(event.target.value)}
                    placeholder="Enter mobile number"
                  />
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  )
}

export default ProfilePage
