import assert from 'node:assert/strict';
import { CONFIG, createDriver, nearestRoadSpawn } from '../driving.mjs';

const flat = (options = {}) => ({
  roads: [{ id: 'road-1', name: 'Test Street', points: [[-30, 0], [30, 0]], width: 8 }],
  buildings: [],
  terrain: { cols: 2, rows: 2, xMin: -50, xMax: 50, zMin: -50, zMax: 50, heights: [0, 0, 0, 0] },
  bounds: { xMin: -40, xMax: 40, zMin: -40, zMax: 40 },
  ...options,
});
const hold = (driver, input, seconds) => {
  const n = Math.ceil(seconds * 120);
  for (let i = 0; i < n; i += 1) driver.step(input, 1 / 120);
};

assert.equal(CONFIG.fixedStep, 1 / 120, 'simulation uses fixed 120 Hz substeps');
assert.equal(CONFIG.length, 10.4, 'apparatus length matches the pinned truck tuning');

{
  const d = createDriver(flat(), { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 3);
  assert.ok(d.state.speed > 5, 'throttle accelerates the apparatus');
  hold(d, { brake: 1 }, 2);
  assert.ok(Math.abs(d.state.speed) < 0.5, 'service brake stops the apparatus');
  hold(d, { throttle: -1 }, 2);
  assert.ok(d.state.speed < -1 && d.state.gear === 'R', 'negative throttle selects reverse and backs away');
}

{
  const d = createDriver(flat(), { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 0.5, steering: 1 }, 1.5);
  assert.ok(d.state.heading > 0.08 && d.state.x < 0, 'positive steering turns left with Three.js heading convention');
}

{
  const d = createDriver(flat(), { x: 15, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 4);
  assert.equal(d.state.onRoad, false, 'off-road is determined from the truck tire contacts');
  assert.ok(d.state.speed <= CONFIG.offRoadSpeed + 1e-6, 'off-road speed is deliberately limited');
  const road = createDriver(flat(), { x: 0, z: 0, heading: Math.PI / 2 });
  hold(road, { throttle: 1 }, 4);
  assert.ok(d.state.speed < road.state.speed, 'off-road acceleration is slower than road acceleration');
}

{
  const terrain = { cols: 2, rows: 2, xMin: -20, xMax: 20, zMin: -20, zMax: 20, heights: [0, 4, 8, 12] };
  const d = createDriver(flat({ roads: [], terrain }), { x: 0, z: 0, heading: 0 });
  const contacts = d.contacts;
  assert.equal(contacts.length, 4, 'all four tire supports are sampled');
  assert.ok(Math.abs(d.state.y - 6.06) < 0.03, 'base height follows the planar terrain and road clearance');
  assert.ok(Math.abs(d.state.pitch) > 0.01 && Math.abs(d.state.roll) > 0.01, 'terrain slope produces truck pitch and roll');
}

{
  const building = { polygon: [[[-0.75, -9], [0.75, -9], [0.75, -7.05], [-0.75, -7.05], [-0.75, -9]]] };
  const d = createDriver(flat({ buildings: [building] }), { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 3);
  assert.ok(d.state.collision && d.state.z > -7, 'head-on swept collision stops before the wall');
  const stoppedAt = d.state.z;
  hold(d, { throttle: -1 }, 1);
  assert.ok(d.state.z > stoppedAt + 0.5, 'reverse can move away from a blocked wall');
}

{
  const corner = { polygon: [[[1.12, -7.0], [1.45, -7.0], [1.45, -6.2], [1.12, -6.2], [1.12, -7.0]]] };
  const d = createDriver(flat({ roads: [], buildings: [corner] }), { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 2);
  assert.equal(d.state.collision, true, 'the oriented body corner cannot clip through a building edge');
}

{
  const bounds = { xMin: -10, xMax: 10, zMin: -10, zMax: 10 };
  const d = createDriver(flat({ bounds }), { x: 0, z: -3, heading: 0 });
  hold(d, { throttle: 1 }, 3);
  assert.ok(d.state.z - CONFIG.length / 2 >= bounds.zMin - 1e-6, 'the full truck body stays inside map bounds');
}

{
  const d = createDriver(flat(), { x: 0, z: 0, heading: 0 });
  d.step({ throttle: 1 }, 9);
  const capped = d.state.travelMetres;
  assert.ok(capped < 1 && capped > 0.1, 'a stalled tab advances at most the 0.25 second frame cap');
  d.setPaused(true);
  d.step({ throttle: 1 }, 0.25);
  assert.equal(d.state.travelMetres, capped, 'paused time does not accumulate or move the truck');
  d.setPaused(false);
  d.step({ throttle: 1 }, 0.1);
  assert.ok(d.state.travelMetres > capped, 'driving resumes after unpausing');
}

{
  const start = nearestRoadSpawn(flat(), { x: 0, z: 1 });
  assert.ok(start.z > 0, 'road spawn uses a safe right-hand lane offset when room permits');
  const defaultStart = nearestRoadSpawn(flat());
  assert.ok(defaultStart.z > 0, 'default road starts also prefer the right-hand lane');
  assert.equal(start.roadName, 'Test Street');
  const named = nearestRoadSpawn(flat(), 'Test Street');
  assert.equal(named.roadName, 'Test Street', 'street-name spawn selection is supported');
}

{
  const buildingWithLargeOpening = { polygon: [
    [[-12, -12], [12, -12], [12, 12], [-12, 12], [-12, -12]],
    [[-6, -7], [-6, 7], [6, 7], [6, -7], [-6, -7]],
  ] };
  const d = createDriver(flat({ roads: [], buildings: [buildingWithLargeOpening] }), { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 0.2);
  assert.equal(d.state.collision, false, 'a footprint hole large enough for the full truck remains traversable');
  const moved = d.state.travelMetres;
  d.reset({ x: 20, z: 0, heading: 0 });
  assert.equal(d.state.travelMetres, moved, 'reset preserves the accumulated trip distance');
  assert.equal(d.state.speed, 0, 'reset clears vehicle motion');
}

{
  const junction = flat({ roads: [
    { id: 'main', name: 'Main Street', points: [[-20, 0], [20, 0]], width: 2.8 },
    { id: 'cross', name: 'Cross Street', points: [[0, -20], [0, 20]], width: 2.8 },
  ] });
  const d = createDriver(junction, { x: 0, z: 0, heading: 0 });
  hold(d, { throttle: 1 }, 0.5);
  assert.equal(d.state.onRoad, true, 'road contacts remain supported through a mapped intersection');
}

console.log('Hybrid driving checks passed.');
