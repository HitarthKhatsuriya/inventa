import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { doctorAPI, appointmentAPI } from '../../api'
import { CalendarPlus, ChevronRight, Check, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function PatientBooking() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [bookingResult, setBookingResult] = useState(null)

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const { data: doctorDetail } = useQuery({
    queryKey: ['doctor', selectedDoctor?.id],
    queryFn: () => doctorAPI.get(selectedDoctor.id),
    enabled: !!selectedDoctor,
  })

  const bookMutation = useMutation({
    mutationFn: (data) => appointmentAPI.create(data),
    onSuccess: (res) => {
      setBookingResult(res.data)
      setStep(4)
      toast.success('Appointment booked!')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Booking failed.')
    },
  })

  const docList = doctors?.data || []
  const detail = doctorDetail?.data

  const getAvailableSlots = () => {
    if (!detail?.slots || !selectedDate) return []
    const dayOfWeek = new Date(selectedDate).getDay()
    return detail.slots.filter(s => s.day_of_week === dayOfWeek)
  }

  const generateTimeSlots = (slot) => {
    const times = []
    let [startH, startM] = slot.start_time.split(':').map(Number)
    const [endH, endM] = slot.end_time.split(':').map(Number)
    const endMinutes = endH * 60 + endM

    while (startH * 60 + startM < endMinutes) {
      times.push(`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`)
      startM += 30
      if (startM >= 60) { startH++; startM -= 60 }
    }
    return times
  }

  const handleBook = () => {
    bookMutation.mutate({
      doctor_id: selectedDoctor.id,
      appointment_date: selectedDate,
      slot_time: selectedTime,
      notes: notes || undefined,
    })
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Book Appointment</h1>
          <p className="page-header-subtitle">Choose a doctor and schedule your visit</p>
        </div>
      </div>

      <div className="page-content">
        {/* Steps */}
        {step < 4 && (
          <div className="booking-steps">
            {[{ num: 1, label: 'Doctor' }, { num: 2, label: 'Schedule' }, { num: 3, label: 'Confirm' }].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`booking-step ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}>
                  <div className="booking-step-number">{step > s.num ? <Check size={14} /> : s.num}</div>
                  <span className="booking-step-label">{s.label}</span>
                </div>
                {i < 2 && <div className={`booking-step-connector ${step > s.num ? 'active' : ''}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card-body">
            {step === 1 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Choose Your Doctor</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {docList.map(doc => (
                    <div
                      key={doc.id}
                      className={`doctor-card ${selectedDoctor?.id === doc.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      <div className="doctor-avatar">
                        {doc.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="doctor-card-info" style={{ flex: 1 }}>
                        <h3>{doc.name}</h3>
                        <div className="doctor-card-spec">{doc.specialization}</div>
                        <div className="doctor-card-queue">
                          ~{doc.avg_consultation_minutes} min avg · {doc.today_queue_count} patients today
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button className="btn btn-primary" disabled={!selectedDoctor} onClick={() => setStep(2)}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Pick Date & Time</h2>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={selectedDate} min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setSelectedDate(e.target.value); setSelectedTime('') }} />
                </div>
                {selectedDate && getAvailableSlots().length === 0 && (
                  <p style={{ color: 'var(--warning)', fontSize: 'var(--text-sm)' }}>
                    No availability on {DAYS[new Date(selectedDate).getDay()]}. Try a different date.
                  </p>
                )}
                {selectedDate && getAvailableSlots().map(slot => (
                  <div key={slot.id} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {slot.start_time} — {slot.end_time}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {generateTimeSlots(slot).map(time => (
                        <button key={time} className={`btn btn-sm ${selectedTime === time ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedTime(time)}>
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any health concerns to mention..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
                  <button className="btn btn-primary" disabled={!selectedTime} onClick={() => setStep(3)}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Confirm Your Booking</h2>
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '20px' }}>
                  <div className="status-info-row">
                    <span className="status-info-label">Doctor</span>
                    <span className="status-info-value">{selectedDoctor?.name}</span>
                  </div>
                  <div className="status-info-row">
                    <span className="status-info-label">Specialization</span>
                    <span className="status-info-value">{selectedDoctor?.specialization}</span>
                  </div>
                  <div className="status-info-row">
                    <span className="status-info-label">Date</span>
                    <span className="status-info-value">
                      {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <div className="status-info-row">
                    <span className="status-info-label">Time</span>
                    <span className="status-info-value">{selectedTime}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
                  <button className="btn btn-primary" onClick={handleBook} disabled={bookMutation.isPending}>
                    <CalendarPlus size={16} /> {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}

            {step === 4 && bookingResult && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Check size={32} color="var(--primary)" />
                </div>
                <h2>Booked Successfully!</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Your token number is <strong style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>#{bookingResult.token_number}</strong>
                </p>
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '16px', margin: '20px 0', textAlign: 'left' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>Booking Reference</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>{bookingResult.booking_reference}</div>
                </div>
                <a href={`/status/${bookingResult.booking_reference}`} target="_blank" rel="noopener" className="btn btn-primary" style={{ marginRight: '12px' }}>
                  Track Live Status
                </a>
                <button className="btn btn-secondary" onClick={() => navigate('/patient')}>
                  My Appointments
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
