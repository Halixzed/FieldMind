-- Farm layout tables for Verdara grid/3D view
-- Each user has one farm layout with a configurable grid
-- Beds are cells (or multi-cell rectangles) within that grid

CREATE TABLE IF NOT EXISTS farm_layouts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT 'My Allotment',
  width_m     FLOAT NOT NULL DEFAULT 10,
  height_m    FLOAT NOT NULL DEFAULT 6,
  grid_cols   INTEGER NOT NULL DEFAULT 10,
  grid_rows   INTEGER NOT NULL DEFAULT 6,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plot_beds (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layout_id       UUID REFERENCES farm_layouts(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  row             INTEGER NOT NULL,
  col             INTEGER NOT NULL,
  width           INTEGER NOT NULL DEFAULT 1,
  height          INTEGER NOT NULL DEFAULT 1,
  name            TEXT NOT NULL DEFAULT '',
  crop            TEXT,
  planted_date    DATE,
  status          TEXT NOT NULL DEFAULT 'empty'
                    CHECK (status IN ('empty','planted','growing','ready','harvested')),
  sensor_node_id  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_layouts_user_idx ON farm_layouts (user_id);
CREATE INDEX IF NOT EXISTS plot_beds_layout_idx  ON plot_beds  (layout_id);
CREATE INDEX IF NOT EXISTS plot_beds_user_idx    ON plot_beds  (user_id);

ALTER TABLE farm_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_beds    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their layouts"
  ON farm_layouts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own their beds"
  ON plot_beds FOR ALL USING (auth.uid() = user_id);
