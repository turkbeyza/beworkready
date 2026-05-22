import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedJobs } from '../services/api';
import JobCard from '../components/JobCard';
import { Bookmark, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SavedJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSavedJobs();
  }, [user, navigate]);

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const res = await getSavedJobs();
      setSavedJobs(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load saved jobs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container">
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bookmark className="text-primary" size={28} style={{ color: 'var(--primary)' }} />
          Saved Jobs
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Manage the positions you bookmarked and keep track of your favorites.
        </p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : savedJobs.length > 0 ? (
        <div className="grid-2">
          {savedJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <Bookmark size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3, color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your saved list is empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Browse through hundreds of job postings and bookmark the ones that catch your eye.
          </p>
          <Link to="/search" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', borderRadius: '8px', textDecoration: 'none' }}>
            Browse Jobs <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
