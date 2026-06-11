import { useQuery } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import { appointmentAPI, doctorAPI } from '../../api'
import StatusBadge from '../../components/StatusBadge'
import { Users, Clock, UserCheck, AlertTriangle, CalendarDays } from 'lucide-react'

export default function AdminDashboard() {
  const today = new Date().toISOString().split('T')[0]

  const { data: appointments } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentAPI.list({ date: today }),
    refetchInterval: 15000,
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const appts = appointments?.data?.data || []
  const docList = doctors?.data || []

  const stats = {
    total: appts.length,
    waiting: appts.filter(a => a.status === 'arrived').length,
    inConsultation: appts.filter(a => a.status === 'in_consultation').length,
    done: appts.filter(a => a.status === 'done').length,
    noShow: appts.filter(a => a.status === 'no_show').length,
    booked: appts.filter(a => a.status === 'booked').length,
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-subtitle">Today's overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-label">Total Appointments</div>
            <div className="stat-card-value primary">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Waiting</div>
            <div className="stat-card-value secondary">{stats.waiting}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">In Consultation</div>
            <div className="stat-card-value" style={{ color: 'var(--primary)' }}>{stats.inConsultation}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Completed</div>
            <div className="stat-card-value">{stats.done}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Yet to Arrive</div>
            <div className="stat-card-value warning">{stats.booked}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">No-Shows</div>
            <div className="stat-card-value danger">{stats.noShow}</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h2><Users size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Active Doctors</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {docList.length === 0 ? (
                <div className="empty-state">
                  <p>No doctors registered yet</p>
                </div>
              ) : (
                <ul className="queue-list">
                  {docList.map(doc => (
                    <li key={doc.id} className="queue-item">
                      <div className="doctor-avatar">
                        {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="queue-info">
                        <div className="queue-patient-name">{doc.name}</div>
                        <div className="queue-patient-meta">{doc.specialization}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
                          {doc.today_queue_count}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>in queue</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2><CalendarDays size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Recent Appointments</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {appts.length === 0 ? (
                <div className="empty-state">
                  <p>No appointments today</p>
                </div>
              ) : (
                <ul className="queue-list">
                  {appts.slice(0, 8).map(apt => (
                    <li key={apt.id} className="queue-item">
                      <div className="queue-token">{apt.token_number}</div>
                      <div className="queue-info">
                        <div className="queue-patient-name">{apt.patient?.name}</div>
                        <div className="queue-patient-meta">
                          {apt.doctor?.user?.name} · Token #{apt.token_number}
                        </div>
                      </div>
                      <StatusBadge status={apt.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
