import { useCallback, useEffect, useRef, useState } from 'react';
import SensorGrid from '../components/SensorGrid';
import AlertBox from '../components/AlertBox';
import AICard from '../components/AICard';
import WeatherList from '../components/WeatherList';
import MoistureChart from '../components/MoistureChart';
import Simulator from '../components/Simulator';
import {
  fetchCurrentSensors,
  fetchSensorHistory,
  fetchWeather,
  fetchAIRecommendation,
} from '../lib/api';
import type { AIResponse, SensorSnapshot, WeatherForecast } from '../types';

const DEMO_SENSORS: SensorSnapshot = {
  moisture: 62, nitrogen: 48, phosphorus: 31, potassium: 74,
  soil_temp: 14, air_temp: 16, humidity: 68, ph: 6.5,
  hours_since_rain: 2.1, timestamp: new Date().toISOString(),
};

const DEMO_AI: AIResponse = {
  source: 'fallback:demo',
  sensors: DEMO_SENSORS,
  ai: {
    alert: { level: 'warning', message: 'Phosphorus slightly low — apply bone meal before planting.' },
    recommendation: 'Conditions broadly favourable. Plant courgettes and French beans this week — soil temp at 14°C and moisture at 62% are optimal.',
    crops: [
      { name: 'Courgette', action: 'plant now', days_to_harvest: 65, yield_pct: 87, reason: 'Optimal temp + moisture' },
      { name: 'French Beans', action: 'plant now', days_to_harvest: 58, yield_pct: 81, reason: 'Good germination conditions' },
      { name: 'Winter Brassica', action: 'delay 2wk', days_to_harvest: 90, yield_pct: 54, reason: 'Phosphorus needs boosting first' },
      { name: 'Tomatoes', action: 'plant now', days_to_harvest: 75, yield_pct: 79, reason: 'Good all-round conditions' },
    ],
    amendments: ['Organic bone meal (P boost)', 'Seaweed liquid feed (trace minerals)'],
    market_note: 'Courgettes £1.20/kg wholesale — strong August window. French beans £2.10/kg, consistent demand.',
  },
};

const DEMO_WEATHER: WeatherForecast = {
  location: 'Nottinghamshire, UK',
  forecast: [
    { day: 'Mon', date: '01 Jul', condition: 'Partly cloudy', icon: '⛅', rainfall_mm: 2, temp_high: 16, temp_low: 11, wind_mph: 8, humidity_pct: 70 },
    { day: 'Tue', date: '02 Jul', condition: 'Light rain', icon: '🌧', rainfall_mm: 8, temp_high: 13, temp_low: 9, wind_mph: 12, humidity_pct: 80 },
    { day: 'Wed', date: '03 Jul', condition: 'Showers', icon: '🌦', rainfall_mm: 12, temp_high: 11, temp_low: 8, wind_mph: 15, humidity_pct: 85 },
    { day: 'Thu', date: '04 Jul', condition: 'Overcast', icon: '☁', rainfall_mm: 0, temp_high: 14, temp_low: 10, wind_mph: 6, humidity_pct: 72 },
    { day: 'Fri', date: '05 Jul', condition: 'Clearing', icon: '⛅', rainfall_mm: 1, temp_high: 17, temp_low: 11, wind_mph: 9, humidity_pct: 65 },
    { day: 'Sat', date: '06 Jul', condition: 'Sunny', icon: '☀', rainfall_mm: 0, temp_high: 19, temp_low: 12, wind_mph: 5, humidity_pct: 58 },
    { day: 'Sun', date: '07 Jul', condition: 'Sunny', icon: '☀', rainfall_mm: 0, temp_high: 20, temp_low: 13, wind_mph: 7, humidity_pct: 55 },
  ],
};

