import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationAPI } from '../api'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, Users, CalendarPlus, ClipboardList,
  BarChart3, Settings, LogOut, Stethoscope, Bell,
  Calendar, History, Check, X
} from 'lucide-react'

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/queue', icon: ClipboardList, label: 'Queue Management' },
  { to: '/admin/book', icon: CalendarPlus, label: 'Book Appointment' },
  { to: '/admin/doctors', icon: Stethoscope, label: 'Manage Doctors' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

const doctorNav = [
  { to: '/doctor', icon: ClipboardList, label: 'My Queue' },
  { to: '/doctor/history', icon: History, label: 'Patient History' },
  { to: '/doctor/schedule', icon: Calendar, label: 'My Schedule' },
]

const patientNav = [
  { to: '/patient', icon: LayoutDashboard, label: 'My Appointments' },
  { to: '/patient/book', icon: CalendarPlus, label: 'Book Appointment' },
]

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
    refetchInterval: 30000,
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.data?.notifications || []
  const unreadCount = data?.data?.unread_count || 0

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const typeIcons = {
    booking_confirmed: '📋',
    delay_alert: '⏰',
    reminder: '🔔',
    cancellation: '❌',
    no_show: '🚫',
  }

  return (
    <div className="notification-bell-container" ref={ref}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        id="notification-bell"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => markAllRead.mutate()}
                style={{ fontSize: '0.7rem' }}
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={24} style={{ opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                >
                  <span className="notification-type-icon">{typeIcons[n.type] || '📌'}</span>
                  <div className="notification-item-content">
                    <p className="notification-message">{n.message}</p>
                    <span className="notification-time">
                      {new Date(n.sent_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = user?.role === 'admin' 
    ? adminNav 
    : user?.role === 'doctor' 
      ? doctorNav 
      : patientNav

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleLabel = {
    admin: 'Administrator',
    doctor: 'Doctor',
    patient: 'Patient',
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <h1>MED<span>IQ</span></h1>
          <div className="sidebar-role">{roleLabel[user?.role]}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/doctor' || to === '/patient'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '8px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.email}
              </div>
            </div>
            <NotificationBell />
          </div>
          <button onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="app-main">
        {children}
      </main>
    </div>
  )
}
