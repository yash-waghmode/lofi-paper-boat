import { TrackData, Vector2D, TrackCheckpoint, Obstacle } from './types';

function createCurvePoints(controlPoints: Vector2D[], samplesPerSegment: number = 8): Vector2D[] {
  const result: Vector2D[] = [];
  const n = controlPoints.length;

  for (let i = 0; i < n; i++) {
    const p0 = controlPoints[(i - 1 + n) % n];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % n];
    const p3 = controlPoints[(i + 2) % n];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom spline interpolation
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      const z = 0.5 * (
        (2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
      );
      result.push({ x, z });
    }
  }
  return result;
}

function generateCheckpoints(centerline: Vector2D[], count: number, riverWidth: number): TrackCheckpoint[] {
  const checkpoints: TrackCheckpoint[] = [];
  const step = Math.floor(centerline.length / count);

  for (let i = 0; i < count; i++) {
    const idx = (i * step) % centerline.length;
    const pt = centerline[idx];
    const nextPt = centerline[(idx + 2) % centerline.length];

    const dx = nextPt.x - pt.x;
    const dz = nextPt.z - pt.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;

    checkpoints.push({
      index: i,
      x: pt.x,
      z: pt.z,
      tangentX: dx / len,
      tangentZ: dz / len,
      width: riverWidth
    });
  }
  return checkpoints;
}

// Track 1: Willow Bend
const willowControls: Vector2D[] = [
  { x: 0, z: 0 },
  { x: 25, z: 45 },
  { x: 70, z: 65 },
  { x: 110, z: 40 },
  { x: 125, z: -10 },
  { x: 95, z: -60 },
  { x: 45, z: -80 },
  { x: -20, z: -60 },
  { x: -50, z: -25 },
  { x: -35, z: 15 },
  { x: -15, z: 20 },
];
const willowPath = createCurvePoints(willowControls, 8);
const willowCheckpoints = generateCheckpoints(willowPath, 6, 18);

// Track 2: Amber Rapids (Technical F1-style chicanes)
const amberControls: Vector2D[] = [
  { x: 0, z: 0 },
  { x: 30, z: 50 },
  { x: 20, z: 90 },
  { x: 65, z: 120 },
  { x: 115, z: 100 },
  { x: 90, z: 50 },
  { x: 120, z: 10 },
  { x: 110, z: -50 },
  { x: 60, z: -90 },
  { x: 10, z: -70 },
  { x: -30, z: -100 },
  { x: -80, z: -70 },
  { x: -75, z: -20 },
  { x: -40, z: 10 },
];
const amberPath = createCurvePoints(amberControls, 7);
const amberCheckpoints = generateCheckpoints(amberPath, 7, 16);

// Track 3: Origami Canyon (Dramatic hairpin curves and bridges)
const canyonControls: Vector2D[] = [
  { x: 0, z: 0 },
  { x: 40, z: 35 },
  { x: 80, z: 30 },
  { x: 110, z: 70 },
  { x: 125, z: 120 },
  { x: 85, z: 140 },
  { x: 45, z: 110 },
  { x: 50, z: 70 },
  { x: 10, z: 60 },
  { x: -35, z: 90 },
  { x: -80, z: 70 },
  { x: -95, z: 20 },
  { x: -60, z: -35 },
  { x: -10, z: -40 },
];
const canyonPath = createCurvePoints(canyonControls, 8);
const canyonCheckpoints = generateCheckpoints(canyonPath, 7, 17);

