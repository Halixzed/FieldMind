import { useEffect, useState } from 'react';
import AllSensorsChart from '../components/AllSensorsChart';
import { fetchSensorHistory } from '../lib/api';
import type { SensorSnapshot } from '../types';

export default function Sensors() {
  const [history, setHistory] = useState<SensorSnapshot[]>([]);

  useEffect(() => {
    fetchSensorHistory(24).then(setHistory).catch(() => {});
  }, []);

  const rawLog = history
    .slice(-10)
    .reverse()
    .map(h => {
      const ts = (h.timestamp ?? h.created_at ?? '').slice(11, 19);
      return `${ts}  M:${h.moisture}%  N:${h.nitrogen}  P:${h.phosphorus}  K:${h.potassium}  T:${h.soil_temp}°C  pH:${h.ph}`;
    })
    .join('\n');

  return (
    <div className="page-content">
      <div className="topbar"><h1>Sensor Data</h1></div>

      <div className="chart-section">
        <div className="card-title">All sensor readings — live</div>
        <div className="chart-wrap-tall">
          {history.length > 0 ? <AllSensorsChart history={history} /> : null}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Raw sensor log (last 10 readings)</div>
        <pre style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre' }}>
          {rawLog || 'No data yet.'}
        </pre>
      </div>
    </div>
  );
}
