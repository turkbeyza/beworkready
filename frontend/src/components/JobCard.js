import { Link } from 'react-router-dom';
import { Compass, Timer, Globe, Coins } from 'lucide-react';

const TYPE_LABELS = {
  fulltime: 'Full-time',
  parttime: 'Part-time',
  remote:   'Remote',
  hybrid:   'Hybrid',
  contract: 'Contract',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export default function JobCard({ job, highlight }) {
  const isNew = (Date.now() - new Date(job.created_at).getTime()) < 3 * 86400000;

  function highlightText(text, hl) {
    if (!text) return '';
    if (!hl || !hl.trim()) return text;
    const cleanHl = hl.trim();
    const regex = new RegExp(`(${cleanHl.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part)
            ? <mark key={i} style={{ backgroundColor: 'rgba(251, 191, 36, 0.35)', color: 'inherit', padding: '0 2px', borderRadius: '3px', fontWeight: 600 }}>{part}</mark>
            : part
        )}
      </>
    );
  }

  function getDescriptionSnippet(desc, hl) {
    if (!desc) return '';
    const cleanDesc = desc.replace(/<[^>]*>/g, ' ');
    if (!hl || !hl.trim()) {
      return cleanDesc.slice(0, 100) + (cleanDesc.length > 100 ? '...' : '');
    }
    const idx = cleanDesc.toLowerCase().indexOf(hl.toLowerCase());
    if (idx === -1) {
      return cleanDesc.slice(0, 100) + (cleanDesc.length > 100 ? '...' : '');
    }
    const start = Math.max(0, idx - 40);
    const end = Math.min(cleanDesc.length, idx + hl.length + 60);
    let snippet = cleanDesc.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < cleanDesc.length) snippet = snippet + '...';
    return snippet;
  }

  const locationStr = [job.town, job.city, job.country].filter(Boolean).join(', ');

  return (
    <Link to={`/jobs/${job.id}`} className="job-card" id={`job-card-${job.id}`}>
      <div className="job-card-header">
        <div className="job-card-logo">
          {job.company_logo_url
            ? <img src={job.company_logo_url} alt={job.company_name} />
            : <span>{(job.company_name || '?')[0].toUpperCase()}</span>
          }
        </div>
        {isNew && <span className="tag" style={{ color: 'var(--primary)', borderColor: 'var(--border-accent)', background: 'transparent' }}>New</span>}
      </div>

      <div className="job-info" style={{ marginBottom: '0.75rem' }}>
        <div className="job-title">{highlightText(job.title, highlight)}</div>
        <div className="job-company">{highlightText(job.company_name || 'Confidential Company', highlight)}</div>
      </div>

      {/* Description Snippet */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
        {highlightText(getDescriptionSnippet(job.description, highlight), highlight)}
      </div>

      <div className="job-tags" style={{ padding: 0 }}>
        {locationStr && (
          <span className="tag tag-location">
            <Compass size={12} /> {highlightText(locationStr, highlight)}
          </span>
        )}
        {job.working_type && (
          <span className="tag tag-type">
            {TYPE_LABELS[job.working_type] || job.working_type}
          </span>
        )}
        {job.salary_min && (
          <span className="tag tag-salary">
            <Coins size={12} /> {job.salary_min.toLocaleString()} {job.currency || 'USD'}+
          </span>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Timer size={12} />
          {formatDate(job.created_at)}
        </span>
        {job.application_count > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Globe size={12} />
            {job.application_count} applied
          </span>
        )}
      </div>
    </Link>
  );
}
