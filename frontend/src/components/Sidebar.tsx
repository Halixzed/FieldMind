import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-dot" />
        <span className="brand-main">FIELDMIND</span>
        <span className="brand-powered">
          POWERED BY <span className="brand-sentinelis">SENTINELIS®</span>
        </span>
      </div>

      <div>
        <div className="nav-section">Dashboard</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          Overview
        </NavLink>
        <NavLink to="/sensors" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          Sensors
        </NavLink>
        <NavLink to="/learning" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          AI Learning
        </NavLink>
        <NavLink to="/hardware" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          Hardware
        </NavLink>
        <NavLink to="/farm" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          Farm Map
        </NavLink>
      </div>

      <div className="privacy-tag">
        <p>
          <strong>Secure cloud + local AI</strong>
          Sensor data stored in Supabase. Crop recommendations run on-device via Ollama. No third-party sharing.
        </p>
      </div>

      <div className="user-info">
        <div className="user-email">{user?.email}</div>
        <button className="signout-btn" onClick={signOut}>Sign out →</button>
      </div>
    </nav>
  );
}
