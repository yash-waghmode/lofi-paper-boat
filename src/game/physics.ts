import { BoatInput, BoatState, TrackCheckpoint, Obstacle, RaceStats } from './types';

export const PHYSICS_CONSTANTS = {
  ACCELERATION: 26.0,       // Punchy, immediate throttle bite
  MAX_SPEED: 30.0,          // Crisp top speed
  REVERSE_SPEED: 8.5,       // Responsive reverse brake
  LINEAR_DRAG: 0.95,        // Weighted fluid coasting
  QUADRATIC_DRAG: 0.038,    // High-speed water drag
  STEER_SPEED: 3.2,         // Smooth, authoritative steering
  DRIFT_STEER_BOOST: 1.7,   // Snappy rotation when drifting
  DRIFT_SLIP_DRAG: 0.32,    // Smooth drift glide
  NORMAL_SLIP_DRAG: 5.8,    // High tracking grip
  WAVE_AMPLITUDE: 0.12,
  WAVE_FREQUENCY: 0.8,
  ROLL_DAMPING: 7.5,        // Damped, organic roll
  PITCH_DAMPING: 6.0,
  RIVER_CURRENT_SPEED: 1.6, // Tactile river current
};

/**
 * Calculates wave height at a given world position and timestamp
 */
export function getWaterHeight(x: number, z: number, time: number): number {
  const w1 = Math.sin(x * 0.15 + time * 1.8) * Math.cos(z * 0.12 + time * 1.4);
  const w2 = Math.sin((x + z) * 0.08 - time * 1.1) * 0.5;
  const ripple = Math.sin(x * 0.4 + z * 0.3 + time * 3.0) * 0.2;
  return (w1 + w2 + ripple) * PHYSICS_CONSTANTS.WAVE_AMPLITUDE;
}

/**
 * Updates boat physics simulation for a discrete time step dt
 */
