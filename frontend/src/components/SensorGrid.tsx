import type { SensorSnapshot } from '../types';

interface Props {
  sensors: SensorSnapshot | null;
}

function SensorCard({
  label,
  value,
  unit,
  sub,
  barPct,
  barColor,
}: {
  label: string;
  value: number | string;
  unit?: string;
  sub: string;
  barPct: number;
  barColor: string;
}) {
  return (
    <div className="sensor-card">
      <div className="s-label">{label}</div>
      <div>
        <span className="s-val">{value}</span>
        {unit && <span className="s-unit">{unit}</span>}
      </div>
      <div className="s-sub">{sub}</div>
      <div
        className="s-bar"
        style={{ width: `${Math.min(100, Math.round(barPct))}%`, background: barColor }}
      />
    </div>
  );
}

export default function SensorGrid({ sensors: s }: Props) {
  if (!s) {
    return (
      <div className="sensor-grid">
        {['Soil Moisture', 'Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'Soil Temp', 'Soil pH'].map(label => (
          <div className="sensor-card" key={label}>
            <div className="s-label">{label}</div>
            <div className="s-val" style={{ opacity: 0.2 }}>—</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="sensor-grid">
      <SensorCard
        label="Soil Moisture"
        value={s.moisture}
        unit="%"
        sub={s.moisture < 30 ? 'Low' : s.moisture > 80 ? 'High' : 'Good'}
        barPct={s.moisture}
        barColor="#1f1f1f"
      />
      <SensorCard
        label="Nitrogen (N)"
        value={s.nitrogen}
        unit=" mg/kg"
        sub={s.nitrogen < 20 ? 'Deficient' : s.nitrogen > 80 ? 'Excess' : 'Adequate'}
        barPct={s.nitrogen / 1.2}
        barColor="#353535"
      />
      <SensorCard
        label="Phosphorus (P)"
        value={s.phosphorus}
        unit=" mg/kg"
        sub={s.phosphorus < 25 ? 'Low' : 'Adequate'}
        barPct={s.phosphorus / 0.8}
        barColor="#4a4a4a"
      />
      <SensorCard
        label="Potassium (K)"
        value={s.potassium}
        unit=" mg/kg"
        sub={s.potassium < 30 ? 'Low' : 'Good'}
        barPct={s.potassium / 1.5}
        barColor="#606060"
      />
      <SensorCard
        label="Soil Temp"
        value={s.soil_temp}
        unit="°C"
        sub={s.soil_temp < 8 ? 'Too cold' : s.soil_temp > 25 ? 'Warm' : 'Optimal'}
        barPct={(s.soil_temp / 30) * 100}
        barColor="#2a2a2a"
      />
      <SensorCard
        label="Soil pH"
        value={s.ph}
        sub={s.ph < 5.5 ? 'Acidic' : s.ph > 7.5 ? 'Alkaline' : 'Neutral'}
        barPct={((s.ph - 5) / 3) * 100}
        barColor="#767676"
      />
    </div>
  );
}
