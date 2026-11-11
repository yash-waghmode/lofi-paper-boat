import * as THREE from 'three';

/**
 * Creates a subtle procedural paper fiber texture
 */
export function createPaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base soft warm off-white paper
  ctx.fillStyle = '#FAF8F4';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle paper grain fibers
  ctx.fillStyle = 'rgba(210, 195, 175, 0.08)';
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 2 + Math.random() * 5;
    const angle = Math.random() * Math.PI * 2;
    ctx.fillRect(x, y, Math.cos(angle) * len, Math.sin(angle) * 1.5);
  }

  // Soft watercolor wash mottling
  for (let i = 0; i < 20; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rad = 40 + Math.random() * 80;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
    grad.addColorStop(0, 'rgba(235, 225, 210, 0.09)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates composite 8-part procedural origami paper boat
 */
export function createOrigamiBoat(): THREE.Group {
  const boatGroup = new THREE.Group();
  boatGroup.name = 'OrigamiBoat';

  const paperTexture = createPaperTexture();

  // Primary paper material (matte folded craft paper)
  const paperMaterial = new THREE.MeshStandardMaterial({
    map: paperTexture,
    color: 0xFFFFFF,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Secondary inner paper fold material (slightly warmer shaded crease)
  const innerCreaseMaterial = new THREE.MeshStandardMaterial({
    map: paperTexture,
    color: 0xF0ECE1,
    roughness: 0.90,
    metalness: 0.01,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Accent detail material (metallic gilded crease pin & paper tip)
  const goldAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0xE8BA55,
    roughness: 0.22,
    metalness: 0.85,
  });

  // Part 1 & 2: Left and Right Hull Wings (Folded origami polygon)
  // Coordinates are designed around center (0,0,0), boat length ~ 2.4 units, width ~ 1.2 units
  const leftHullGeo = new THREE.BufferGeometry();
  // Vertices for left origami wing: [Bow, Stern, Keel-Center, Left-Gunwale-Bow, Left-Gunwale-Stern, Left-Gunwale-Mid]
  const lVertices = new Float32Array([
    // Face 1: Bow -> Left Gunwale Mid -> Keel
    0, 0.45, 1.2,    -0.55, 0.38, 0.1,    0, -0.15, 0.1,
    // Face 2: Left Gunwale Mid -> Stern -> Keel
    -0.55, 0.38, 0.1,  0, 0.40, -1.1,     0, -0.15, 0.1,
    // Face 3: Keel to Bottom
    0, -0.15, 0.1,    -0.55, 0.38, 0.1,   0, -0.18, -0.6,
  ]);
  leftHullGeo.setAttribute('position', new THREE.BufferAttribute(lVertices, 3));
  leftHullGeo.computeVertexNormals();
  const leftHullMesh = new THREE.Mesh(leftHullGeo, paperMaterial);
  leftHullMesh.castShadow = true;
  boatGroup.add(leftHullMesh);

  // Mirrored Right Hull Wing
  const rightHullGeo = new THREE.BufferGeometry();
  const rVertices = new Float32Array([
    // Face 1: Bow -> Keel -> Right Gunwale Mid
    0, 0.45, 1.2,     0, -0.15, 0.1,      0.55, 0.38, 0.1,
    // Face 2: Right Gunwale Mid -> Keel -> Stern
    0.55, 0.38, 0.1,   0, -0.15, 0.1,     0, 0.40, -1.1,
    // Face 3: Keel to Bottom
    0, -0.15, 0.1,     0.55, 0.38, 0.1,   0, -0.18, -0.6,
  ]);
  rightHullGeo.setAttribute('position', new THREE.BufferAttribute(rVertices, 3));
  rightHullGeo.computeVertexNormals();
  const rightHullMesh = new THREE.Mesh(rightHullGeo, paperMaterial);
  rightHullMesh.castShadow = true;
  boatGroup.add(rightHullMesh);

  // Part 3: Center Origami Sail Pyramid (Classic folded paper boat sail peak)
  const sailGeo = new THREE.BufferGeometry();
  const sailVerts = new Float32Array([
    // Sail Left Face: Sail Peak, Keel Mid, Left Mid Peak
    0, 1.25, 0.05,    0, -0.1, 0.25,      -0.02, 0.2, -0.45,
    // Sail Right Face: Sail Peak, Right Mid Peak, Keel Mid
    0, 1.25, 0.05,    0.02, 0.2, -0.45,   0, -0.1, 0.25,
    // Forward Sail Slant
    0, 1.25, 0.05,    0, -0.1, 0.25,      0, 0.35, 0.65,
  ]);
  sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
  sailGeo.computeVertexNormals();
  const sailMesh = new THREE.Mesh(sailGeo, innerCreaseMaterial);
  sailMesh.castShadow = true;
  boatGroup.add(sailMesh);

  // Part 4: Inner cockpit crease folds (shadowed inner paper layers)
  const deckGeo = new THREE.BufferGeometry();
  const deckVerts = new Float32Array([
    -0.42, 0.25, 0.05,  0.42, 0.25, 0.05,   0, -0.05, 0.6,
    -0.42, 0.25, 0.05,  0, -0.05, -0.5,    0.42, 0.25, 0.05,
  ]);
  deckGeo.setAttribute('position', new THREE.BufferAttribute(deckVerts, 3));
  deckGeo.computeVertexNormals();
  const deckMesh = new THREE.Mesh(deckGeo, innerCreaseMaterial);
  boatGroup.add(deckMesh);

  // Part 5: Origami Bow Tip (Sharpened paper prow fold)
  const bowTipGeo = new THREE.ConeGeometry(0.06, 0.35, 4);
  bowTipGeo.rotateX(Math.PI / 2.3);
  const bowTipMesh = new THREE.Mesh(bowTipGeo, paperMaterial);
  bowTipMesh.position.set(0, 0.44, 1.25);
  boatGroup.add(bowTipMesh);

  // Part 6: Origami Stern Transom Crest
  const sternGeo = new THREE.BoxGeometry(0.12, 0.18, 0.2);
  sternGeo.rotateX(0.2);
  const sternMesh = new THREE.Mesh(sternGeo, innerCreaseMaterial);
  sternMesh.position.set(0, 0.38, -1.1);
  boatGroup.add(sternMesh);

  // Part 7: Mast Pin (Metallic golden accent)
  const pinGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6);
  const pinMesh = new THREE.Mesh(pinGeo, goldAccentMaterial);
  pinMesh.position.set(0, 1.35, 0.05);
  boatGroup.add(pinMesh);

  // Part 8: Tiny origami paper streamer / pennant flag
  const pennantGeo = new THREE.BufferGeometry();
  const pennantVerts = new Float32Array([
    0, 1.5, 0.05,   0, 1.4, 0.05,   0, 1.45, -0.28,
  ]);
  pennantGeo.setAttribute('position', new THREE.BufferAttribute(pennantVerts, 3));
  pennantGeo.computeVertexNormals();
  const pennantMat = new THREE.MeshStandardMaterial({
    color: 0xEE6C4D,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  const pennantMesh = new THREE.Mesh(pennantGeo, pennantMat);
  boatGroup.add(pennantMesh);

  // Scale slightly for clear low-poly origami presence on screen
  boatGroup.scale.set(1.35, 1.35, 1.35);

  // Grounding / Buoyancy offset: boat sits flush in water
  boatGroup.position.y = 0;
  return boatGroup;
}

/**
 * Creates soft water wake and contact shadow under boat
 */
export function createBoatContactDisc(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2.4, 4.0);
  geo.rotateX(-Math.PI / 2);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Soft radial water wake gradient
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.5, 'rgba(40, 140, 180, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02; // slightly above water surface to avoid z-fighting
  return mesh;
}

/**
 * Creates composite floating origami checkpoint gate arch
 */
export function createCheckpointGate(width: number): THREE.Group {
  const gate = new THREE.Group();
  gate.name = 'CheckpointGate';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xB88B4A,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xE85D4E,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xFFE082,
    emissive: 0xFFB300,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });

  const archW = width + 2.5;
  const halfW = archW / 2;

  // Floating bamboo pilings left and right (tall enough to clear any camera angle)
  const postGeo = new THREE.CylinderGeometry(0.38, 0.48, 10.5, 7);
  const leftPost = new THREE.Mesh(postGeo, woodMat);
  leftPost.position.set(-halfW, 5.0, 0);
  leftPost.castShadow = true;
  gate.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, woodMat);
  rightPost.position.set(halfW, 5.0, 0);
  rightPost.castShadow = true;
  gate.add(rightPost);

  // Buoyancy float rings at water line
  const floatGeo = new THREE.TorusGeometry(0.75, 0.25, 6, 12);
  floatGeo.rotateX(Math.PI / 2);
  const leftFloat = new THREE.Mesh(floatGeo, woodMat);
  leftFloat.position.set(-halfW, 0.15, 0);
  gate.add(leftFloat);

  const rightFloat = new THREE.Mesh(floatGeo, woodMat);
  rightFloat.position.set(halfW, 0.15, 0);
  gate.add(rightFloat);

  // Top origami torii crossbeam (elevated high at y = 9.5)
  const beamGeo = new THREE.BoxGeometry(archW + 2.2, 0.45, 0.6);
  const beamMesh = new THREE.Mesh(beamGeo, woodMat);
  beamMesh.position.set(0, 9.5, 0);
  beamMesh.castShadow = true;
  gate.add(beamMesh);

  // Floating origami crane banner in center
  const craneGeo = new THREE.ConeGeometry(0.65, 1.2, 4);
  craneGeo.rotateZ(Math.PI);
  const craneMesh = new THREE.Mesh(craneGeo, lanternMat);
  craneMesh.position.set(0, 8.2, 0);
  gate.add(craneMesh);

  // Suspended paper streamers dangling
  const streamerGeo = new THREE.PlaneGeometry(0.28, 2.2);
  const leftStreamer = new THREE.Mesh(streamerGeo, ribbonMat);
  leftStreamer.position.set(-halfW * 0.4, 7.5, 0);
  gate.add(leftStreamer);

  const rightStreamer = new THREE.Mesh(streamerGeo, ribbonMat);
  rightStreamer.position.set(halfW * 0.4, 7.5, 0);
  gate.add(rightStreamer);

  return gate;
}

/**
 * Creates multi-faceted low-poly river boulder
 */
export function createRiverRock(scale: number = 1.0): THREE.Mesh {
  const geo = new THREE.DodecahedronGeometry(scale, 1);
  // Organic deformation
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const noise = 1.0 + (Math.sin(vx * 3 + vy * 2) * 0.15);
    pos.setXYZ(i, vx * noise * 1.1, Math.max(0, vy * noise * 0.7), vz * noise * 1.0);
  }
  geo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x989084,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });

  const rockMesh = new THREE.Mesh(geo, rockMat);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  return rockMesh;
}

