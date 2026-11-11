export type GameMode = 'race' | 'drift' | 'zen';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type CameraView = 'chase' | 'hood' | 'isometric';

export type WeatherType = 'sakura' | 'snow' | 'autumn' | 'clear';

export interface Vector2D {
  x: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoatInput {
  throttle: number; // 0 to 1
  steer: number;    // -1 (left) to 1 (right)
  brake: number;    // 0 to 1
  drift: boolean;   // drift button held
}

export interface BoatState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number; // in radians (0 = along +Z)
  yawRate: number;
  speed: number;
  roll: number;
  pitch: number;
  driftFactor: number; // 0 to 1
  isDrifting: boolean;
  driftScore: number;
  driftCombo: number;
  invulnerableTime: number;
}

export interface Obstacle {
  id: string;
  type: 'rock' | 'leaf' | 'log' | 'lantern';
  x: number;
  z: number;
  radius: number;
  rotation: number;
  scale: number;
  color?: string;
}

export interface TrackCheckpoint {
  index: number;
  x: number;
  z: number;
  tangentX: number;
  tangentZ: number;
  width: number;
}

export interface TrackData {
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'Cozy' | 'Flow' | 'Challenging';
  description: string;
  pathPoints: Vector2D[]; // closed loop centerline
  riverWidth: number;
  totalLaps: number;
  checkpoints: TrackCheckpoint[];
  obstacles: Obstacle[];
  foliage: { x: number; z: number; type: 'willow' | 'pine' | 'reed' | 'bamboo'; scale: number }[];
  defaultWeather?: WeatherType;
  sceneryColor: {
    ground: string;
    water: string;
    waterDeep: string;
    ambient: string;
    sun: string;
  };
}

export interface RaceStats {
  currentLap: number;
  totalLaps: number;
  lapTimes: number[];
  currentLapTime: number;
  bestLapTime: number;
  totalTime: number;
  totalDriftScore: number;
  collisions: number;
  checkpointsPassed: number;
  isFinished: boolean;
}
