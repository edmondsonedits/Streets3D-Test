// SPDX-License-Identifier: GPL-2.0-only
// Pure vehicle simulation for the hybrid street sandbox. Simulation units are metres.
import { sampleTerrain } from '../new-romaine-block-v1/navigation.mjs';

export const CONFIG = Object.freeze({
  length: 10.4, width: 2.55, height: 3.25, wheelbase: 5.65, trackWidth: 2.12, wheelRadius: 0.56,
  fixedStep: 1 / 120, maxFrameDelta: 0.25, roadClearance: 0.06,
  maximumForwardSpeed: 27.5, maximumReverseSpeed: 7.2, offRoadSpeed: 11.5,
  forwardAcceleration: 3.85, reverseAcceleration: 2.65, offRoadAccelerationScale: 0.48,
  serviceBrake: 8.8, handbrakeDeceleration: 13, rollingDrag: 0.56, aerodynamicDrag: 0.008,
  steeringLowSpeed: 0.54, steeringHighSpeed: 0.15, steeringResponse: 7.5, steeringReturnResponse: 10,
});
const EPS = 1e-8;

export function createDriver(data, spawn = {}) {
  if (!data || !data.bounds) throw new TypeError('Driving data needs map bounds');
  const body = { x: Number(spawn.x) || 0, z: Number(spawn.z) || 0, heading: finite(spawn.heading) ? spawn.heading : 0 };
  if (!bodyFitsBounds(body, data.bounds)) throw new RangeError('Truck spawn does not fit inside map bounds');
  if (collides(body, data)) throw new RangeError('Truck spawn overlaps a building');
  let accumulator = 0;
  let paused = false;
  let state;

  const updateContacts = () => {
    const contacts = sampleContacts(body, data);
    const centerRoad = roadAt(data, body.x, body.z);
    const onRoad = contacts.reduce((n, c) => n + Number(c.onRoad), 0) >= 2;
    return { contacts, onRoad, road: centerRoad };
  };
  const surface = updateContacts();
  state = {
    x: body.x, y: surface.contacts.reduce((sum, c) => sum + c.height, 0) / 4 + CONFIG.roadClearance,
    z: body.z, heading: body.heading, speed: 0, steering: 0, pitch: surface.contacts.pitch, roll: surface.contacts.roll,
    wheelRotation: 0, gear: 'N', onRoad: surface.onRoad, roadName: surface.road?.road?.name || '',
    contactCount: surface.contacts.filter(c => c.onRoad).length, collision: false, travelMetres: 0, paused: false,
  };

  const stepFixed = (input) => {
    const contact = updateContacts();
    const throttle = clamp(Number(input?.throttle) || 0, -1, 1);
    const steeringInput = clamp(Number(input?.steering) || 0, -1, 1);
    const brake = clamp(Number(input?.brake) || 0, 0, 1);
    const oldSpeed = state.speed;
    const absSpeed = Math.abs(oldSpeed);
    let acceleration = 0;
    if (throttle > 0) acceleration = oldSpeed < -0.2 ? CONFIG.serviceBrake : CONFIG.forwardAcceleration;
    else if (throttle < 0) acceleration = oldSpeed > 0.2 ? -CONFIG.serviceBrake : -CONFIG.reverseAcceleration;
    else if (absSpeed > 0.001) acceleration = -Math.sign(oldSpeed) * (CONFIG.rollingDrag + CONFIG.aerodynamicDrag * oldSpeed * oldSpeed);
    if (!contact.onRoad && throttle !== 0 && Math.sign(acceleration) === Math.sign(throttle)) acceleration *= CONFIG.offRoadAccelerationScale;
    if (brake > 0) acceleration = Math.abs(oldSpeed) > 0.01 ? -Math.sign(oldSpeed) * CONFIG.serviceBrake * brake : 0;
    if (input?.handbrake) acceleration = Math.abs(oldSpeed) > 0.01 ? -Math.sign(oldSpeed) * CONFIG.handbrakeDeceleration : 0;
    let speed = clamp(oldSpeed + acceleration * CONFIG.fixedStep,
      -(contact.onRoad ? CONFIG.maximumReverseSpeed : CONFIG.maximumReverseSpeed * 0.65),
      contact.onRoad ? CONFIG.maximumForwardSpeed : CONFIG.offRoadSpeed);
    if (brake > 0 && Math.sign(speed) !== Math.sign(oldSpeed) && absSpeed <= CONFIG.serviceBrake * brake * CONFIG.fixedStep) speed = 0;
    if (input?.handbrake && Math.sign(speed) !== Math.sign(oldSpeed) && absSpeed <= CONFIG.handbrakeDeceleration * CONFIG.fixedStep) speed = 0;
    if (!throttle && !brake && !input?.handbrake && Math.sign(speed) !== Math.sign(oldSpeed)) speed = 0;

    const speedRatio = Math.min(1, absSpeed / CONFIG.maximumForwardSpeed);
    const maximumSteer = CONFIG.steeringLowSpeed + (CONFIG.steeringHighSpeed - CONFIG.steeringLowSpeed) * speedRatio;
    const targetSteering = steeringInput * maximumSteer;
    const response = steeringInput ? CONFIG.steeringResponse : CONFIG.steeringReturnResponse;
    const steering = state.steering + (targetSteering - state.steering) * (1 - Math.exp(-response * CONFIG.fixedStep));
    const heading = wrapAngle(body.heading + speed / CONFIG.wheelbase * Math.tan(steering) * CONFIG.fixedStep);
    const forward = forwardFor(heading);
    const candidate = { x: body.x + forward.x * speed * CONFIG.fixedStep, z: body.z + forward.z * speed * CONFIG.fixedStep, heading };
    const accepted = sweepMove(body, candidate, data);
    const moved = Math.hypot(accepted.x - body.x, accepted.z - body.z);
    body.x = accepted.x; body.z = accepted.z; body.heading = accepted.heading;
    if (accepted.blocked) speed = 0;
    const now = updateContacts();
    state = {
      ...state, x: body.x, z: body.z, heading: body.heading, speed,
      y: now.contacts.reduce((sum, c) => sum + c.height, 0) / 4 + CONFIG.roadClearance,
      steering, pitch: now.contacts.pitch, roll: now.contacts.roll,
      wheelRotation: state.wheelRotation + (moved / CONFIG.wheelRadius) * (Math.sign(oldSpeed || speed) || 1),
      gear: speed > 0.05 ? 'D' : speed < -0.05 ? 'R' : throttle < -0.05 ? 'R' : throttle > 0.05 ? 'D' : 'N',
      onRoad: now.onRoad, roadName: now.road?.road?.name || now.contacts.find(c => c.onRoad)?.roadName || '', contactCount: now.contacts.filter(c => c.onRoad).length,
      collision: accepted.blocked, travelMetres: state.travelMetres + moved, paused: false,
    };
  };

  return {
    get state() { return { ...state }; },
    get contacts() { return sampleContacts(body, data).map(s => ({ ...s })); },
    step(input = {}, delta = 0) {
      if (paused) return this.state;
      accumulator += clamp(Number(delta) || 0, 0, CONFIG.maxFrameDelta);
      const count = Math.floor((accumulator + EPS) / CONFIG.fixedStep);
      for (let i = 0; i < count; i += 1) stepFixed(input);
      accumulator -= count * CONFIG.fixedStep;
      return this.state;
    },
    reset(nextSpawn = spawn) {
      const next = { x: Number(nextSpawn.x) || 0, z: Number(nextSpawn.z) || 0, heading: finite(nextSpawn.heading) ? nextSpawn.heading : 0 };
      if (!bodyFitsBounds(next, data.bounds) || collides(next, data)) throw new RangeError('Truck reset pose is blocked or outside map bounds');
      body.x = next.x; body.z = next.z; body.heading = next.heading; accumulator = 0;
      const c = updateContacts();
      state = { ...state, x: body.x, z: body.z, heading: body.heading, speed: 0, steering: 0,
        y: c.contacts.reduce((sum, s) => sum + s.height, 0) / 4 + CONFIG.roadClearance,
        pitch: c.contacts.pitch, roll: c.contacts.roll, gear: 'N', collision: false, paused,
        onRoad: c.onRoad, roadName: c.road?.road?.name || '', contactCount: c.contacts.filter(s => s.onRoad).length };
      return this.state;
    },
    setPaused(value) { paused = Boolean(value); accumulator = 0; state = { ...state, paused }; return this.state; },
  };
}

