import { useState, useEffect, lazy, Suspense } from 'react';
import type { FarmLayout, PlotBed, SensorSnapshot, HeatmapOverlay } from '../types';
import {
  fetchFarmData, createFarmLayout, createBed,
} from '../lib/api';
import { fetchCurrentSensors } from '../lib/api';
import FarmToolbar from '../components/FarmToolbar';
import HeatmapControls from '../components/HeatmapControls';
import FarmGrid2D from '../components/FarmGrid2D';
import BedPanel from '../components/BedPanel';

// Lazy-load Three.js to keep the initial bundle small
const FarmGrid3D = lazy(() => import('../components/FarmGrid3D'));

const DEFAULT_COLS = 10;
const DEFAULT_ROWS = 6;

export default function FarmPage() {
  const [layout, setLayout]         = useState<FarmLayout | null>(null);
  const [beds, setBeds]             = useState<PlotBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<PlotBed | null>(null);
  const [view, setView]             = useState<'2d' | '3d'>('2d');
  const [overlay, setOverlay]       = useState<HeatmapOverlay>('none');
  const [editMode, setEditMode]     = useState(false);
  const [sensors, setSensors]       = useState<SensorSnapshot | null>(null);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);

  // load farm data + sensors on mount
  useEffect(() => {
    Promise.all([fetchFarmData(), fetchCurrentSensors().catch(() => null)])
      .then(([farm, snap]) => {
        setLayout(farm.layout);
        setBeds(farm.beds);
        if (snap) setSensors(snap);
      })
      .finally(() => setLoading(false));
  }, []);

  // refresh sensors every 10s
  useEffect(() => {
    const id = setInterval(() =>
      fetchCurrentSensors().then(setSensors).catch(() => {}), 10_000);
    return () => clearInterval(id);
  }, []);

  const handleViewChange = (v: '2d' | '3d') => {
    setView(v);
    if (v === '3d') setEditMode(false);
  };

  const handleEditToggle = () => {
    if (view === '3d') {
      setView('2d');
      setEditMode(true);
    } else {
      setEditMode(e => !e);
    }
  };

  const handleCreateLayout = async () => {
    setCreating(true);
    try {
      const l = await createFarmLayout('My Allotment', DEFAULT_COLS, DEFAULT_ROWS);
      setLayout(l);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBed = async (row: number, col: number) => {
    if (!layout) return;
    const bed = await createBed(layout.id, row, col);
    setBeds(prev => [...prev, bed]);
    setSelectedBed(bed);
  };

  const handleBedUpdated = (updated: PlotBed) => {
    setBeds(prev => prev.map(b => b.id === updated.id ? updated : b));
    setSelectedBed(updated);
  };

  const handleBedDeleted = (id: string) => {
    setBeds(prev => prev.filter(b => b.id !== id));
    setSelectedBed(null);
  };

  if (loading) {
    return (
      <div className="farm-loading">
        <span className="spinner" />Loading farm map…
      </div>
    );
  }

  // first time — no layout yet
  if (!layout) {
    return (
      <div className="farm-empty">
        <div className="farm-empty-icon">🌱</div>
        <h2>Set up your farm map</h2>
        <p>Create a grid layout to visualise your beds, assign crops, and overlay live sensor data.</p>
        <button
          className="farm-create-btn"
          onClick={handleCreateLayout}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'Create farm layout'}
        </button>
      </div>
    );
  }

  return (
    <div className="page-content farm-page">
      <FarmToolbar
        view={view}
        editMode={editMode}
        layoutName={layout.name}
        onViewChange={handleViewChange}
        onEditToggle={handleEditToggle}
      />

      <HeatmapControls active={overlay} onChange={setOverlay} />

      {editMode && (
        <div className="farm-edit-hint">
          Click any empty cell to add a bed. Click an existing bed to edit it.
        </div>
      )}

      <div className="farm-main">
        <div className="farm-canvas-wrap">
          {view === '2d' ? (
            <FarmGrid2D
              layout={layout}
              beds={beds}
              selectedId={selectedBed?.id ?? null}
              editMode={editMode}
              overlay={overlay}
              sensors={sensors}
              onSelectBed={setSelectedBed}
              onCreateBed={handleCreateBed}
            />
          ) : (
            <Suspense fallback={
              <div className="farm-loading"><span className="spinner" />Loading 3D view…</div>
            }>
              <FarmGrid3D
                layout={layout}
                beds={beds}
                selectedId={selectedBed?.id ?? null}
                overlay={overlay}
                sensors={sensors}
                onSelectBed={setSelectedBed}
              />
            </Suspense>
          )}
        </div>

        <BedPanel
          bed={selectedBed}
          sensors={sensors}
          onClose={() => setSelectedBed(null)}
          onUpdated={handleBedUpdated}
          onDeleted={handleBedDeleted}
        />
      </div>

      {/* legend */}
      <div className="farm-legend">
        <span className="fl-item"><span className="fl-dot" style={{ background: '#c8a96e' }} />Empty bed</span>
        <span className="fl-item"><span className="fl-dot" style={{ background: '#6aab5e' }} />Growing</span>
        <span className="fl-item"><span className="fl-dot" style={{ background: '#3a9e56' }} />Ready</span>
        <span className="fl-item"><span className="fl-dot" style={{ background: '#3b82f6' }} />Sensor linked</span>
        {sensors && overlay !== 'none' && (
          <span className="fl-item fl-live">
            <span className="live-dot" />Live {overlay} overlay active
          </span>
        )}
      </div>
    </div>
  );
}
