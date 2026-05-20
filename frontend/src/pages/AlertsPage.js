import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyAlerts, deleteAlert } from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Trash2 } from 'lucide-react';

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
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await deleteAlert(id);
      toast.success('Alert deleted successfully');
      fetchAlerts();
    } catch (e) {
      toast.error('Failed to delete alert');
    }
  };

  if (!user) return <div className="page container"><h3>You must be logged in.</h3></div>;

  return (
    <div className="page container" style={{ maxWidth: '800px' }}>
      <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bell size={24} className="text-primary" /> My Job Alerts
      </h2>

      {loading ? (
        <div className="spinner" />
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <h3>No Job Alerts Found</h3>
          <p>You haven't set up any job alerts yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map(alert => (
            <div key={alert._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>{alert.keyword || 'Any Position'}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span><strong>City:</strong> {alert.city || 'Any'}</span>
                  <span><strong>Type:</strong> {alert.working_type || 'Any'}</span>
                  <span><strong>Min Salary:</strong> {alert.salary_min > 0 ? alert.salary_min : 'Any'}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(alert._id)} className="btn btn-ghost" style={{ color: 'var(--danger-color)', padding: '0.5rem' }}>
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
