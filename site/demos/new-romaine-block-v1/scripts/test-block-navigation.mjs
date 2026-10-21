import assert from 'node:assert/strict';
import { clampToBounds, footprintContains, isBlocked, movePose, sampleClosedRoute, sampleTerrain } from '../navigation.mjs';

const terrain = { cols: 2, rows: 2, xMin: 0, xMax: 10, zMin: 0, zMax: 10, heights: [0, 10, 20, 30] };
assert.equal(sampleTerrain(terrain, 5, 5), 15, 'terrain interpolates the rendered planar grid');
assert.equal(sampleTerrain(terrain, -50, 50), 20, 'terrain sample clamps to the grid');

assert.equal(sampleTerrain({ ...terrain, heights: [0,0,0,10] },5,5),0,'height sampling matches the terrain triangle diagonal, not a curved bilinear surface');

const route = [[0, 0], [10, 0], [10, 10], [0, 10]];
assert.equal(sampleClosedRoute(route, 40).length, 40, 'route length includes closing segment');
assert.deepEqual(sampleClosedRoute(route, 41), { x: 1, z: 0, yaw: Math.PI / 2, length: 40 }, 'route distance wraps across its seam');

const building = { polygon: [[[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]], [[4.5, 4.5], [5.5, 4.5], [5.5, 5.5], [4.5, 5.5], [4.5, 4.5]]] };
building.wallPositions = [4, 0, 4, 6, 0, 4, 6, 6, 4, 4, 0, 4, 6, 6, 4, 4, 6, 4];
building.roofPositions = [4, 9, 4, 6, 9, 4, 6, 9, 6];
assert.equal(footprintContains(4.2, 4.2, building), true, 'outer footprint is occupied');
assert.equal(footprintContains(5, 5, building), false, 'building holes remain traversable');
assert.equal(isBlocked(4.1, 5, [building], 0.35), true, 'collision radius keeps the camera away from walls');
assert.equal(isBlocked(4.25, 4.25, [building], 0.35, 8), true, 'camera below the roof remains blocked');
assert.equal(isBlocked(4.25, 4.25, [building], 0.35, 9.34), true, 'roof clearance is required before crossing a building');
assert.equal(isBlocked(4.25, 4.25, [building], 0.35, 9.36), false, 'camera above the roof can overfly the building');
const data = { bounds: { xMin: 0, xMax: 10, zMin: 0, zMax: 10 }, buildings: [building] };
assert.deepEqual(clampToBounds(-5, 5, data.bounds), { x: 1.2, z: 5 }, 'movement remains inside the mapped block');
assert.equal(movePose({ x: 3.5, z: 4.2 }, 1, 0, data).x, 3.5, 'movement cannot enter a building footprint');
assert.equal(movePose({ x: 3.5, z: 5 }, 1, 0, data, 0.35, 12).x, 4.5, 'free flight can move horizontally above a roof');
console.log('Block navigation checks passed.');
