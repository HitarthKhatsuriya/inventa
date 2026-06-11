import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminQueue from './pages/admin/AdminQueue'
import AdminBooking from './pages/admin/AdminBooking'
import AdminDoctors from './pages/admin/AdminDoctors'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminSettings from './pages/admin/AdminSettings'
import DoctorView from './pages/doctor/DoctorView'
import DoctorSchedule from './pages/doctor/DoctorSchedule'
import DoctorHistory from './pages/doctor/DoctorHistory'
import PatientDashboard from './pages/patient/PatientDashboard'
import PatientBooking from './pages/patient/PatientBooking'
import PatientStatus from './pages/PatientStatus'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  switch (user.role) {
    case 'admin': return <Navigate to="/admin" replace />
    case 'doctor': return <Navigate to="/doctor" replace />
    case 'patient': return <Navigate to="/patient" replace />
    default: return <Navigate to="/login" replace />
  }
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/status/:bookingReference" element={<PatientStatus />} />

      {/* Role redirect */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/queue" element={<ProtectedRoute roles={['admin']}><AdminQueue /></ProtectedRoute>} />
      <Route path="/admin/book" element={<ProtectedRoute roles={['admin']}><AdminBooking /></ProtectedRoute>} />
      <Route path="/admin/doctors" element={<ProtectedRoute roles={['admin']}><AdminDoctors /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />

      {/* Doctor routes */}
      <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DoctorView /></ProtectedRoute>} />
      <Route path="/doctor/schedule" element={<ProtectedRoute roles={['doctor']}><DoctorSchedule /></ProtectedRoute>} />
      <Route path="/doctor/history" element={<ProtectedRoute roles={['doctor']}><DoctorHistory /></ProtectedRoute>} />

      {/* Patient routes */}
      <Route path="/patient" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/book" element={<ProtectedRoute roles={['patient']}><PatientBooking /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
