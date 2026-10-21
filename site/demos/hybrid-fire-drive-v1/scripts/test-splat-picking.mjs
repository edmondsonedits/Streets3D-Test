import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickSplatInWorld} from '../splat-picking.mjs';
const matrix=new THREE.Matrix4().compose(new THREE.Vector3(3,4,5),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7),new THREE.Vector3(20,20,20));
const mesh={matrixWorld:matrix,updateWorldMatrix(){},raycast(raycaster,hits){
 assert.ok(Math.abs(raycaster.ray.direction.length()-1)<1e-10,'native query uses unit ray');
 assert.deepEqual(this.matrixWorld.elements,new THREE.Matrix4().elements,'query proxy uses native coordinates');
 const point=raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(),1),new THREE.Vector3());
 if(point){const distance=point.distanceTo(raycaster.ray.origin);if(distance>=raycaster.near&&distance<=raycaster.far)hits.push({point,distance,object:this});}
}};
const origin=new THREE.Vector3(0,0,4).applyMatrix4(matrix),direction=new THREE.Vector3(0,0,-1).transformDirection(matrix),ray=new THREE.Raycaster(origin,direction,0,100),before=matrix.clone();
const hits=pickSplatInWorld(mesh,ray);assert.equal(hits.length,1);assert.ok(Math.abs(hits[0].distance-60)<1e-8);
assert.ok(hits[0].point.distanceTo(new THREE.Vector3(0,0,1).applyMatrix4(matrix))<1e-8);
assert.equal(hits[0].object,mesh);assert.deepEqual(matrix.elements,before.elements,'live mesh matrix unchanged');
ray.far=50;assert.equal(pickSplatInWorld(mesh,ray).length,0,'world far limit translated to native units');
console.log('Scaled Gaussian picking tests passed');
