import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Compass, Search, X } from 'lucide-react';
import { autocomplete } from '../services/api';

export default function SearchBar({ initialTitle = '', initialCity = '', onSearch }) {
  const [title, setTitle] = useState(initialTitle);
  const [city, setCity] = useState(initialCity);
  const navigate = useNavigate();

  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Track whether the user explicitly cleared the city field.
  // If true, we skip the geolocation auto-fill so the user's clear is respected.
  const userClearedCity = useRef(false);

  // Sync with parent prop changes (e.g. URL changes)
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setCity(initialCity);
    // If the URL city is now empty AND the user had explicitly cleared it, keep it empty.
    // If the URL city was set externally (non-empty), reset the cleared flag.
    if (initialCity) {
      userClearedCity.current = false;
    }
  }, [initialCity]);

  // Auto-fill city from geolocation — ONLY if no initialCity and user hasn't cleared manually
  useEffect(() => {
    if (!initialCity && !userClearedCity.current) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const data = await response.json();
              const detectedCity = data.city || data.principalSubdivision || '';
              if (detectedCity && !userClearedCity.current) {
                setCity(detectedCity);
              }
            } catch (e) {
              console.error('Failed to resolve city from coords', e);
            }
          },
          (err) => console.log('Geolocation denied:', err.message)
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocomplete for Title
  useEffect(() => {
    if (title.length < 2) { setTitleSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await autocomplete(title, 'title');
        setTitleSuggestions(data.data || []);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [title]);

  // Autocomplete for City
  useEffect(() => {
    if (city.length < 2) { setCitySuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await autocomplete(city, 'city');
        setCitySuggestions(data.data || []);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [city]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowTitleDropdown(false);
    setShowCityDropdown(false);
    if (onSearch) {
      onSearch({ title, city });
    } else {
      const params = new URLSearchParams();
      if (title) params.append('title', title);
      if (city) params.append('city', city);
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleClearCity = () => {
    userClearedCity.current = true;
    setCity('');
    setCitySuggestions([]);
    if (onSearch) {
      onSearch({ title, city: '' });
    } else {
      const params = new URLSearchParams();
      if (title) params.append('title', title);
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      {/* Title input */}
      <div className="search-input-wrap">
        <Command className="icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Role, company, or keywords"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setShowTitleDropdown(true); }}
          onFocus={() => { if (titleSuggestions.length > 0) setShowTitleDropdown(true); }}
          onBlur={() => setTimeout(() => setShowTitleDropdown(false), 200)}
        />
        {showTitleDropdown && titleSuggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {titleSuggestions.map((s, idx) => (
              <div key={idx} className="autocomplete-item" onMouseDown={() => { setTitle(s); setShowTitleDropdown(false); }}>
                <Search size={14} /> {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="search-divider" />

      {/* City input with clear button */}
      <div className="search-input-wrap" style={{ flex: 0.6, position: 'relative' }}>
        <Compass className="icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="City (leave empty for all)"
          value={city}
          style={{ paddingRight: city ? '2.2rem' : undefined }}
          onChange={(e) => { setCity(e.target.value); setShowCityDropdown(true); }}
          onFocus={() => { if (citySuggestions.length > 0) setShowCityDropdown(true); }}
          onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
        />
        {/* ✕ Clear city button — visible whenever city has a value */}
        {city && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleClearCity(); }}
            title="Clear city — show all locations"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 0,
              flexShrink: 0,
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
        {showCityDropdown && citySuggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {citySuggestions.map((s, idx) => (
              <div key={idx} className="autocomplete-item" onMouseDown={() => { setCity(s); setShowCityDropdown(false); }}>
                <Search size={14} /> {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem', borderRadius: 'var(--radius-sm)' }}>
        Find Jobs
      </button>
    </form>
  );
}
