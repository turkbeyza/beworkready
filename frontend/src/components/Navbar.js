import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, Command, Sparkles, Plus, Power, Fingerprint, Sun, Moon, Bookmark, Settings, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';

export default function Navbar() {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  
  // Theme Toggle Logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Click outside listener for the profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

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
        <NavLink to="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/logo.png" alt="BeWorkReady Logo" style={{ height: '42px', objectFit: 'contain' }} />
          <span><span style={{ color: 'var(--primary)' }}>Be</span><span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>Work</span><span style={{ color: 'var(--primary)' }}>Ready</span></span>
        </NavLink>

        {/* Links */}
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            <Layers size={16} />
            Jobs
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
            <Command size={16} />
            Explore
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => isActive ? 'active' : ''}>
            <Sparkles size={16} />
            AI Assistant
          </NavLink>
          {user && user.displayName === 'company' && (
            <NavLink to="/post-job" className={({ isActive }) => isActive ? 'active' : ''}>
              <Plus size={16} />
              Post Job
            </NavLink>
          )}
        </div>

        {/* Auth & Theme */}
        <div className="navbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          
          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-menu-trigger"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '30px',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {user.email ? user.email[0].toUpperCase() : <User size={12} />}
                </div>
                <span className="user-email-text" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown-menu" style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '0.5rem 0',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ padding: '0.8rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                    Signed in as <br/>
                    <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.9rem' }}>{user.email}</strong>
                    {user.displayName && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <span className="tag" style={{ padding: '0.15rem 0.5rem', textTransform: 'capitalize' }}>{user.displayName}</span>
                      </div>
                    )}
                  </div>
                  
                  <NavLink to="/saved" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Bookmark size={15} /> Saved Jobs
                  </NavLink>
                  <NavLink to="/alerts" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Command size={15} /> My Alerts
                  </NavLink>
                  <NavLink to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Settings size={15} /> Settings
                  </NavLink>
                  
                  <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
                  
                  <button 
                    onClick={() => { handleLogout(); setShowUserMenu(false); }}
                    className="dropdown-item"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontFamily: 'inherit',
                      padding: '0.7rem 1.25rem'
                    }}
                  >
                    <Power size={15} style={{ color: '#ef4444' }} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')} style={{ borderRadius: '30px', padding: '0.5rem 1.2rem' }}>
              <Fingerprint size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
