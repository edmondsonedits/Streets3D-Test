import assert from 'node:assert/strict';
const { createFallbackPumper, loadPumper, VEHICLE_ASSET, VEHICLE_FETCH_TIMEOUT_MS } = await import('../vehicle.mjs');
const THREE = await import('three');

assert.equal(typeof createFallbackPumper, 'function', 'vehicle module exposes the procedural fallback');
const fallback = createFallbackPumper('Pinned asset timed out');
assert.equal(fallback.degraded, true, 'fallback is surfaced as degraded');
assert.match(fallback.status, /fallback/i, 'fallback status is explicit');
assert.equal(typeof fallback.animate, 'function');
assert.equal(typeof fallback.dispose, 'function');
assert.ok(fallback.wheels.length >= 4 && fallback.front.length >= 2, 'fallback includes four wheels and steerable front wheels');
assert.ok(fallback.beacons.length >= 2, 'fallback includes emergency beacons');
const size = new THREE.Box3().setFromObject(fallback.model).getSize(new THREE.Vector3());
assert.ok(Math.abs(size.x - 2.55) < 0.02 && Math.abs(size.y - 3.25) < 0.02 && Math.abs(size.z - 10.4) < 0.02, 'fallback matches the truck width, height and length envelope');
fallback.animate({ x: 2, y: 1, z: 3, heading: 0.5, pitch: 0.1, roll: -0.1, steering: 0.2, wheelRotation: 4 }, true, 1);
assert.deepEqual(fallback.root.position.toArray(), [2, 1, 3], 'fallback obeys the shared pose animation contract');
assert.ok(fallback.wheels[0].node.quaternion.angleTo(fallback.wheels[0].base) > 0.1, 'fallback wheels animate with vehicle travel');
assert.ok(fallback.beacons[0].material.emissiveIntensity > 0.3, 'fallback emergency beacons animate when lights are enabled');
fallback.dispose();

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  const unavailable = await loadPumper(() => {}, { timeoutMs: 15 });
  assert.equal(unavailable.degraded, true, 'failed pinned fetch returns a playable fallback');
  assert.match(unavailable.status, /offline|fallback/i);

  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Uint8Array.of(1, 2, 3).buffer });
  const invalid = await loadPumper(() => {}, { timeoutMs: 15 });
  assert.equal(invalid.degraded, true);
  assert.match(invalid.status, /integrity check failed/i, 'a wrong pinned hash selects fallback instead of loading unverified bytes');

  let aborted = false;
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); }, { once: true });
  });
  const timed = await loadPumper(() => {}, { timeoutMs: 15 });
  assert.equal(aborted, true, 'timeout aborts the remote pinned fetch');
  assert.equal(timed.degraded, true, 'timed-out fetch returns the procedural fallback');
  assert.equal(VEHICLE_ASSET.sha256.length, 64, 'the original asset keeps its pinned SHA-256');
  assert.equal(VEHICLE_FETCH_TIMEOUT_MS, 9000, 'the pinned request has a bounded default timeout');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Vehicle fallback checks passed.');
