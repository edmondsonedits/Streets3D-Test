// SPDX-License-Identifier: GPL-2.0-only
import * as THREE from 'three';
import {buildingFacadePlan} from '../new-romaine-block-v1/building-archetypes.js';
import {sampleTerrain} from '../new-romaine-block-v1/navigation.mjs';
export function createMapWorld(data){const clamp=THREE.MathUtils.clamp,scene=new THREE.Group();
const noiseCanvas=document.createElement('canvas');noiseCanvas.width=noiseCanvas.height=64;const ctx=noiseCanvas.getContext('2d'),pixels=ctx.createImageData(64,64);let seed=991;
for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const c=190+(seed%65);pixels.data.set([c,c,c,255],i);}ctx.putImageData(pixels,0,0);const noise=new THREE.CanvasTexture(noiseCanvas);noise.wrapS=noise.wrapT=THREE.RepeatWrapping;noise.anisotropy=4;
function surfaceDetail(mesh,repeat){const pos=mesh.geometry.getAttribute('position'),uv=[];for(let i=0;i<pos.count;i++)uv.push(pos.getX(i)/repeat,pos.getZ(i)/repeat);mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));mesh.material.map=noise;mesh.material.bumpMap=noise;mesh.material.bumpScale=.018;mesh.material.needsUpdate=true;}

function addTerrain() {
  const t = data.terrain, positions = [], indices = [];
  for (let row = 0; row < t.rows; row++) for (let col = 0; col < t.cols; col++) {
    const x = t.xMin + (t.xMax - t.xMin) * col / (t.cols - 1), z = t.zMin + (t.zMax - t.zMin) * row / (t.rows - 1);
    positions.push(x, Number(t.heights[row * t.cols + col]) || 0, z);
  }
  for (let row = 0; row < t.rows - 1; row++) for (let col = 0; col < t.cols - 1; col++) {
    const a = row * t.cols + col, b = a + 1, c = a + t.cols, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x99b78a, roughness: 1, side: THREE.DoubleSide }));
  mesh.receiveShadow = true; surfaceDetail(mesh,8); scene.add(mesh);
}

function addRoads() {
  const flat = data.roadPositions || [];
  if (!flat.length) return;
  const mesh = triangles(flat, new THREE.MeshStandardMaterial({ color: 0x49545a, roughness: 0.93, side: THREE.DoubleSide }));
  surfaceDetail(mesh,3);
  mesh.receiveShadow = true; scene.add(mesh);
}

function addBuildings() {
  const wallBuckets = new Map(), roofBuckets = new Map();
  for (const building of data.buildings) {
    const wall = Array.isArray(building.wallPositions) ? building.wallPositions : [];
    const roof = Array.isArray(building.roofPositions) ? building.roofPositions : [];
    const type = String(building.type || "building").toLowerCase();
    const shade=[...building.id].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,0); const wallColor = /garage|shed|service/.test(type) ? 0xb4aa93 : /commercial|retail|industrial/.test(type) ? 0xc4bca7 : [0xd3cbb7,0xc5cbbb,0xbac8cc,0xd9c3b1,0xc3b9aa,0xd9d6c7][shade%6];
    const roofColor = /garage|shed|service/.test(type) ? 0x666b68 : 0x625e59;
    pushBucket(wallBuckets, wallColor, wall); pushBucket(roofBuckets, roofColor, roof);
  }
  for (const [color, positions] of wallBuckets) { const mesh = triangles(positions, new THREE.MeshStandardMaterial({ color, roughness: 0.88, side: THREE.DoubleSide })); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name="buildings"; scene.add(mesh); }
  for (const [color, positions] of roofBuckets) { const mesh = triangles(positions, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide })); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name="buildings"; scene.add(mesh); }
}

