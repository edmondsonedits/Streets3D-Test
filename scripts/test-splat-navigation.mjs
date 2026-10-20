import assert from 'node:assert/strict';
import { stepPosition, constrainHeight } from '../site/demos/splat-explorer-v1/navigation.mjs';

const EPS = 1e-10;
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= EPS, `${label}: expected ${expected}, got ${actual}`);
const vector = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, `${label}: length`);
  actual.forEach((value, i) => near(value, expected[i], `${label}[${i}]`));
};
const magnitude = ([x, y, z]) => Math.hypot(x, y, z);

// A steep look angle must not tilt movement when capture height is locked.
{
  const start = [2, 7, -4];
  const level = stepPosition(start, { forward: 1, yaw: 0.7, pitch: 0, distance: 3, locked: true, referenceHeight: 7 });
  const steep = stepPosition(start, { forward: 1, yaw: 0.7, pitch: 1.4, distance: 3, locked: true, referenceHeight: 7 });
  vector(steep, level, 'locked steep-pitch forward');
  near(steep[1], 7, 'locked steep-pitch height');
  console.log('PASS steep pitch does not tilt locked forward movement');
}

// Explicit Q/E input is ignored while locked; the reference plane is enforced.
{
  const start = [0, 3.25, 0];
  const up = stepPosition(start, { up: 1, distance: 5, locked: true, referenceHeight: 3.25 });
  const down = stepPosition(start, { up: -1, distance: 5, locked: true, referenceHeight: 3.25 });
  vector(up, start, 'locked up input');
  vector(down, start, 'locked down input');
  console.log('PASS locked vertical input is ignored');
}

// Free flight combines pitch-derived forward motion with explicit vertical input.
{
  const start = [1, 2, 3];
  const pitch = Math.PI / 6;
  const result = stepPosition(start, { forward: 1, up: 1, yaw: 0, pitch, distance: 2, locked: false });
  vector(result, [1, 2 + Math.sqrt(3), 2], 'free-flight pitched forward plus up');
  near(result[1], 2 + Math.sqrt(3), 'free-flight vertical input');
  console.log('PASS free flight moves vertically from pitch and Q/E input');
}

// Orthogonal forward/right input is normalized to the requested travel distance.
{
  const result = stepPosition([0, 4, 0], { forward: 1, right: 1, yaw: 0, distance: 10, locked: true, referenceHeight: 4 });
  near(magnitude([result[0], result[1] - 4, result[2]]), 10, 'diagonal travel magnitude');
  near(result[0], 10 / Math.sqrt(2), 'diagonal right component');
  near(result[2], -10 / Math.sqrt(2), 'diagonal forward component');
  near(result[1], 4, 'diagonal height');
  console.log('PASS diagonal forward/right travel does not gain speed');
}

// Re-engaging lock snaps to the selected capture plane and subsequent moves stay there.
{
  const captureHeight = 1.75;
  const free = stepPosition([0, captureHeight, 0], { up: 1, distance: 8, locked: false });
  assert.ok(free[1] > captureHeight, 'free flight should change height before relock');
  const snapped = constrainHeight(free, true, captureHeight);
  near(snapped[1], captureHeight, 're-engaged lock snap');
  const continued = stepPosition(snapped, { forward: 1, up: -1, yaw: 0.3, distance: 2, locked: true, referenceHeight: captureHeight });
  near(continued[1], captureHeight, 're-engaged lock movement');
  console.log('PASS lock re-engagement snaps to capture height and retains plane');
}
