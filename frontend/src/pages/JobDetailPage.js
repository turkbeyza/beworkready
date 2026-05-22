import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Compass, Timer, Globe, Coins, Box, SendHorizonal, RefreshCw, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import JobCard from '../components/JobCard';
import { getJobDetail, applyToJob, saveJob, unsaveJob } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  
  const [showApply, setShowApply] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await getJobDetail(id);
        setData(res.data.data);
        setIsSaved(res.data.data.is_saved || false);
      } catch (err) {
        toast.error('Job not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
    window.scrollTo(0, 0);
  }, [id]);

  const handleApplyClick = () => {
    if (!user) {
      toast.error('Please sign in to apply.');
      navigate('/login');
      return;
    }
    setShowApply(true);
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save jobs.');
      navigate('/login');
      return;
    }
    try {
      if (isSaved) {
        await unsaveJob(data.id);
        toast.success('Job removed from saved list.');
        setIsSaved(false);
      } else {
        await saveJob(data.id);
        toast.success('Job saved successfully!');
        setIsSaved(true);
      }
    } catch (err) {
      toast.error('Failed to update saved status.');
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      await applyToJob({ job_id: id, cover_note: coverNote });
      toast.success('Application submitted successfully!');
      setShowApply(false);
      setData(prev => ({ ...prev, application_count: prev.application_count + 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="page container"><div className="spinner" /></div>;
  if (!data) return <div className="page container"><div className="empty-state">Job not found.</div></div>;

  const wasUpdated = data.updated_at && data.updated_at !== data.created_at;

  return (
    <div className="page container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="job-card-logo" style={{ width: 80, height: 80, fontSize: '2rem' }}>
          {data.company_logo_url 
            ? <img src={data.company_logo_url} alt={data.company_name} />
            : (data.company_name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{data.title}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1rem' }}>{data.company_name || 'Confidential Company'}</div>
          
          <div className="job-tags">
            {data.city && <span className="tag"><Compass size={12}/> {data.city}, {data.country}</span>}
            {data.working_type && <span className="tag"><Box size={12}/> {data.working_type}</span>}
            {data.salary_min && (
              <span className="tag">
                <Coins size={12}/> {data.salary_min.toLocaleString()} - {data.salary_max?.toLocaleString()} {data.currency}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className="btn btn-ghost" 
              onClick={handleSaveToggle}
              style={{ 
                padding: '0.55rem 1rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: isSaved ? 'var(--primary)' : 'var(--text-secondary)'
              }}
              title={isSaved ? "Unsave Job" : "Save Job"}
            >
              <Bookmark size={16} fill={isSaved ? "var(--primary)" : "none"} />
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button className="btn btn-primary" onClick={handleApplyClick} disabled={showApply}>
              <SendHorizonal size={16} /> Apply Now
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
            <span><Timer size={12} style={{marginRight:4}}/> Posted: {new Date(data.created_at).toLocaleDateString('en-US')}</span>
            {wasUpdated && (
              <span style={{ color: 'var(--accent)' }}>
                <RefreshCw size={12} style={{marginRight:4}}/> Updated: {new Date(data.updated_at).toLocaleDateString('en-US')}
              </span>
            )}
            <span><Globe size={12} style={{marginRight:4}}/> {data.application_count} applicants</span>
          </div>
        </div>
      </div>

      {/* Application Form */}
      {showApply && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Quick Apply</h3>
          <form onSubmit={submitApplication}>
            <div className="form-group">
              <label className="form-label">Cover Note (Optional)</label>
              <textarea 
                className="form-textarea" 
                placeholder="Why are you a good fit for this role?"
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowApply(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={applying}>
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main content: description left, similar jobs right */}
      <div style={{ display: 'grid', gridTemplateColumns: data.related_jobs?.length > 0 ? '1fr 340px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Job Description */}
        <div className="card">
          <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Job Description</h2>
          <div 
            style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '0.97rem' }}
            dangerouslySetInnerHTML={{ __html: data.description.replace(/\n/g, '<br/>') }}
          />
        </div>

        {/* Similar Jobs sidebar */}
        {data.related_jobs && data.related_jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Similar Jobs</h3>
            {data.related_jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