function addFacades() {
  const buckets = new Map();
  const materialColors = { facadeTrim: 0x635d53, windowGlass: 0x54666b, windowWarm: 0x8b775c, storefrontGlass: 0x587a80 };
  for (const building of data.buildings) {
    const ring = building.polygon?.[0]; if (!Array.isArray(ring) || ring.length < 4) continue;
    const edgeRows = [];
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 1.4) continue;
      const mx = (a[0] + b[0]) * 0.5, mz = (a[1] + b[1]) * 0.5;
      edgeRows.push({ a, b, length, roadDistance: nearestRoadDistance(mx, mz) });
    }
    if (!edgeRows.length) continue;
    const frontIndex = edgeRows.reduce((best, edge, i) => edge.roadDistance < edgeRows[best].roadDistance - 0.01 || (Math.abs(edge.roadDistance - edgeRows[best].roadDistance) <= 0.01 && edge.length > edgeRows[best].length) ? i : best, 0);
    const footprintArea = Math.abs(ring.reduce((area, p, i) => { const q = ring[(i + 1) % ring.length]; return area + p[0] * q[1] - q[0] * p[1]; }, 0) * 0.5);
    const signedArea = ring.reduce((area, p, i) => { const q = ring[(i + 1) % ring.length]; return area + p[0] * q[1] - q[0] * p[1]; }, 0) * 0.5;
    edgeRows.forEach((edge, edgeIndex) => {
      const { a, b, length } = edge, dx = b[0] - a[0], dz = b[1] - a[1];
      // For a counter-clockwise ring, its interior is left of each edge.
      const normalSign = signedArea >= 0 ? 1 : -1, nx = normalSign * dz / length, nz = -normalSign * dx / length;
      const plan = buildingFacadePlan({ tags: { building: building.type }, featureId: building.id, edgeLength: length, wallHeight: Number(building.height) || 0, edgeIndex, footprintArea, front: edgeIndex === frontIndex });
      for (const panel of plan.panels) {
        const half = panel.width / length * 0.5, t0 = Math.max(0, panel.t - half), t1 = Math.min(1, panel.t + half), offset = panel.offset;
        const x0 = a[0] + dx * t0 + nx * offset, z0 = a[1] + dz * t0 + nz * offset;
        const x1 = a[0] + dx * t1 + nx * offset, z1 = a[1] + dz * t1 + nz * offset;
        const lower = (Number(building.baseElevation) || 0) + panel.lowerY, upper = (Number(building.baseElevation) || 0) + panel.upperY;
        if (upper <= lower) continue;
        const target = buckets.get(panel.materialKey) || [];
        target.push(x0, lower, z0, x1, lower, z1, x1, upper, z1, x0, lower, z0, x1, upper, z1, x0, upper, z0);
        buckets.set(panel.materialKey, target);
      }
    });
  }
  for (const [key, positions] of buckets) {
    const mesh = triangles(positions, new THREE.MeshStandardMaterial({ color: materialColors[key] || 0x615b52, roughness: key.includes("Glass") ? 0.38 : 0.82, metalness: 0.02, side: THREE.DoubleSide }));
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.name="buildings"; scene.add(mesh);
  }
}

function nearestRoadDistance(x, z) {
  let nearest = Infinity;
  for (const road of data.roads) for (let i = 1; i < (road.points || []).length; i++) nearest = Math.min(nearest, distanceToSegment(x, z, road.points[i - 1], road.points[i]));
  return nearest;
}
function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], d2 = dx * dx + dz * dz;
  const t = d2 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / d2, 0, 1) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

function addRoute() {
  const points = data.route?.points || [];
  if (points.length < 2) return;
  const line = points.map(([x, z]) => new THREE.Vector3(x, sampleTerrain(data.terrain, x, z) + 0.16, z));
  const geometry = new THREE.BufferGeometry().setFromPoints(line);
  const routeLine = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: 0x37b7a1, transparent: true, opacity: 0.7 })); routeLine.name="route"; routeLine.visible=false; scene.add(routeLine);
}

function triangles(flat, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3)); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}
function pushBucket(map, color, values) { if (!values.length) return; if (!map.has(color)) map.set(color, []); map.get(color).push(...values); }


addTerrain();addRoads();addBuildings();addFacades();addRoute();return {root:scene,setBuildings(v){scene.children.filter(o=>o.name==='buildings').forEach(o=>o.visible=v);},setRoute(v){scene.getObjectByName('route').visible=v;},colliders:scene.children.filter(o=>o.name==='buildings')};}
