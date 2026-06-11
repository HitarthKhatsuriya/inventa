import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { queueAPI, doctorAPI } from '../../api'
import { Play, Square, UserCheck, Clock, Users, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorView() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // First, get the doctor profile to find doctor_id
  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const docList = doctors?.data || []
  const myDoctor = docList.find(d => d.user_id === user?.id)

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue', myDoctor?.id],
    queryFn: () => queueAPI.todayQueue(myDoctor.id),
    enabled: !!myDoctor?.id,
    refetchInterval: 10000,
  })

  const queueData = queue?.data || null

  const startMutation = useMutation({
    mutationFn: (id) => queueAPI.startConsultation(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['queue'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  })

  const endMutation = useMutation({
    mutationFn: (id) => queueAPI.endConsultation(id),
    onSuccess: (res) => {
      toast.success(`Consultation ended. Duration: ${res.data.duration_minutes} min`)
      queryClient.invalidateQueries({ queryKey: ['queue'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  })

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>My Queue</h1>
          <p className="page-header-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {queueData?.doctor?.is_running_late && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            <AlertTriangle size={16} /> Running Behind Schedule
          </div>
        )}
      </div>

      <div className="page-content">
        {isLoading ? (
          <div className="spinner" />
        ) : !myDoctor ? (
          <div className="empty-state">
            <h3>Doctor profile not found</h3>
            <p>Contact admin to set up your doctor profile.</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-label">Patients in Queue</div>
                <div className="stat-card-value primary">{queueData?.total_in_queue || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Completed Today</div>
                <div className="stat-card-value">{queueData?.total_done || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Avg Consultation</div>
                <div className="stat-card-value secondary">{queueData?.doctor?.avg_consultation_minutes || 15} min</div>
              </div>
            </div>

            {/* Current Patient Highlight */}
            {queueData?.current_patient && (
              <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary)', borderWidth: '2px' }}>
                <div className="card-header" style={{ background: 'var(--primary-bg)' }}>
                  <h2 style={{ color: 'var(--primary)' }}>
                    <Play size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Current Patient
                  </h2>
                  <button className="btn btn-danger btn-sm" onClick={() => endMutation.mutate(queueData.current_patient.id)} disabled={endMutation.isPending}>
                    <Square size={14} /> End Consultation
                  </button>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="queue-token active" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                      {queueData.current_patient.token_number}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                        {queueData.current_patient.patient?.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        Token #{queueData.current_patient.token_number} · {queueData.current_patient.patient?.phone}
                      </div>
                      {queueData.current_patient.notes && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                          Notes: {queueData.current_patient.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Patient */}
            {queueData?.next_patient && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <h2>Next Patient</h2>
                  {!queueData.current_patient && (
                    <button className="btn btn-primary btn-sm" onClick={() => startMutation.mutate(queueData.next_patient.id)} disabled={startMutation.isPending}>
                      <Play size={14} /> Start Consultation
                    </button>
                  )}
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="queue-token">{queueData.next_patient.token_number}</div>
                    <div>
                      <div className="queue-patient-name">{queueData.next_patient.patient?.name}</div>
                      <div className="queue-patient-meta">
                        Token #{queueData.next_patient.token_number}
                      </div>
                    </div>
                    <StatusBadge status={queueData.next_patient.status} />
                  </div>
                </div>
              </div>
            )}

            {/* Full Queue */}
            <div className="card">
              <div className="card-header">
                <h2>Today's Queue</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {(!queueData?.queue || queueData.queue.length === 0) ? (
                  <div className="empty-state">
                    <Clock size={48} />
                    <h3>No patients today</h3>
                    <p>Your queue is empty</p>
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
                          <div className="queue-patient-meta">Slot: {apt.slot_time}</div>
                        </div>
                        <StatusBadge status={apt.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
