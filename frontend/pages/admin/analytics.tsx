import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, BarChart3, Database, HardDrive, Cpu, RefreshCw, ArrowLeft, Disc } from 'lucide-react';

export default function Analytics() {
  const [tokenInput, setTokenInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [flag, setFlag] = useState('');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if token exists in localStorage/cookies on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('soundwave_admin_token') || getCookie('token');
    if (savedToken) {
      setTokenInput(savedToken);
      verifyToken(savedToken);
    }
  }, []);

  const getCookie = (name: string) => {
    if (typeof window === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  const setCookie = (name: string, value: string, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Please input a JSON Web Token.');
      return;
    }
    verifyToken(tokenInput.trim());
  };

  const verifyToken = async (token: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/v1/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setAuthorized(true);
        setFlag(data.flag);
        setUser(data.user);
        // Persist token
        localStorage.setItem('soundwave_admin_token', token);
        setCookie('token', token);
      } else {
        setAuthorized(false);
        setFlag('');
        setErrorMsg(data.error || 'Verification failed. Access denied.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not reach the verification service backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthorized(false);
    setFlag('');
    setUser('');
    setTokenInput('');
    localStorage.removeItem('soundwave_admin_token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  };

  return (
    <div>
      <header>
        <div className="logo-container">
          <Disc className="logo-icon" size={32} color="#8b5cf6" />
          <span className="logo-text">SOUNDWAVE</span>
        </div>
        <nav>
          <ul className="nav-links">
            <li>
              <Link href="/" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Back to Web Player
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="container animate-fadeIn">
        {!authorized ? (
          <div className="glass-panel" style={{ maxWidth: '500px', margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <ShieldAlert size={40} color="#ef4444" />
              </div>
            </div>
            
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Admin Console Access</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '15px' }}>
              Authentication required. Please authenticate using a valid SoundWave administrator token signed by our staging authority.
            </p>

            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label className="form-label">JWT Token (Bearer Authentication)</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', resize: 'vertical', fontSize: '13px', fontFamily: 'monospace' }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '14px', marginBottom: '20px' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Authenticating token...' : 'Authorize Session'}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel admin-card">
            <div className="admin-header">
              <div className="admin-title">
                <ShieldCheck size={32} color="#10b981" />
                <span>SoundWave Mastering Administration</span>
              </div>
              <span className="status-badge">Logged in as {user} (editor)</span>
            </div>

            <p style={{ color: 'var(--text-secondary)' }}>
              Successfully authenticated session via administrative staging key. You have full edit access to the normalization metrics.
            </p>

            {/* CTF FLAG PRESENTATION */}
            <div className="flag-box">
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                🔑 FLAG CAPTURED
              </div>
              <div className="flag-text">{flag}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '40px 0 20px 0' }}>
              <h3>Pipeline Node Telemetry</h3>
              <button 
                onClick={handleVerify.bind(null, { preventDefault: () => {} } as any)} 
                className="btn-icon" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--accent-secondary)' }}
              >
                <RefreshCw size={14} /> Refresh Node
              </button>
            </div>

            <div className="metric-grid">
              <div className="metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Cpu size={16} /> CPU Usage
                </div>
                <div className="metric-value">4.2%</div>
              </div>
              <div className="metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Database size={16} /> MongoDB Storage
                </div>
                <div className="metric-value">12.8 MB</div>
              </div>
              <div className="metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <HardDrive size={16} /> Node Status
                </div>
                <div className="metric-value" style={{ color: '#10b981' }}>ONLINE</div>
              </div>
            </div>

            <div style={{ marginTop: '40px', borderTop: '1px solid var(--bg-card-border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleLogout} 
                className="btn-submit" 
                style={{ width: 'auto', padding: '10px 24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}
              >
                Terminate Session
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
