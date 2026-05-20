import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createJob, getCompanyJobs, deleteJob, updateJob } from '../services/api';
import toast from 'react-hot-toast';
import { Briefcase, Users, Calendar, MapPin, Trash2, Edit2, X, ExternalLink } from 'lucide-react';

const EMPTY_FORM = {
  title: '', company_name: '', company_logo_url: '', city: '',
  country: 'Turkey', town: '', working_type: 'fulltime',
  salary_min: '', salary_max: '', description: ''
};

export default function PostJobPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('post');
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Edit state
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (user && user.displayName === 'company' && activeTab === 'dashboard') {
      fetchMyJobs();
    }
  }, [user, activeTab]);

  const fetchMyJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await getCompanyJobs();
      setMyJobs(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load your jobs.');
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await deleteJob(id);
      toast.success('Job deleted successfully');
      fetchMyJobs();
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const startEdit = (job) => {
    setEditingJob(job.id);
    setEditForm({
      title: job.title || '',
      company_name: job.company_name || '',
      company_logo_url: job.company_logo_url || '',
      city: job.city || '',
      country: job.country || 'Turkey',
      town: job.town || '',
      working_type: job.working_type || 'fulltime',
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      description: job.description || '',
    });
  };

  const cancelEdit = () => { setEditingJob(null); setEditForm(EMPTY_FORM); };

  const handleEditSubmit = async (e, jobId) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        salary_min: editForm.salary_min ? Number(editForm.salary_min) : null,
        salary_max: editForm.salary_max ? Number(editForm.salary_max) : null,
      };
      await updateJob(jobId, payload);
      toast.success('Job updated successfully!');
      setEditingJob(null);
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update job.');
    }
  };

  if (!user || user.displayName !== 'company') {
    return (
      <div className="page container">
        <div className="empty-state">
          <h3>You must be logged in as a Company to post a job.</h3>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        salary_min: formData.salary_min ? Number(formData.salary_min) : null,
        salary_max: formData.salary_max ? Number(formData.salary_max) : null,
      };
      const res = await createJob(dataToSubmit);
      toast.success('Job posted successfully!');
      navigate(`/jobs/${res.data.data.id}`);
    } catch (err) {
      const msgs = err.response?.data?.errors?.map(e => e.msg).join(', ') || err.response?.data?.message || 'Failed to post job.';
      toast.error(msgs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button
          className="btn btn-ghost"
          style={{ borderBottom: activeTab === 'post' ? '2px solid var(--primary)' : 'none', borderRadius: 0, paddingBottom: '1rem' }}
          onClick={() => setActiveTab('post')}
        >
          Post a New Job
        </button>
        <button
          className="btn btn-ghost"
          style={{ borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : 'none', borderRadius: 0, paddingBottom: '1rem' }}
          onClick={() => setActiveTab('dashboard')}
        >
          My Jobs &amp; Applicants
        </button>
      </div>

      {activeTab === 'post' && (
        <>
          <h2 className="section-title">Post a New Job</h2>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Job Title *</label>
                  <input required name="title" className="form-input" placeholder="e.g. Senior Frontend Developer" onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input required name="company_name" className="form-input" placeholder="e.g. Tech Corp" onChange={handleChange} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input required name="city" className="form-input" placeholder="e.g. Izmir" onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Town</label>
                  <input name="town" className="form-input" placeholder="e.g. Bornova" onChange={handleChange} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Country *</label>
                  <input required name="country" className="form-input" defaultValue="Turkey" onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Type *</label>
                  <select required name="working_type" className="form-select" value={formData.working_type} onChange={handleChange}>
                    <option value="fulltime">Full-time</option>
                    <option value="parttime">Part-time</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Minimum Salary</label>
                  <input type="number" name="salary_min" className="form-input" placeholder="e.g. 80000" onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Logo URL</label>
                  <input type="url" name="company_logo_url" className="form-input" placeholder="https://..." onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Job Description *</label>
                <textarea required name="description" className="form-textarea" placeholder="Requirements, responsibilities, etc." onChange={handleChange} />
              </div>
              <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Posting...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {activeTab === 'dashboard' && (
        <div>
          <h2 className="section-title">Company Dashboard</h2>
          {loadingJobs ? (
            <div className="spinner" />
          ) : myJobs.length === 0 ? (
            <div className="empty-state">You haven't posted any jobs yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {myJobs.map(job => (
                <div key={job.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  {editingJob === job.id ? (
                    /* ─── Inline Edit Form ─── */
                    <form onSubmit={(e) => handleEditSubmit(e, job.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Editing: {job.title}</h3>
                        <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm"><X size={16} /></button>
                      </div>
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Job Title</label>
                          <input className="form-input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Company Name</label>
                          <input className="form-input" value={editForm.company_name} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">City</label>
                          <input className="form-input" value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Work Type</label>
                          <select className="form-select" value={editForm.working_type} onChange={e => setEditForm(p => ({ ...p, working_type: e.target.value }))}>
                            <option value="fulltime">Full-time</option>
                            <option value="parttime">Part-time</option>
                            <option value="remote">Remote</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="contract">Contract</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Min Salary</label>
                          <input type="number" className="form-input" value={editForm.salary_min} onChange={e => setEditForm(p => ({ ...p, salary_min: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Salary</label>
                          <input type="number" className="form-input" value={editForm.salary_max} onChange={e => setEditForm(p => ({ ...p, salary_max: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={cancelEdit} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                      </div>
                    </form>
                  ) : (
                    /* ─── Normal Card ─── */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {job.title}
                              <ExternalLink size={14} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                            </h3>
                          </Link>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {job.city}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Briefcase size={14} /> {job.working_type}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {new Date(job.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{job.application_count}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Applicants</div>
                          </div>
                          <button onClick={() => startEdit(job)} className="btn btn-ghost" title="Edit Job" style={{ padding: '0.5rem', color: 'var(--primary)' }}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDeleteJob(job.id)} className="btn btn-ghost" title="Delete Job" style={{ padding: '0.5rem', color: '#ef4444' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {job.applications && job.applications.length > 0 && (
                        <div style={{ marginTop: '1.5rem', background: 'var(--bg-base)', padding: '1rem', borderRadius: '8px' }}>
                          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={16} /> Recent Applications
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {job.applications.map(app => (
                              <div key={app.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{app.user_email}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                  Applied on {new Date(app.applied_at).toLocaleDateString()}
                                </div>
                                {app.cover_note && (
                                  <div style={{ fontSize: '0.85rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '4px', fontStyle: 'italic' }}>
                                    "{app.cover_note}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
