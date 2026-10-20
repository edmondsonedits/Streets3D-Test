export const DEFAULT_ROAD_LIMITS = Object.freeze({ lateral: 4.72, start: 0, endPadding: 0.25 });
export function polygonArea(polygon) { let sum = 0; for (let i = 0; i < polygon.length; i++) { const a = polygon[i], b = polygon[(i + 1) % polygon.length]; sum += a[0] * b[1] - b[0] * a[1]; } return sum / 2; }
export function footprintPolygon(building) { const polygon = building?.polygon; if (!Array.isArray(polygon) || polygon.length < 3 || polygon.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) throw new TypeError(`Invalid footprint for ${building?.id ?? "unknown building"}`); return polygon.map(([x,z]) => [x,z]); }
export function frontFrame(building, endpoints = building?.front) { if (!Array.isArray(endpoints) || endpoints.length !== 2) throw new TypeError(`Invalid front for ${building?.id ?? "unknown building"}`); const [a,b]=endpoints, dx=b[0]-a[0], dz=b[1]-a[1], length=Math.hypot(dx,dz); if (!(length>0)||![...a,...b].every(Number.isFinite)) throw new TypeError(`Degenerate front for ${building?.id ?? "unknown building"}`); const side=building.side==="north"?1:-1; return {start:[a[0],a[1]],end:[b[0],b[1]],midpoint:[(a[0]+b[0])/2,(a[1]+b[1])/2],tangent:[dx/length,dz/length],outward:[(-dz/length)*side,(dx/length)*side],length}; }
export function clampDrive(position, blockLength, roadWidth, dt=1/60) { const laneLimit=roadWidth/2-0.42, step=Math.min(0.1,Math.max(0,dt)), speed=Number.isFinite(position.speed)?position.speed:0; return {...position,x:Math.max(0,Math.min(blockLength-0.25,position.x+(position.forward??0)*speed*step)),z:Math.max(-laneLimit,Math.min(laneLimit,position.z+(position.lateral??0)*speed*step))}; }
export function roofCapPolygon(building) { return footprintPolygon(building); }
// Clip a simple footprint to one side of an X-aligned roof ridge. Keeping the
// roof faces inside the GIS polygon avoids the overhangs caused by using its bbox.
export function clipPolygonAtX(polygon, ridgeX, keepLeft = true) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !Number.isFinite(ridgeX)) throw new TypeError("Invalid roof clipping input");
  const inside = x => keepLeft ? x <= ridgeX + 1e-9 : x >= ridgeX - 1e-9, out = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], ain = inside(a[0]), bin = inside(b[0]);
    if (ain) out.push([a[0], a[1]]);
    if (ain !== bin) { const t = (ridgeX - a[0]) / (b[0] - a[0]); out.push([ridgeX, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
export function clipFootprintAtX(building, ridgeX, keepLeft = true) { return clipPolygonAtX(footprintPolygon(building), ridgeX, keepLeft); }
