import { useState, useEffect } from 'react';
import type { PlotBed, BedStatus, SensorSnapshot } from '../types';
import { updateBed, deleteBed } from '../lib/api';

const CROPS = [
  'Courgette','French Beans','Tomatoes','Kale','Leeks','Spinach',
  'Carrots','Potatoes','Onions','Peas','Beetroot','Lettuce',
  'Cabbage','Broccoli','Cauliflower','Garlic','Pumpkin',
  'Strawberries','Raspberries','Other',
];

const STATUS_LABELS: Record<BedStatus, string> = {
  empty: 'Empty', planted: 'Planted', growing: 'Growing',
  ready: 'Ready to harvest', harvested: 'Harvested',
};

const CROP_EMOJI: Record<string, string> = {
  'Courgette':'🥒','French Beans':'🫘','Tomatoes':'🍅','Kale':'🥬',
  'Leeks':'🧅','Spinach':'🌿','Carrots':'🥕','Potatoes':'🥔',
  'Onions':'🧅','Peas':'🟢','Beetroot':'🫚','Lettuce':'🥗',
  'Cabbage':'🥬','Broccoli':'🥦','Cauliflower':'🥦','Garlic':'🧄',
  'Pumpkin':'🎃','Strawberries':'🍓','Raspberries':'🫐','Other':'🌱',
};

interface Props {
  bed: PlotBed | null;
  sensors: SensorSnapshot | null;
  onClose: () => void;
  onUpdated: (bed: PlotBed) => void;
  onDeleted: (id: string) => void;
}

export default function BedPanel({ bed, sensors, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('');
  const [plantedDate, setPlantedDate] = useState('');
  const [status, setStatus] = useState<BedStatus>('empty');
  const [sensorId, setSensorId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!bed) return;
    setName(bed.name);
    setCrop(bed.crop ?? '');
    setPlantedDate(bed.planted_date ?? '');
    setStatus(bed.status);
    setSensorId(bed.sensor_node_id ?? '');
    setNotes(bed.notes ?? '');
    setConfirmDelete(false);
  }, [bed?.id]);

  if (!bed) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateBed(bed.id, {
        name,
        crop: crop || null,
        planted_date: plantedDate || null,
        status,
        sensor_node_id: sensorId || null,
        notes: notes || null,
      });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteBed(bed.id);
    onDeleted(bed.id);
  };

  const emoji = crop ? (CROP_EMOJI[crop] ?? '🌱') : null;

  return (
    <div className="bed-panel">
      <div className="bed-panel-header">
        <div className="bed-panel-title">
          {emoji && <span className="bed-emoji">{emoji}</span>}
          <span>{name || 'Unnamed bed'}</span>
        </div>
        <button className="bed-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="bed-panel-body">
        <div className="bed-field">
          <label>Bed name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. North Raised Bed" />
        </div>

        <div className="bed-field">
          <label>Crop</label>
          <select value={crop} onChange={e => setCrop(e.target.value)}>
            <option value="">— no crop —</option>
            {CROPS.map(c => (
              <option key={c} value={c}>{CROP_EMOJI[c]} {c}</option>
            ))}
          </select>
        </div>

        <div className="bed-field">
          <label>Planted date</label>
          <input type="date" value={plantedDate} onChange={e => setPlantedDate(e.target.value)} />
        </div>

        <div className="bed-field">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as BedStatus)}>
            {(Object.keys(STATUS_LABELS) as BedStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="bed-field">
          <label>Sensor node ID <span className="bed-field-hint">(optional)</span></label>
          <input
            value={sensorId}
            onChange={e => setSensorId(e.target.value)}
            placeholder="e.g. node-01"
          />
        </div>

        <div className="bed-field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any observations about this bed..."
          />
        </div>

        {/* Live sensor readout if sensor attached */}
        {sensorId && sensors && (
          <div className="bed-sensor-live">
            <div className="bed-sensor-live-label">Live sensor · {sensorId}</div>
            <div className="bed-sensor-grid">
              <span>Moisture</span><strong>{sensors.moisture}%</strong>
              <span>Soil temp</span><strong>{sensors.soil_temp}°C</strong>
              <span>pH</span><strong>{sensors.ph}</strong>
              <span>Nitrogen</span><strong>{sensors.nitrogen} mg/kg</strong>
            </div>
          </div>
        )}

        <div className="bed-panel-actions">
          <button className="bed-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save bed'}
          </button>
          <button
            className={`bed-delete-btn${confirmDelete ? ' confirm' : ''}`}
            onClick={handleDelete}
          >
            {confirmDelete ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
