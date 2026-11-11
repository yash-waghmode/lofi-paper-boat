import * as THREE from 'three';

export interface CheckpointGateEntity {
  group: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
  craneMat: THREE.MeshStandardMaterial;
  pulseRing: THREE.Mesh;
  pulseTimer: number; // >0 while pulsing
}

/**
 * Creates a glowing spatial signpost checkpoint arch with emissive materials and pulse ring
 */
export function createGlowingCheckpointGate(width: number, isStartLine: boolean = false): CheckpointGateEntity {
  const gate = new THREE.Group();
  gate.name = isStartLine ? 'StartFinishArch' : 'CheckpointArch';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8C5A2B,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: isStartLine ? 0xE85D4E : 0x2CB1D8,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // Glowing spatial signpost materials
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xFFE082,
    emissive: new THREE.Color(isStartLine ? 0xFF9100 : 0xFFB300),
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const craneMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    emissive: new THREE.Color(isStartLine ? 0xFF3D00 : 0x00E5FF),
    emissiveIntensity: 2.0,
    roughness: 0.3,
  });

  const archW = width + 2.5;
  const halfW = archW / 2;

  // Floating bamboo pilings left and right
  const postGeo = new THREE.CylinderGeometry(0.38, 0.48, 10.5, 7);
  const leftPost = new THREE.Mesh(postGeo, woodMat);
  leftPost.position.set(-halfW, 5.0, 0);
  leftPost.castShadow = true;
  gate.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, woodMat);
  rightPost.position.set(halfW, 5.0, 0);
  rightPost.castShadow = true;
  gate.add(rightPost);

  // Buoyancy float rings with glowing neon trim
  const floatGeo = new THREE.TorusGeometry(0.75, 0.25, 6, 12);
  floatGeo.rotateX(Math.PI / 2);
  const leftFloat = new THREE.Mesh(floatGeo, woodMat);
  leftFloat.position.set(-halfW, 0.15, 0);
  gate.add(leftFloat);

  const rightFloat = new THREE.Mesh(floatGeo, woodMat);
  rightFloat.position.set(halfW, 0.15, 0);
  gate.add(rightFloat);

  // Top origami torii crossbeam
  const beamGeo = new THREE.BoxGeometry(archW + 2.4, 0.48, 0.65);
  const beamMesh = new THREE.Mesh(beamGeo, woodMat);
  beamMesh.position.set(0, 9.5, 0);
  beamMesh.castShadow = true;
  gate.add(beamMesh);

  // Glowing center origami crane crest signpost
  const craneGeo = new THREE.ConeGeometry(0.65, 1.3, 4);
  craneGeo.rotateZ(Math.PI);
  const craneMesh = new THREE.Mesh(craneGeo, craneMat);
  craneMesh.position.set(0, 8.2, 0);
  gate.add(craneMesh);

  // Left & right glowing paper lanterns
  const lanternGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 6);
  const leftLantern = new THREE.Mesh(lanternGeo, lanternMat);
  leftLantern.position.set(-halfW * 0.65, 8.6, 0);
  gate.add(leftLantern);

  const rightLantern = new THREE.Mesh(lanternGeo, lanternMat);
  rightLantern.position.set(halfW * 0.65, 8.6, 0);
  gate.add(rightLantern);

  // Suspended paper streamers
  const streamerGeo = new THREE.PlaneGeometry(0.3, 2.4);
  const leftStreamer = new THREE.Mesh(streamerGeo, ribbonMat);
  leftStreamer.position.set(-halfW * 0.4, 7.4, 0);
  gate.add(leftStreamer);

  const rightStreamer = new THREE.Mesh(streamerGeo, ribbonMat);
  rightStreamer.position.set(halfW * 0.4, 7.4, 0);
  gate.add(rightStreamer);

  // Dynamic radiant pulse ring (invisible by default, expands on pass)
  const ringGeo = new THREE.RingGeometry(0.5, 1.2, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isStartLine ? 0xFFAB00 : 0x00E5FF,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pulseRing = new THREE.Mesh(ringGeo, ringMat);
  pulseRing.position.set(0, 0.2, 0);
  gate.add(pulseRing);

  return {
    group: gate,
    lanternMat,
    craneMat,
    pulseRing,
    pulseTimer: 0,
  };
}
