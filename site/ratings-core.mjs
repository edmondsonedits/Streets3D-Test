function validate(scores, rubric) {
  if (!Array.isArray(rubric) || !rubric.length || !Array.isArray(scores)) throw new TypeError('Scores and rubric must be arrays.');
  const ids = rubric.map(x=>x?.id);
  if (ids.some(x=>typeof x!=='string'||!x) || new Set(ids).size!==ids.length) throw new TypeError('Rubric ids must be unique.');
  if (rubric.some(x=>!Number.isFinite(x.weight)||x.weight<0) || rubric.reduce((n,x)=>n+x.weight,0)!==100) throw new RangeError('Rubric weights must total 100.');
  const byId = new Map();
  for (const entry of scores) {
    if (!entry || !ids.includes(entry.category)) throw new TypeError('Unknown category.');
    if (byId.has(entry.category)) throw new TypeError('Duplicate score for '+entry.category);
    if (entry.score!==null && (!Number.isFinite(entry.score)||entry.score<0||entry.score>10)) throw new RangeError('Score must be null or between 0 and 10.');
    byId.set(entry.category,entry.score);
  }
  if (ids.some(x=>!byId.has(x))) throw new TypeError('Missing score categories.');
  return byId;
}
// A complete score is deliberately unavailable until every weighted category has evidence.
export function calculateTotal(scores,rubric) {
  const values=validate(scores,rubric);
  if (rubric.some(x=>x.weight>0 && values.get(x.id)===null)) return null;
  return Math.round(rubric.reduce((n,x)=>n+(values.get(x.id)??0)*x.weight/10,0));
}
export function calculateVisualScore(scores,rubric) {
  const values=validate(scores,rubric),visual=rubric.filter(x=>x.dimension==='visual'&&x.weight>0);
  const weight=visual.reduce((n,x)=>n+x.weight,0);
  if (!weight || visual.some(x=>values.get(x.id)===null)) return null;
  return Math.round(visual.reduce((n,x)=>n+values.get(x.id)*x.weight,0)/weight*10);
}
export function costPer100Metres(cost,acceptedUniqueMetres) {
  for (const x of [cost,acceptedUniqueMetres]) if(x!==null && (!Number.isFinite(x)||x<0)) throw new RangeError('Cost and coverage must be nonnegative numbers or null.');
  if (cost===null || acceptedUniqueMetres===null || acceptedUniqueMetres===0) return null;
  return cost/acceptedUniqueMetres*100;
}
export function storageCostPer100Metres(bytes,acceptedUniqueMetres) {
  const value=costPer100Metres(bytes,acceptedUniqueMetres);
  return value===null?null:value/1e6;
}
// Only visual scores are currently comparable across all published assets.
export function rankRatings(ratings) {
  if (!Array.isArray(ratings)) throw new TypeError('Ratings must be an array.');
  const seen=new Set();
  const ordered=ratings.map(r=>{
    if (!r || typeof r.id!=='string' || !r.id || seen.has(r.id)) throw new TypeError('Unique rating id required.');
    seen.add(r.id);
    if (!Number.isFinite(r.visualScore)||r.visualScore<0||r.visualScore>100) throw new RangeError('Visual score must be between 0 and 100.');
    return r;
  }).sort((a,b)=>b.visualScore-a.visualScore||a.id.localeCompare(b.id));
  let prior,rank=0;
  return ordered.map((r,i)=>{if(r.visualScore!==prior)rank=i+1;prior=r.visualScore;return {...r,rank};});
}
