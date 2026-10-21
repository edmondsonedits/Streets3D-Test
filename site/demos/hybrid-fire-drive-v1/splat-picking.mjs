// SPDX-License-Identifier: GPL-2.0-only
import * as THREE from 'three';
// Spark 2.3.1's native ray query requires a unit direction. Query in native
// coordinates, then return world points/distances; do not mutate the live mesh.
export function pickSplatInWorld(mesh,worldRay){
 mesh.updateWorldMatrix(true,false);
 const matrix=mesh.matrixWorld.clone(),inverse=matrix.clone().invert();
 const origin=worldRay.ray.origin.clone().applyMatrix4(inverse);
 const direction=worldRay.ray.direction.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(inverse));
 const units=direction.length();if(!Number.isFinite(units)||units<1e-12)return [];
 direction.divideScalar(units);
 const nativeRay=new THREE.Raycaster(origin,direction,worldRay.near*units,worldRay.far*units),proxy=Object.create(mesh),hits=[];
 proxy.matrixWorld=new THREE.Matrix4();mesh.raycast.call(proxy,nativeRay,hits);
 return hits.map(hit=>{const point=hit.point.clone().applyMatrix4(matrix);return {...hit,point,distance:point.distanceTo(worldRay.ray.origin),object:mesh};}).filter(hit=>hit.distance>=worldRay.near&&hit.distance<=worldRay.far).sort((a,b)=>a.distance-b.distance);
}
