import * as THREE from 'three';

/**
 * Creates flowing procedural water ripple texture
 */
export function createRiverWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base vibrant azure blue
  ctx.fillStyle = '#1E88E5';
  ctx.fillRect(0, 0, 512, 512);

  // Flowing river stream lines and caustics
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const y = i * 14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      const cy = y + Math.sin(x * 0.05 + i) * 6;
      ctx.lineTo(x, cy);
    }
    ctx.stroke();
  }

  // Soft cyan highlights
  ctx.fillStyle = 'rgba(100, 181, 246, 0.35)';
  for (let j = 0; j < 60; j++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rw = 20 + Math.random() * 50;
    const rh = 4 + Math.random() * 8;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural RiverTrack material with vibrant blue #1E88E5 and animated ripples
 */
export function createRiverWaterMaterial(): THREE.MeshStandardMaterial {
  const waterTexture = createRiverWaterTexture();

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E88E5'),
    map: waterTexture,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  return mat;
}
