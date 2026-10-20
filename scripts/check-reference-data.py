"""Check geographic and source-media contracts for the reference-built block."""
from pathlib import Path
import json, hashlib, math
root=Path(__file__).resolve().parents[1]/'site/demos/sherbrooke-reference-v1'
block=json.loads((root/'block.json').read_text(encoding='utf-8'))
appearance=json.loads((root/'buildings.json').read_text(encoding='utf-8'))
features=block['buildings']; profiles=appearance['buildings']
assert len(features)==19, 'Expected the reviewed 19 map footprints'
ids={f['id'] for f in features}
assert len(ids)==19 and len(profiles)==19
assert {p['id'] for p in profiles}==ids, 'Every footprint needs exactly one appearance record'
a,b=block['road']['endpointsLongitudeLatitude']; c=block['coordinates']; u=c['alongRoadEastNorth']
assert abs(math.hypot(*u)-1)<1e-9
for f in features:
    assert len(f['polygon'])>=3
    assert all(len(q)==2 and all(math.isfinite(v) for v in q) for q in f['polygon'])
    assert (sum(q[1] for q in f['polygon'])<0)==(f['side']=='north'), 'Mirrored street side'
    assert math.dist(*f['front'])>2
    geo=f['geographicPolygon'][:-1]
    assert len(geo)==len(f['polygon'])
    for source,local in zip(geo,f['polygon']):
        e=math.radians(source[0]-a[0])*c['earthRadiusMetres']*math.cos(math.radians(c['longitudeScaleLatitude']))
        n=math.radians(source[1]-a[1])*c['earthRadiusMetres']
        assert math.dist(local,[e*u[0]+n*u[1],e*u[1]-n*u[0]])<0.001, 'Projection drift'
station=next(p for p in profiles if p['id']=='way/1009651229')
assert station['bayCount']==5, 'Five doors observed in source0158, overriding legacy four-bay annotation'
refs=set(); patches=0
for p in profiles:
    assert p['confidence'] in ('observed','partial','inferred')
    assert 2<=p['height']<=25 and 0<p.get('eaveHeight',p['height'])<=p['height']
    assert p['roof'] in ('flat','gable','hip')
    assert p.get('notes'), 'Record limitations and observation evidence'
    ref=p.get('reference')
    if ref:
        path=(root/ref['file']).resolve(); assert path.is_relative_to(root.resolve()) and path.is_file()
        assert hashlib.sha256(path.read_bytes()).hexdigest()==ref['sha256'], 'Reference is not the recorded source image'
        assert 0<=ref['sourceSeconds']<=168.335
        refs.add(path)
    patch=p.get('texturePatch')
    if patch:
        assert (root/patch['file']).is_file()
        assert len(patch['quad'])==4 and all(0<=v<=1 for q in patch['quad'] for v in q)
        patches+=1
print(json.dumps({'passed':True,'footprints':len(features),'appearanceRecords':len(profiles),'referenceFiles':len(refs),'referenceBytes':sum(p.stat().st_size for p in refs),'photoPatches':patches,'projectionToleranceMetres':0.001}))