/** Find a safe point on the requested or nearest road, with a right-hand lane bias when possible. */
export function nearestRoadSpawn(data, target = {}) {
  const requestedName = typeof target === 'string' ? target : '';
  const tx = finite(target?.x) ? target.x : 0, tz = finite(target?.z) ? target.z : 0;
  const candidates = [];
  for (const road of data?.roads || []) {
    if (requestedName && road.name !== requestedName) continue;
    for (let i = 1; i < (road.points || []).length; i += 1) {
      const a = road.points[i - 1], b = road.points[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length <= EPS) continue;
      const tangent = { x: dx / length, z: dz / length };
      const t = clamp(((tx - a[0]) * dx + (tz - a[1]) * dz) / (length * length), 0, 1);
      const center = { x: a[0] + dx * t, z: a[1] + dz * t };
      const heading = Math.atan2(-tangent.x, -tangent.z);
      const right = rightFor(heading);
      const lane = Math.max(0, Math.min((Number(road.width) || 0) / 4, (Number(road.width) || 0) / 2 - CONFIG.width / 2 - 0.25));
      for (const side of [1, -1, 0]) {
        const pose = { x: center.x + right.x * lane * side, z: center.z + right.z * lane * side, heading };
        const score = Math.hypot(center.x - tx, center.z - tz) + (side === 1 ? 0 : side === -1 ? 0.03 : 0.08);
        candidates.push({ ...pose, roadName: road.name || '', road, score });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const safe = candidates.find(p => bodyFitsBounds(p, data.bounds) && !collides(p, data));
  if (!safe) throw new RangeError(requestedName ? `No safe spawn on ${requestedName}` : 'No safe road spawn could be found');
  return { x: safe.x, z: safe.z, heading: safe.heading, roadName: safe.roadName };
}

function sampleContacts(pose, data) {
  const f = forwardFor(pose.heading), r = rightFor(pose.heading), halfWheel = CONFIG.wheelbase / 2, halfTrack = CONFIG.trackWidth / 2;
  const samples = [];
  for (const longitudinal of [halfWheel, -halfWheel]) for (const lateral of [-halfTrack, halfTrack]) {
    const x = pose.x + f.x * longitudinal + r.x * lateral;
    const z = pose.z + f.z * longitudinal + r.z * lateral;
    const road = roadAt(data, x, z);
    samples.push({ x, z, height: sampleTerrain(data.terrain, x, z) + (road ? CONFIG.roadClearance : 0), onRoad: Boolean(road), roadName: road?.road?.name || '' });
  }
  const [fl, fr, rl, rr] = samples;
  const front = (fl.height + fr.height) / 2, rear = (rl.height + rr.height) / 2;
  const left = (fl.height + rl.height) / 2, right = (fr.height + rr.height) / 2;
  Object.assign(samples, { pitch: Math.atan2(front - rear, CONFIG.wheelbase), roll: Math.atan2(right - left, CONFIG.trackWidth) });
  return samples;
}

function roadAt(data, x, z) {
  let best = null;
  for (const road of data?.roads || []) {
    const points = road.points || [];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz;
      if (length2 <= EPS) continue;
      const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / length2, 0, 1);
      const px = a[0] + dx * t, pz = a[1] + dz * t, distance = Math.hypot(x - px, z - pz);
      if (!best || distance < best.distance) best = { road, distance, onRoad: distance <= (Number(road.width) || 0) / 2 };
    }
  }
  return best?.onRoad ? best : null;
}

function sweepMove(from, to, data) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const angle = Math.abs(wrapAngle(to.heading - from.heading));
  const steps = Math.max(1, Math.ceil(Math.max(distance / 0.1, angle / (Math.PI / 90))));
  let previous = from;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const pose = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, heading: wrapAngle(from.heading + wrapAngle(to.heading - from.heading) * t) };
    if (!bodyFitsBounds(pose, data.bounds) || collides(pose, data)) {
      // Find the last safe point along this short fixed-step movement.
      let lo = (i - 1) / steps, hi = t;
      for (let j = 0; j < 9; j += 1) {
        const mid = (lo + hi) / 2;
        const probe = { x: from.x + (to.x - from.x) * mid, z: from.z + (to.z - from.z) * mid, heading: wrapAngle(from.heading + wrapAngle(to.heading - from.heading) * mid) };
        if (bodyFitsBounds(probe, data.bounds) && !collides(probe, data)) lo = mid; else hi = mid;
      }
      return { x: from.x + (to.x - from.x) * lo, z: from.z + (to.z - from.z) * lo, heading: wrapAngle(from.heading + wrapAngle(to.heading - from.heading) * lo), blocked: true };
    }
    previous = pose;
  }
  return { ...previous, blocked: false };
}

