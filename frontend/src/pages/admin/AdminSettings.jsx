import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import { adminAPI } from '../../api'
import { Settings, Save, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const [settingsForm, setSettingsForm] = useState(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: 'password123', phone: '', role: 'patient' })
  const [showUserForm, setShowUserForm] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminAPI.getSettings(),
    onSuccess: (res) => {
      if (!settingsForm) setSettingsForm(res.data)
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminAPI.listUsers(),
  })

  // Initialize form when data loads
  if (settings?.data && !settingsForm) {
    setSettingsForm(settings.data)
  }

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => adminAPI.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings saved!')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Failed to save settings.'),
  })

  const createUserMutation = useMutation({
    mutationFn: (data) => adminAPI.createUser(data),
    onSuccess: () => {
      toast.success('User created!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowUserForm(false)
      setUserForm({ name: '', email: '', password: 'password123', phone: '', role: 'patient' })
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(msg => toast.error(msg))
      else toast.error('Failed to create user.')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => adminAPI.toggleUserActive(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const userList = users?.data?.data || []

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header-subtitle">Clinic configuration and user management</p>
        </div>
      </div>

      <div className="page-content">
        <div className="grid-2">
          {/* Clinic Settings */}
          <div className="card">
            <div className="card-header">
              <h2><Settings size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Clinic Settings</h2>
            </div>
            <div className="card-body">
              {settingsForm && (
                <>
                  <div className="form-group">
                    <label className="form-label">Clinic Name</label>
                    <input className="form-input" value={settingsForm.clinic_name || ''} onChange={e => setSettingsForm(f => ({ ...f, clinic_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No-Show Grace Period (minutes)</label>
                    <input className="form-input" type="number" value={settingsForm.no_show_grace_minutes || ''} onChange={e => setSettingsForm(f => ({ ...f, no_show_grace_minutes: e.target.value }))} />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Clinic Start Time</label>
                      <input className="form-input" type="time" value={settingsForm.clinic_start_time || ''} onChange={e => setSettingsForm(f => ({ ...f, clinic_start_time: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Clinic End Time</label>
                      <input className="form-input" type="time" value={settingsForm.clinic_end_time || ''} onChange={e => setSettingsForm(f => ({ ...f, clinic_end_time: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => updateSettingsMutation.mutate(settingsForm)} disabled={updateSettingsMutation.isPending}>
                    <Save size={16} />
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Create User */}
          <div className="card">
            <div className="card-header">
              <h2><UserPlus size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Create User</h2>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input form-select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => createUserMutation.mutate(userForm)} disabled={createUserMutation.isPending}>
                <UserPlus size={16} />
                Create User
              </button>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h2>All Users</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{
                          background: u.role === 'admin' ? 'var(--danger-bg)' : u.role === 'doctor' ? 'var(--primary-bg)' : 'var(--secondary-bg)',
                          color: u.role === 'admin' ? 'var(--danger)' : u.role === 'doctor' ? 'var(--primary)' : 'var(--secondary)',
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.is_active ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>Active</span>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>Inactive</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleMutation.mutate(u.id)}>
                          {u.is_active ? <ToggleRight size={18} color="var(--primary)" /> : <ToggleLeft size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
