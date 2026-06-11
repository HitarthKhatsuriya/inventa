import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { doctorAPI, queueAPI } from '../../api'
import { Play, Square, UserCheck, UserX, AlertCircle, Siren } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminQueue() {
  const queryClient = useQueryClient()
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [confirm, setConfirm] = useState({ open: false, id: null, action: '', title: '', message: '' })

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['queue', selectedDoctor],
    queryFn: () => queueAPI.todayQueue(selectedDoctor),
    enabled: !!selectedDoctor,
    refetchInterval: 10000,
  })

  const docList = doctors?.data || []
  const queueData = queue?.data || null

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      switch (action) {
        case 'arrived': return queueAPI.markArrived(id)
        case 'start': return queueAPI.startConsultation(id)
        case 'end': return queueAPI.endConsultation(id)
        case 'noshow': return queueAPI.markNoShow(id)
        default: throw new Error('Unknown action')
      }
    },
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      setConfirm({ open: false })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Action failed.')
      setConfirm({ open: false })
    },
  })

  const handleAction = (id, action) => {
    if (action === 'noshow') {
      setConfirm({
        open: true, id, action,
        title: 'Mark as No-Show',
        message: 'Are you sure you want to mark this patient as no-show? They will be removed from the active queue.',
      })
    } else if (action === 'end') {
      setConfirm({
        open: true, id, action,
        title: 'End Consultation',
        message: 'Mark this consultation as complete?',
      })
    } else {
      actionMutation.mutate({ id, action })
    }
  }

  // Auto-select first doctor
  if (docList.length > 0 && !selectedDoctor) {
    setSelectedDoctor(docList[0].id.toString())
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Queue Management</h1>
          <p className="page-header-subtitle">Live queue for today</p>
        </div>
        <select
          className="form-input form-select"
          style={{ width: 'auto', minWidth: '250px' }}
          value={selectedDoctor}
          onChange={e => setSelectedDoctor(e.target.value)}
          id="doctor-selector"
        >
          <option value="">Select Doctor</option>
          {docList.map(d => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.specialization} ({d.today_queue_count} in queue)
            </option>
          ))}
        </select>
      </div>

      <div className="page-content">
        {!selectedDoctor ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>Select a doctor to view their queue</h3>
          </div>
        ) : queueLoading ? (
          <div className="spinner" />
        ) : (
          <>
            {queueData && (
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-card-label">In Queue</div>
                  <div className="stat-card-value primary">{queueData.total_in_queue}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Completed</div>
                  <div className="stat-card-value">{queueData.total_done}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Avg Duration</div>
                  <div className="stat-card-value secondary">{queueData.doctor?.avg_consultation_minutes} min</div>
                </div>
                {queueData.doctor?.is_running_late && (
                  <div className="stat-card" style={{ borderColor: 'var(--warning)' }}>
                    <div className="stat-card-label" style={{ color: 'var(--warning)' }}>⚠️ Running Late</div>
                    <div className="stat-card-value warning" style={{ fontSize: '1rem' }}>Doctor is behind schedule</div>
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h2>Patient Queue</h2>
                {queueData?.current_patient && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary)', fontWeight: 600 }}>
                    Current: {queueData.current_patient.patient?.name} (Token #{queueData.current_patient.token_number})
                  </span>
                )}
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {(!queueData?.queue || queueData.queue.length === 0) ? (
                  <div className="empty-state">
                    <h3>No patients in queue</h3>
                    <p>The queue is empty for today</p>
                  </div>
                ) : (
                  <ul className="queue-list">
                    {queueData.queue.map(apt => (
                      <li key={apt.id} className={`queue-item ${apt.status === 'in_consultation' ? 'current' : ''}`}>
                        <div className={`queue-token ${apt.status === 'in_consultation' ? 'active' : ''}`}>
                          {apt.token_number}
                        </div>
                        <div className="queue-info">
                          <div className="queue-patient-name">{apt.patient?.name}</div>
                          <div className="queue-patient-meta">
                            {apt.patient?.phone} · Slot: {apt.slot_time}
                            {apt.notes && ` · ${apt.notes}`}
                          </div>
                        </div>
                        <StatusBadge status={apt.status} />
                        <div className="queue-actions">
                          {apt.status === 'booked' && (
                            <>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleAction(apt.id, 'arrived')} title="Mark Arrived">
                                <UserCheck size={14} /> Arrived
                              </button>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleAction(apt.id, 'noshow')} title="No-Show">
                                <UserX size={14} />
                              </button>
                            </>
                          )}
                          {apt.status === 'arrived' && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => handleAction(apt.id, 'start')} title="Start Consultation">
                                <Play size={14} /> Start
                              </button>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleAction(apt.id, 'noshow')} title="No-Show">
                                <UserX size={14} />
                              </button>
                            </>
                          )}
                          {apt.status === 'in_consultation' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleAction(apt.id, 'end')} title="End Consultation">
                              <Square size={14} /> End
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.action === 'noshow'}
        onConfirm={() => actionMutation.mutate({ id: confirm.id, action: confirm.action })}
        onCancel={() => setConfirm({ open: false })}
      />
    </AppLayout>
  )
}