export function updateBoatPhysics(
  state: BoatState,
  input: BoatInput,
  dt: number,
  time: number
): {
  nextState: BoatState;
  collisionEvents: { type: 'bank' | 'obstacle' | 'checkpoint'; intensity: number }[];
} {
  const clampedDt = Math.min(dt, 0.05);
  const events: { type: 'bank' | 'obstacle' | 'checkpoint'; intensity: number }[] = [];

  let {
    x, y, z, vx, vz, heading, yawRate, roll, pitch,
    driftFactor, isDrifting, driftScore, driftCombo, invulnerableTime
  } = state;

  if (invulnerableTime > 0) {
    invulnerableTime = Math.max(0, invulnerableTime - clampedDt);
  }

  // Heading vectors
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);

  // Decompose velocity into forward and lateral components
  const forwardVelocity = vx * forwardX + vz * forwardZ;
  const lateralVelocity = vx * rightX + vz * rightZ;

  // Drift trigger: active drift key OR sharp steering at speed
  const speed = Math.sqrt(vx * vx + vz * vz);
  const intendsDrift = input.drift || (Math.abs(input.steer) > 0.82 && speed > 9.0 && input.brake > 0.15);

  // Smooth drift factor transition
  const targetDriftFactor = intendsDrift && speed > 4.5 ? 1.0 : 0.0;
  driftFactor += (targetDriftFactor - driftFactor) * Math.min(1.0, clampedDt * 9.0);
  isDrifting = driftFactor > 0.35 && speed > 5.0;

  // Steering torque with speed-dependent authority
  const steerMultiplier = isDrifting ? PHYSICS_CONSTANTS.DRIFT_STEER_BOOST : 1.0;
  // Responsive turning with low-speed turning assist
  const speedSteerAuthority = Math.min(1.0, Math.max(0.35, speed / 2.5));
  const steerImpulse = -input.steer * PHYSICS_CONSTANTS.STEER_SPEED * steerMultiplier * speedSteerAuthority;
  
  yawRate += (steerImpulse - yawRate) * Math.min(1.0, clampedDt * 12.0);
  heading += yawRate * clampedDt;

  // Keep heading in [0, 2*PI]
  if (heading > Math.PI * 2) heading -= Math.PI * 2;
  if (heading < 0) heading += Math.PI * 2;

  // Punchy Acceleration and Braking with initial bite
  let targetForwardAccel = 0;
  if (input.throttle > 0) {
    // Punchy launch boost from low speeds
    const launchBoost = speed < 6.0 ? 1.3 : 1.0;
    targetForwardAccel = input.throttle * PHYSICS_CONSTANTS.ACCELERATION * launchBoost;
  } else if (input.brake > 0) {
    // Active hydrodynamic braking or reverse
    if (forwardVelocity > 0.4) {
      targetForwardAccel = -input.brake * PHYSICS_CONSTANTS.ACCELERATION * 1.6;
    } else {
      targetForwardAccel = -input.brake * PHYSICS_CONSTANTS.REVERSE_SPEED * 0.9;
    }
  }

  // Compute updated forward & lateral forces
  const updatedForwardX = Math.sin(heading);
  const updatedForwardZ = Math.cos(heading);
  const updatedRightX = Math.cos(heading);
  const updatedRightZ = -Math.sin(heading);

  // Lateral resistance depends heavily on drift state
  const lateralFriction = isDrifting ? PHYSICS_CONSTANTS.DRIFT_SLIP_DRAG : PHYSICS_CONSTANTS.NORMAL_SLIP_DRAG;
  
  // Update forward & lateral velocity with weighted momentum
  let newForwardVelocity = forwardVelocity + targetForwardAccel * clampedDt;
  
  // Drag forces (fluid resistance)
  const dragForce = (PHYSICS_CONSTANTS.LINEAR_DRAG + PHYSICS_CONSTANTS.QUADRATIC_DRAG * Math.abs(newForwardVelocity)) * newForwardVelocity;
  newForwardVelocity -= dragForce * clampedDt;

  let newLateralVelocity = lateralVelocity - (lateralVelocity * lateralFriction) * clampedDt;

  // Speed clamp
  if (newForwardVelocity > PHYSICS_CONSTANTS.MAX_SPEED) {
    newForwardVelocity = PHYSICS_CONSTANTS.MAX_SPEED;
  } else if (newForwardVelocity < -PHYSICS_CONSTANTS.REVERSE_SPEED) {
    newForwardVelocity = -PHYSICS_CONSTANTS.REVERSE_SPEED;
  }

  // Recombine velocity
  vx = newForwardVelocity * updatedForwardX + newLateralVelocity * updatedRightX;
  vz = newForwardVelocity * updatedForwardZ + newLateralVelocity * updatedRightZ;

  // Subtle natural river flow current
  vz += PHYSICS_CONSTANTS.RIVER_CURRENT_SPEED * 0.05 * clampedDt;

  // Position update
  x += vx * clampedDt;
  z += vz * clampedDt;

  // Water buoyancy and tilting
  const waterHeight = getWaterHeight(x, z, time);
  y += (waterHeight - y) * Math.min(1.0, clampedDt * 8.0);

  // Tactile boat roll (tilts into turns, counter-steers into drifts)
  const targetRoll = -yawRate * 0.35 - (newLateralVelocity / 12.0) * 0.32;
  roll += (targetRoll - roll) * Math.min(1.0, clampedDt * PHYSICS_CONSTANTS.ROLL_DAMPING);

  // Tactile boat pitch (lift bow on punchy acceleration, dip on braking)
  const targetPitch = (targetForwardAccel / PHYSICS_CONSTANTS.ACCELERATION) * 0.22;
  pitch += (targetPitch - pitch) * Math.min(1.0, clampedDt * PHYSICS_CONSTANTS.PITCH_DAMPING);

  // Drift scoring
  if (isDrifting) {
    const slipAngle = Math.abs(Math.atan2(newLateralVelocity, Math.max(0.1, Math.abs(newForwardVelocity))));
    const earned = Math.max(1, Math.round((slipAngle + 0.15) * speed * clampedDt * 60 * driftCombo));
    driftScore += earned;
    driftCombo = Math.min(5.0, driftCombo + clampedDt * 0.5);
  } else {
    driftCombo = Math.max(1.0, driftCombo - clampedDt * 1.5);
  }

  const updatedSpeed = Math.sqrt(vx * vx + vz * vz);

  return {
    nextState: {
      x, y, z, vx, vz, heading, yawRate,
      speed: updatedSpeed,
      roll, pitch,
      driftFactor, isDrifting,
      driftScore, driftCombo,
      invulnerableTime
    },
    collisionEvents: events
  };
}

/**
 * Checks boat against river track boundary and resolves bank collision
 */
