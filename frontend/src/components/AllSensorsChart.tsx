import { Line } from 'react-chartjs-2';
import type { SensorSnapshot } from '../types';

function tsLabel(r: SensorSnapshot) {
  const raw = r.timestamp ?? r.created_at ?? '';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? '' : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AllSensorsChart({ history }: { history: SensorSnapshot[] }) {
  const data = {
    labels: history.map(tsLabel),
    datasets: [
      { label: 'Moisture %', data: history.map(h => h.moisture), borderColor: '#1D9E75', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Nitrogen', data: history.map(h => h.nitrogen), borderColor: '#378ADD', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Phosphorus', data: history.map(h => h.phosphorus), borderColor: '#D85A30', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Potassium', data: history.map(h => h.potassium), borderColor: '#BA7517', tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
          y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' }, border: { display: false } },
        },
      }}
    />
  );
}
