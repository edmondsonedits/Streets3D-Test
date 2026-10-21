// SPDX-License-Identifier: GPL-2.0-only
import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export const VEHICLE_ASSET = Object.freeze({
  url: 'https://raw.githubusercontent.com/edmondsonedits/Peterborough-Map-Game/3754f99a0e59cd97b35d5e64ac31ac26c6bbbde8/city-explorer/assets/vehicles/generic-pumper.glb',
  sha256: 'ab616d03025278e057a835fc1d32088071419838115800fb132d568424e63fbb',
});
export const VEHICLE_FETCH_TIMEOUT_MS = 9000;
const VEHICLE_DIMENSIONS = Object.freeze({ length: 10.4, width: 2.55, height: 3.25, wheelRadius: 0.56 });

export async function loadPumper(onStatus = () => {}, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Math.min(15000, Math.max(1, Number(options.timeoutMs) || VEHICLE_FETCH_TIMEOUT_MS));
  try {
    onStatus('Loading pinned Map Game pumper');
    const bytes = await fetchPinnedBytes(fetchImpl, timeoutMs);
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    if (sha !== VEHICLE_ASSET.sha256) throw new Error('Pumper integrity check failed');
    const gltf = await new GLTFLoader().parseAsync(bytes, '');
    const truck = createVerifiedPumper(gltf);
    truck.status = 'Verified Map Game pumper';
    truck.degraded = false;
    truck.fallback = false;
    onStatus(truck.status);
    return truck;
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'pinned fetch timed out' : (error?.message || 'asset unavailable');
    const status = `PROCEDURAL FALLBACK · ${reason}`;
    onStatus(status);
    return createFallbackPumper(reason, status);
  }
}

