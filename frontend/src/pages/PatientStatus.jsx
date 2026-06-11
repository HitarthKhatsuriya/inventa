import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { waitTimeAPI } from '../api'
import StatusBadge from '../components/StatusBadge'
import { Clock, Users, Stethoscope, RefreshCw, AlertTriangle } from 'lucide-react'

export default function PatientStatus() {
  const { bookingReference } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchStatus = async () => {
    try {
      const res = await waitTimeAPI.get(bookingReference)
      setData(res.data)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [bookingReference])

  if (loading) {
    return (
      <div className="status-page">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="status-page">
        <div className="status-card">
          <div className="status-header" style={{ background: 'var(--danger)' }}>
            <AlertTriangle size={32} />
            <h1 style={{ marginTop: '8px' }}>Appointment Not Found</h1>
          </div>
          <div className="status-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: '12px' }}>
              Reference: {bookingReference}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isActive = ['booked', 'arrived', 'in_consultation'].includes(data.status)

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="status-header">
          <h1 style={{ fontSize: 'var(--text-sm)', fontWeight: 500, opacity: 0.8 }}>MEDIQ Healthcare</h1>
          <div style={{ fontSize: '3.5rem', fontWeight: 700, margin: '12px 0 4px', fontFamily: 'var(--font-heading)' }}>
            #{data.token_number}
          </div>
          <StatusBadge status={data.status} />
        </div>

        <div className="status-body">
          {isActive && data.status !== 'in_consultation' && (
            <div className="wait-time-display" style={{ padding: '24px 0' }}>
              <div className="wait-time-number">
                {data.estimated_wait_minutes}
              </div>
              <div className="wait-time-label">minutes estimated wait</div>
              <div className="wait-time-sub">
                {data.patients_ahead} patient{data.patients_ahead !== 1 ? 's' : ''} ahead of you
              </div>
            </div>
          )}

          {data.status === 'in_consultation' && (
            <div className="wait-time-display" style={{ padding: '24px 0' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                ✨ It's your turn!
              </div>
              <div className="wait-time-sub" style={{ marginTop: '8px' }}>
                Your consultation is in progress
              </div>
            </div>
          )}

          {data.message && (
            <p style={{
              textAlign: 'center', color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)', padding: '0 0 16px',
              borderBottom: '1px solid var(--border)', marginBottom: '16px'
            }}>
              {data.message}
            </p>
          )}

          <div className="status-info-row">
            <span className="status-info-label"><Stethoscope size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Doctor</span>
            <span className="status-info-value">{data.doctor_name}</span>
          </div>

          {data.doctor_specialization && (
            <div className="status-info-row">
              <span className="status-info-label">Specialization</span>
              <span className="status-info-value">{data.doctor_specialization}</span>
            </div>
          )}

          <div className="status-info-row">
            <span className="status-info-label">Date</span>
            <span className="status-info-value">{data.appointment_date}</span>
          </div>

          <div className="status-info-row">
            <span className="status-info-label">Slot Time</span>
            <span className="status-info-value">{data.slot_time}</span>
          </div>

          {isActive && (
            <div className="status-info-row">
              <span className="status-info-label"><Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Queue Position</span>
              <span className="status-info-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                #{data.queue_position}
              </span>
            </div>
          )}

          {data.is_doctor_running_late && (
            <div style={{
              background: 'var(--warning-bg)', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', marginTop: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: 'var(--text-sm)', color: 'var(--warning)'
            }}>
              <AlertTriangle size={16} />
              Doctor is currently running behind schedule
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Last updated: {lastRefresh?.toLocaleTimeString()}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={fetchStatus}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <p style={{ marginTop: '24px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
        This page auto-refreshes every 30 seconds
      </p>
    </div>
  )
}
