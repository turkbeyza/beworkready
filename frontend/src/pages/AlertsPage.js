import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyAlerts, deleteAlert, toggleAlert } from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Trash2, BellOff, BellRing, MapPin, Briefcase, DollarSign } from 'lucide-react';

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await getMyAlerts();
      setAlerts(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load your alerts.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alert permanently?')) return;
    try {
      await deleteAlert(id);
      toast.success('Alert deleted.');
      setAlerts(prev => prev.filter(a => a._id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete alert.');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleAlert(id);
      const { is_active } = res.data;
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, is_active } : a));
      toast.success(is_active ? 'Alert activated — you will receive emails.' : 'Alert paused — no more emails for this alert.');
    } catch (e) {
      toast.error('Failed to update alert status.');
    }
  };

  if (!user) return (
    <div className="page container">
      <div className="empty-state"><h3>You must be logged in to manage alerts.</h3></div>
    </div>
  );

  return (
    <div className="page container" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Bell size={24} style={{ color: 'var(--primary)' }} /> My Job Alerts
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} total</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <strong>How alerts work:</strong> When a new job matches your alert filters (keyword, city, work type, salary),
          you will receive an email notification. You can <strong>pause</strong> any alert to stop emails without deleting it.
        </p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <Bell size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3>No Job Alerts Yet</h3>
          <p>Search for jobs and click "Create Job Alert" to get notified of new matches.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map(alert => (
            <div
              key={alert._id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderLeft: `4px solid ${alert.is_active !== false ? 'var(--primary)' : 'var(--border)'}`,
                opacity: alert.is_active === false ? 0.65 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>
                    {alert.keyword ? `"${alert.keyword}"` : 'All Positions'}
                  </h3>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: alert.is_active !== false ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)',
                    color: alert.is_active !== false ? 'var(--primary)' : 'var(--text-muted)',
                    border: `1px solid ${alert.is_active !== false ? 'var(--primary)' : 'var(--border)'}`,
                  }}>
                    {alert.is_active !== false ? '● Active' : '○ Paused'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {alert.city || 'Any City'}{alert.country ? `, ${alert.country}` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Briefcase size={12} /> {alert.working_type || 'Any Type'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <DollarSign size={12} /> Min: {alert.salary_min > 0 ? `${Number(alert.salary_min).toLocaleString()} TRY` : 'Any'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                <button
                  onClick={() => handleToggle(alert._id)}
                  className="btn btn-ghost btn-sm"
                  title={alert.is_active !== false ? 'Pause this alert' : 'Resume this alert'}
                  style={{ color: alert.is_active !== false ? 'var(--primary)' : 'var(--text-muted)', padding: '0.5rem' }}
                >
                  {alert.is_active !== false ? <BellRing size={18} /> : <BellOff size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(alert._id)}
                  className="btn btn-ghost btn-sm"
                  title="Delete alert"
                  style={{ color: '#ef4444', padding: '0.5rem' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
