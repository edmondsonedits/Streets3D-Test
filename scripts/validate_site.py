"""Dependency-free checks for the exact static artifact deployed by Pages."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from html.parser import HTMLParser
import hashlib, json, re
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
    if p.suffix in ('.json','.html','.css','.js','.txt'):
        text=p.read_text(encoding='utf-8-sig')
        check('H:\\' not in text and 'H:/' not in text and 'file:///' not in text,f'Local path in public file: {p.relative_to(ROOT)}')
        if p.suffix=='.json':json.loads(text)
        if p.suffix=='.html':Links(p.parent).feed(text)
        if p.suffix=='.css':
            for url in re.findall(r'url\([\s\"\x27]*([^\)\"\x27]+)',text):ref(p.parent,url.strip())
        if p.suffix=='.js':
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
if errors:raise SystemExit('\n'.join(errors))
print(json.dumps({'valid':True,'tests':len(seen),'files':len(files),'siteBytes':size,'largestFileBytes':max(p.stat().st_size for p in files)}))
