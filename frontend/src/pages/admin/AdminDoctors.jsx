import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import { doctorAPI } from '../../api'
import { Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminDoctors() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: 'password123', phone: '', specialization: '', bio: '' })
  const [slotForm, setSlotForm] = useState({ doctor_id: '', day_of_week: '1', start_time: '09:00', end_time: '13:00', max_patients: '20' })
  const [showSlotForm, setShowSlotForm] = useState(false)

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => doctorAPI.create(data),
    onSuccess: () => {
      toast.success('Doctor created!')
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setShowForm(false)
      setForm({ name: '', email: '', password: 'password123', phone: '', specialization: '', bio: '' })
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(msg => toast.error(msg))
      else toast.error(err.response?.data?.message || 'Failed to create doctor.')
    },
  })

  const createSlotMutation = useMutation({
    mutationFn: (data) => doctorAPI.createSlot(data.doctor_id, data),
    onSuccess: () => {
      toast.success('Slot created!')
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setShowSlotForm(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create slot.'),
  })

  const docList = doctors?.data || []

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Manage Doctors</h1>
          <p className="page-header-subtitle">{docList.length} doctors registered</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowSlotForm(true)}>
            Add Slot
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Doctor
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Add Doctor Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2>New Doctor</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Full Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="doctor@mediq.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-input" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Cardiology" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-input" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Doctor's qualifications and experience..." style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Doctor'}
              </button>
            </div>
          </div>
        )}

        {/* Add Slot Form */}
        {showSlotForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2>New Availability Slot</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSlotForm(false)}>Cancel</button>
            </div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Doctor</label>
                  <select className="form-input form-select" value={slotForm.doctor_id} onChange={e => setSlotForm(f => ({ ...f, doctor_id: e.target.value }))}>
                    <option value="">Select Doctor</option>
                    {docList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Day of Week</label>
                  <select className="form-input form-select" value={slotForm.day_of_week} onChange={e => setSlotForm(f => ({ ...f, day_of_week: e.target.value }))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input className="form-input" type="time" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input className="form-input" type="time" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Patients</label>
                  <input className="form-input" type="number" value={slotForm.max_patients} onChange={e => setSlotForm(f => ({ ...f, max_patients: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => createSlotMutation.mutate(slotForm)} disabled={createSlotMutation.isPending}>
                {createSlotMutation.isPending ? 'Creating...' : 'Create Slot'}
              </button>
            </div>
          </div>
        )}

        {/* Doctors List */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Avg Duration</th>
                    <th>Today's Queue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {docList.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="doctor-avatar" style={{ width: 40, height: 40, fontSize: 'var(--text-sm)' }}>
                            {doc.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{doc.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{doc.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{doc.specialization}</td>
                      <td>{doc.avg_consultation_minutes} min</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{doc.today_queue_count}</span>
                      </td>
                      <td>
                        {doc.is_running_late ? (
                          <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Late</span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>Active</span>
                        )}
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
