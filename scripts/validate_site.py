"""Dependency-free checks for the exact static artifact deployed by Pages."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from html.parser import HTMLParser
import hashlib, json, re, math, zipfile
ROOT=Path(__file__).resolve().parents[1]/'site'
errors=[]
def check(condition,message):
    if not condition: errors.append(message)
def ref(base,value):
    if not value or value.startswith(('#','data:','mailto:','tel:','blob:')): return
    parts=urlsplit(value)
    if parts.scheme or parts.netloc:
        check(parts.scheme in ('https','http'),f'Unsupported URL: {value}')
        check(parts.hostname not in ('localhost','127.0.0.1'),f'Local host URL: {value}')
        return
    check(not parts.path.startswith('/'),f'Root-relative URL breaks project hosting: {value}')
    p=(base/unquote(parts.path)).resolve()
    check(p.is_relative_to(ROOT.resolve()),f'Link escapes site: {value}')
    check(p.exists() and (not p.is_dir() or (p/'index.html').is_file()),f'Missing target: {base.relative_to(ROOT)}/{value}')
class Links(HTMLParser):
    def __init__(self,base): super().__init__();self.base=base
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('href','src','poster'):ref(self.base,value)
files=[p for p in ROOT.rglob('*') if p.is_file()]
size=sum(p.stat().st_size for p in files)
check(size<900_000_000,'Site exceeds conservative 900 MB budget')
for p in files:
    check(not p.is_symlink(),f'Symlink not supported: {p.relative_to(ROOT)}')
    check(p.stat().st_size<100*1024*1024,f'File reaches GitHub 100 MiB limit: {p.relative_to(ROOT)}')
    check(p.suffix.lower() not in ('.insv','.lrv','.env','.log'),f'Unexpected source/private file: {p.relative_to(ROOT)}')
    if p.suffix in ('.json','.html','.css','.js','.mjs','.txt'):
        text=p.read_text(encoding='utf-8-sig')
        check('H:\\' not in text and 'H:/' not in text and 'file:///' not in text,f'Local path in public file: {p.relative_to(ROOT)}')
        if p.suffix=='.json':json.loads(text)
        if p.suffix=='.html':Links(p.parent).feed(text)
        if p.suffix=='.css':
            for url in re.findall(r'url\([\s\"\x27]*([^\)\"\x27]+)',text):ref(p.parent,url.strip())
        if p.suffix in ('.js','.mjs'):
            for url in re.findall(r'(?:from\s*|import\s*)[\"\x27]([^\"\x27]+)',text):
                if url.startswith('.'):ref(p.parent,url)
registry=json.loads((ROOT/'tests.json').read_text(encoding='utf-8'))
check(registry.get('schemaVersion')==1,'Unsupported registry schema')
seen=set()
for item in registry['tests']:
    for field in ('id','title','category','date','version','status','url','preview','description','controls','limitation'):
        check(isinstance(item.get(field),str) and bool(item.get(field)),f'Missing {field} in {item.get("id")}')
    check(item['id'] not in seen,f'Duplicate test ID {item["id"]}');seen.add(item['id'])
    check(item['status'] in ('prototype','tested','archived'),f'Unknown status {item["id"]}')
    ref(ROOT,item['url']);ref(ROOT,item['preview'])
for manifest in ROOT.glob('demos/*/assets/demo-manifest.json'):
    data=json.loads(manifest.read_text(encoding='utf-8'));base=manifest.parent.parent
    for panel in data.get('road',{}).get('panels',[]):ref(base,panel['url'])
    for direction in ('forward','reverse'):
        video=data.get('video',{}).get(direction,{})
        if video.get('url'):ref(base,video['url'])
for manifest in ROOT.glob('demos/*/media-manifest.json'):
    data=json.loads(manifest.read_text(encoding='utf-8'))
    for item in data['artifacts']:
        path=(manifest.parent/item['path']).resolve()
        check(path.is_relative_to(ROOT.resolve()),'Artifact path escapes site')
        if not path.is_file():errors.append(f'Missing artifact {item["path"]}');continue
        if path.suffix in ('.json','.txt','.html','.js','.css'):
            check(b'\r\n' not in path.read_bytes(),f'Hashed text must use LF line endings: {item["path"]}')
        check(path.stat().st_size==item['bytes'],f'Artifact size mismatch {item["path"]}')
        check(hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==item['sha256'],f'Artifact hash mismatch {item["path"]}')
# Gaussian assets and render videos are lazy-loaded by the shared viewer.
scene_file=ROOT/'splats/scenes.json'
if scene_file.exists():
    data=json.loads(scene_file.read_text(encoding='utf-8'))
    check(data.get('schemaVersion')==1,'Unknown splat schema')
    scene_ids=set()
    def finite_vector(values,n):
        return isinstance(values,list) and len(values)==n and all(isinstance(x,(int,float)) and math.isfinite(x) for x in values)
    def artifact(path,count,sha):
        check(path.is_relative_to(ROOT.resolve()),'Splat artifact path escapes site')
        if not path.is_file(): errors.append(f'Missing {path.name}'); return
        check(path.stat().st_size==count,f'Size mismatch: {path.relative_to(ROOT)}')
        with path.open('rb') as f: actual=hashlib.file_digest(f,'sha256').hexdigest()
        check(actual==sha,f'Hash mismatch: {path.relative_to(ROOT)}')
    viewer=ROOT/'demos/splat-explorer-v1'
    for item in data['scenes']:
        ident=item['id'];check(ident not in scene_ids,f'Duplicate scene {ident}');scene_ids.add(ident)
        check(ident in seen,f'Scene missing from gallery: {ident}')
        check(finite_vector(item['modelMatrix'],16),f'Invalid model transform: {ident}')
        check(finite_vector(item['up'],3) and abs(math.hypot(*item['up'])-1)<1e-5,f'Invalid local up: {ident}')
        check(isinstance(item['count'],int) and item['count']>0,f'Invalid count: {ident}')
        check(item['speed']>0 and 10<item['fov']<150,f'Invalid navigation: {ident}')
        check(bool(item.get('heightReference')),f'Missing height provenance: {ident}')
        for pose in [item['initial'],*item['poses']]:
            for key in ('position','target','up'):check(finite_vector(pose[key],3),f'Invalid pose {ident}/{key}')
            check(pose['position']!=pose['target'],f'Zero view direction: {ident}')
        ref(viewer,item['asset']);path=(viewer/item['asset']).resolve();artifact(path,item['assetBytes'],item['assetSha256'])
        if item['format']=='sog':
            with zipfile.ZipFile(path) as z:check(json.loads(z.read('meta.json'))['count']==item['count'],f'SOG count mismatch {ident}')
        else:
            with path.open('rb') as f:header=f.read(3000).decode('ascii',errors='ignore')
            match=re.search(r'element vertex (\d+)',header);check(bool(match) and int(match[1])==item['count'],f'PLY count mismatch {ident}')
        provenance=json.loads((ROOT/'splats'/ident/'provenance.json').read_text(encoding='utf-8'))
        check(provenance['assetSha256']==item['assetSha256'] and provenance['modelMatrix']==item['modelMatrix'],f'Stale provenance {ident}')
        for render in item['renders']:ref(viewer,render['url'])
    videos=json.loads((ROOT/'renders/renders.json').read_text(encoding='utf-8'))['renders']
    check(registry.get('renderCount')==len(videos),'Gallery render count is stale')
    urls=set()
    for video in videos:
        check(video['url'] not in urls,'Duplicate web render URL');urls.add(video['url'])
        ref(viewer,video['url']);artifact((viewer/video['url']).resolve(),video['bytes'],video['sha256'])
        check(video['durationSeconds']>0,'Empty render video')
        check(bool(video['sceneIds']) and set(video['sceneIds']).issubset(scene_ids),'Render scene association missing')
        for ident in video['sceneIds']:
            match=next(x for x in data['scenes'] if x['id']==ident)
            check(video['url'] in [v['url'] for v in match['renders']],f'Render not reachable from {ident}')
    for item in data['scenes']:
        for render in item['renders']:check(render['url'] in urls,f'Unregistered render in {item["id"]}')
# Ratings must cover the exact delivered models; all linked evidence is published.
ratings_path=ROOT/'ratings/ratings.json'
updates_path=ROOT/'ratings/native-updates.json'
updates=json.loads(updates_path.read_text(encoding='utf-8')) if updates_path.exists() else {'entries':[],'clips':[]}
native_ids={x['id'] for x in updates.get('entries',[])}
if ratings_path.exists():
    rating_data=json.loads(ratings_path.read_text(encoding='utf-8'))
    check(rating_data.get('schemaVersion')==2,'Unknown ratings schema')
    rubric=rating_data['rubric'];rows=rating_data['ratings']
    check(len(rubric)==10 and sum(x['weight'] for x in rubric)==100,'Ratings must have 10 categories totalling 100')
    check(len(rows)==len(scene_ids)+7 and {x['id'] for x in rows}==scene_ids|native_ids,'Ratings must cover 21 published splats and seven native-render previews')
    for row in rows:
        ident=row['id'];is_preview=row.get('publicationType')=='native-render-preview'
        scene=next((x for x in data['scenes'] if x['id']==ident),None)
        if is_preview:
            check(ident in native_ids,'Native preview rating missing from manifest '+ident)
            check(row['facts']['assetBytes'] is None,'Native preview must not invent a packaged model size '+ident)
            check(scene is None,'Native preview must not masquerade as an interactive scene '+ident)
            check(row.get('facts',{}).get('splats') is None or isinstance(row['facts']['splats'],int),'Invalid native splat count '+ident)
        else:
            check(scene is not None,'Interactive rating missing its published scene '+ident)
            if scene:check(row['facts']['assetBytes']==scene['assetBytes'],'Stale rated model size '+ident)
        check(len(row['scores'])==10 and {x['category'] for x in row['scores']}=={x['id'] for x in rubric},'Incomplete scores '+ident)
        if is_preview:check(sum(x['score'] is not None for x in row['scores'])==5,'Native preview must use the five visual scores only '+ident)
        check(all(x['score'] is None or (isinstance(x['score'],(int,float)) and math.isfinite(x['score']) and 0<=x['score']<=10) for x in row['scores']),'Invalid category score '+ident)
        check(not any(x['score'] is None for x in row['scores']) or row['total'] is None,'Incomplete rubric must not get a total '+ident)
        for link in row['evidence']:ref(ROOT,link['url'])
        proof=json.loads((ROOT/'ratings/records'/f'{ident}.json').read_text(encoding='utf-8'))
        if is_preview:
            check(proof.get('reviewBasis')=='native-renders','Native review basis missing '+ident)
            check(bool(re.fullmatch(r'[a-f0-9]{64}',proof.get('nativeModel',{}).get('sha256',''))),'Native model hash missing '+ident)
            check(bool(proof.get('nativeModel',{}).get('archivePath')),'Native model archive path missing '+ident)
            check(len(proof['reviewArtifacts'])>=3,'Native preview needs poster and two motion artifacts '+ident)
            entry=next((x for x in updates['entries'] if x['id']==ident),{})
            check(entry.get('ratingId')==ident and entry.get('status')=='Ranked native-render preview','Native manifest rating link/status mismatch '+ident)
        elif scene:
            check(proof['publishedModel']['sha256']==scene['assetSha256'],'Stale rating provenance '+ident)
        for item in proof['reviewArtifacts']:artifact((ROOT/item['url']).resolve(),item['bytes'],item['sha256'])
# Native manifest remains provenance for ranked render previews; score details live in ratings.json.
if updates_path.exists():
    updates=json.loads(updates_path.read_text(encoding='utf-8'))
    check(updates.get('schemaVersion')==1 and updates.get('qualityGoalAchieved') is False and updates.get('status')=='ranked-native-renders','Invalid native preview manifest status')
    entries=updates['entries'];clips=updates['clips'];entry_ids=[x['id'] for x in entries];clip_ids=[x['id'] for x in clips]
    check(len(entries)==7 and len(set(entry_ids))==7,'Expected seven distinct native-render previews')
    check(not set(entry_ids)&scene_ids,'Native preview duplicates a published interactive model')
    check(len(clip_ids)==len(set(clip_ids))==12,'Expected twelve unique supplemental videos')
    used=set()
    for entry in entries:
        check(entry.get('qualityGoalAchieved') is False and entry.get('status')=='Ranked native-render preview' and entry.get('ratingId')==entry['id'] and 'scores' not in entry and 'rank' not in entry,'Native manifest must link to a rating without duplicating scores '+entry['id'])
        ref(ROOT,entry['poster']['url']);artifact((ROOT/entry['poster']['url']).resolve(),entry['poster']['bytes'],entry['poster']['sha256'])
        check(len(entry['clipIds'])==2 and set(entry['clipIds']).issubset(clip_ids),'Missing route/lateral preview '+entry['id'])
        used.update(entry['clipIds'])
    check(used==set(clip_ids),'Unreachable supplemental render')
    for clip in clips:
        ref(ROOT,clip['url']);artifact((ROOT/clip['url']).resolve(),clip['bytes'],clip['sha256'])
        check(clip['frames']==clip['source']['frames'] and clip['fps']==clip['source']['fps'] and abs(clip['durationSeconds']-clip['source']['durationSeconds'])<.05,'Changed preview timing '+clip['id'])
        source=clip['source']['archivePath']
        check(source.startswith('Experiments/offpath-ten-tests-20261020-112451/') and '..' not in source,'Invalid archive provenance')
        check(bool(re.fullmatch(r'[a-f0-9]{64}',clip['source']['sha256'])),'Missing source hash')
    hybrid=[x for x in entries if x['id'].startswith('residential-perspective-hybrid')]
    check(len(hybrid)==2 and hybrid[0]['clipIds']==hybrid[1]['clipIds'],'Paired hybrid clips must share one published copy')
if errors:raise SystemExit('\n'.join(errors))
print(json.dumps({'valid':True,'tests':len(seen),'files':len(files),'siteBytes':size,'largestFileBytes':max(p.stat().st_size for p in files)}))