/**
 * Creates floating autumn maple / lily leaf obstacle
 */
export function createFloatingLeaf(color: string = '#E87A5D', scale: number = 1.0): THREE.Group {
  const leafGroup = new THREE.Group();

  // Low-poly leaf blade
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(-0.6, 0.4, -0.8, 1.2, 0, 1.6);
  leafShape.bezierCurveTo(0.8, 1.2, 0.6, 0.4, 0, 0);

  const extrudeSettings = {
    depth: 0.04,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  };
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
  leafGeo.rotateX(-Math.PI / 2);
  leafGeo.scale(scale * 0.9, scale * 0.9, scale * 0.9);

  const leafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const leafMesh = new THREE.Mesh(leafGeo, leafMat);
  leafMesh.position.y = 0.05;
  leafGroup.add(leafMesh);

  // Tiny leaf stem
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4 * scale, 4);
  stemGeo.rotateX(Math.PI / 2);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x5C4033,
    roughness: 0.9,
  });
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.position.set(0, 0.05, -0.15 * scale);
  leafGroup.add(stemMesh);

  return leafGroup;
}

/**
 * Creates floating driftwood log obstacle
 */
export function createDriftwoodLog(scale: number = 1.0): THREE.Group {
  const logGroup = new THREE.Group();

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x6E543C,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  const coreGeo = new THREE.CylinderGeometry(0.28 * scale, 0.32 * scale, 2.6 * scale, 6);
  coreGeo.rotateZ(Math.PI / 2);
  const coreMesh = new THREE.Mesh(coreGeo, barkMat);
  coreMesh.position.y = 0.08 * scale;
  coreMesh.castShadow = true;
  logGroup.add(coreMesh);

  // Secondary branch knot
  const branchGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.8 * scale, 5);
  branchGeo.rotateX(0.7);
  const branchMesh = new THREE.Mesh(branchGeo, barkMat);
  branchMesh.position.set(0.4 * scale, 0.25 * scale, 0.3 * scale);
  logGroup.add(branchMesh);

  return logGroup;
}

