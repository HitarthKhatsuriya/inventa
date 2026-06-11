import { useQuery } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { doctorAPI } from '../../api'
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DoctorSchedule() {
  const { user } = useAuth()

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const docList = doctors?.data || []
  const myDoctor = docList.find(d => d.user_id === user?.id)

  const { data: doctorDetail, isLoading } = useQuery({
    queryKey: ['doctor-detail', myDoctor?.id],
    queryFn: () => doctorAPI.get(myDoctor.id),
    enabled: !!myDoctor?.id,
  })

  const detail = doctorDetail?.data
  const slots = detail?.slots || []

  // Group slots by day
  const slotsByDay = DAYS.map((dayName, idx) => ({
    day: idx,
    dayName,
    dayShort: DAY_SHORT[idx],
    slots: slots.filter(s => s.day_of_week === idx),
  }))

  const todayIdx = new Date().getDay()

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>My Schedule</h1>
          <p className="page-header-subtitle">Weekly availability and time slots</p>
        </div>
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
            {/* Quick Stats */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-card-label">Working Days</div>
                <div className="stat-card-value primary">{slotsByDay.filter(d => d.slots.length > 0).length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total Slots</div>
                <div className="stat-card-value secondary">{slots.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Max Daily Capacity</div>
                <div className="stat-card-value">
                  {Math.max(...slotsByDay.map(d => d.slots.reduce((sum, s) => sum + s.max_patients, 0)), 0)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Avg Consultation</div>
                <div className="stat-card-value warning">{detail?.avg_consultation_minutes || 15} min</div>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="card">
              <div className="card-header">
                <h2><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Weekly Schedule</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="schedule-grid">
                  {slotsByDay.map(({ day, dayName, dayShort, slots: daySlots }) => (
                    <div
                      key={day}
                      className={`schedule-day ${daySlots.length === 0 ? 'off' : ''} ${day === todayIdx ? 'today' : ''}`}
                    >
                      <div className="schedule-day-header">
                        <span className="schedule-day-name">{dayName}</span>
                        {day === todayIdx && (
                          <span className="badge badge-arrived" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            Today
                          </span>
                        )}
                      </div>

                      {daySlots.length === 0 ? (
                        <div className="schedule-day-off">
                          <span>Day Off</span>
                        </div>
                      ) : (
                        <div className="schedule-slots">
                          {daySlots.map(slot => (
                            <div key={slot.id} className="schedule-slot">
                              <div className="schedule-slot-time">
                                <Clock size={13} />
                                {slot.start_time} — {slot.end_time}
                              </div>
                              <div className="schedule-slot-capacity">
                                <Users size={12} />
                                <span>Max {slot.max_patients} patients</span>
                              </div>
                              {slot.is_active && (
                                <div className="schedule-slot-active">
                                  <CheckCircle size={12} />
                                  Active
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
