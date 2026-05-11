-- Velsar — Production Schema
-- Run via: Supabase Dashboard → SQL Editor, or `supabase db push`
-- -----------------------------------------------------------------------

-- Sensor readings (global device simulation, written by service-role backend)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  moisture         FLOAT       NOT NULL,
  nitrogen         FLOAT       NOT NULL,
  phosphorus       FLOAT       NOT NULL,
  potassium        FLOAT       NOT NULL,
  soil_temp        FLOAT       NOT NULL,
  air_temp         FLOAT       NOT NULL,
  humidity         FLOAT       NOT NULL,
  ph               FLOAT       NOT NULL,
  hours_since_rain FLOAT       NOT NULL
);

-- Any authenticated user can read sensor history; only the service-role
-- backend may insert (no INSERT policy = service-role bypass only).
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sensor readings"
  ON public.sensor_readings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Auto-purge readings older than 30 days to keep storage bounded
CREATE INDEX IF NOT EXISTS sensor_readings_created_at_idx
  ON public.sensor_readings (created_at DESC);

-- -----------------------------------------------------------------------
-- Learning observations (per-user crop outcome logs)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.observations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  sensors          JSONB       NOT NULL,
  crop_planted     TEXT        NOT NULL,
  actual_yield_pct FLOAT,
  notes            TEXT
);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own observations"
  ON public.observations FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS observations_user_created_idx
  ON public.observations (user_id, created_at DESC);

-- -----------------------------------------------------------------------
-- AI recommendations cache (per-user)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  sensors        JSONB       NOT NULL,
  recommendation JSONB       NOT NULL,
  source         TEXT        NOT NULL
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own recommendations"
  ON public.ai_recommendations FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_recommendations_user_created_idx
  ON public.ai_recommendations (user_id, created_at DESC);

-- -----------------------------------------------------------------------
-- Helper: purge sensor readings older than 30 days
-- Wire this up with pg_cron in Supabase dashboard:
--   select cron.schedule('purge-old-sensors', '0 3 * * *',
--     'SELECT purge_old_sensor_readings()');
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_sensor_readings()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.sensor_readings
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;