/**
 * Creates low-poly Weeping Willow Tree (Composite 6-part group)
 */
export function createWillowTree(scale: number = 1.0): THREE.Group {
  const tree = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5D4734,
    roughness: 0.92,
    flatShading: true,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x8FA876,
    roughness: 0.80,
    flatShading: true,
  });

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.7 * scale, 3.5 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, woodMat);
  trunk.position.y = 1.75 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  // Canopy tiers
  const canopyOffsets = [
    { y: 3.2, r: 2.2, h: 2.0 },
    { y: 4.4, r: 1.8, h: 1.8 },
    { y: 5.4, r: 1.2, h: 1.4 },
  ];

  canopyOffsets.forEach(c => {
    const geo = new THREE.ConeGeometry(c.r * scale, c.h * scale, 7);
    const mesh = new THREE.Mesh(geo, foliageMat);
    mesh.position.y = c.y * scale;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tree.add(mesh);
  });

  return tree;
}

/**
 * Creates low-poly River Pine tree
 */
export function createPineTree(scale: number = 1.0): THREE.Group {
  const tree = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4A3728,
    roughness: 0.9,
    flatShading: true,
  });

  const needleMat = new THREE.MeshStandardMaterial({
    color: 0x486B4F,
    roughness: 0.75,
    flatShading: true,
  });

  const trunkGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3.0 * scale, 5);
  const trunk = new THREE.Mesh(trunkGeo, woodMat);
  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const tiers = [
    { y: 2.8, r: 1.8, h: 2.2 },
    { y: 4.2, r: 1.4, h: 2.0 },
    { y: 5.5, r: 0.9, h: 1.8 },
  ];

  tiers.forEach(t => {
    const geo = new THREE.ConeGeometry(t.r * scale, t.h * scale, 6);
    const mesh = new THREE.Mesh(geo, needleMat);
    mesh.position.y = t.y * scale;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tree.add(mesh);
  });

  return tree;
}

/**
 * Creates low-poly organic cherry blossom / leaf petal geometry
 */
export function createCherryPetalGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.16, 0.12, -0.22, 0.32, -0.06, 0.45);
  shape.bezierCurveTo(0.0, 0.52, 0.06, 0.52, 0.06, 0.45);
  shape.bezierCurveTo(0.22, 0.32, 0.16, 0.12, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 4);
  const pos = geo.attributes.position;
  // Apply gentle 3D cup curvature to petal
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * Math.PI) * 0.06);
  }
  geo.computeVertexNormals();
  geo.center();
  return geo;
}

/**
 * Creates low-poly crystalline snowflake geometry
 */
export function createSnowflakeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(0.18, 0);
  geo.scale(1.0, 0.25, 1.0); // Flatten slightly into a floating flake
  geo.computeVertexNormals();
  return geo;
}
