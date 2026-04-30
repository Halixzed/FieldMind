export interface SensorSnapshot {
  timestamp?: string;
  created_at?: string;
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_temp: number;
  air_temp: number;
  humidity: number;
  ph: number;
  hours_since_rain: number;
}

export interface AIAlert {
  level: 'ok' | 'warning' | 'danger' | 'info';
  message: string | null;
}

export interface CropRecommendation {
  name: string;
  action: string;
  days_to_harvest: number;
  yield_pct: number;
  reason: string;
}

export interface AIResult {
  alert: AIAlert;
  recommendation: string;
  crops: CropRecommendation[];
  amendments: string[];
  market_note: string;
}

export interface AIResponse {
  source: string;
  sensors: SensorSnapshot;
  ai: AIResult;
}

export interface WeatherDay {
  day: string;
  date: string;
  condition: string;
  icon: string;
  rainfall_mm: number;
  temp_high: number;
  temp_low: number;
  wind_mph: number;
  humidity_pct: number;
}

export interface WeatherForecast {
  forecast: WeatherDay[];
  location: string;
}

export interface Observation {
  id: string;
  user_id: string;
  created_at: string;
  sensors: SensorSnapshot;
  crop_planted: string;
  actual_yield_pct: number | null;
  notes: string | null;
}

export interface ObservationsResponse {
  observations: Observation[];
  count: number;
}
