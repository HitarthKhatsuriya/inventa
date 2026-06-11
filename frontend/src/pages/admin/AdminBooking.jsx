import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { doctorAPI, appointmentAPI } from '../../api'
import { CalendarPlus, ChevronRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminBooking() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [patientInfo, setPatientInfo] = useState({ name: '', email: '', phone: '', notes: '' })
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
      setStep(4) // Success step
      toast.success('Appointment booked!')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Booking failed.')
    },
  })

  const docList = doctors?.data || []
  const detail = doctorDetail?.data

  // Get available times for selected date
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
      startM += 30 // 30-minute intervals
      if (startM >= 60) { startH++; startM -= 60 }
    }
    return times
  }

  const handleBook = () => {
    bookMutation.mutate({
      doctor_id: selectedDoctor.id,
      appointment_date: selectedDate,
      slot_time: selectedTime,
      notes: patientInfo.notes || undefined,
    })
  }

  const steps = [
    { num: 1, label: 'Doctor' },
    { num: 2, label: 'Date & Time' },
    { num: 3, label: 'Confirm' },
  ]

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Book Appointment</h1>
          <p className="page-header-subtitle">Schedule appointments for walk-in patients</p>
        </div>
      </div>

      <div className="page-content">
        {/* Steps indicator */}
        {step < 4 && (
          <div className="booking-steps">
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`booking-step ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}>
                  <div className="booking-step-number">
                    {step > s.num ? <Check size={14} /> : s.num}
                  </div>
                  <span className="booking-step-label">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`booking-step-connector ${step > s.num ? 'active' : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card-body">
            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Select Doctor</h2>
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
                      <div className="doctor-card-info">
                        <h3>{doc.name}</h3>
                        <div className="doctor-card-spec">{doc.specialization}</div>
                        <div className="doctor-card-queue">
                          {doc.today_queue_count} patients in today's queue
                          {doc.is_running_late && ' · ⚠️ Running late'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedDoctor}
                    onClick={() => setStep(2)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Select Date & Time</h2>

                <div className="form-group">
                  <label className="form-label">Appointment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setSelectedDate(e.target.value); setSelectedTime('') }}
                    id="booking-date"
                  />
                </div>

                {selectedDate && (
                  <div className="form-group">
                    <label className="form-label">Available Slots</label>
                    {getAvailableSlots().length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        No slots available on {DAYS[new Date(selectedDate).getDay()]}
                      </p>
                    ) : (
                      getAvailableSlots().map(slot => (
                        <div key={slot.id} style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            {slot.start_time} — {slot.end_time}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {generateTimeSlots(slot).map(time => (
                              <button
                                key={time}
                                className={`btn btn-sm ${selectedTime === time ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setSelectedTime(time)}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Any special notes..."
                    value={patientInfo.notes}
                    onChange={e => setPatientInfo(p => ({ ...p, notes: e.target.value }))}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <>
                <h2 style={{ marginBottom: '20px' }}>Confirm Booking</h2>

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
                      {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="status-info-row">
                    <span className="status-info-label">Time</span>
                    <span className="status-info-value">{selectedTime}</span>
                  </div>
                  {patientInfo.notes && (
                    <div className="status-info-row">
                      <span className="status-info-label">Notes</span>
                      <span className="status-info-value">{patientInfo.notes}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleBook}
                    disabled={bookMutation.isPending}
                  >
                    <CalendarPlus size={16} />
                    {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Success */}
            {step === 4 && bookingResult && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--primary-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Check size={32} color="var(--primary)" />
                </div>
                <h2>Appointment Booked!</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px', fontSize: 'var(--text-sm)' }}>
                  Token number <strong>#{bookingResult.token_number}</strong>
                </p>

                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Booking Reference
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>
                    {bookingResult.booking_reference}
                  </div>
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Status page: <a href={`/status/${bookingResult.booking_reference}`} target="_blank" rel="noopener">
                    /status/{bookingResult.booking_reference.slice(0, 8)}...
                  </a>
                </div>

                <button className="btn btn-primary" onClick={() => { setStep(1); setSelectedDoctor(null); setSelectedDate(''); setSelectedTime(''); setBookingResult(null) }}>
                  Book Another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
