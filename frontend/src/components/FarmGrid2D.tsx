import type { PlotBed, FarmLayout, SensorSnapshot, HeatmapOverlay } from '../types';

const CELL = 64; // px per grid cell
const PAD  = 16;

const CROP_EMOJI: Record<string, string> = {
  'Courgette': '🥒', 'French Beans': '🫘', 'Tomatoes': '🍅',
  'Kale': '🥬', 'Leeks': '🧅', 'Spinach': '🌿', 'Carrots': '🥕',
  'Potatoes': '🥔', 'Onions': '🧅', 'Peas': '🟢', 'Beetroot': '🫚',
  'Lettuce': '🥗', 'Cabbage': '🥬', 'Broccoli': '🥦',
  'Cauliflower': '🥦', 'Garlic': '🧄', 'Pumpkin': '🎃',
  'Strawberries': '🍓', 'Raspberries': '🫐', 'Other': '🌱',
};

const STATUS_COLOR: Record<string, string> = {
  empty: 'transparent', planted: '#d4a853', growing: '#6aab5e',
  ready: '#3a9e56', harvested: '#9e9e9e',
};

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgba(${r},${g},${bl},0.72)`;
}

function overlayColor(overlay: HeatmapOverlay, sensors: SensorSnapshot | null): string {
  if (!sensors || overlay === 'none') return '';
  switch (overlay) {
    case 'moisture': {
      const t = Math.max(0, Math.min(1, sensors.moisture / 100));
      return lerpColor([239,68,68], [59,130,246], t);
    }
    case 'temp': {
      const t = Math.max(0, Math.min(1, (sensors.soil_temp - 4) / 24));
      return lerpColor([59,130,246], [249,115,22], t);
    }
    case 'npk': {
      const t = Math.max(0, Math.min(1,
        (sensors.nitrogen/120 + sensors.phosphorus/80 + sensors.potassium/150) / 3));
      return lerpColor([239,68,68], [34,197,94], t);
    }
    case 'health': {
      const mOk = sensors.moisture > 30 && sensors.moisture < 85 ? 1 : 0.3;
      const tOk = sensors.soil_temp > 8 && sensors.soil_temp < 25 ? 1 : 0.4;
      const pOk = sensors.ph > 5.5 && sensors.ph < 7.5 ? 1 : 0.5;
      const t = (mOk + tOk + pOk) / 3;
      return lerpColor([239,68,68], [34,197,94], t);
    }
    default: return '';
  }
}

function getBedAtCell(beds: PlotBed[], row: number, col: number): PlotBed | null {
  return beds.find(b =>
    row >= b.row && row < b.row + b.height &&
    col >= b.col && col < b.col + b.width
  ) ?? null;
}

interface Props {
  layout: FarmLayout;
  beds: PlotBed[];
  selectedId: string | null;
  editMode: boolean;
  overlay: HeatmapOverlay;
  sensors: SensorSnapshot | null;
  onSelectBed: (bed: PlotBed | null) => void;
  onCreateBed: (row: number, col: number) => void;
}

export default function FarmGrid2D({
  layout, beds, selectedId, editMode, overlay, sensors,
  onSelectBed, onCreateBed,
}: Props) {
  const W = layout.grid_cols * CELL + PAD * 2;
  const H = layout.grid_rows * CELL + PAD * 2;
  const heat = overlayColor(overlay, sensors);

  const handleCellClick = (row: number, col: number) => {
    const existing = getBedAtCell(beds, row, col);
    if (existing) {
      onSelectBed(existing);
    } else if (editMode) {
      onCreateBed(row, col);
    }
  };

  return (
    <div className="farm-2d-scroll">
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* grid background cells */}
        {Array.from({ length: layout.grid_rows }, (_, row) =>
          Array.from({ length: layout.grid_cols }, (_, col) => {
            const occupied = !!getBedAtCell(beds, row, col);
            return (
              <rect
                key={`cell-${row}-${col}`}
                x={PAD + col * CELL + 1}
                y={PAD + row * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                fill={occupied ? 'transparent' : 'var(--bg)'}
                stroke="var(--border)"
                strokeDasharray={occupied ? 'none' : '4 3'}
                strokeWidth={0.5}
                style={{ cursor: editMode && !occupied ? 'cell' : 'default' }}
                onClick={() => handleCellClick(row, col)}
              />
            );
          })
        )}

        {/* beds */}
        {beds.map(bed => {
          const x = PAD + bed.col * CELL + 3;
          const y = PAD + bed.row * CELL + 3;
          const bw = bed.width * CELL - 6;
          const bh = bed.height * CELL - 6;
          const isSelected = bed.id === selectedId;
          const statusFill = STATUS_COLOR[bed.status] ?? '#d4a853';
          const emoji = bed.crop ? (CROP_EMOJI[bed.crop] ?? '🌱') : null;

          return (
            <g
              key={bed.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectBed(bed)}
            >
              {/* base fill */}
              <rect
                x={x} y={y} width={bw} height={bh} rx={8}
                fill={bed.status === 'empty' ? '#c8a96e' : statusFill}
                opacity={0.85}
                stroke={isSelected ? 'var(--text)' : 'transparent'}
                strokeWidth={isSelected ? 2 : 0}
              />
              {/* heatmap overlay */}
              {heat && (
                <rect
                  x={x} y={y} width={bw} height={bh} rx={8}
                  fill={heat}
                  stroke="none"
                />
              )}
              {/* soil texture lines */}
              {[0.25, 0.5, 0.75].map(f => (
                <line
                  key={f}
                  x1={x + 8} y1={y + bh * f}
                  x2={x + bw - 8} y2={y + bh * f}
                  stroke="rgba(0,0,0,0.08)" strokeWidth={1}
                />
              ))}
              {/* crop emoji */}
              {emoji && (
                <text
                  x={x + bw / 2} y={y + bh / 2 + (bh > 40 ? 2 : 6)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(28, bh * 0.55, bw * 0.55)}
                  style={{ userSelect: 'none' }}
                >
                  {emoji}
                </text>
              )}
              {/* bed name */}
              {bh >= 40 && (
                <text
                  x={x + 6} y={y + 14}
                  fontSize={9}
                  fill="rgba(0,0,0,0.55)"
                  fontFamily="DM Mono, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {bed.name}
                </text>
              )}
              {/* sensor indicator */}
              {bed.sensor_node_id && (
                <circle cx={x + bw - 8} cy={y + 8} r={4} fill="#3b82f6" opacity={0.9} />
              )}
              {/* status dot */}
              {bed.status !== 'empty' && (
                <circle cx={x + 8} cy={y + 8} r={3.5}
                  fill={statusFill === 'transparent' ? '#888' : statusFill}
                  stroke="white" strokeWidth={0.5}
                />
              )}
            </g>
          );
        })}

        {/* column labels */}
        {Array.from({ length: layout.grid_cols }, (_, col) => (
          <text
            key={`col-${col}`}
            x={PAD + col * CELL + CELL / 2}
            y={PAD - 4}
            textAnchor="middle"
            fontSize={9}
            fill="var(--faint)"
            fontFamily="DM Mono, monospace"
          >
            {String.fromCharCode(65 + col)}
          </text>
        ))}

        {/* row labels */}
        {Array.from({ length: layout.grid_rows }, (_, row) => (
          <text
            key={`row-${row}`}
            x={PAD - 4}
            y={PAD + row * CELL + CELL / 2 + 4}
            textAnchor="end"
            fontSize={9}
            fill="var(--faint)"
            fontFamily="DM Mono, monospace"
          >
            {row + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}
