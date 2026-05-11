import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import type { Mesh } from 'three';
import type { PlotBed, FarmLayout, SensorSnapshot, HeatmapOverlay } from '../types';

const CROP_EMOJI: Record<string, string> = {
  'Courgette':'🥒','French Beans':'🫘','Tomatoes':'🍅','Kale':'🥬',
  'Leeks':'🧅','Spinach':'🌿','Carrots':'🥕','Potatoes':'🥔',
  'Onions':'🧅','Peas':'🟢','Beetroot':'🫚','Lettuce':'🥗',
  'Cabbage':'🥬','Broccoli':'🥦','Cauliflower':'🥦','Garlic':'🧄',
  'Pumpkin':'🎃','Strawberries':'🍓','Raspberries':'🫐','Other':'🌱',
};

function lerpHex(
  a: [number,number,number],
  b: [number,number,number],
  t: number
): string {
  const r = Math.round(a[0] + (b[0]-a[0]) * t) / 255;
  const g = Math.round(a[1] + (b[1]-a[1]) * t) / 255;
  const bl= Math.round(a[2] + (b[2]-a[2]) * t) / 255;
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(bl*255)})`;
}

function bedColor(overlay: HeatmapOverlay, sensors: SensorSnapshot | null): string {
  if (!sensors || overlay === 'none') return '#c8a96e';
  switch (overlay) {
    case 'moisture': {
      const t = Math.max(0, Math.min(1, sensors.moisture / 100));
      return lerpHex([239,68,68],[59,130,246], t);
    }
    case 'temp': {
      const t = Math.max(0, Math.min(1, (sensors.soil_temp - 4) / 24));
      return lerpHex([59,130,246],[249,115,22], t);
    }
    case 'npk': {
      const t = Math.max(0, Math.min(1,
        (sensors.nitrogen/120 + sensors.phosphorus/80 + sensors.potassium/150) / 3));
      return lerpHex([239,68,68],[34,197,94], t);
    }
    case 'health': {
      const mOk = sensors.moisture > 30 && sensors.moisture < 85 ? 1 : 0.3;
      const tOk = sensors.soil_temp > 8 && sensors.soil_temp < 25 ? 1 : 0.4;
      const pOk = sensors.ph > 5.5 && sensors.ph < 7.5 ? 1 : 0.5;
      const t = (mOk + tOk + pOk) / 3;
      return lerpHex([239,68,68],[34,197,94], t);
    }
    default: return '#c8a96e';
  }
}

// Pulsing sensor sphere
function SensorMarker({ position }: { position: [number,number,number] }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 3) * 0.15);
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.6} />
    </mesh>
  );
}

interface BedMeshProps {
  bed: PlotBed;
  color: string;
  selected: boolean;
  gridCols: number;
  gridRows: number;
  onSelect: () => void;
}

function BedMesh({ bed, color, selected, gridCols, gridRows, onSelect }: BedMeshProps) {
  const [hovered, setHovered] = useState(false);
  const bw = bed.width  * 0.88;
  const bd = bed.height * 0.88;
  const bh = 0.18;
  // centre in grid space, then offset so grid is centred at origin
  const cx = bed.col + bed.width  / 2 - gridCols / 2;
  const cz = bed.row + bed.height / 2 - gridRows / 2;
  const emoji = bed.crop ? (CROP_EMOJI[bed.crop] ?? '🌱') : null;

  return (
    <group position={[cx, 0, cz]}>
      {/* raised bed box */}
      <mesh
        position={[0, bh / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onSelect}
        castShadow
      >
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial
          color={hovered || selected ? '#f0c060' : color}
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* selection ring */}
      {selected && (
        <mesh position={[0, bh + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(bw, bd) / 2 + 0.05, Math.max(bw, bd) / 2 + 0.12, 32]} />
          <meshBasicMaterial color="#f0c060" />
        </mesh>
      )}

      {/* crop emoji label */}
      {emoji && (
        <Html position={[0, bh + 0.4, 0]} center distanceFactor={6}>
          <div style={{ fontSize: 20, userSelect: 'none', pointerEvents: 'none' }}>
            {emoji}
          </div>
        </Html>
      )}

      {/* bed name on hover */}
      {hovered && bed.name && (
        <Html position={[0, bh + 0.75, 0]} center distanceFactor={6}>
          <div style={{
            background: 'rgba(0,0,0,0.75)', color: '#fff',
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {bed.name}
          </div>
        </Html>
      )}

      {/* sensor marker */}
      {bed.sensor_node_id && (
        <SensorMarker position={[bw / 2 - 0.1, bh + 0.12, -bd / 2 + 0.1]} />
      )}
    </group>
  );
}

interface Props {
  layout: FarmLayout;
  beds: PlotBed[];
  selectedId: string | null;
  overlay: HeatmapOverlay;
  sensors: SensorSnapshot | null;
  onSelectBed: (bed: PlotBed | null) => void;
}

export default function FarmGrid3D({ layout, beds, selectedId, overlay, sensors, onSelectBed }: Props) {
  const color = bedColor(overlay, sensors);

  return (
    <div className="farm-3d-canvas">
      <Canvas
        orthographic
        shadows
        camera={{ position: [layout.grid_cols * 0.9, layout.grid_cols * 0.9, layout.grid_rows * 0.9], zoom: 48, near: 0.01, far: 1000 }}
      >
        <color attach="background" args={['#f7f7f7']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.0} castShadow
          shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 4, -3]} intensity={0.25} />

        {/* ground plane */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[layout.grid_cols + 2, layout.grid_rows + 2]} />
          <meshStandardMaterial color="#4a7c4e" roughness={1} />
        </mesh>

        {/* grid lines */}
        <Grid
          args={[layout.grid_cols, layout.grid_rows]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#3a6b3e"
          sectionSize={layout.grid_cols}
          sectionThickness={0.6}
          sectionColor="#2d5530"
          fadeDistance={60}
          position={[0, 0.001, 0]}
        />

        {/* beds */}
        {beds.map(bed => (
          <BedMesh
            key={bed.id}
            bed={bed}
            color={color}
            selected={bed.id === selectedId}
            gridCols={layout.grid_cols}
            gridRows={layout.grid_rows}
            onSelect={() => onSelectBed(bed)}
          />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.5}
          minZoom={20}
          maxZoom={120}
        />
      </Canvas>
    </div>
  );
}
