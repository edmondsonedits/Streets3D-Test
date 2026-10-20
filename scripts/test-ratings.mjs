import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { calculateTotal, calculateVisualScore, rankRatings } from '../site/ratings-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>JSON.parse(readFileSync(resolve(root,name),'utf8').replace(/^\uFEFF/,''));
const data=read('site/ratings/ratings.json');
const scenes=read('site/splats/scenes.json').scenes;
assert.equal(data.rubric.length,10);
assert.equal(data.rubric.reduce((n,x)=>n+x.weight,0),100);
assert.equal(data.rubric.slice(0,5).reduce((n,x)=>n+x.weight,0),65);
const scores=data.rubric.map(x=>({category:x.id,score:10}));
assert.equal(calculateTotal(scores,data.rubric),100,'perfect scores use a ten-point category scale');
assert.equal(calculateTotal(scores.map(x=>({...x,score:0})),data.rubric),0);
assert.equal(calculateTotal(scores.map(x=>({...x,score:5})),data.rubric),50);
assert.throws(()=>calculateTotal(scores.slice(1),data.rubric),/Missing/i);
assert.throws(()=>calculateTotal([...scores,scores[0]],data.rubric),/Duplicate/i);
assert.throws(()=>calculateTotal(scores.map((x,i)=>i?x:{...x,score:10.5}),data.rubric));
assert.throws(()=>calculateTotal(scores.map((x,i)=>i?x:{...x,score:NaN}),data.rubric));
const tied=rankRatings([{id:'b',visualScore:60},{id:'c',visualScore:50},{id:'a',visualScore:60}]);
assert.deepEqual(tied.map(x=>[x.id,x.rank]),[['a',1],['b',1],['c',3]]);
assert.equal(new Set(data.ratings.map(x=>x.id)).size,scenes.length);
assert.deepEqual([...data.ratings.map(x=>x.id)].sort(),scenes.map(x=>x.id).sort());
const ranks=rankRatings(data.ratings);
for(const r of data.ratings){
 assert.equal(r.total,calculateTotal(r.scores,data.rubric),r.id+' complete total must stay null if measurements are missing');
 assert.equal(r.visualScore,calculateVisualScore(r.scores,data.rubric));
 assert.equal(r.assessedCategories,r.scores.filter(x=>x.score!==null).length);
 assert.equal(r.efficiency.acceptedUniqueMetres,null);
 for(const category of ['size','time','effort','runtime','startup'])assert.equal(r.scores.find(x=>x.category===category).score,null,category+' needs actual comparable measurements');
 assert.equal(r.rank,ranks.find(x=>x.id===r.id).rank,r.id+' published rank');
 assert.equal(r.scores.length,10);
 const scene=scenes.find(x=>x.id===r.id);
 assert.equal(r.facts.assetBytes,scene.assetBytes);
 assert.equal(r.facts.splats,scene.count);
 assert.equal(r.facts.humanHours,null,'unknown labor must not be invented');
 assert.equal(r.scores.find(x=>x.category==='effort').score,null);
 const ev=new Set(r.evidence.map(x=>x.id));
 assert.equal(ev.size,r.evidence.length,'unique evidence ids');
 for(const score of r.scores){assert.ok(score.reason.length>15);assert.ok(score.evidenceIds.length);for(const id of score.evidenceIds)assert.ok(ev.has(id),r.id+' '+id);}
 for(const e of r.evidence)assert.ok(existsSync(resolve(root,'site',e.url)),r.id+' '+e.url);
 const record=read('site/ratings/records/'+r.id+'.json');
 assert.equal(record.publishedModel.sha256,scene.assetSha256,'rating must describe exact delivered model');
 assert.equal(record.observations.length,5);
 assert.equal(record.reviewArtifacts.length,2);
 assert.ok(record.sourceFileHashes.every(x=>x.sha256),'all evidence sources hashed');
}
assert.equal(data.ratings.find(x=>x.id==='corner-a').visualTotal,data.ratings.find(x=>x.id==='corner-b').visualTotal,'A/B visual tie is deliberate');

for(const group of data.costComparisons||[]){const ref=group.rows.find(x=>x.id===group.referenceId);assert.ok(ref);for(const row of group.rows){if(row.bytesRatio!==null)assert.ok(Math.abs(row.bytesRatio-row.assetBytes/ref.assetBytes)<1e-9);if(row.trainingRatio!==null)assert.ok(Math.abs(row.trainingRatio-row.trainingSeconds/ref.trainingSeconds)<1e-9);}}
const audit=read('site/ratings/coverage-audit.json');
assert.equal(data.schemaVersion,2);
assert.equal(data.rankingMetric,'visualScore');
assert.equal(data.costComparisons.length,4);
assert.equal(data.costComparisons.reduce((n,g)=>n+g.rows.length,0),20);
assert.deepEqual(audit.cohorts.flatMap(g=>g.publishedIds).sort(),scenes.map(x=>x.id).sort());
for(const group of data.costComparisons){
 const cohort=audit.cohorts.find(c=>c.publishedIds.includes(group.referenceId));
 assert.deepEqual(group.rows.map(r=>r.id).sort(),[...cohort.publishedIds].sort());
 for(const row of group.rows){
  const model=data.ratings.find(r=>r.id===row.id);
  assert.equal(row.assetBytes,model.facts.assetBytes);
  assert.equal(row.visualScore,model.visualScore);
  assert.equal(row.trainingSeconds,model.facts.trainingSeconds);
 }
}
assert.equal(data.costComparisons.flatMap(g=>g.rows).find(r=>r.id==='corner-mrnf-gut').trainingRatio,null,'different timer boundaries must not be ranked as comparable');
console.log(JSON.stringify({passed:true,models:data.ratings.length,categories:data.rubric.length,checks:'weighted scale, invalid input, ties, complete registry, unscored unknowns, artifact/evidence contracts'}));
