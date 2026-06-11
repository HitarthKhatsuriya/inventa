import { useQuery } from '@tanstack/react-query'
import AppLayout from '../../components/AppLayout'
import { analyticsAPI, doctorAPI } from '../../api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Clock, Users, Activity } from 'lucide-react'

export default function AdminAnalytics() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsAPI.overview(),
  })

  const { data: peakHours } = useQuery({
    queryKey: ['peak-hours'],
    queryFn: () => analyticsAPI.peakHours(30),
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorAPI.list(),
  })

  const stats = overview?.data || {}
  const hourData = peakHours?.data || []
  const docList = doctors?.data || []

  // Filter to only working hours for the chart
  const chartHours = hourData.filter(h => h.hour >= 8 && h.hour <= 20)

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-header-subtitle">Clinic performance and trends</p>
        </div>
      </div>

      <div className="page-content">
        {/* Overview Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-card-label">Today's Patients</div>
            <div className="stat-card-value primary">{stats.today?.total_appointments || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">This Week</div>
            <div className="stat-card-value secondary">{stats.this_week?.total_appointments || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">This Month</div>
            <div className="stat-card-value">{stats.this_month?.total_appointments || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Avg Duration (Month)</div>
            <div className="stat-card-value warning">{stats.this_month?.avg_consultation_minutes || 0} min</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Today Completed</div>
            <div className="stat-card-value" style={{ color: 'var(--primary)' }}>{stats.today?.completed || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Today No-Shows</div>
            <div className="stat-card-value danger">{stats.today?.no_shows || 0}</div>
          </div>
        </div>

        <div className="grid-2">
          {/* Peak Hours Chart */}
          <div className="card">
            <div className="card-header">
              <h2><Activity size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Peak Hours (Last 30 Days)</h2>
            </div>
            <div className="card-body">
              {chartHours.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                      }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <p>No data available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Performance */}
          <div className="card">
            <div className="card-header">
              <h2><Users size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Doctor Performance</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Queue</th>
                      <th>Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docList.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{doc.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{doc.specialization}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{doc.today_queue_count}</span>
                        </td>
                        <td>{doc.avg_consultation_minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