export const TRACKS: TrackData[] = [
  {
    id: 'willow-bend',
    name: 'Willow Bend',
    subtitle: 'Circuit 01 · Morning River',
    difficulty: 'Cozy',
    description: 'A serene introductory river loop with gentle sweeping curves, weeping willows, and floating lily leaves.',
    pathPoints: willowPath,
    riverWidth: 18,
    totalLaps: 3,
    checkpoints: willowCheckpoints,
    obstacles: [
      { id: 'wb-r1', type: 'rock', x: 40, z: 52, radius: 1.1, rotation: 0.3, scale: 1.2 },
      { id: 'wb-r2', type: 'rock', x: 105, z: 20, radius: 1.3, rotation: 1.1, scale: 1.4 },
      { id: 'wb-l1', type: 'leaf', x: 15, z: 30, radius: 0.8, rotation: 0.5, scale: 1.0, color: '#E87A5D' },
      { id: 'wb-l2', type: 'leaf', x: 80, z: -45, radius: 0.9, rotation: 1.8, scale: 1.1, color: '#D97724' },
      { id: 'wb-l3', type: 'leaf', x: 30, z: -70, radius: 0.7, rotation: 2.5, scale: 0.9, color: '#7AA874' },
      { id: 'wb-log1', type: 'log', x: -40, z: -40, radius: 1.2, rotation: 0.8, scale: 1.1 },
    ],
    foliage: [
      { x: -15, z: -20, type: 'willow', scale: 1.3 },
      { x: 35, z: 20, type: 'willow', scale: 1.5 },
      { x: 75, z: 30, type: 'willow', scale: 1.2 },
      { x: 95, z: -15, type: 'willow', scale: 1.4 },
      { x: 15, z: -40, type: 'willow', scale: 1.1 },
      { x: -45, z: -70, type: 'pine', scale: 1.2 },
      { x: 135, z: 10, type: 'pine', scale: 1.3 },
    ],
    defaultWeather: 'sakura',
    sceneryColor: {
      ground: '#F5EFE6',
      water: '#2CB1D8',
      waterDeep: '#13678A',
      ambient: '#FFFDF9',
      sun: '#FFF5E4'
    }
  },
  {
    id: 'amber-rapids',
    name: 'Amber Rapids',
    subtitle: 'Circuit 02 · Golden Chicanes',
    difficulty: 'Flow',
    description: 'A dynamic course through autumn foliage with flowing currents, rock chicanes, and sweeping drift corners.',
    pathPoints: amberPath,
    riverWidth: 16,
    totalLaps: 3,
    checkpoints: amberCheckpoints,
    obstacles: [
      { id: 'ar-r1', type: 'rock', x: 25, z: 75, radius: 1.2, rotation: 0.5, scale: 1.3 },
      { id: 'ar-r2', type: 'rock', x: 85, z: 95, radius: 1.4, rotation: 2.1, scale: 1.5 },
      { id: 'ar-r3', type: 'rock', x: 110, z: 30, radius: 1.1, rotation: 1.4, scale: 1.2 },
      { id: 'ar-l1', type: 'leaf', x: 10, z: 35, radius: 0.8, rotation: 0.2, scale: 1.0, color: '#E0533C' },
      { id: 'ar-l2', type: 'leaf', x: 75, z: 115, radius: 0.9, rotation: 1.2, scale: 1.1, color: '#D97724' },
      { id: 'ar-l3', type: 'leaf', x: 40, z: -80, radius: 0.8, rotation: 2.8, scale: 1.0, color: '#E5A93C' },
      { id: 'ar-log1', type: 'log', x: -60, z: -50, radius: 1.3, rotation: 1.2, scale: 1.2 },
      { id: 'ar-log2', type: 'log', x: 95, z: -25, radius: 1.2, rotation: 0.4, scale: 1.1 },
    ],
    foliage: [
      { x: 50, z: 75, type: 'willow', scale: 1.4 },
      { x: 135, z: 60, type: 'pine', scale: 1.5 },
      { x: -50, z: 40, type: 'pine', scale: 1.3 },
      { x: -100, z: -40, type: 'willow', scale: 1.2 },
      { x: 80, z: -30, type: 'pine', scale: 1.4 },
    ],
    defaultWeather: 'autumn',
    sceneryColor: {
      ground: '#EFE6D8',
      water: '#1FA2C6',
      waterDeep: '#0D4F6C',
      ambient: '#FFF8EE',
      sun: '#FFECCC'
    }
  },
  {
    id: 'origami-canyon',
    name: 'Origami Canyon',
    subtitle: 'Circuit 03 · High Peaks & Hairpins',
    difficulty: 'Challenging',
    description: 'A technical canyon raceway with dramatic hairpin bends, paper crane checkpoints, and river gorges.',
    pathPoints: canyonPath,
    riverWidth: 17,
    totalLaps: 3,
    checkpoints: canyonCheckpoints,
    obstacles: [
      { id: 'oc-r1', type: 'rock', x: 60, z: 32, radius: 1.3, rotation: 0.9, scale: 1.4 },
      { id: 'oc-r2', type: 'rock', x: 105, z: 135, radius: 1.2, rotation: 2.4, scale: 1.3 },
      { id: 'oc-r3', type: 'rock', x: 25, z: 85, radius: 1.4, rotation: 1.1, scale: 1.5 },
      { id: 'oc-l1', type: 'leaf', x: 20, z: 20, radius: 0.8, rotation: 0.7, scale: 1.0, color: '#E87A5D' },
      { id: 'oc-l2', type: 'leaf', x: -50, z: 80, radius: 0.9, rotation: 1.9, scale: 1.1, color: '#5C9E78' },
      { id: 'oc-log1', type: 'log', x: -80, z: 45, radius: 1.3, rotation: 0.6, scale: 1.2 },
    ],
    foliage: [
      { x: 65, z: 85, type: 'pine', scale: 1.6 },
      { x: -20, z: 120, type: 'pine', scale: 1.5 },
      { x: -115, z: -10, type: 'willow', scale: 1.3 },
      { x: 145, z: 90, type: 'pine', scale: 1.4 },
    ],
    defaultWeather: 'snow',
    sceneryColor: {
      ground: '#EADECF',
      water: '#198EB3',
      waterDeep: '#0A435C',
      ambient: '#FDF7EE',
      sun: '#FFE4B5'
    }
  }
];
