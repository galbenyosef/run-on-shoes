import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function createScene(host: HTMLElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.025, 2200);
  const stage = new THREE.Group();
  const player = new THREE.Group();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x0b1117);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  host.appendChild(renderer.domElement);
  camera.position.set(105, 74, 125);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.target.set(0, 22, 0);
  controls.enablePan = false;
  controls.minDistance = 60;
  controls.maxDistance = 240;
  controls.maxPolarAngle = Math.PI * 0.73;
  scene.add(new THREE.HemisphereLight(0xddefff, 0x666057, 2));
  const sun = new THREE.DirectionalLight(0xffe8d0, 3.1);
  sun.position.set(-55, 120, 80);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fdfe8, 1.55);
  fill.position.set(80, 40, -65);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xdae1c2, 1);
  rim.position.set(20, 30, 100);
  scene.add(rim);
  const stars = new THREE.BufferGeometry(),
    coords = [];
  for (let i = 0; i < 550; i++) {
    const t = Math.random() * Math.PI * 2,
      r = 140 + Math.random() * 400;
    coords.push(Math.cos(t) * r, Math.random() * 270 - 80, Math.sin(t) * r);
  }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  scene.add(
    new THREE.Points(
      stars,
      new THREE.PointsMaterial({
        color: 0x8aa8b7,
        size: 0.28,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
      }),
    ),
  );
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(160, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0b1920,
      roughness: 1,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -65;
  stage.add(floor);
  stage.position.set(0, 22, 0);
  scene.add(stage);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6a8e83,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  [62, 68, 120].forEach((r) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.045, 160),
      ringMat,
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = -64.96;
    stage.add(m);
  });
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({
      color: 0x0c1114,
      transparent: true,
      opacity: 0.37,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  scene.add(shadow);
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.43, 0.47, 40),
    new THREE.MeshBasicMaterial({
      color: 0xd5f478,
      transparent: true,
      opacity: 0.64,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    }),
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);
  scene.add(player);

  return { scene, camera, renderer, controls, stage, player, shadow, reticle };
}
