import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useState } from 'react'
import { appointmentAPI, notificationAPI } from '../../api'
import { CalendarPlus, X, Bell, ExternalLink, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientDashboard() {
  const queryClient = useQueryClient()
  const [cancelId, setCancelId] = useState(null)

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentAPI.list(),
    refetchInterval: 30000,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentAPI.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled.')
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      setCancelId(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel.'),
  })

  const markReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const appts = appointments?.data?.data || []
  const notifs = notifications?.data || { notifications: [], unread_count: 0 }

  const upcoming = appts.filter(a => ['booked', 'arrived', 'in_consultation'].includes(a.status))
  const past = appts.filter(a => ['done', 'no_show', 'cancelled'].includes(a.status))

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>My Appointments</h1>
          <p className="page-header-subtitle">View and manage your appointments</p>
        </div>
        <Link to="/patient/book" className="btn btn-primary">
          <CalendarPlus size={16} /> Book Appointment
        </Link>
      </div>

      <div className="page-content">
        <div className="grid-2">
          {/* Upcoming */}
          <div>
            <h2 style={{ marginBottom: '16px', fontSize: 'var(--text-lg)' }}>
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '40px' }}>
                  <h3>No upcoming appointments</h3>
                  <Link to="/patient/book" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                    <CalendarPlus size={14} /> Book Now
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcoming.map(apt => (
                  <div key={apt.id} className="card">
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <StatusBadge status={apt.status} />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary)' }}>
                          Token #{apt.token_number}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        {apt.doctor?.user?.name}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        {new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {apt.slot_time}
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <a href={`/status/${apt.booking_reference}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                          <ExternalLink size={14} /> Live Status
                        </a>
                        {apt.status === 'booked' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setCancelId(apt.id)} style={{ color: 'var(--danger)' }}>
                            <X size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications & Past */}
          <div>
            {/* Notifications */}
            {notifs.notifications.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)' }}>
                    <Bell size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Notifications
                    {notifs.unread_count > 0 && (
                      <span className="notification-badge" style={{ marginLeft: '8px', display: 'inline-flex' }}>
                        {notifs.unread_count}
                      </span>
                    )}
                  </h2>
                  {notifs.unread_count > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => markReadMutation.mutate()}>
                      <CheckCircle size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    {notifs.notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border)',
                        background: n.is_read ? 'transparent' : 'var(--primary-bg)',
                        fontSize: 'var(--text-sm)',
                      }}>
                        <div style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Past Appointments */}
            <h2 style={{ marginBottom: '16px', fontSize: 'var(--text-lg)' }}>
              Past ({past.length})
            </h2>
            {past.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '30px' }}>
                  <p>No past appointments</p>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  {past.slice(0, 10).map(apt => (
                    <div key={apt.id} className="queue-item">
                      <div className="queue-info">
                        <div className="queue-patient-name">
                          {apt.doctor?.user?.name}
                        </div>
                        <div className="queue-patient-meta">
                          {new Date(apt.appointment_date).toLocaleDateString('en-IN')} · Token #{apt.token_number}
                        </div>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment?"
        danger
        onConfirm={() => cancelMutation.mutate(cancelId)}
        onCancel={() => setCancelId(null)}
      />
    </AppLayout>
  )
}
