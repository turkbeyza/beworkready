import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, Command, Sparkles, Plus, Power, Fingerprint, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  
  // Theme Toggle Logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };


  const handleLogout = async () => {
    await logOut();
    navigate('/');
    toast.success('Logged out successfully.');
  };

  return (
    <nav className="navbar">
      <div className="container">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="BeWorkReady Logo" style={{ height: '45px', objectFit: 'contain' }} />
          <span><span style={{ color: 'var(--primary)' }}>Be</span><span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>Work</span><span style={{ color: 'var(--primary)' }}>Ready</span></span>
        </NavLink>

        {/* Links */}
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            <Layers size={15} style={{ marginRight: 6 }} />
            Jobs
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
            <Command size={15} style={{ marginRight: 6 }} />
            Explore
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => isActive ? 'active' : ''}>
            <Sparkles size={15} style={{ marginRight: 6 }} />
            AI Assistant
          </NavLink>
          {user && (
            <NavLink to="/alerts" className={({ isActive }) => isActive ? 'active' : ''}>
              <Command size={15} style={{ marginRight: 6 }} />
              My Alerts
            </NavLink>
          )}
          {user && user.displayName === 'company' && (
            <NavLink to="/post-job" className={({ isActive }) => isActive ? 'active' : ''}>
              <Plus size={15} style={{ marginRight: 6 }} />
              Post Job
            </NavLink>
          )}
        </div>

        {/* Auth & Theme */}
        <div className="navbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {user ? (
            <>
              <NavLink to="/settings" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', marginRight: '0.5rem', fontWeight: 500 }} className={({ isActive }) => isActive ? 'active' : ''}>
                {user.email}
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <Power size={14} />
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
              <Fingerprint size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
