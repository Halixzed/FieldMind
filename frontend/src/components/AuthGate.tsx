import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'signin' | 'signup';

export default function AuthGate() {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created — check your email to confirm, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithProvider(provider: 'google' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="auth-split">
      {/* Left: auth form */}
      <div className="auth-left">
        <div className="auth-panel">
          <div className="auth-logo">
            <span className="auth-logo-dot" />
            VELSAR
          </div>

          <p className="auth-tagline">Your AI-powered field intelligence platform</p>

          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
              onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
              onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
            >
              Create account
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="auth-field">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="auth-divider">or continue with</div>

          <button className="auth-sso" onClick={() => signInWithProvider('google')}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="auth-powered">
            POWERED BY <span className="auth-powered-brand">SENTINELIS</span>
          </p>
        </div>
      </div>

      {/* Right: agriculture video panel */}
      <div className="auth-right">
        {/* Replace src with your agriculture video URL */}
        <video
          className="auth-video"
          autoPlay
          muted
          loop
          playsInline
          src=""
        />
        <div className="auth-right-overlay">
          <div className="auth-right-content">
            <p className="auth-right-label">INTELLIGENT FARMING</p>
            <h2 className="auth-right-heading">Know your field.<br />Grow smarter.</h2>
            <p className="auth-right-sub">Real-time soil, weather and AI recommendations — all in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
