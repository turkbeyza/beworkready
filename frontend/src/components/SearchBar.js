import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Compass, Search } from 'lucide-react';
import { autocomplete } from '../services/api';

export default function SearchBar({ initialTitle = '', initialCity = '', onSearch }) {
  const [title, setTitle] = useState(initialTitle);
  const [city, setCity]   = useState(initialCity);
  const navigate = useNavigate();

  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions]   = useState([]);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown]   = useState(false);

  // Set initial city from browser location if not provided
  useEffect(() => {
    if (!initialCity) {
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
              if (detectedCity) {
                setCity(detectedCity);
                if (onSearch && !title) {
                  onSearch({ title, city: detectedCity });
                }
              }
            } catch (e) {
              console.error('Failed to resolve city from coords', e);
            }
          },
          (err) => console.log('Geolocation permission denied or error:', err.message)
        );
      }
    }
  }, [initialCity]);

  // Autocomplete for Title
  useEffect(() => {
    if (title.length < 2) {
      setTitleSuggestions([]);
      return;
    }
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
    if (city.length < 2) {
      setCitySuggestions([]);
      return;
    }
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
      if (city)  params.append('city', city);
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
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

      <div className="search-input-wrap" style={{ flex: 0.6 }}>
        <Compass className="icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="City or location"
          value={city}
          onChange={(e) => { setCity(e.target.value); setShowCityDropdown(true); }}
          onFocus={() => { if (citySuggestions.length > 0) setShowCityDropdown(true); }}
          onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
        />
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
