import * as THREE from 'three';
import { BoatState } from '../game/types';
import { createOrigamiBoat, createBoatContactDisc } from '../game/proceduralModels';

export interface PaperBoatEntity {
  group: THREE.Group;
  contactDisc: THREE.Mesh;
}

/**
 * Creates and manages the composite origami paper boat and its water wake
 */
export function createPaperBoat(): PaperBoatEntity {
  const group = createOrigamiBoat();
  const contactDisc = createBoatContactDisc();

  return {
    group,
    contactDisc,
  };
}

/**
 * Applies tactile physics transform: translation, heading yaw, roll into turns, pitch on acceleration/braking
 */
export function updatePaperBoatTransform(entity: PaperBoatEntity, boat: BoatState) {
  entity.group.position.set(boat.x, boat.y, boat.z);
  entity.group.rotation.set(0, boat.heading, 0);
  entity.group.rotateZ(boat.roll);
  entity.group.rotateX(boat.pitch);

  // Keep contact disc flush with water surface
  entity.contactDisc.position.set(boat.x, boat.y + 0.02, boat.z);
  entity.contactDisc.rotation.y = boat.heading;
}
