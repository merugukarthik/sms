import { memo } from 'react'

const roles = [
  { id: 1, name: 'Admin', icon: '👑' },
  { id: 2, name: 'Principal', icon: '🏫' },
  { id: 3, name: 'Teacher', icon: '🧑‍🏫' },
  { id: 4, name: 'Student', icon: '🎓' },
  { id: 5, name: 'Librarian', icon: '📚' },
  { id: 6, name: 'Accountant', icon: '🧾' },
  { id: 7, name: 'Transport Manager', icon: '🚌' },
]

const RoleCard = memo(function RoleCard({ role, onSelectRole }) {
  return (
    <button
      type="button"
      className="role-card"
      onClick={() => onSelectRole(role)}
    >
      <span className="role-icon" aria-hidden="true">{role.icon}</span>
      <span className="role-name">{role.name}</span>
    </button>
  )
})

function RoleSelectionPage({ onSelectRole }) {
  return (
    <section className="public-page">
      <h1 className="greeting-title">Welcome to School Managment System</h1>
      <div className="role-card-wrap">
        <h1 className="role-title">Select Your Role</h1>
        <p className="role-subtitle">Choose a role to continue to login.</p>
        <div className="role-grid">
          {roles.map((role) => (
            <RoleCard
              key={role.name}
              role={role}
              onSelectRole={onSelectRole}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default RoleSelectionPage
