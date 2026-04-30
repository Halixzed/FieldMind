import { useEffect, useState } from 'react';
import { fetchObservations, logObservation } from '../lib/api';
import type { Observation, SensorSnapshot } from '../types';

const CROPS = ['Courgette', 'French Beans', 'Tomatoes', 'Kale', 'Leeks', 'Spinach', 'Other'];

interface Props {
  latestSensors: SensorSnapshot | null;
}

export default function Learning({ latestSensors }: Props) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [crop, setCrop] = useState(CROPS[0]!);
  const [yieldPct, setYieldPct] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchObservations().then(r => setObservations(r.observations)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!latestSensors) return;
    setSaving(true);
    try {
      await logObservation({
        sensors: latestSensors,
        crop_planted: crop,
        actual_yield_pct: yieldPct ? parseFloat(yieldPct) : null,
        notes,
      });
      const r = await fetchObservations();
      setObservations(r.observations);
      setYieldPct('');
      setNotes('');
    } catch {
      // offline — silently ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <div className="topbar"><h1>AI Learning</h1></div>

      <div className="learn-grid">
        <div className="stat-card">
          <div className="stat-val">{observations.length}</div>
          <div className="stat-label">Observations logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">v0.1</div>
          <div className="stat-label">Model version</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Log a crop outcome</div>
          <form className="log-form" onSubmit={submit}>
            <div>
              <label>Crop planted</label>
              <select value={crop} onChange={e => setCrop(e.target.value)}>
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Actual yield %</label>
              <input
                type="number"
                placeholder="e.g. 78"
                min={0}
                max={100}
                value={yieldPct}
                onChange={e => setYieldPct(e.target.value)}
              />
            </div>
            <div>
              <label>Notes</label>
              <input
                type="text"
                placeholder="e.g. aphid damage in week 3"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="log-btn" disabled={saving || !latestSensors}>
              {saving ? 'Saving…' : 'Log observation →'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Observation history</div>
          {observations.length === 0 ? (
            <div className="log-empty">No observations yet. Log your first crop outcome to start training the model.</div>
          ) : (
            observations.slice(0, 8).map(o => (
              <div className="log-entry" key={o.id}>
                <div className="log-ts">{new Date(o.created_at).toLocaleTimeString()}</div>
                <div className="log-text">
                  <strong>{o.crop_planted}</strong>
                  {o.actual_yield_pct != null ? ` · ${o.actual_yield_pct}% yield` : ''}
                  {o.notes ? ` · ${o.notes}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">How continual learning works</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 12 }}>
          Every time you log a real crop outcome, FieldMind stores the sensor conditions at planting time alongside your actual yield. Over a growing season, these observations are used to run nightly LoRA fine-tuning jobs — the model adapts to <em>your specific plot&apos;s</em> microclimate, soil quirks, and local conditions.
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>
          No data ever leaves the device. The model weights are updated locally using{' '}
          <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>llama.cpp</code>{' '}
          with LoRA adapters. After 20+ observations, accuracy improves significantly compared to the baseline model.
        </p>
      </div>
    </div>
  );
}
