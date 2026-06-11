import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { appointmentAPI } from '../../api'
import { History, Search, Filter, Clock, User } from 'lucide-react'

export default function DoctorHistory() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['doctor-history'],
    queryFn: () => appointmentAPI.list(),
  })

  const allAppts = appointments?.data?.data || []

  // Filter appointments
  const filtered = allAppts.filter(apt => {
    const matchSearch = !search ||
      apt.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      apt.patient?.phone?.includes(search) ||
      apt.token_number?.toString().includes(search)

    const matchStatus = !statusFilter || apt.status === statusFilter

    return matchSearch && matchStatus
  })

  const pastAppts = filtered.filter(a => ['done', 'no_show', 'cancelled'].includes(a.status))
  const activeAppts = filtered.filter(a => ['booked', 'arrived', 'in_consultation'].includes(a.status))

  // Compute stats
  const totalDone = allAppts.filter(a => a.status === 'done').length
  const totalNoShow = allAppts.filter(a => a.status === 'no_show').length
  const totalCancelled = allAppts.filter(a => a.status === 'cancelled').length

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Patient History</h1>
          <p className="page-header-subtitle">View all past and upcoming patients</p>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Completed</div>
            <div className="stat-card-value primary">{totalDone}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">No-Shows</div>
            <div className="stat-card-value danger">{totalNoShow}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Cancelled</div>
            <div className="stat-card-value warning">{totalCancelled}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Patients</div>
            <div className="stat-card-value secondary">{allAppts.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, phone, or token..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
                id="history-search"
              />
            </div>
            <select
              className="form-input form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              id="history-status-filter"
            >
              <option value="">All Status</option>
              <option value="done">Completed</option>
              <option value="no_show">No-Show</option>
              <option value="cancelled">Cancelled</option>
              <option value="booked">Booked</option>
              <option value="arrived">Arrived</option>
              <option value="in_consultation">In Consultation</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="spinner" />
        ) : (
          <>
            {/* Active Appointments */}
            {activeAppts.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ background: 'var(--primary-bg)' }}>
                  <h2 style={{ color: 'var(--primary)' }}>
                    <Clock size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Active ({activeAppts.length})
                  </h2>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Patient</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAppts.map(apt => (
                          <tr key={apt.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{apt.token_number}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{apt.patient?.name}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{apt.patient?.phone}</div>
                            </td>
                            <td>{new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                            <td>{apt.slot_time}</td>
                            <td><StatusBadge status={apt.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Past Appointments */}
            <div className="card">
              <div className="card-header">
                <h2>
                  <History size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  History ({pastAppts.length})
                </h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {pastAppts.length === 0 ? (
                  <div className="empty-state">
                    <User size={48} />
                    <h3>No patient history found</h3>
                    <p>{search ? 'Try adjusting your search' : 'Complete consultations to build history'}</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Patient</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Notes</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastAppts.map(apt => (
                          <tr key={apt.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>#{apt.token_number}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{apt.patient?.name}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{apt.patient?.phone}</div>
                            </td>
                            <td>{new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td>{apt.slot_time}</td>
                            <td>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {apt.notes || '—'}
                              </div>
                            </td>
                            <td><StatusBadge status={apt.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
