import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {applyTransform,assessRegistration,fitSimilarity,restoreRegistrationMetadata} from '../site/demos/hybrid-fire-drive-v1/registration.mjs';
import {createDriver} from '../site/demos/hybrid-fire-drive-v1/driving.mjs';
const dir=new URL('../site/demos/hybrid-fire-drive-v2/',import.meta.url);
const reg=JSON.parse(fs.readFileSync(new URL('route-suggestion.json',dir),'utf8'));
const proof=JSON.parse(fs.readFileSync(new URL('alignment-evidence.json',dir),'utf8'));
assert.equal(reg.assetSha256,'426ebbb6ecebfdcda2dc99a157f6ad9f56d57cb8e5483958cc1f23e64647cfd0');
for(const p of reg.pairs){const q=applyTransform(p.source,reg.transform);assert.ok(Math.hypot(q[0]-p.target[0],q[2]-p.target[2])<1e-8);}
assert.equal(reg.pairs.length,2);
assert.equal(assessRegistration(reg.pairs,reg.transform).checksPass,false);
assert.throws(()=>fitSimilarity(reg.pairs),/three distinct/);
assert.equal(reg.checksPass,false);
assert.equal(proof.localFit.independentControls,0);
assert.ok(proof.globalRejectedFit.nearestBrownFordTurnMetres.pass1>40);
assert.ok(proof.globalRejectedFit.nearestBrownFordTurnMetres.pass2>40);
const signCamera=applyTransform(reg.inspectionPose.position,reg.transform);
assert.ok(Math.hypot(signCamera[0]+146.441,signCamera[2]-8.892)<4,'signed corner must be nearby');
const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../site/demos/new-romaine-block-v1/block.json.gz',import.meta.url))));
const driver=createDriver(data,reg.initialSpawn);
assert.equal(driver.state.roadName,'Ford Street');assert.equal(driver.state.contactCount,4);
let minContacts=4;
for(let i=0;i<300;i++){driver.step({throttle:1},1/60);minContacts=Math.min(minContacts,driver.state.contactCount);assert.equal(driver.state.collision,false);}
assert.ok(driver.state.travelMetres>30);assert.equal(minContacts,4);
const app=fs.readFileSync(new URL('../site/demos/hybrid-fire-drive-v1/app.js',import.meta.url),'utf8');
assert.ok(app.includes('location.pathname'));assert.ok(app.includes('suggestion.initialSpawn||nearestRoadSpawn'));
console.log('Local placement: controls reproduced; global gate correctly FAILED; Ford drive >30m, four contacts, no building collision.');

const restored=restoreRegistrationMetadata(reg,{transform:{...reg.transform,x:reg.transform.x+1},pairs:[],badge:'FAKE VERIFIED',inspectionPose:null});
assert.equal(restored.badge,reg.badge);assert.equal(restored.inspectionPose,reg.inspectionPose);assert.equal(restored.reviewSummary,reg.reviewSummary);assert.equal(restored.transform.x,reg.transform.x+1);
console.log('Saved/imported controls preserve independent failed-check evidence and inspection pose.');
