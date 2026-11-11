import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateBoatPhysics,
  resolveRiverBankCollision,
  checkObstacleCollisions,
  evaluateCheckpoints,
  getWaterHeight,
} from './physics';
import { BoatState, TrackCheckpoint, Obstacle, RaceStats } from './types';

function createInitialBoat(): BoatState {
  return {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vz: 0,
    heading: 0,
    yawRate: 0,
    speed: 0,
    roll: 0,
    pitch: 0,
    driftFactor: 0,
    isDrifting: false,
    driftScore: 0,
    driftCombo: 1.0,
    invulnerableTime: 0,
  };
}

test('Boat accelerates forward when throttle is applied', () => {
  const boat = createInitialBoat();
  const input = { throttle: 1.0, steer: 0, brake: 0, drift: false };
  const { nextState } = updateBoatPhysics(boat, input, 0.05, 0);

  assert.ok(nextState.speed > 0, 'Boat speed should increase from throttle');
  assert.ok(nextState.vz > 0, 'Boat heading 0 (+Z) should gain positive Z velocity');
  assert.equal(nextState.vx, 0, 'No steer means 0 lateral velocity');
});

test('Water wave height function produces bounded oscillation', () => {
  const h1 = getWaterHeight(0, 0, 0);
  const h2 = getWaterHeight(10, 20, 1.5);
  assert.ok(Math.abs(h1) <= 0.3, 'Wave height should be within cozy bounded amplitude');
  assert.ok(Math.abs(h2) <= 0.3, 'Wave height should be within cozy bounded amplitude');
});

test('Steering causes yaw rate and heading change when moving', () => {
  const boat = createInitialBoat();
  boat.vz = 10.0;
  boat.speed = 10.0;

  const steerLeftInput = { throttle: 1.0, steer: -1.0, brake: 0, drift: false };
  const { nextState } = updateBoatPhysics(boat, steerLeftInput, 0.05, 0);

  assert.ok(nextState.yawRate !== 0, 'Steering should produce yaw rate');
  assert.ok(nextState.heading !== 0, 'Steering should change heading');
});

test('Drift mode triggers with drift input and accumulates drift score', () => {
  const boat = createInitialBoat();
  boat.vz = 15.0;
  boat.speed = 15.0;
  boat.driftFactor = 0.8;

  const driftInput = { throttle: 0.8, steer: 1.0, brake: 0, drift: true };
  const { nextState } = updateBoatPhysics(boat, driftInput, 0.05, 0);

  assert.ok(nextState.isDrifting, 'Boat should enter drifting state');
  assert.ok(nextState.driftScore > 0, 'Drifting should accumulate drift points');
});

test('River bank collision prevents boat from escaping channel', () => {
  const boat = createInitialBoat();
  boat.x = 12.0; // outside 16m wide river (half-width = 8m)
  boat.z = 10.0;
  boat.vx = 5.0;
  boat.vz = 2.0;

  const centerline = [
    { x: 0, z: 0 },
    { x: 0, z: 20 },
    { x: 0, z: 40 },
  ];

  const result = resolveRiverBankCollision(boat, centerline, 16.0);
  assert.equal(result.hitBank, true, 'Boat beyond river width should hit river bank');
  assert.ok(result.boat.x < 12.0, 'Boat should be pushed back inward toward centerline');
  assert.ok(result.boat.vx < 5.0, 'Outward velocity should be damped / reflected');
});

test('Obstacle collision applies speed reduction and invulnerability window', () => {
  const boat = createInitialBoat();
  boat.x = 5.0;
  boat.z = 5.0;
  boat.vx = 10.0;
  boat.vz = 0;
  boat.speed = 10.0;

  const obstacles: Obstacle[] = [
    { id: 'rock-1', type: 'rock', x: 5.5, z: 5.0, radius: 1.2, rotation: 0, scale: 1 },
  ];

  const result = checkObstacleCollisions(boat, obstacles);
  assert.ok(result.hitObstacle !== null, 'Should detect collision with rock obstacle');
  assert.ok(result.boat.speed < 10.0, 'Speed should decrease upon collision');
  assert.ok(result.boat.invulnerableTime > 0, 'Invulnerability timer should activate');
});

test('Checkpoint crossing increments lap and records lap times correctly', () => {
  const boat = createInitialBoat();
  boat.x = 0;
  boat.z = 20.0;

  const checkpoints: TrackCheckpoint[] = [
    { index: 0, x: 0, z: 20.0, tangentX: 0, tangentZ: 1, width: 14.0 },
    { index: 1, x: 0, z: 60.0, tangentX: 0, tangentZ: 1, width: 14.0 },
  ];

  const initialStats: RaceStats = {
    currentLap: 1,
    totalLaps: 3,
    lapTimes: [],
    currentLapTime: 12.5,
    bestLapTime: 0,
    totalTime: 12.5,
    totalDriftScore: 150,
    collisions: 0,
    checkpointsPassed: 0,
    isFinished: false,
  };

  // Boat crosses checkpoint 0
  const step1 = evaluateCheckpoints(boat, checkpoints, 0, initialStats, 0.05);
  assert.equal(step1.passedCheckpoint, true, 'Checkpoint 0 should be crossed');
  assert.equal(step1.nextCheckpointIdx, 1, 'Next target checkpoint should be index 1');

  // Boat crosses checkpoint 1
  boat.z = 60.0;
  const step2 = evaluateCheckpoints(boat, checkpoints, 1, step1.stats, 0.05);
  assert.equal(step2.passedCheckpoint, true, 'Checkpoint 1 should be crossed');
  assert.equal(step2.nextCheckpointIdx, 0, 'Should loop back to checkpoint 0');
  assert.equal(step2.lapCompleted, true, 'Completed circuit should complete Lap 1');
  assert.equal(step2.stats.currentLap, 2, 'Should advance to Lap 2');
  assert.equal(step2.stats.lapTimes.length, 1, 'Should record 1 completed lap time');
});
