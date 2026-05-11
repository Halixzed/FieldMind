import { useState } from 'react';
import { fetchAIRecommendation, overrideSensors } from '../lib/api';
import type { AIResponse } from '../types';

interface Props {
  onResult: (data: AIResponse) => void;
}

export default function Simulator({ onResult }: Props) {
  const [moisture, setMoisture] = useState(62);
  const [nitrogen, setNitrogen] = useState(48);
  const [phosphorus, setPhosphorus] = useState(31);
  const [soilTemp, setSoilTemp] = useState(14);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await overrideSensors({ moisture, nitrogen, phosphorus, soil_temp: soilTemp });
      const data = await fetchAIRecommendation({ moisture, nitrogen, soil_temp: soilTemp });
      onResult(data);
    } catch {
      // silently ignore — backend may be down
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sim-section">
      <div className="card-title">Simulate sensor conditions</div>

      {(
        [
          { label: 'Moisture', value: moisture, set: setMoisture, min: 10, max: 95, unit: '%' },
          { label: 'Nitrogen (N)', value: nitrogen, set: setNitrogen, min: 5, max: 120, unit: ' mg/kg' },
          { label: 'Phosphorus (P)', value: phosphorus, set: setPhosphorus, min: 5, max: 80, unit: ' mg/kg' },
          { label: 'Soil Temp', value: soilTemp, set: setSoilTemp, min: 2, max: 30, unit: '°C' },
        ] as const
      ).map(({ label, value, set, min, max, unit }) => (
        <div className="slider-row" key={label}>
          <span className="slider-label">{label}</span>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => set(Number(e.target.value))}
          />
          <span className="slider-val">{value}{unit}</span>
        </div>
      ))}

      <button className="sim-btn" disabled={busy} onClick={run}>
        {busy ? <><span className="spinner" />Asking Velsar AI…</> : 'Run AI analysis on these conditions →'}
      </button>
    </div>
  );
}