export function resolveRiverBankCollision(
  boat: BoatState,
  centerlinePoints: { x: number; z: number }[],
  riverWidth: number
): { boat: BoatState; hitBank: boolean } {
  const halfWidth = riverWidth / 2;
  let minDistance = Infinity;
  let nearestX = 0;
  let nearestZ = 0;
  let nearestNormalX = 0;
  let nearestNormalZ = 0;

  // Find nearest segment on the centerline
  for (let i = 0; i < centerlinePoints.length; i++) {
    const p1 = centerlinePoints[i];
    const p2 = centerlinePoints[(i + 1) % centerlinePoints.length];

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) continue;

    // Project boat onto segment
    let t = ((boat.x - p1.x) * dx + (boat.z - p1.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projZ = p1.z + t * dz;
    const distSq = (boat.x - projX) * (boat.x - projX) + (boat.z - projZ) * (boat.z - projZ);

    if (distSq < minDistance) {
      minDistance = distSq;
      nearestX = projX;
      nearestZ = projZ;
      const segLen = Math.sqrt(lenSq);
      // Normal to segment pointing away from centerline
      nearestNormalX = (boat.x - projX);
      nearestNormalZ = (boat.z - projZ);
      const normLen = Math.sqrt(nearestNormalX * nearestNormalX + nearestNormalZ * nearestNormalZ);
      if (normLen > 0.001) {
        nearestNormalX /= normLen;
        nearestNormalZ /= normLen;
      }
    }
  }

  const distance = Math.sqrt(minDistance);
  // Soft boundary margin (allow boat to touch bank before elastic deflection)
  const margin = halfWidth - 0.7;

  if (distance > margin) {
    // Boat has touched the river bank!
    const penetration = distance - margin;
    // Push boat back into the river
    const newX = boat.x - nearestNormalX * penetration * 1.05;
    const newZ = boat.z - nearestNormalZ * penetration * 1.05;

    // Reflect velocity with damping (restitution 0.35)
    const dot = boat.vx * nearestNormalX + boat.vz * nearestNormalZ;
    let newVx = boat.vx;
    let newVz = boat.vz;
    if (dot > 0) {
      // Moving outward into bank
      newVx -= 1.35 * dot * nearestNormalX;
      newVz -= 1.35 * dot * nearestNormalZ;
      // Additional damping
      newVx *= 0.7;
      newVz *= 0.7;
    }

    return {
      boat: {
        ...boat,
        x: newX,
        z: newZ,
        vx: newVx,
        vz: newVz,
        speed: Math.sqrt(newVx * newVx + newVz * newVz),
      },
      hitBank: true
    };
  }

  return { boat, hitBank: false };
}

/**
 * Checks boat against obstacle array
 */
export function checkObstacleCollisions(
  boat: BoatState,
  obstacles: Obstacle[]
): { boat: BoatState; hitObstacle: Obstacle | null } {
  if (boat.invulnerableTime > 0) {
    return { boat, hitObstacle: null };
  }

  for (const obs of obstacles) {
    const dx = boat.x - obs.x;
    const dz = boat.z - obs.z;
    const distSq = dx * dx + dz * dz;
    const combinedRadius = 1.0 + obs.radius;

    if (distSq < combinedRadius * combinedRadius) {
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.0001 ? dx / dist : 1;
      const nz = dist > 0.0001 ? dz / dist : 0;

      // Obstacle collision response
      const speed = Math.sqrt(boat.vx * boat.vx + boat.vz * boat.vz);
      let speedLoss = 0.7; // default 30% reduction
      if (obs.type === 'leaf') {
        speedLoss = 0.95; // very light drag
      } else if (obs.type === 'rock' || obs.type === 'log') {
        speedLoss = 0.6; // heavy bump
      }

      const newVx = (boat.vx * 0.4 + nx * speed * 0.4) * speedLoss;
      const newVz = (boat.vz * 0.4 + nz * speed * 0.4) * speedLoss;

      return {
        boat: {
          ...boat,
          x: obs.x + nx * (combinedRadius + 0.1),
          z: obs.z + nz * (combinedRadius + 0.1),
          vx: newVx,
          vz: newVz,
          speed: Math.sqrt(newVx * newVx + newVz * newVz),
          invulnerableTime: 0.4,
        },
        hitObstacle: obs
      };
    }
  }

  return { boat, hitObstacle: null };
}

/**
 * Evaluates checkpoint progress and lap completion
 */
export function evaluateCheckpoints(
  boat: BoatState,
  checkpoints: TrackCheckpoint[],
  currentCheckpointIdx: number,
  stats: RaceStats,
  dt: number
): {
  nextCheckpointIdx: number;
  stats: RaceStats;
  passedCheckpoint: boolean;
  lapCompleted: boolean;
} {
  const newStats = { ...stats };
  newStats.currentLapTime += dt;
  newStats.totalTime += dt;

  const targetCheckpoint = checkpoints[currentCheckpointIdx];
  if (!targetCheckpoint) {
    return { nextCheckpointIdx: currentCheckpointIdx, stats: newStats, passedCheckpoint: false, lapCompleted: false };
  }

  // Vector from checkpoint to boat
  const dx = boat.x - targetCheckpoint.x;
  const dz = boat.z - targetCheckpoint.z;
  const distSq = dx * dx + dz * dz;

  // Check if within gate radius
  const maxGateRadius = targetCheckpoint.width / 2 + 3.0;
  if (distSq <= maxGateRadius * maxGateRadius) {
    // Check if forward crossing: dot product with tangent is positive
    const forwardDot = dx * targetCheckpoint.tangentX + dz * targetCheckpoint.tangentZ;
    // When boat is close and aligned
    if (forwardDot > -2.0) {
      const nextIdx = (currentCheckpointIdx + 1) % checkpoints.length;
      newStats.checkpointsPassed += 1;

      // Completed a full lap?
      let lapCompleted = false;
      if (nextIdx === 0) {
        lapCompleted = true;
        newStats.lapTimes.push(newStats.currentLapTime);
        if (newStats.bestLapTime === 0 || newStats.currentLapTime < newStats.bestLapTime) {
          newStats.bestLapTime = newStats.currentLapTime;
        }

        if (newStats.currentLap < newStats.totalLaps) {
          newStats.currentLap += 1;
          newStats.currentLapTime = 0;
        } else {
          newStats.isFinished = true;
        }
      }

      return {
        nextCheckpointIdx: nextIdx,
        stats: newStats,
        passedCheckpoint: true,
        lapCompleted
      };
    }
  }

  return {
    nextCheckpointIdx: currentCheckpointIdx,
    stats: newStats,
    passedCheckpoint: false,
    lapCompleted: false
  };
}
