import type { WeatherForecast } from '../types';

function weatherClass(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('storm') || c.includes('thunder')) return 'weather-storm';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'weather-rain';
  if (c.includes('cloud') || c.includes('overcast')) return 'weather-cloud';
  if (c.includes('sun') || c.includes('clear')) return 'weather-sunny';
  return 'weather-clear';
}

export default function WeatherList({ data }: { data: WeatherForecast | null }) {
  if (!data) return <div style={{ fontSize: 12, color: 'var(--faint)' }}>Loading…</div>;
  return (
    <>
      {data.forecast.slice(0, 7).map(d => (
        <div key={d.day + d.date} className={`weather-row ${weatherClass(d.condition)}`}>
          <span className="w-day">{d.day}</span>
          <span className="w-desc">{d.condition}</span>
          <span className="w-rain">{d.rainfall_mm}mm</span>
          <span className="w-temp">{Math.round(d.temp_high)}°C</span>
        </div>
      ))}
    </>
  );
}
