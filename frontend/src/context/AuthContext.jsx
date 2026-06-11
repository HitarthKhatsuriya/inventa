import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mediq_token')
    const savedUser = localStorage.getItem('mediq_user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('mediq_token')
        localStorage.removeItem('mediq_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    const { token, user: userData } = res.data
    localStorage.setItem('mediq_token', token)
    localStorage.setItem('mediq_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const register = async (data) => {
    const res = await authAPI.register(data)
    const { token, user: userData } = res.data
    localStorage.setItem('mediq_token', token)
    localStorage.setItem('mediq_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch {} // Ignore if token already invalid
    localStorage.removeItem('mediq_token')
    localStorage.removeItem('mediq_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
