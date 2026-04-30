import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import Learning from './pages/Learning';
import Hardware from './pages/Hardware';
import type { SensorSnapshot } from './types';

function AppLayout() {
  // latestSensors is lifted here so Learning can receive it from Dashboard's polling
  const [latestSensors, setLatestSensors] = useState<SensorSnapshot | null>(null);

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route
            path="/"
            element={<Dashboard onSensorsUpdate={setLatestSensors} />}
          />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/learning" element={<Learning latestSensors={latestSensors} />} />
          <Route path="/hardware" element={<Hardware />} />
          <Route path="*" element={<Dashboard onSensorsUpdate={setLatestSensors} />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--faint)' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!user) return <AuthGate />;

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}
