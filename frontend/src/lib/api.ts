import { supabase } from './supabase';
import type {
  SensorSnapshot,
  AIResponse,
  WeatherForecast,
  ObservationsResponse,
  FarmLayout,
  PlotBed,
} from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    await supabase.auth.signOut();
    throw new Error('Not authenticated');
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Session expired');
  }
  return res;
}

export async function fetchCurrentSensors(): Promise<SensorSnapshot> {
  const r = await authFetch('/sensors/current');
  return r.json();
}

export async function fetchSensorHistory(limit = 48): Promise<SensorSnapshot[]> {
  const r = await authFetch(`/sensors/history?limit=${limit}`);
  return r.json();
}

export async function overrideSensors(params: {
  moisture?: number;
  nitrogen?: number;
  phosphorus?: number;
  soil_temp?: number;
}): Promise<void> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  );
  await authFetch(`/sensors/override?${qs}`, { method: 'POST' });
}

export async function fetchWeather(): Promise<WeatherForecast> {
  const r = await authFetch('/weather/forecast');
  return r.json();
}

export async function fetchAIRecommendation(overrides?: {
  moisture?: number;
  nitrogen?: number;
  soil_temp?: number;
}): Promise<AIResponse> {
  const qs = overrides
    ? '?' + new URLSearchParams(
        Object.entries(overrides)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : '';
  const r = await authFetch(`/ai/recommend${qs}`);
  return r.json();
}

export async function logObservation(payload: {
  sensors: SensorSnapshot;
  crop_planted: string;
  actual_yield_pct: number | null;
  notes: string;
}): Promise<{ status: string; total_observations: number }> {
  const r = await authFetch('/learning/observe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export async function fetchObservations(): Promise<ObservationsResponse> {
  const r = await authFetch('/learning/observations');
  return r.json();
}

// ---------------------------------------------------------------------------
// Farm layout — direct Supabase (no FastAPI needed for CRUD)
// ---------------------------------------------------------------------------

export async function fetchFarmData(): Promise<{ layout: FarmLayout | null; beds: PlotBed[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { layout: null, beds: [] };

  const { data: layouts } = await supabase
    .from('farm_layouts')
    .select('*')
    .eq('user_id', session.user.id)
    .limit(1);

  if (!layouts || layouts.length === 0) return { layout: null, beds: [] };

  const layout = layouts[0] as FarmLayout;

  const { data: beds } = await supabase
    .from('plot_beds')
    .select('*')
    .eq('layout_id', layout.id)
    .order('created_at');

  return { layout, beds: (beds ?? []) as PlotBed[] };
}

export async function createFarmLayout(
  name: string,
  gridCols: number,
  gridRows: number
): Promise<FarmLayout> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('farm_layouts')
    .insert({
      user_id: session.user.id,
      name,
      grid_cols: gridCols,
      grid_rows: gridRows,
      width_m: gridCols,
      height_m: gridRows,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmLayout;
}

export async function createBed(
  layoutId: string,
  row: number,
  col: number
): Promise<PlotBed> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('plot_beds')
    .insert({
      layout_id: layoutId,
      user_id: session.user.id,
      row,
      col,
      width: 1,
      height: 1,
      name: `Bed ${String.fromCharCode(65 + col)}${row + 1}`,
      status: 'empty',
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlotBed;
}

export async function updateBed(
  id: string,
  patch: Partial<Pick<PlotBed, 'name' | 'crop' | 'planted_date' | 'status' | 'sensor_node_id' | 'notes'>>
): Promise<PlotBed> {
  const { data, error } = await supabase
    .from('plot_beds')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlotBed;
}

export async function deleteBed(id: string): Promise<void> {
  const { error } = await supabase.from('plot_beds').delete().eq('id', id);
  if (error) throw error;
}