function buildDemoHistory(): SensorSnapshot[] {
  const now = Date.now();
  return Array.from({ length: 48 }, (_, i) => ({
    timestamp: new Date(now - (47 - i) * 30 * 60_000).toISOString(),
    moisture: 58 + Math.sin(i / 8) * 8 + (Math.random() - 0.5) * 3,
    nitrogen: 48, phosphorus: 31, potassium: 74,
    soil_temp: 14, air_temp: 16, humidity: 68, ph: 6.5, hours_since_rain: 2,
  }));
}

interface Props {
  onSensorsUpdate?: (s: SensorSnapshot) => void;
}

export default function Dashboard({ onSensorsUpdate }: Props) {
  const [sensors, setSensors] = useState<SensorSnapshot | null>(null);
  const [ai, setAI] = useState<AIResponse | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [history, setHistory] = useState<SensorSnapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSensors = useCallback(async () => {
    try {
      const s = await fetchCurrentSensors();
      setSensors(s);
      onSensorsUpdate?.(s);
    } catch { /* backend offline */ }
  }, [onSensorsUpdate]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, w, a, h] = await Promise.all([
        fetchCurrentSensors(),
        fetchWeather(),
        fetchAIRecommendation(),
        fetchSensorHistory(48),
      ]);
      setSensors(s);
      onSensorsUpdate?.(s);
      setWeather(w);
      setAI(a);
      setHistory(h);
    } catch {
      setSensors(DEMO_SENSORS);
      setWeather(DEMO_WEATHER);
      setAI(DEMO_AI);
      setHistory(buildDemoHistory());
    } finally {
      setRefreshing(false);
    }
  }, [onSensorsUpdate]);

  // Initial load
  useEffect(() => { void refreshAll(); }, [refreshAll]);

  // 5-second sensor polling
  useEffect(() => {
    function schedule() {
      pollingRef.current = setTimeout(async () => {
        await loadSensors();
        schedule();
      }, 5000);
    }
    schedule();
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current); };
  }, [loadSensors]);

  return (
    <div className="page-content">
      <div className="topbar">
        <div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--faint)', marginBottom: 4 }}>
            Allotment A1 · Derby
          </div>
          <h1>Field Dashboard</h1>
        </div>
        <div className="topbar-right">
          <span className="badge badge-live"><span className="live-dot" />LIVE</span>
          <span className="badge badge-model">{ai?.source ?? 'phi3:mini'}</span>
          <button className="refresh-btn" disabled={refreshing} onClick={refreshAll}>
            {refreshing ? <><span className="spinner" />Refreshing…</> : '↺ Refresh AI'}
          </button>
        </div>
      </div>

      <SensorGrid sensors={sensors} />
      <AlertBox alert={ai?.ai.alert} />
      <AICard data={ai} />

      <div className="two-col">
        <div className="card">
          <div className="card-title">7-day weather forecast</div>
          <WeatherList data={weather} />
        </div>
        <div className="card">
          <div className="card-title">Crop yield forecast</div>
          {ai?.ai.crops ? (
            ai.ai.crops.map(c => {
              const yPct = Math.round(c.yield_pct);
              const color = yPct >= 75 ? '#3B6D11' : yPct >= 55 ? '#BA7517' : '#A32D2D';
              const cls = c.action.includes('now') ? 'action-now' : c.action.includes('delay') ? 'action-delay' : 'action-no';
              return (
                <div className="crop-row" key={c.name}>
                  <div>
                    <div className="crop-name">{c.name}</div>
                    <div className={`crop-action ${cls}`}>{c.action} · {c.days_to_harvest}d</div>
                  </div>
                  <div className="crop-right">
                    <div className="yield-pct" style={{ color }}>{yPct}%</div>
                    <div className="yield-bar-wrap">
                      <div className="yield-bar-fill" style={{ width: `${yPct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12, color: 'var(--faint)' }}>Loading…</div>
          )}
        </div>
      </div>

      <div className="chart-section">
        <div className="card-title">Soil moisture — 24h trend</div>
        <div className="chart-wrap">
          {history.length > 0 ? <MoistureChart history={history} /> : null}
        </div>
      </div>

      <Simulator onResult={data => { setAI(data); setSensors(data.sensors); }} />
    </div>
  );
}
