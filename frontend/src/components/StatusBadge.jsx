export default function StatusBadge({ status }) {
  const labels = {
    booked: 'Booked',
    arrived: 'Arrived',
    in_consultation: 'In Consultation',
    done: 'Done',
    no_show: 'No Show',
    cancelled: 'Cancelled',
  }

  return (
    <span className={`badge badge-${status}`}>
      {status === 'in_consultation' && <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--primary)',
        animation: 'pulse-green 2s infinite',
        display: 'inline-block'
      }} />}
      {labels[status] || status}
    </span>
  )
}
