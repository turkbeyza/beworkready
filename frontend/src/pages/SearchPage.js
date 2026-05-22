import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search as SearchIcon, Bell, X } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import JobCard from '../components/JobCard';
import { searchJobs, createJobAlert, autocomplete } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const WORKING_TYPES = [
  { id: 'fulltime', label: 'Full-time' },
  { id: 'parttime', label: 'Part-time' },
  { id: 'remote',   label: 'Remote' },
  { id: 'hybrid',   label: 'Hybrid' },
  { id: 'contract', label: 'Contract' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Alert Modal States
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertData, setAlertData] = useState({
    keyword: '',
    city: '',
    working_type: '',
    salary_min: ''
  });

  const { user } = useAuth();

  // Active query parameters
  const currentTitle   = searchParams.get('title') || '';
  const currentCity    = searchParams.get('city') || '';
  const currentCountry = searchParams.get('country') || '';
  const currentTown    = searchParams.get('town') || '';
  const currentType    = searchParams.get('working_type') || '';
  const currentMinSalary = searchParams.get('salary_min') || '0';
  const currentMaxSalary = searchParams.get('salary_max') || '250000';
  const currentPage    = Number(searchParams.get('page')) || 1;

  // Filter input states
  const [countryInput, setCountryInput] = useState(currentCountry);
  const [cityInput, setCityInput]       = useState(currentCity);
  const [townInput, setTownInput]       = useState(currentTown);

  // Slider states
  const [sliderMin, setSliderMin] = useState(Number(currentMinSalary));
  const [sliderMax, setSliderMax] = useState(Number(currentMaxSalary));

  // Autocomplete lists
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [townSuggestions, setTownSuggestions] = useState([]);

  // Browser-detected city
  const [geoCity, setGeoCity] = useState('');
  const [geoCityLoading, setGeoCityLoading] = useState(false);
  // Track if user explicitly cleared the city so geo won't re-fill it
  const userClearedCityRef = useRef(false);

  // Detect city from geolocation once on mount.
  // If no city is in the URL yet, auto-apply the geo city to URL params so the ✕ button can remove it.
  useEffect(() => {
    // If URL already has a city, don't override it with geo
    if (currentCity) return;
    setGeoCityLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const r = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
            );
            const d = await r.json();
            const detected = d.city || d.principalSubdivision || '';
            if (detected && !userClearedCityRef.current) {
              setGeoCity(detected);
              setCityInput(detected);
              // Auto-apply to URL so the ✕ button can clear it properly
              const next = new URLSearchParams(searchParams);
              next.set('city', detected);
              next.set('page', '1');
              setSearchParams(next, { replace: true });
            }
          } catch (e) {}
          setGeoCityLoading(false);
        },
        () => setGeoCityLoading(false)
      );
    } else {
      setGeoCityLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filter inputs with URL param changes
  const prevCityRef = useRef(undefined);
  useEffect(() => {
    setCountryInput(currentCountry);
    const prevCity = prevCityRef.current;
    if (prevCity !== undefined) {
      setCityInput(currentCity);
      // If city was cleared (went from something to ''), mark that user cleared it
      if (prevCity !== '' && currentCity === '') {
        userClearedCityRef.current = true;
      }
    }
    prevCityRef.current = currentCity;
    setTownInput(currentTown);
    setSliderMin(Number(currentMinSalary));
    setSliderMax(Number(currentMaxSalary));
  }, [currentCountry, currentCity, currentTown, currentMinSalary, currentMaxSalary]);





  // City and Town Autocomplete fetchers
  useEffect(() => {
    if (cityInput.length >= 2) {
      autocomplete(cityInput, 'city')
        .then(res => setCitySuggestions(res.data.data || []))
        .catch(() => {});
    } else {
      setCitySuggestions([]);
    }
  }, [cityInput]);

  useEffect(() => {
    if (townInput.length >= 2) {
      autocomplete(townInput, 'town')
        .then(res => setTownSuggestions(res.data.data || []))
        .catch(() => {});
    } else {
      setTownSuggestions([]);
    }
  }, [townInput]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data } = await searchJobs({
          title: currentTitle,
          city: currentCity,
          country: currentCountry,
          town: currentTown,
          working_type: currentType,
          salary_min: currentMinSalary === '0' ? '' : currentMinSalary,
          salary_max: currentMaxSalary === '250000' ? '' : currentMaxSalary,
          page: currentPage,
          limit: 10,
        });
        setJobs(data.data || []);
        setTotal(data.total || 0);
        window.scrollTo(0, 0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [currentTitle, currentCity, currentCountry, currentTown, currentType, currentMinSalary, currentMaxSalary, currentPage]);

  const handleSearch = ({ title, city }) => {
    searchParams.set('title', title);
    searchParams.set('city', city);
    searchParams.set('page', 1);
    setSearchParams(searchParams);
  };

  const handleTypeToggle = (typeId) => {
    if (currentType === typeId) {
      searchParams.delete('working_type');
    } else {
      searchParams.set('working_type', typeId);
    }
    searchParams.set('page', 1);
    setSearchParams(searchParams);
  };

  const applyTextFilter = (key, value) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    searchParams.set('page', 1);
    setSearchParams(searchParams);
  };

  const applySalaryFilter = (minVal, maxVal) => {
    searchParams.set('salary_min', minVal);
    searchParams.set('salary_max', maxVal);
    searchParams.set('page', 1);
    setSearchParams(searchParams);
  };

  const removeFilter = (key) => {
    searchParams.delete(key);
    searchParams.set('page', 1);
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    const title = searchParams.get('title') || '';
    const newParams = new URLSearchParams();
    if (title) newParams.set('title', title);
    setSearchParams(newParams);
  };

  const openAlertModal = () => {
    if (!user) {
      toast.error('You must be logged in to create a job alert.');
      return;
    }
    setAlertData({
      keyword: currentTitle || '',
      city: currentCity || '',
      working_type: currentType || '',
      salary_min: ''
    });
    setIsAlertModalOpen(true);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setAlertLoading(true);
    try {
      await createJobAlert({
        email: user.email,
        city: alertData.city === 'any' ? '' : alertData.city,
        keyword: alertData.keyword,
        working_type: alertData.working_type === 'any' ? '' : alertData.working_type,
        salary_min: alertData.salary_min
      });
      toast.success('Job alert created successfully! We will email you when new jobs match.');
      setIsAlertModalOpen(false);
    } catch (err) {
      toast.error('Failed to create job alert.');
    } finally {
      setAlertLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 10);

  // Active filter tags definition
  const activeFilters = [];
  if (currentCountry) activeFilters.push({ key: 'country', label: `Country: ${currentCountry}` });
  if (currentCity)    activeFilters.push({ key: 'city', label: `City: ${currentCity}` });
  if (currentTown)    activeFilters.push({ key: 'town', label: `Town: ${currentTown}` });
  if (currentType) {
    const typeLabel = WORKING_TYPES.find(t => t.id === currentType)?.label || currentType;
    activeFilters.push({ key: 'working_type', label: `Type: ${typeLabel}` });
  }
  if (currentMinSalary !== '0') activeFilters.push({ key: 'salary_min', label: `Min: ${Number(currentMinSalary).toLocaleString()} TRY` });
  if (currentMaxSalary !== '250000') activeFilters.push({ key: 'salary_max', label: `Max: ${Number(currentMaxSalary).toLocaleString()} TRY` });

  const minPercent = (sliderMin / 250000) * 100;
  const maxPercent = (sliderMax / 250000) * 100;

  return (
    <div className="page container">
      <div style={{ marginBottom: '3rem' }}>
        <SearchBar initialTitle={currentTitle} initialCity={currentCity} onSearch={handleSearch} />
      </div>

      <div className="grid-sidebar">
        {/* Filters */}
        <aside>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.05rem' }}>
                <SlidersHorizontal size={16} /> Filters
              </h3>
              {activeFilters.length > 0 && (
                <button 
                  onClick={clearAllFilters}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Country Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '0.4rem' }}>Country</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Turkey"
                  value={countryInput}
                  onChange={e => setCountryInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyTextFilter('country', countryInput)}
                />
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0 0.75rem' }} 
                  onClick={() => applyTextFilter('country', countryInput)}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* City Input with suggestions + geolocation badge */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                City
                {geoCityLoading && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📡 detecting...</span>}
                {!geoCityLoading && geoCity && currentCity === geoCity && (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(37,99,235,0.12)', color: 'var(--primary)', padding: '1px 8px', borderRadius: '999px', fontWeight: 600 }}>
                    📍 Your location
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Leave empty to see all cities"
                    value={cityInput}
                    list="city-options"
                    style={{ paddingRight: cityInput ? '2.2rem' : undefined }}
                    onChange={e => setCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyTextFilter('city', cityInput)}
                  />
                  {cityInput && (
                    <button
                      type="button"
                      onClick={() => { setCityInput(''); applyTextFilter('city', ''); }}
                      style={{
                        position: 'absolute', right: '0.5rem', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: '20px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                      }}
                      title="Clear city — show all locations"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <datalist id="city-options">
                  {citySuggestions.map((c, i) => <option key={i} value={c} />)}
                </datalist>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0 0.75rem' }}
                  onClick={() => applyTextFilter('city', cityInput)}
                >
                  Apply
                </button>
              </div>
            </div>



            {/* Town Input with suggestions */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '0.4rem' }}>Town</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Bornova"
                  value={townInput}
                  list="town-options"
                  onChange={e => setTownInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyTextFilter('town', townInput)}
                />
                <datalist id="town-options">
                  {townSuggestions.map((t, i) => <option key={i} value={t} />)}
                </datalist>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0 0.75rem' }} 
                  onClick={() => applyTextFilter('town', townInput)}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Work Type Preference */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label" style={{ marginBottom: '0.75rem' }}>Work Type</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {WORKING_TYPES.map(type => (
                  <button
                    key={type.id}
                    className={`tag ${currentType === type.id ? '' : 'btn-ghost'}`}
                    style={{ 
                      justifyContent: 'flex-start', 
                      background: currentType === type.id ? 'var(--bg-elevated)' : 'transparent',
                      border: currentType === type.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                      color: currentType === type.id ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                    onClick={() => handleTypeToggle(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Range Salary Slider */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label" style={{ marginBottom: '0.5rem' }}>Salary Range (TRY)</div>
              
              <div className="range-slider-wrapper">
                <div 
                  className="range-slider-track" 
                  style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} 
                />
                <input 
                  type="range" 
                  min="0" 
                  max="250000" 
                  step="5000"
                  value={sliderMin} 
                  className="range-slider-input"
                  onChange={(e) => {
                    const value = Math.min(Number(e.target.value), sliderMax - 5000);
                    setSliderMin(value);
                  }}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="250000" 
                  step="5000"
                  value={sliderMax} 
                  className="range-slider-input"
                  onChange={(e) => {
                    const value = Math.max(Number(e.target.value), sliderMin + 5000);
                    setSliderMax(value);
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>{sliderMin.toLocaleString()} TRY</span>
                <span>{sliderMax.toLocaleString()} TRY</span>
              </div>
            </div>

            {/* Apply All Filters button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => {
                applyTextFilter('country', countryInput);
                applyTextFilter('city', cityInput);
                applyTextFilter('town', townInput);
                applySalaryFilter(sliderMin, sliderMax);
              }}
            >
              Apply All Filters
            </button>

          </div>
        </aside>

        {/* Results */}
        <main>
          {/* Active Filters Tag list at the top */}
          {activeFilters.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Active Filters:</span>
              {activeFilters.map(f => (
                <div 
                  key={f.key} 
                  className="tag" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem', 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem'
                  }}
                >
                  {f.label}
                  <button 
                    onClick={() => removeFilter(f.key)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {total} jobs found {currentTitle && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>for "{currentTitle}"</span>}
            </h2>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={openAlertModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Bell size={16} /> Create Job Alert
            </button>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : jobs.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} highlight={currentTitle} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={currentPage === 1}
                    onClick={() => { searchParams.set('page', currentPage - 1); setSearchParams(searchParams); }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => { searchParams.set('page', currentPage + 1); setSearchParams(searchParams); }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <SearchIcon size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3>No results found</h3>
              <p>Try adjusting your search criteria.</p>
            </div>
          )}
        </main>
      </div>

      {/* Alert Modal */}
      {isAlertModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative', margin: '1rem' }}>
            <button 
              onClick={() => setIsAlertModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} className="text-primary" /> Setup Job Alert
            </h3>
            <form onSubmit={handleCreateAlert}>
              <div className="form-group">
                <label className="form-label">Keyword / Position</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Developer (Leave empty for any)" 
                  value={alertData.keyword} 
                  onChange={e => setAlertData({...alertData, keyword: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Istanbul (Leave empty for any)" 
                  value={alertData.city} 
                  onChange={e => setAlertData({...alertData, city: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Work Type</label>
                <select 
                  className="form-select" 
                  value={alertData.working_type} 
                  onChange={e => setAlertData({...alertData, working_type: e.target.value})}
                >
                  <option value="">Any Work Type</option>
                  <option value="fulltime">Full-time</option>
                  <option value="parttime">Part-time</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Salary</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 50000 (Leave empty for any)" 
                  value={alertData.salary_min} 
                  onChange={e => setAlertData({...alertData, salary_min: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={alertLoading}>
                {alertLoading ? 'Saving...' : 'Save Job Alert'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