async function fetchPinnedBytes(fetchImpl, timeoutMs) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(VEHICLE_ASSET.url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Pumper asset HTTP ${response.status}`);
    return await response.arrayBuffer();
  } catch (error) {
    if (timedOut) throw new DOMException('Pinned pumper fetch timed out', 'AbortError');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createVerifiedPumper(gltf) {
  const root = new THREE.Group();
  const model = gltf.scene;
  root.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const factor = VEHICLE_DIMENSIONS.length / size.z;
  model.scale.multiplyScalar(factor);
  model.position.set(-center.x * factor, -box.min.y * factor, -center.z * factor);
  const wheels = [], front = [], beacons = [];
  model.traverse(object => {
    if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    if (/^Wheel_[FR][LR]$/.test(object.name)) {
      wheels.push({ node: object, base: object.quaternion.clone() });
      if (object.name.startsWith('Wheel_F')) front.push(object);
    }
    if (object.name.startsWith('Beacon_') && object.isMesh) {
      object.material = object.material.clone(); beacons.push(object);
    }
  });
  return {
    root, model, wheels, front, beacons, scale: factor,
    animate(state, lights, time) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.set(state.pitch || 0, state.heading, state.roll || 0, 'YXZ');
      for (const wheel of wheels) {
        wheel.node.quaternion.copy(wheel.base);
        wheel.node.rotateX(-(state.wheelRotation || 0));
        if (front.includes(wheel.node)) wheel.node.rotateY(state.steering || 0);
      }
      beacons.forEach((beacon, i) => {
        const on = lights && ((Math.floor(time * 8) + i) % 2 === 0);
        beacon.material.emissive?.set(on ? 0xff1d0b : 0x150100);
        beacon.material.emissiveIntensity = on ? 3 : 0.3;
      });
    },
    dispose() { disposeTree(root); },
  };
}

/** Visible, map-sized truck used only when the pinned remote model cannot be verified. */
export function createFallbackPumper(reason = 'asset unavailable', status = `PROCEDURAL FALLBACK · ${reason}`) {
  const root = new THREE.Group();
  const model = new THREE.Group();
  model.name = 'Procedural fire pumper fallback';
  root.add(model);
  const materials = {
    red: new THREE.MeshStandardMaterial({ color: 0xb93d32, roughness: 0.62, metalness: 0.08 }),
    redDark: new THREE.MeshStandardMaterial({ color: 0x702923, roughness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe7dfca, roughness: 0.68 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0x9ca19b, roughness: 0.32, metalness: 0.68 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x171a19, roughness: 0.94 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x41616a, roughness: 0.22, metalness: 0.12, transparent: true, opacity: 0.84 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x242725, roughness: 0.82 }),
  };
  const addBox = (name, size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; model.add(mesh); return mesh;
  };
  const addCylinder = (name, radiusTop, radiusBottom, height, position, material, segments = 12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; model.add(mesh); return mesh;
  };

  // Chassis and compartment bodies span the stated 10.4 m by 2.55 m envelope.
  addBox('Fallback chassis', [2.55, 0.48, 9.5], [0, 0.68, 0], materials.dark);
  addBox('Cab', [2.48, 2.15, 3.9], [0, 2.0, -2.75], materials.red);
  addBox('Cab roof', [2.42, 0.12, 2.85], [0, 3.08, -2.88], materials.redDark);
  addBox('Windshield', [2.08, 0.72, 0.055], [0, 2.48, -4.72], materials.glass);
  for (const side of [-1, 1]) {
    addBox(`Cab side window ${side}`, [0.05, 0.69, 1.25], [side * 1.245, 2.42, -2.92], materials.glass);
    addBox(`Locker panel ${side}`, [0.045, 0.84, 3.7], [side * 1.237, 1.82, 1.28], materials.redDark);
    addBox(`Locker stripe ${side}`, [0.06, 0.13, 3.7], [side * 1.245, 1.67, 1.28], materials.white);
    addBox(`Mirror arm ${side}`, [0.12, 0.09, 0.1], [side * 1.21, 2.32, -4.0], materials.chrome);
  }
  addBox('Pump body', [2.52, 1.55, 4.5], [0, 1.75, 1.45], materials.red);
  addBox('Compartment roof', [2.5, 0.15, 4.55], [0, 2.6, 1.42], materials.white);
  addBox('Front bumper', [2.48, 0.3, 0.36], [0, 0.61, -5.02], materials.chrome);
  addBox('Rear step bumper', [2.48, 0.28, 0.36], [0, 0.58, 5.02], materials.chrome);
  addBox('Front grille', [1.35, 0.58, 0.055], [0, 1.04, -4.98], materials.chrome);
  for (const x of [-0.89, 0.89]) addBox(`Headlamp ${x}`, [0.25, 0.24, 0.07], [x, 1.1, -4.99], materials.white);
  addBox('Roof ladder base', [0.8, 0.12, 3.05], [0, 2.83, 1.25], materials.chrome);
  for (let i = 0; i < 8; i += 1) addBox(`Ladder rung ${i + 1}`, [0.72, 0.055, 0.06], [0, 2.92, -0.12 + i * 0.39], materials.dark);

  const wheels = [], front = [];
  const wheelStations = [
    { z: -2.72, front: true }, { z: 2.15, front: false }, { z: 3.58, front: false },
  ];
  for (const station of wheelStations) for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = `Fallback wheel pivot ${station.front ? 'front' : 'rear'} ${side}`;
    pivot.position.set(side * (VEHICLE_DIMENSIONS.width / 2 - 0.22), VEHICLE_DIMENSIONS.wheelRadius, station.z);
    model.add(pivot);
    const node = new THREE.Group();
    node.name = `Fallback wheel ${station.front ? 'front' : 'rear'} ${side}`;
    node.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    pivot.add(node);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(VEHICLE_DIMENSIONS.wheelRadius, VEHICLE_DIMENSIONS.wheelRadius, 0.34, 16), materials.tyre);
    tire.castShadow = true; tire.receiveShadow = true; node.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 12), materials.chrome);
    hub.castShadow = true; node.add(hub);
    wheels.push({ node, base: node.quaternion.clone(), pivot, spinAxis: new THREE.Vector3(0, 1, 0) });
    if (station.front) front.push(node);
  }

  const beacons = [];
  for (const [i, x, color] of [[0, -0.55, 0xff332b], [1, 0.55, 0x36a6d5]]) {
    const material = new THREE.MeshStandardMaterial({ color, emissive: 0x150100, emissiveIntensity: 0.3, roughness: 0.32 });
    const beacon = addCylinder(`Beacon_${i + 1}`, 0.145, 0.17, 0.26, [x, 3.12, -2.82], material, 14);
    beacons.push(beacon);
  }

  return {
    root, model, wheels, front, beacons, scale: 1, status, degraded: true, fallback: true,
    animate(state, lights, time) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.set(state.pitch || 0, state.heading, state.roll || 0, 'YXZ');
      const spin = -(state.wheelRotation || 0);
      for (const wheel of wheels) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(wheel.spinAxis, spin);
        wheel.node.quaternion.copy(wheel.base).multiply(rotation);
        wheel.pivot.rotation.y = front.includes(wheel.node) ? (state.steering || 0) : 0;
      }
      beacons.forEach((beacon, i) => {
        const on = lights && ((Math.floor(time * 8) + i) % 2 === 0);
        beacon.material.emissive.set(on ? beacon.material.color : 0x150100);
        beacon.material.emissiveIntensity = on ? 2.6 : 0.3;
      });
    },
    dispose() { disposeTree(root); },
  };
}

function disposeTree(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
