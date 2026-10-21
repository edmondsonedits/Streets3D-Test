// SPDX-License-Identifier: GPL-2.0-only
// New block demo / adapted map facade planner. Source and licence are shipped alongside.
const EPSILON = 1e-8;

export function sampleTerrain(terrain, x, z) {
  if (!terrain || !Array.isArray(terrain.heights) || terrain.cols < 2 || terrain.rows < 2) return 0;
  const gx = clamp((x - terrain.xMin) / (terrain.xMax - terrain.xMin) * (terrain.cols - 1), 0, terrain.cols - 1);
  const gz = clamp((z - terrain.zMin) / (terrain.zMax - terrain.zMin) * (terrain.rows - 1), 0, terrain.rows - 1);
  const x0 = Math.floor(gx), z0 = Math.floor(gz), x1 = Math.min(x0 + 1, terrain.cols - 1), z1 = Math.min(z0 + 1, terrain.rows - 1);
  const tx = gx - x0, tz = gz - z0, at = (cx, cz) => Number(terrain.heights[cz * terrain.cols + cx]) || 0;
  return tx + tz <= 1 ? at(x0,z0) + tx * (at(x1,z0)-at(x0,z0)) + tz * (at(x0,z1)-at(x0,z0)) : at(x1,z1) + (1-tx)*(at(x0,z1)-at(x1,z1)) + (1-tz)*(at(x1,z0)-at(x1,z1));
}

export function sampleClosedRoute(points, distance) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length <= EPSILON) continue;
    segments.push({ a, b, length, start: total }); total += length;
  }
  if (!total) return { x: points[0][0], z: points[0][1], yaw: 0, length: 0 };
  let d = ((distance % total) + total) % total;
  const seg = segments.find(s => d <= s.start + s.length) || segments[segments.length - 1];
  const t = clamp((d - seg.start) / seg.length, 0, 1);
  return { x: mix(seg.a[0], seg.b[0], t), z: mix(seg.a[1], seg.b[1], t), yaw: Math.atan2(seg.b[0] - seg.a[0], -(seg.b[1] - seg.a[1])), length: total };
}

export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    const crosses = ((zi > z) !== (zj > z)) && x < (xj - xi) * (z - zi) / ((zj - zi) || EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function footprintContains(x, z, building) {
  const rings = building?.polygon;
  return Array.isArray(rings) && rings.length > 0 && pointInRing(x, z, rings[0]) && !rings.slice(1).some(r => pointInRing(x, z, r));
}

export function isBlocked(x, z, buildings, radius = 0.35, cameraY = null) {
  return (buildings || []).some(building => {
    if (Number.isFinite(cameraY) && cameraY > buildingTopY(building) + 0.35) return false;
    if (footprintContains(x, z, building)) return true;
    const ring = building?.polygon?.[0];
    if (!ring) return false;
    for (let i = 1; i < ring.length; i++) if (distanceToSegment(x, z, ring[i - 1], ring[i]) < radius) return true;
    return false;
  });
}

export function clampToBounds(x, z, bounds, margin = 1.2) {
  return { x: clamp(x, bounds.xMin + margin, bounds.xMax - margin), z: clamp(z, bounds.zMin + margin, bounds.zMax - margin) };
}

export function movePose(pose, dx, dz, data, radius = 0.35, cameraY = null) {
  const next = clampToBounds(pose.x + dx, pose.z + dz, data.bounds);
  let x = pose.x, z = pose.z;
  if (!isBlocked(next.x, z, data.buildings, radius, cameraY)) x = next.x;
  if (!isBlocked(x, next.z, data.buildings, radius, cameraY)) z = next.z;
  return { ...pose, x, z };
}

function buildingTopY(building) {
  const base = Number.isFinite(building?.baseElevation) ? building.baseElevation : 0;
  let top = Number.isFinite(building?.height) ? base + building.height + (Number(building?.roofHeight) || 0) : -Infinity;
  for (const vertices of [building?.wallPositions, building?.roofPositions]) {
    if (!Array.isArray(vertices)) continue;
    for (let i = 1; i < vertices.length; i += 3) if (Number.isFinite(vertices[i])) top = Math.max(top, vertices[i]);
  }
  return Number.isFinite(top) ? top : Infinity;
}

function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], d2 = dx * dx + dz * dz;
  const t = d2 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / d2, 0, 1) : 0;
  return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function mix(a, b, t) { return a + (b - a) * t; }
