import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, Disc, Music, BarChart2, ShieldAlert, Sliders, Radio, Volume2 } from 'lucide-react';
import { SOUNDWAVE_DEV_BYPASS_TOKEN } from '../src/config/dev-defaults';

interface Episode {
  id: number;
  title: string;
  artist: string;
  description: string;
  duration: string;
  coverUrl: string;
  audioUrl: string;
  isPrivate: boolean;
}

export default function Home() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Staging configuration validation
    if (typeof window !== 'undefined' && window.location.search.includes('verify_staging_token')) {
      console.log('Staging configuration check active. Token value loaded: ', SOUNDWAVE_DEV_BYPASS_TOKEN);
    }

    // Fetch episodes from backend
    fetch('/api/v1/episodes/list')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tracks');
        return res.json();
      })
      .then((data: Episode[]) => {
        setEpisodes(data);
        if (data.length > 0) {
          setCurrentEpisode(data[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not connect to SoundWave API service.');
        setLoading(false);
      });
  }, []);

  const handlePlayPause = () => {
    if (!currentEpisode) return;
    setIsPlaying(!isPlaying);
  };

  const selectEpisode = (ep: Episode) => {
    setCurrentEpisode(ep);
    setIsPlaying(true);
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
              <Link href="/" className="nav-link">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/analytics" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} /> Admin Console
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="container animate-fadeIn">
        <section className="hero">
          <h1>Automatic AI <span>Audio Normalization</span></h1>
          <p>
            Upload raw audio. Our intelligent neural mastering engine balances levels, enforces broadcast standards (-14 LUFS), and optimizes transient response instantly.
          </p>
        </section>

        <div className="dashboard-grid">
          {/* Left panel: Tracks */}
          <div className="glass-panel">
            <div className="ep-list-header">
              <h2>Mastered Audio Pipeline</h2>
              <Sliders size={20} color="#06b6d4" />
            </div>

            {loading && <p style={{ color: '#94a3b8' }}>Scanning AI pipeline tracks...</p>}
            {error && <p style={{ color: '#ef4444' }}>{error}</p>}

            {!loading && !error && (
              <div className="ep-list">
                {episodes.map(ep => (
                  <div
                    key={ep.id}
                    className={`ep-card ${currentEpisode?.id === ep.id ? 'active-ep' : ''}`}
                    onClick={() => selectEpisode(ep)}
                    style={{
                      borderColor: currentEpisode?.id === ep.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                      background: currentEpisode?.id === ep.id ? 'rgba(139, 92, 246, 0.05)' : ''
                    }}
                  >
                    <div className="ep-cover">
                      <Music size={24} color={currentEpisode?.id === ep.id ? '#8b5cf6' : '#94a3b8'} />
                    </div>
                    <div className="ep-info">
                      <div className="ep-title">{ep.title}</div>
                      <div className="ep-artist">{ep.artist}</div>
                    </div>
                    <div className="ep-meta">
                      <span className="ep-duration">{ep.duration}</span>
                      <button className="play-btn">
                        {currentEpisode?.id === ep.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--bg-card-border)', fontSize: '13px', color: '#64748b' }}>
              <p>Staging deployment active. Build: #4092-dev. Source mappings active for diagnostics.</p>
            </div>
          </div>

          {/* Right panel: Active Player / Mastering Monitor */}
          <div className="glass-panel player-container">
            <h2>Mastering Monitor</h2>
            <div style={{ color: '#06b6d4', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={16} className={isPlaying ? 'animate-pulse' : ''} />
              {isPlaying ? 'NORMALIZER ACTIVE' : 'MONITOR STANDBY'}
            </div>

            <div className="player-artwork">
              <Disc size={80} color="white" className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
            </div>

            <div className="player-details">
              <h3>{currentEpisode ? currentEpisode.title : 'No track loaded'}</h3>
              <p>{currentEpisode ? currentEpisode.artist : 'Select a pipeline track'}</p>
            </div>

            {/* Visualizer bars */}
            <div className={`visualizer ${isPlaying ? 'active' : ''}`}>
              {[...Array(10)].map((_, i) => (
                <div key={i} className="visualizer-bar" />
              ))}
            </div>

            {/* Audio player controls */}
            <div className="audio-controls">
              <button className="btn-icon">
                <Music size={20} />
              </button>
              <button className="btn-primary-play" onClick={handlePlayPause}>
                {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ transform: 'translateX(2px)' }} />}
              </button>
              <button className="btn-icon">
                <Volume2 size={20} />
              </button>
            </div>

            <div style={{ marginTop: '24px', fontSize: '12px', color: '#64748b', textAlign: 'left', width: '100%', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <strong>AI Analysis Info:</strong>
              <div style={{ marginTop: '4px' }}>Target: -14.0 LUFS</div>
              <div>Current Max True Peak: -1.2 dBTP</div>
              <div>Status: Verified & Normalization Applied</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
