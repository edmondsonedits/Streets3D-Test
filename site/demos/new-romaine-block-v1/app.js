// SPDX-License-Identifier: GPL-2.0-only
// New block demo / adapted map facade planner. Source and licence are shipped alongside.
import * as THREE from "../street-alternatives-v1/vendor/three.module.js";
import { clampToBounds, isBlocked, movePose, sampleClosedRoute, sampleTerrain } from "./navigation.mjs";
import { buildingFacadePlan } from "./building-archetypes.js";

const $ = (id) => document.getElementById(id);
const stage = $("stage"), loading = $("loading"), errorBox = $("error");
let data, renderer, scene, camera, frameCount = 0, mode = "walk", locked = true, tourOn = false;
let yaw = 0, pitch = 0, flightOffset = 1.7, tourDistance = 0, tourLookOffset = 0, lastFrame = 0, lastMap = 0;
let pose = { x: 0, z: 0 }, keys = new Set(), touchMoves = new Set(), dragging = false, lastPointer = null;


try {
  const response = await fetch("./block.json.gz", { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load block.json.gz (${response.status})`);
  if (typeof DecompressionStream === "undefined") throw new Error("Please use a current browser with gzip stream support.");
  data = await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
  validateData(data);
  start();
} catch (error) {
  showError(error?.message || "The mapped block could not be loaded.");
}

function validateData(d) {
  if (d?.schemaVersion !== 1 || !d.bounds || !d.terrain || !Array.isArray(d.roads) || !Array.isArray(d.buildings)) throw new Error("This block data is missing required fields.");
  if (!(d.bounds.xMax > d.bounds.xMin && d.bounds.zMax > d.bounds.zMin)) throw new Error("The mapped block has invalid bounds.");
}

function start() {
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch { throw new Error("WebGL is unavailable in this browser. Try enabling hardware acceleration or use a browser with WebGL support."); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = "view";
  renderer.domElement.setAttribute("aria-label", "Three dimensional view of the New Romaine Street block");
  stage.prepend(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#cbdedc");
  scene.fog = new THREE.Fog("#d8e5e1", 105, 360);
  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 800);
  camera.rotation.order = "YXZ";
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x706e59, 1.55));
  const sun = new THREE.DirectionalLight(0xfff0d5, 2.45);
  sun.position.set(-55, 90, -35); sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.left = -150; sun.shadow.camera.right = 150; sun.shadow.camera.top = 150; sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.00035; scene.add(sun);
  addTerrain(); addRoads(); addBuildings(); addFacades(); addRoute();
  setTitle(); setupUI(); chooseStart(); updateCamera(); drawMiniMap();
  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
  renderer.domElement.addEventListener("webglcontextrestored", () => location.reload(), false);
  Object.defineProperty(window, "blockDebug", { configurable: false, get: () => Object.freeze({ pose: Object.freeze({ x: pose.x, y: currentGround() + viewHeight(), z: pose.z, yaw, pitch }), mode, frameCount, buildingCount: data.buildings.length, roadCount: data.roads.length, rendererInfo: Object.freeze({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }) }) });
  loading.remove();
  requestAnimationFrame(tick);
}

function setTitle() {
  $("block-title").textContent = data.title || "New Romaine Street";
  $("place-label").textContent = "Peterborough · estimated 3D scaffold";
  document.title = `${data.title || "New Romaine Street"} · Block walk`;
}

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
  mesh.receiveShadow = true; scene.add(mesh);
}

function addRoads() {
  const flat = data.roadPositions || [];
  if (!flat.length) return;
  const mesh = triangles(flat, new THREE.MeshStandardMaterial({ color: 0x49545a, roughness: 0.93, side: THREE.DoubleSide }));
  mesh.receiveShadow = true; scene.add(mesh);
}

function addBuildings() {
  const wallBuckets = new Map(), roofBuckets = new Map();
  for (const building of data.buildings) {
    const wall = Array.isArray(building.wallPositions) ? building.wallPositions : [];
    const roof = Array.isArray(building.roofPositions) ? building.roofPositions : [];
    const type = String(building.type || "building").toLowerCase();
    const wallColor = /garage|shed|service/.test(type) ? 0xb4aa93 : /commercial|retail|industrial/.test(type) ? 0xc4bca7 : 0xd3cbb7;
    const roofColor = /garage|shed|service/.test(type) ? 0x666b68 : 0x625e59;
    pushBucket(wallBuckets, wallColor, wall); pushBucket(roofBuckets, roofColor, roof);
  }
  for (const [color, positions] of wallBuckets) { const mesh = triangles(positions, new THREE.MeshStandardMaterial({ color, roughness: 0.88, side: THREE.DoubleSide })); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }
  for (const [color, positions] of roofBuckets) { const mesh = triangles(positions, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide })); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }
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
    mesh.castShadow = false; mesh.receiveShadow = false; scene.add(mesh);
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
  scene.add(new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: 0x37b7a1, transparent: true, opacity: 0.9 })));
}

function triangles(flat, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3)); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}
function pushBucket(map, color, values) { if (!values.length) return; if (!map.has(color)) map.set(color, []); map.get(color).push(...values); }

function chooseStart() {
  const road = data.roads.filter(r => /new\s+romaine/i.test(r.name || "")).sort((a, b) => pathLength(b.points) - pathLength(a.points))[0] || data.roads.slice().sort((a, b) => pathLength(b.points) - pathLength(a.points))[0];
  let target;
  if (road?.points?.length > 1) {
    const mid = pathLength(road.points) * 0.52, sampled = sampleOpenPath(road.points, mid);
    target = { x: sampled.x, z: sampled.z }; yaw = sampled.yaw;
  } else target = { x: (data.bounds.xMin + data.bounds.xMax) / 2, z: (data.bounds.zMin + data.bounds.zMax) / 2 };
  const nearestRoadPoints = (road?.points || []).slice().sort((a, b) => Math.hypot(a[0] - target.x, a[1] - target.z) - Math.hypot(b[0] - target.x, b[1] - target.z));
  if (isBlocked(target.x, target.z, data.buildings)) {
    const safe = nearestRoadPoints.find(([x, z]) => !isBlocked(x, z, data.buildings));
    if (safe) target = { x: safe[0], z: safe[1] };
  }
  pose = { ...clampToBounds(target.x, target.z, data.bounds) };
  if (!road) yaw = 0;
  flightOffset = 1.7;
}

function setupUI() {
  const select = $("street-select"), names = [...new Set(data.roads.map(r => r.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const name of names) { const option = document.createElement("option"); option.value = name; option.textContent = name; select.append(option); }
  const romaine = names.find(name => /new\s+romaine/i.test(name)); if (romaine) select.value = romaine;
  select.addEventListener("change", () => jumpToStreet(select.value));
  $("height-lock").addEventListener("click", () => { locked = !locked; $("height-lock").textContent = locked ? "Walk height" : "Free flight"; $("height-lock").setAttribute("aria-pressed", String(locked)); if (locked) { flightOffset = 1.7; if (isBlocked(pose.x, pose.z, data.buildings)) chooseStart(); } syncFlightControls(); updateCamera(); });
  $("tour").addEventListener("click", () => toggleTour(!tourOn));
  $("reset").addEventListener("click", reset);
  $("overview").addEventListener("click", () => { if (mode === "overview") mode = "walk"; else { mode = "overview"; toggleTour(false); } $("overview").textContent = mode === "overview" ? "Walk view" : "Overview"; syncFlightControls(); updateCamera(); });
  window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", e => keys.delete(e.code)); window.addEventListener("blur", () => { keys.clear(); touchMoves.clear(); });
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", e => { if (e.button !== 0 || e.target !== canvas) return; dragging = true; lastPointer = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (!dragging || !lastPointer) return; const dx = e.clientX - lastPointer.x, dy = e.clientY - lastPointer.y; lastPointer = { x: e.clientX, y: e.clientY }; if (tourOn) tourLookOffset -= dx * 0.004; else if (mode === "walk") yaw -= dx * 0.004; pitch = clamp(pitch - dy * 0.0035, -1.25, 1.2); updateCamera(); });
  canvas.addEventListener("pointerup", () => { dragging = false; lastPointer = null; }); canvas.addEventListener("pointercancel", () => { dragging = false; lastPointer = null; });
  for (const button of document.querySelectorAll("[data-move]")) {
    const direction = button.dataset.move;
    button.addEventListener("pointerdown", e => { e.preventDefault(); touchMoves.add(direction); button.setPointerCapture(e.pointerId); stopTourOnInput(); });
    const end = () => touchMoves.delete(direction); button.addEventListener("pointerup", end); button.addEventListener("pointercancel", end); button.addEventListener("lostpointercapture", end);
  }
  for (const button of document.querySelectorAll("[data-height]")) button.addEventListener("click", () => adjustFlight(button.dataset.height === "up" ? 1 : -1));
  syncFlightControls();
}

function onKeyDown(event) {
  if (["SELECT", "INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) { keys.add(event.code); stopTourOnInput(); }
  if (event.code === "KeyQ" || event.code === "KeyE") adjustFlight((event.code === "KeyE" ? 1 : -1) * 0.8);
  if (event.code === "Escape" && mode === "overview") { mode = "walk"; $("overview").textContent = "Overview"; syncFlightControls(); }
}

function tick(time) {
  const dt = Math.min(0.05, (time - (lastFrame || time)) / 1000); lastFrame = time; frameCount++;
  if (mode === "walk") {
    if (tourOn) {
      const route = data.route?.points || [], length = Number(data.route?.lengthMetres) || 0;
      if (route.length >= 3) { tourDistance = (tourDistance + dt * 4.2) % (length || sampleClosedRoute(route, 0).length); const sample = sampleClosedRoute(route, tourDistance); if (sample) { pose = { x: sample.x, z: sample.z }; yaw = sample.yaw + tourLookOffset; } }
      else toggleTour(false);
    } else updateMovement(dt);
    updateCamera();
  }
  renderer.render(scene, camera);
  if (time - lastMap > 140) { drawMiniMap(); lastMap = time; }
  requestAnimationFrame(tick);
}

function updateMovement(dt) {
  let forward = Number(keys.has("KeyW") || keys.has("ArrowUp") || touchMoves.has("forward")) - Number(keys.has("KeyS") || keys.has("ArrowDown") || touchMoves.has("back"));
  let side = Number(keys.has("KeyD") || keys.has("ArrowRight") || touchMoves.has("right")) - Number(keys.has("KeyA") || keys.has("ArrowLeft") || touchMoves.has("left"));
  if (!forward && !side) return;
  const norm = Math.hypot(forward, side); forward /= norm; side /= norm;
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 10 : 5.2;
  const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed * dt;
  const dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * side) * speed * dt;
  pose = movePose(pose, dx, dz, data, 0.35, currentGround() + viewHeight());
}

function updateCamera() {
  if (!camera) return;
  if (mode === "overview") {
    scene.fog.near = 900; scene.fog.far = 1700;
    const centerX = (data.bounds.xMin + data.bounds.xMax) / 2, centerZ = (data.bounds.zMin + data.bounds.zMax) / 2;
    const halfAngle = Math.tan(52 * Math.PI / 360);
    const y = maxTerrain() + Math.max((data.bounds.xMax - data.bounds.xMin) / (2 * halfAngle * camera.aspect), (data.bounds.zMax - data.bounds.zMin) / (2 * halfAngle)) * 1.1;
    camera.position.set(centerX, y, centerZ); camera.up.set(0, 0, -1); camera.lookAt(centerX, 0, centerZ); camera.fov = 52; camera.near = 10; camera.far = 3000; camera.updateProjectionMatrix();
    return;
  }
  scene.fog.near = 105; scene.fog.far = 360;
  camera.up.set(0, 1, 0); camera.fov = 68; camera.near = 0.08; camera.far = 800; camera.updateProjectionMatrix();
  camera.position.set(pose.x, currentGround() + viewHeight(), pose.z);
  camera.rotation.set(pitch, -yaw, 0, "YXZ"); // Heading is clockwise from north; Three camera yaw has the opposite sign.
}

function currentGround() { return sampleTerrain(data.terrain, pose.x, pose.z); }
function viewHeight() { return locked ? 1.7 : flightOffset; }
function maxTerrain() { return Math.max(...data.terrain.heights.filter(Number.isFinite)); }
function jumpToStreet(name) {
  const candidates = data.roads.filter(r => r.name === name).sort((a, b) => pathLength(b.points) - pathLength(a.points));
  const road = candidates[0]; if (!road?.points?.length) return;
  const p = sampleOpenPath(road.points, pathLength(road.points) * 0.5); let target = { x: p.x, z: p.z };
  if (isBlocked(target.x, target.z, data.buildings)) { const nearest = road.points.slice().sort((a, b) => Math.hypot(a[0] - target.x, a[1] - target.z) - Math.hypot(b[0] - target.x, b[1] - target.z)).find(([x, z]) => !isBlocked(x, z, data.buildings)); if (nearest) target = { x: nearest[0], z: nearest[1] }; }
  pose = clampToBounds(target.x, target.z, data.bounds); yaw = p.yaw; mode = "walk"; $("overview").textContent = "Overview"; toggleTour(false); syncFlightControls(); updateCamera();
}

function reset() { mode = "walk"; locked = true; flightOffset = 1.7; pitch = 0; tourLookOffset = 0; toggleTour(false); chooseStart(); $("height-lock").textContent = "Walk height"; $("height-lock").setAttribute("aria-pressed", "true"); $("overview").textContent = "Overview"; syncFlightControls(); updateCamera(); }
function toggleTour(value) { tourOn = Boolean(value); if (tourOn) { mode = "walk"; tourDistance = 0; tourLookOffset = 0; $("overview").textContent = "Overview"; } $("tour").setAttribute("aria-pressed", String(tourOn)); $("tour").textContent = tourOn ? "Stop tour" : "Perimeter tour"; syncFlightControls(); }
function stopTourOnInput() { if (tourOn) toggleTour(false); }
function adjustFlight(delta) { if (locked || mode !== "walk") return; flightOffset = clamp(flightOffset + delta, 0.4, 80); stopTourOnInput(); updateCamera(); }
function syncFlightControls() { const controls = $("flight-controls"); if (controls) controls.hidden = locked || mode !== "walk"; }
function pathLength(points = []) { let sum = 0; for (let i = 1; i < points.length; i++) sum += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); return sum; }
function sampleOpenPath(points, distance) { let d = Math.max(0, distance); for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= len || i === points.length - 1) { const t = len ? clamp(d / len, 0, 1) : 0; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(b[0] - a[0], -(b[1] - a[1])) }; } d -= len; } const p = points[0] || [0, 0]; return { x: p[0], z: p[1], yaw: 0 }; }

function drawMiniMap() {
  const canvas = $("minimap"), ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height, b = data.bounds, pad = 12;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#e5ece2"; ctx.fillRect(0, 0, w, h);
  const sx = (w - pad * 2) / (b.xMax - b.xMin), sz = (h - pad * 2) / (b.zMax - b.zMin), scale = Math.min(sx, sz);
  const ox = (w - (b.xMax - b.xMin) * scale) / 2, oz = (h - (b.zMax - b.zMin) * scale) / 2;
  const xy = ([x, z]) => [ox + (x - b.xMin) * scale, oz + (z - b.zMin) * scale];
  ctx.fillStyle = "#9ba99b";
  for (const building of data.buildings) for (const ring of (building.polygon || []).slice(0, 1)) { ctx.beginPath(); ring.forEach((p, i) => { const [x, y] = xy(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); }
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#7d8b8f"; ctx.lineWidth = 2.5;
  for (const road of data.roads) { ctx.beginPath(); (road.points || []).forEach((p, i) => { const [x, y] = xy(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
  const route = data.route?.points || []; if (route.length) { ctx.beginPath(); route.forEach((p, i) => { const [x, y] = xy(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.strokeStyle = "#16a792"; ctx.lineWidth = 1.7; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
  const [px, pz] = xy([pose.x, pose.z]); ctx.save(); ctx.translate(px, pz); ctx.rotate(yaw); ctx.fillStyle = "#e85639"; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
}

function onResize() { if (!renderer) return; renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); updateCamera(); }
function onContextLost(event) { event.preventDefault(); showError("The WebGL context was lost. Reload this page to restore the block view."); }
function showError(message) { loading?.remove(); errorBox.hidden = false; errorBox.textContent = message; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
