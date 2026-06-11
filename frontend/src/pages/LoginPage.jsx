import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      // Redirect based on role
      switch (user.role) {
        case 'admin': navigate('/admin'); break
        case 'doctor': navigate('/doctor'); break
        case 'patient': navigate('/patient'); break
        default: navigate('/')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Login failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>MED<span style={{ color: 'var(--primary-light)' }}>IQ</span></h1>
        <p className="login-subtitle">Healthcare Appointment Management System</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              id="login-email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              id="login-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} id="login-submit">
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">or</div>

        <div className="login-link">
          Don't have an account? <Link to="/register">Register as Patient</Link>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Demo Credentials:</strong>
          <div style={{ marginTop: '6px' }}>Admin: admin@mediq.com</div>
          <div>Doctor: priya@mediq.com</div>
          <div>Patient: amit@example.com</div>
          <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.3)' }}>Password: password123</div>
        </div>
      </div>
    </div>
  )
}
