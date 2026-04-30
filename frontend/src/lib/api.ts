import { supabase } from './supabase';
import type {
  SensorSnapshot,
  AIResponse,
  WeatherForecast,
  ObservationsResponse,
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
