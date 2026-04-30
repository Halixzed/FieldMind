import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip,
} from 'chart.js';
import type { SensorSnapshot } from '../types';

ChartJS.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler, Legend, Tooltip);

function tsLabel(r: SensorSnapshot) {
  const raw = r.timestamp ?? r.created_at ?? '';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? '' : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MoistureChart({ history }: { history: SensorSnapshot[] }) {
  const data = {
    labels: history.map(tsLabel),
    datasets: [
      {
        label: 'Moisture %',
        data: history.map(h => h.moisture),
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29,158,117,0.07)',
        tension: 0.4,
        pointRadius: 0,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
          y: { min: 20, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' }, border: { display: false } },
        },
      }}
    />
  );
}