function collides(pose, data) {
  const corners = bodyCorners(pose);
  for (const [x, z] of corners) if (insideBounds(x, z, data.bounds) === false) return true;
  return (data.buildings || []).some(building => polygonTouchesBody(building?.polygon, corners));
}
function bodyFitsBounds(pose, bounds) { return bodyCorners(pose).every(([x, z]) => insideBounds(x, z, bounds)); }
function insideBounds(x, z, b) { return x >= b.xMin - EPS && x <= b.xMax + EPS && z >= b.zMin - EPS && z <= b.zMax + EPS; }
function bodyCorners(pose) {
  const f = forwardFor(pose.heading), r = rightFor(pose.heading), hf = CONFIG.length / 2, hw = CONFIG.width / 2;
  return [[1,1],[1,-1],[-1,-1],[-1,1]].map(([fl, sw]) => [pose.x + f.x * hf * fl + r.x * hw * sw, pose.z + f.z * hf * fl + r.z * hw * sw]);
}
function polygonTouchesBody(polygon, corners) {
  if (!Array.isArray(polygon) || !polygon.length || !polygon[0]?.length) return false;
  const outer = polygon[0];
  const solid = (x, z) => pointInRing(x, z, outer) && !polygon.slice(1).some(hole => pointInRing(x, z, hole));
  if (corners.some(([x, z]) => solid(x, z))) return true;
  for (const ring of polygon) {
    for (let i = 1; i < ring.length; i += 1) {
      const a = ring[i - 1], b = ring[i];
      if (corners.some(([x, z]) => pointSegmentDistance(x, z, a, b) < 1e-5)) return true;
      for (let j = 0; j < corners.length; j += 1) if (segmentsIntersect(a, b, corners[j], corners[(j + 1) % corners.length])) return true;
    }
  }
  return outer.some(([x, z]) => pointInPolygon(x, z, corners));
}
function pointInPolygon(x, z, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if (((zi > z) !== (zj > z)) && x < (xj - xi) * (z - zi) / ((zj - zi) || EPS) + xi) inside = !inside; } return inside; }
function pointInRing(x, z, ring) { return pointInPolygon(x, z, ring); }
function pointSegmentDistance(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], d = dx * dx + dz * dz; const t = d ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / d, 0, 1) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function segmentsIntersect(a, b, c, d) { const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); const ab1 = orient(a,b,c), ab2 = orient(a,b,d), cd1 = orient(c,d,a), cd2 = orient(c,d,b); return ab1 * ab2 < 0 && cd1 * cd2 < 0; }
function forwardFor(h) { return { x: -Math.sin(h), z: -Math.cos(h) }; }
function rightFor(h) { return { x: Math.cos(h), z: -Math.sin(h) }; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function finite(v) { return Number.isFinite(v); }
function wrapAngle(a) { return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }
