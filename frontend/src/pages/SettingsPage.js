import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHistory, clearHistory, deleteHistoryItem } from '../services/api';
import toast from 'react-hot-toast';
import { Settings, History, Trash2, Timer, Bell, ArrowRight } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchHistory();
  }, [user, navigate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory();
      setHistoryList(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load search history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistoryList(prev => prev.filter(item => item._id !== id));
      toast.success('Search item deleted.');
    } catch (e) {
      toast.error('Failed to delete search item.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire search history?')) return;
    try {
      await clearHistory();
      setHistoryList([]);
      toast.success('Search history cleared.');
    } catch (e) {
      toast.error('Failed to clear search history.');
    }
  };

  if (!user) return null;

  return (
    <div className="page container" style={{ maxWidth: '800px' }}>
      {/* Title */}
      <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Settings size={24} className="text-primary" /> Settings
      </h2>

      {/* Grid Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Profile Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--primary)'
          }}>
            {user.email ? user.email[0].toUpperCase() : 'U'}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Account Information
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>Email:</strong> {user.email}
            </p>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>User ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{user.uid}</span>
            </p>
          </div>
        </div>

        {/* Shortcuts / Navigation */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> Notifications & Alerts
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Manage the jobs alerts you created to receive automated email notifications when matches are published.
          </p>
          <Link to="/alerts" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Manage Job Alerts <ArrowRight size={14} />
          </Link>
        </div>

        {/* Search History Management */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={20} /> Search History
            </h3>
            {historyList.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="spinner" />
          ) : historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <History size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No search history found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyList.map(s => {
                const parts = [];
                if (s.city) parts.push(s.city);
                else if (!s.query) parts.push('All Turkey');
                if (s.query) parts.push(s.query);
                if (s.workingType) {
                  const tl = s.workingType === 'fulltime' ? 'Full-time'
                    : s.workingType === 'parttime' ? 'Part-time'
                      : s.workingType.charAt(0).toUpperCase() + s.workingType.slice(1);
                  parts.push(tl);
                }
                const displayText = parts.join(' – ');

                const params = new URLSearchParams();
                if (s.query) params.append('title', s.query);
                if (s.city) params.append('city', s.city);
                if (s.workingType) params.append('working_type', s.workingType);

                return (
                  <div
                    key={s._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <Link
                      to={`/search?${params.toString()}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      <Timer size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{displayText}</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteItem(s._id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
                      title="Delete search record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
