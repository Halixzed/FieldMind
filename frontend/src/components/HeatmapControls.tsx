import type { HeatmapOverlay } from '../types';

const OPTIONS: { key: HeatmapOverlay; label: string; color: string }[] = [
  { key: 'none',     label: 'None',     color: '' },
  { key: 'moisture', label: 'Moisture', color: '#3b82f6' },
  { key: 'temp',     label: 'Temp',     color: '#f97316' },
  { key: 'npk',      label: 'NPK',      color: '#22c55e' },
  { key: 'health',   label: 'Health',   color: '#a855f7' },
];

interface Props {
  active: HeatmapOverlay;
  onChange: (v: HeatmapOverlay) => void;
}

export default function HeatmapControls({ active, onChange }: Props) {
  return (
    <div className="heatmap-bar">
      <span className="heatmap-bar-label">Overlay</span>
      {OPTIONS.map(o => (
        <button
          key={o.key}
          className={`heatmap-btn${active === o.key ? ' active' : ''}`}
          style={active === o.key && o.color ? { background: o.color, color: '#fff', borderColor: o.color } : {}}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
