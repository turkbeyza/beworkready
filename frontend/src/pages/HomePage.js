import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Timer, Box, X } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import JobCard from '../components/JobCard';
import { getJobs, getJobsByCity, getHistory, deleteHistoryItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [jobs, setJobs] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detectedCity, setDetectedCity] = useState('');
  const [cityJobsFound, setCityJobsFound] = useState(false);
  const { user } = useAuth();
  const location = useLocation(); // track navigation to re-fetch on return

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        let resolvedCity = '';
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                  const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                  );
                  const geoData = await response.json();
                  resolvedCity = geoData.city || geoData.principalSubdivision || '';
                  if (resolvedCity) setDetectedCity(resolvedCity);
                } catch (e) { }
                resolve();
              },
              () => resolve()
            );
          });
        }

        let cityJobs = [];
        if (resolvedCity) {
          try {
            const { data: cityJobRes } = await getJobsByCity(resolvedCity);
            cityJobs = cityJobRes.data || [];
          } catch (e) {
            console.error('City-based job fetch failed:', e);
          }
        }

        // Fetch general jobs and merge them, keeping exactly 6 jobs
        try {
          const { data: fallbackJobRes } = await getJobs({ limit: 12 });
          const fallbackJobs = fallbackJobRes.data || [];
          
          // Deduplicate to avoid showing same job twice
          const cityJobIds = new Set(cityJobs.map(j => j.id));
          const uniqueFallback = fallbackJobs.filter(j => !cityJobIds.has(j.id));

          // Merge: start with city jobs, then fill up to 6 with fallback jobs
          const merged = [...cityJobs];
          while (merged.length < 6 && uniqueFallback.length > 0) {
            merged.push(uniqueFallback.shift());
          }

          setJobs(merged.slice(0, 6));
          setCityJobsFound(cityJobs.length > 0);
        } catch (fallbackErr) {
          console.error('Fallback job fetch failed:', fallbackErr);
          setJobs(cityJobs.slice(0, 6));
          setCityJobsFound(cityJobs.length > 0);
        }

        if (user) {
          const { data: histRes } = await getHistory();
          const uniqueSearches = [];
          const seen = new Set();
          for (const item of histRes.data || []) {
            // dedup by query+city+workingType combination
            const key = `${(item.query || '').toLowerCase()}|${(item.city || '').toLowerCase()}|${item.workingType || ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueSearches.push(item);
              if (uniqueSearches.length >= 5) break;
            }
          }
          setRecentSearches(uniqueSearches);
        } else {
          setRecentSearches([]);
        }
      } catch (err) {
        console.error('Home page data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, [user, location.pathname]); // re-fetch whenever user navigates back to home

  const handleDeleteHistory = async (id) => {
    try {
      await deleteHistoryItem(id);
      setRecentSearches(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('Failed to delete search history item:', err);
    }
  };

  return (
    <div className="page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">

          <h1>
            Discover Your <br />
            <span className="text-gradient">Next Opportunity</span>
          </h1>
          <p>
            Find the best roles from top companies and navigate your career path with our AI-powered assistant.
          </p>

          <SearchBar />

          {/* Recent Searches */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Recent Searches
            </p>
            {user && recentSearches.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {recentSearches.map(s => {
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
                      className="tag"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                    >
                      <Link
                        to={`/search?${params.toString()}`}
                        style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Timer size={12} style={{ flexShrink: 0 }} />
                        <span>{displayText}</span>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteHistory(s._id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '2px',
                          opacity: 0.7,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        title="Delete search"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : user ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Search for jobs to see your recent searches here.
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link> to see your recent searches.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="container" style={{ marginTop: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            {cityJobsFound && detectedCity ? `Jobs Near You in ${detectedCity}` : 'Jobs Picked For You'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {cityJobsFound && detectedCity
              ? `Top open positions in ${detectedCity} matching your location.`
              : 'Curated job postings selected especially for you.'}
          </p>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : jobs.length > 0 ? (
          <>
            <div className="grid-2">
              {jobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
              <Link 
                to={cityJobsFound && detectedCity ? `/search?city=${encodeURIComponent(detectedCity)}` : '/search'} 
                className="btn btn-primary"
                style={{ 
                  padding: '0.8rem 2.5rem', 
                  borderRadius: '30px', 
                  fontSize: '0.95rem', 
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Explore More Jobs
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Box size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>No jobs available right now.</h3>
          </div>
        )}
      </section>
    </div>
  );
}
