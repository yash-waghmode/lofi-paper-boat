import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TrackData, BoatState, CameraView, WeatherType } from './types';
import {
  createOrigamiBoat,
  createBoatContactDisc,
  createRiverRock,
  createFloatingLeaf,
  createDriftwoodLog,
  createWillowTree,
  createPineTree,
  createCherryPetalGeometry,
} from './proceduralModels';
import { createRiverWaterMaterial } from '../components/RiverTrack';
import { createGlowingCheckpointGate, CheckpointGateEntity } from '../components/Checkpoints';
import { getWaterHeight } from './physics';

export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

// Reusable scratch vectors to ensure zero GC in animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _colorA = new THREE.Color();

// Fixed capacity particle pools
const MAX_PARTICLES = 120;
const MAX_WEATHER_PARTICLES = 160;

interface WeatherParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  wobbleSpeed: number;
  phase: number;
  baseScale: number;
}

export class SceneRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  // Scene entities
  public boatMesh: THREE.Group;
  private boatContactDisc: THREE.Mesh;
  private checkpointEntities: CheckpointGateEntity[] = [];
  private obstacleMeshes: THREE.Object3D[] = [];
  private foliageMeshes: THREE.Object3D[] = [];
  private riverMesh: THREE.Mesh | null = null;
  private riverMat: THREE.MeshStandardMaterial | null = null;
  private terrainMesh: THREE.Mesh | null = null;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Particle pool for splashes and drift spray
  private particleGeo: THREE.InstancedMesh;
  private particleData: {
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    scale: number;
  }[];
  private nextParticleIdx = 0;

  // Dynamic Weather Particle System (Cherry petals, snowfall, autumn leaves)
  public weatherType: WeatherType = 'sakura';
  private weatherMesh: THREE.InstancedMesh;
  private weatherMat: THREE.MeshStandardMaterial;
  private weatherParticles: WeatherParticle[] = [];

  // Camera damping state
  private camPos = new THREE.Vector3(0, 8, -12);
  private camLook = new THREE.Vector3(0, 0, 5);
  public trauma = 0; // camera shake trauma [0, 1]
  private titleTourAngle = 0;

  constructor(container: HTMLElement, track: TrackData) {
    this.container = container;

    // 1. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 2. Scene setup with exponential cream fog (#F5EFEB)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#F5EFEB');
    this.scene.fog = new THREE.FogExp2(0xF5EFEB, 0.0078);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.2, 500);
    this.camera.position.set(0, 14, -20);

    // 3. Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Safety fallback
    }

    // 4. Cozy Atmospheric Lighting: Warm Directional Sun + Soft Ambient Fill
    this.hemiLight = new THREE.HemisphereLight(
      new THREE.Color('#FFF8F0'), // Soft warm cream sky fill
      new THREE.Color('#D8CFBE'), // Warm ground bounce
      1.15
    );
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(new THREE.Color('#FFF3D6'), 1.85);
    this.dirLight.position.set(40, 60, 30);
    this.dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 180;
      const d = 80;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    // 5. Boat Mesh & Wake
    this.boatMesh = createOrigamiBoat();
    this.scene.add(this.boatMesh);

    this.boatContactDisc = createBoatContactDisc();
    this.scene.add(this.boatContactDisc);

    // 6. Particle pool setup
    const sphereGeo = new THREE.DodecahedronGeometry(0.18, 1);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.85,
    });
    this.particleGeo = new THREE.InstancedMesh(sphereGeo, particleMat, MAX_PARTICLES);
    this.particleGeo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.particleGeo);

    this.particleData = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      scale: 1,
    }));

    // 7. Dynamic Weather Particle System (Sakura petals, snowfall, autumn leaves)
    const petalGeo = createCherryPetalGeometry();
    this.weatherMat = new THREE.MeshStandardMaterial({
      color: 0xFFB7C5,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.90,
      flatShading: true,
    });
    this.weatherMesh = new THREE.InstancedMesh(petalGeo, this.weatherMat, MAX_WEATHER_PARTICLES);
    this.weatherMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.weatherMesh);

    // Seed weather particles in local volume
    const p0 = track.pathPoints[0] || { x: 0, z: 0 };
    this.weatherParticles = Array.from({ length: MAX_WEATHER_PARTICLES }, () => ({
      x: p0.x + (Math.random() - 0.5) * 60,
      y: 1.0 + Math.random() * 12.0,
      z: p0.z + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.6 + Math.random() * 0.7,
      vz: (Math.random() - 0.5) * 0.6,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: (Math.random() - 0.5) * 2.2,
      rotSpeedY: (Math.random() - 0.5) * 2.8,
      rotSpeedZ: (Math.random() - 0.5) * 1.8,
      wobbleSpeed: 1.2 + Math.random() * 2.0,
      phase: Math.random() * Math.PI * 2,
      baseScale: 0.8 + Math.random() * 0.5,
    }));

    // Apply initial weather
    this.setWeather(track.defaultWeather || 'sakura');

    // Build track world
    this.buildTrack(track);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public setWeather(type: WeatherType) {
    this.weatherType = type;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      if (type === 'clear') {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.weatherMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const p = this.weatherParticles[i];
      if (type === 'sakura') {
        // Soft pastel cherry blossom petal shades
        const sakuraColors = ['#FFB7C5', '#FFCCD5', '#FFA4B6', '#FFE3E8', '#FF9AA2'];
        const hex = sakuraColors[i % sakuraColors.length];
        this.weatherMesh.setColorAt(i, _colorA.set(hex));
        p.vy = 0.5 + Math.random() * 0.6; // gentle floating
        p.baseScale = 0.85 + Math.random() * 0.45;
      } else if (type === 'snow') {
        // Soft crystalline snow flakes
        const snowColors = ['#FFFFFF', '#F0F8FF', '#E8F3F7', '#EDF6F9'];
        const hex = snowColors[i % snowColors.length];
        this.weatherMesh.setColorAt(i, _colorA.set(hex));
        p.vy = 1.1 + Math.random() * 0.8; // steady snowfall
        p.baseScale = 0.55 + Math.random() * 0.35;
      } else if (type === 'autumn') {
        // Warm golden autumn leaves
        const autumnColors = ['#E87A5D', '#D97724', '#F2A93B', '#C85A32', '#EB5757'];
        const hex = autumnColors[i % autumnColors.length];
        this.weatherMesh.setColorAt(i, _colorA.set(hex));
        p.vy = 0.8 + Math.random() * 0.7;
        p.baseScale = 0.9 + Math.random() * 0.5;
      }
    }

    if (this.weatherMesh.instanceColor) {
      this.weatherMesh.instanceColor.needsUpdate = true;
    }
  }

  public buildTrack(track: TrackData) {
    // Clean up previous track items
    if (this.riverMesh) this.scene.remove(this.riverMesh);
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    this.checkpointEntities.forEach(e => this.scene.remove(e.group));
    this.checkpointEntities = [];
    this.obstacleMeshes.forEach(o => this.scene.remove(o));
    this.obstacleMeshes = [];
    this.foliageMeshes.forEach(f => this.scene.remove(f));
    this.foliageMeshes = [];

    // Exponential cream fog (#F5EFEB)
    this.scene.background = new THREE.Color('#F5EFEB');
    if (this.scene.fog) {
      this.scene.fog.color.set('#F5EFEB');
    }

    // Set track weather
    this.setWeather(track.defaultWeather || 'sakura');

    // 1. Build Animated River Ribbon Mesh
    const pts = track.pathPoints;
    const riverGeo = new THREE.BufferGeometry();
    const halfW = track.riverWidth / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      // Left bank vertex
      vertices.push(curr.x + nx * halfW, 0, curr.z + nz * halfW);
      uvs.push(0, i / pts.length);

      // Right bank vertex
      vertices.push(curr.x - nx * halfW, 0, curr.z - nz * halfW);
      uvs.push(1, i / pts.length);

      // Center vertex for wave motion
      vertices.push(curr.x, 0, curr.z);
      uvs.push(0.5, i / pts.length);
    }

    for (let i = 0; i < pts.length; i++) {
      const nextI = (i + 1) % pts.length;
      const i0 = i * 3;
      const i1 = i * 3 + 1;
      const i2 = i * 3 + 2;
      const n0 = nextI * 3;
      const n1 = nextI * 3 + 1;
      const n2 = nextI * 3 + 2;

      // Left half quad
      indices.push(i0, i2, n0);
      indices.push(n0, i2, n2);

      // Right half quad
      indices.push(i2, i1, n2);
      indices.push(n2, i1, n1);
    }

    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    riverGeo.setIndex(indices);
    riverGeo.computeVertexNormals();

    // Vibrant blue flowing river material (#1E88E5)
    this.riverMat = createRiverWaterMaterial();
    this.riverMesh = new THREE.Mesh(riverGeo, this.riverMat);
    this.riverMesh.position.y = 0.04; // Sit cleanly atop riverbed
    this.riverMesh.receiveShadow = true;
    this.scene.add(this.riverMesh);

    // 2. Build Riverbanks & Meadows Terrain with Vertex Colors
    const terrainGeo = new THREE.PlaneGeometry(360, 360, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors: number[] = [];
    const sandColor = new THREE.Color('#E3D6C3'); // Soft river sand / pebbles
    const grassColor = new THREE.Color('#EFE9DE'); // Cream meadow
    const mossColor = new THREE.Color('#D8DFCE'); // Soft sage green moss

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Distance to river centerline
      let minDistSq = Infinity;
      for (let p = 0; p < pts.length; p += 2) {
        const dSq = (vx - pts[p].x) ** 2 + (vz - pts[p].z) ** 2;
        if (dSq < minDistSq) minDistSq = dSq;
      }
      const dist = Math.sqrt(minDistSq);

      if (dist < halfW) {
        // Riverbed beneath water
        pos.setY(i, -0.45);
        colors.push(sandColor.r, sandColor.g, sandColor.b);
      } else if (dist < halfW + 3.0) {
        // Gentle sandy shore
        const t = (dist - halfW) / 3.0;
        pos.setY(i, -0.45 + t * 0.55); // Rises gently to +0.10
        colors.push(sandColor.r, sandColor.g, sandColor.b);
      } else {
        // Outer rolling meadows
        const hill = Math.sin(vx * 0.04) * Math.cos(vz * 0.04) * 1.5 + Math.sin(vx * 0.09 + vz * 0.07) * 0.8;
        pos.setY(i, 0.12 + Math.max(0, hill));

        // Blend between cream grass and soft moss
        const isMossy = (Math.sin(vx * 0.1) * Math.cos(vz * 0.1)) > 0.1;
        const col = isMossy ? mossColor : grassColor;
        colors.push(col.r, col.g, col.b);
      }
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true,
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.position.y = -0.02;
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // 3. Build Glowing Spatial Signpost Checkpoint Gates
    track.checkpoints.forEach((cp, idx) => {
      const entity = createGlowingCheckpointGate(cp.width, idx === 0);
      entity.group.position.set(cp.x, 0, cp.z);
      const rot = Math.atan2(cp.tangentX, cp.tangentZ);
      entity.group.rotation.y = rot;
      entity.group.userData = { checkpointIndex: idx };
      this.checkpointEntities.push(entity);
      this.scene.add(entity.group);
    });

    // 4. Place Obstacles
    track.obstacles.forEach(obs => {
      let mesh: THREE.Object3D;
      if (obs.type === 'rock') {
        mesh = createRiverRock(obs.scale);
      } else if (obs.type === 'leaf') {
        mesh = createFloatingLeaf(obs.color || '#E87A5D', obs.scale);
      } else {
        mesh = createDriftwoodLog(obs.scale);
      }
      mesh.position.set(obs.x, 0, obs.z);
      mesh.rotation.y = obs.rotation;
      this.obstacleMeshes.push(mesh);
      this.scene.add(mesh);
    });

    // 5. Place Foliage
    track.foliage.forEach(f => {
      const tree = f.type === 'willow' ? createWillowTree(f.scale) : createPineTree(f.scale);
      tree.position.set(f.x, 0.5, f.z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      this.foliageMeshes.push(tree);
      this.scene.add(tree);
    });
  }

  public emitDriftParticles(x: number, y: number, z: number, heading: number, speed: number, intensity: number) {
    const count = Math.min(6, Math.max(2, Math.round(intensity * 4)));
    for (let i = 0; i < count; i++) {
      const p = this.particleData[this.nextParticleIdx];
      this.nextParticleIdx = (this.nextParticleIdx + 1) % MAX_PARTICLES;

      const spread = (Math.random() - 0.5) * 1.2;
      const backX = -Math.sin(heading) + Math.cos(heading) * spread;
      const backZ = -Math.cos(heading) - Math.sin(heading) * spread;

      p.active = true;
      p.x = x + backX * 0.8;
      p.y = y + 0.1;
      p.z = z + backZ * 0.8;
      p.vx = backX * (speed * 0.2 + Math.random() * 2);
      p.vy = 1.0 + Math.random() * 2.0;
      p.vz = backZ * (speed * 0.2 + Math.random() * 2);
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.scale = 0.4 + Math.random() * 0.6;
    }
  }

  public emitSplash(x: number, y: number, z: number, intensity: number = 1.0) {
    const count = Math.min(18, Math.max(6, Math.round(intensity * 12)));
    for (let i = 0; i < count; i++) {
      const p = this.particleData[this.nextParticleIdx];
      this.nextParticleIdx = (this.nextParticleIdx + 1) % MAX_PARTICLES;

      const angle = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * 4.0 * intensity;

      p.active = true;
      p.x = x + Math.cos(angle) * 0.3;
      p.y = y + 0.15;
      p.z = z + Math.sin(angle) * 0.3;
      p.vx = Math.cos(angle) * spd;
      p.vy = 2.5 + Math.random() * 3.5 * intensity;
      p.vz = Math.sin(angle) * spd;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.3;
      p.scale = 0.6 + Math.random() * 0.5;
    }
  }

  public triggerCheckpointPulse(index: number) {
    if (index >= 0 && index < this.checkpointEntities.length) {
      this.checkpointEntities[index].pulseTimer = 1.0;
    }
  }

  public update(
    boat: BoatState,
    cameraView: CameraView,
    gameState: 'title' | 'playing' | 'paused' | 'gameover',
    dt: number,
    time: number
  ) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Update boat position, roll, pitch, heading
    this.boatMesh.position.set(boat.x, boat.y, boat.z);
    this.boatMesh.rotation.set(0, boat.heading, 0);
    this.boatMesh.rotateZ(boat.roll);
    this.boatMesh.rotateX(boat.pitch);

    // Update boat wake disc
    this.boatContactDisc.position.set(boat.x, boat.y + 0.02, boat.z);
    this.boatContactDisc.rotation.y = boat.heading;

    // 2. Animate River Water Surface (Flowing water texture + vertex ripples)
    if (this.riverMat?.map) {
      this.riverMat.map.offset.y -= clampedDt * 0.32;
    }
    if (this.riverMesh) {
      const pos = this.riverMesh.geometry.attributes.position;
      for (let i = 2; i < pos.count; i += 3) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        pos.setY(i, getWaterHeight(vx, vz, time));
      }
      pos.needsUpdate = true;
    }

    // 2b. Animate Glowing Checkpoint Arches (Breathing lanterns & dynamic radiant pulse shockwave)
    this.checkpointEntities.forEach((cp, idx) => {
      const breath = Math.sin(time * 3.0 + idx * 1.5) * 0.4 + 1.6;
      cp.lanternMat.emissiveIntensity = cp.pulseTimer > 0 ? (breath + cp.pulseTimer * 3.5) : breath;
      cp.craneMat.emissiveIntensity = cp.pulseTimer > 0 ? (2.0 + cp.pulseTimer * 4.0) : 2.0;

      if (cp.pulseTimer > 0) {
        cp.pulseTimer = Math.max(0, cp.pulseTimer - clampedDt * 1.4);
        const progress = 1 - cp.pulseTimer;
        const scale = 1 + progress * 14.0;
        cp.pulseRing.scale.set(scale, scale, 1);
        (cp.pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, cp.pulseTimer * 0.85);
      } else {
        (cp.pulseRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    });

    // 3. Animate Obstacles (Floating leaves and logs bob in current)
    this.obstacleMeshes.forEach((mesh, idx) => {
      const h = getWaterHeight(mesh.position.x, mesh.position.z, time);
      mesh.position.y = h;
      mesh.rotation.z = Math.sin(time * 2.0 + idx) * 0.06;
      mesh.rotation.x = Math.cos(time * 1.8 + idx) * 0.05;
    });

    // 4. Update Particles
    const dummy = new THREE.Object3D();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particleData[i];
      if (p.active) {
        p.life += clampedDt;
        if (p.life >= p.maxLife) {
          p.active = false;
          dummy.position.set(0, -50, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.particleGeo.setMatrixAt(i, dummy.matrix);
          continue;
        }

        // Apply physics
        p.x += p.vx * clampedDt;
        p.y += p.vy * clampedDt;
        p.z += p.vz * clampedDt;
        p.vy -= 9.8 * clampedDt; // gravity

        const lifeFrac = p.life / p.maxLife;
        const s = p.scale * (1 - lifeFrac);
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        this.particleGeo.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.particleGeo.setMatrixAt(i, dummy.matrix);
      }
    }
    this.particleGeo.instanceMatrix.needsUpdate = true;

    // Emit drift particles if boat is drifting
    if (boat.isDrifting && boat.speed > 5.0) {
      this.emitDriftParticles(boat.x, boat.y, boat.z, boat.heading, boat.speed, boat.driftFactor);
    }

    // 5. Update Dynamic Weather Particles (Cherry petals, gentle snow, or autumn leaves)
    if (this.weatherType !== 'clear') {
      const windX = Math.sin(time * 0.35) * 1.2 + 0.6;
      const windZ = Math.cos(time * 0.28) * 0.9 + 1.0;

      for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
        const p = this.weatherParticles[i];

        // Apply wind and falling velocity with sinusoidal gentle flutter
        p.x += (p.vx + windX + Math.sin(time * p.wobbleSpeed + p.phase) * 0.7) * clampedDt;
        p.y -= p.vy * clampedDt;
        p.z += (p.vz + windZ + Math.cos(time * p.wobbleSpeed + p.phase) * 0.5) * clampedDt;

        // Tumbling / rotating in the breeze
        p.rotX += p.rotSpeedX * clampedDt;
        p.rotY += p.rotSpeedY * clampedDt;
        p.rotZ += (p.rotSpeedZ + Math.sin(time * 2.8 + p.phase) * 1.5) * clampedDt;

        // Wrap around moving box around the boat
        const dx = p.x - boat.x;
        const dz = p.z - boat.z;
        const radius = 35.0;

        if (p.y < boat.y - 0.2 || Math.abs(dx) > radius || Math.abs(dz) > radius) {
          // Recycle above and slightly upwind of the boat
          p.x = boat.x + (Math.random() - 0.5) * 60 - windX * 6;
          p.y = boat.y + 7.0 + Math.random() * 8.0;
          p.z = boat.z + (Math.random() - 0.5) * 60 - windZ * 6;
        }

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
        dummy.scale.set(p.baseScale, p.baseScale, p.baseScale);
        dummy.updateMatrix();
        this.weatherMesh.setMatrixAt(i, dummy.matrix);
      }
      this.weatherMesh.instanceMatrix.needsUpdate = true;
    }

    // 6. Camera Management & Trauma Shake
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - clampedDt * 2.5);
    }
    const shake = this.trauma * this.trauma * 0.5;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;
    const shakeZ = (Math.random() - 0.5) * shake;

    if (gameState === 'title') {
      // Cinematic live world orbital camera tour around the boat
      this.titleTourAngle += clampedDt * 0.25;
      const radius = 18.0;
      const targetCamX = boat.x + Math.sin(this.titleTourAngle) * radius;
      const targetCamY = boat.y + 7.5;
      const targetCamZ = boat.z + Math.cos(this.titleTourAngle) * radius;

      this.camPos.lerp(_vec3A.set(targetCamX, targetCamY, targetCamZ), clampedDt * 3.0);
      this.camLook.lerp(_vec3B.set(boat.x, boat.y + 1.2, boat.z), clampedDt * 4.0);
    } else {
      // Gameplay camera modes
      const forwardX = Math.sin(boat.heading);
      const forwardZ = Math.cos(boat.heading);

      if (cameraView === 'chase') {
        // Dynamic chase cam: behind and elevated above, smoothly following heading
        const dist = 12.0;
        const height = 5.8;
        const targetX = boat.x - forwardX * dist + shakeX;
        const targetY = boat.y + height + shakeY;
        const targetZ = boat.z - forwardZ * dist + shakeZ;

        // Exponential damping
        this.camPos.lerp(_vec3A.set(targetX, targetY, targetZ), 1 - Math.exp(-7.0 * clampedDt));
        // Look ahead of boat
        const lookTarget = _vec3B.set(boat.x + forwardX * 7.0, boat.y + 1.8, boat.z + forwardZ * 7.0);
        this.camLook.lerp(lookTarget, 1 - Math.exp(-9.0 * clampedDt));
      } else if (cameraView === 'hood') {
        // Low-angle bow camera
        const targetX = boat.x + forwardX * 0.5 + shakeX;
        const targetY = boat.y + 1.6 + shakeY;
        const targetZ = boat.z + forwardZ * 0.5 + shakeZ;

        this.camPos.lerp(_vec3A.set(targetX, targetY, targetZ), 1 - Math.exp(-14.0 * clampedDt));
        const lookTarget = _vec3B.set(boat.x + forwardX * 16.0, boat.y + 1.0, boat.z + forwardZ * 16.0);
        this.camLook.lerp(lookTarget, 1 - Math.exp(-12.0 * clampedDt));
      } else {
        // Isometric birds-eye diorama angle
        const targetX = boat.x - 14.0 + shakeX;
        const targetY = boat.y + 22.0 + shakeY;
        const targetZ = boat.z - 16.0 + shakeZ;

        this.camPos.lerp(_vec3A.set(targetX, targetY, targetZ), 1 - Math.exp(-5.0 * clampedDt));
        this.camLook.lerp(_vec3B.set(boat.x, boat.y, boat.z), 1 - Math.exp(-6.0 * clampedDt));
      }
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Keep directional shadow camera centered near boat
    if (!isSoftwareGl) {
      this.dirLight.position.set(boat.x + 35, 60, boat.z + 30);
      this.dirLight.target.position.set(boat.x, 0, boat.z);
      this.dirLight.target.updateMatrixWorld();
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
