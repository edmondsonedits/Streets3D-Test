"""Guard the reviewed, recoverable retirement of redundant standalone previews."""
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
read = lambda path: json.loads(path.read_text(encoding='utf-8'))
audit = read(ROOT / 'docs/media-retirement/2026-10-22-residential-previews.json')
removed = audit['removed']
assert len(removed) == audit['removedCount'] == 16
assert sum(item['render']['bytes'] for item in removed) == audit['removedMediaBytes'] == 70_996_113
renders = read(SITE / 'renders/renders.json')['renders']
by_id = {item['id']: item for item in renders}
scenes = read(SITE / 'splats/scenes.json')['scenes']
by_scene = {item['id']: item for item in scenes}
assert len(renders) == 32
assert read(SITE / 'tests.json')['renderCount'] == len(renders)
for item in removed:
    old, replacement = item['render'], item['replacement']
    assert not (ROOT / item['path']).exists(), item['path']
    kept = by_id[replacement['id']]
    assert kept['panels'][replacement['panel']] == old['sceneIds'][0]
    assert set(old['sceneIds']).issubset(kept['sceneIds'])
    assert kept['durationSeconds'] == old['durationSeconds'] == 24
    assert (old['width'], old['height']) == (1152, 648)
    assert (kept['width'] // 2, kept['height']) == (800, 450)
    assert replacement['samples'] == 48 and replacement['psnrDbMin'] > 30
    scene = by_scene[old['sceneIds'][0]]
    published = next(r for r in scene['renders'] if r['url'] == kept['url'])
    assert 'side-by-side' in published['title']
    assert f'this model: {replacement["panel"]}' in published['title']
    assert 'less fine detail' in published['note']
    proof = read(SITE / 'splats' / scene['id'] / 'provenance.json')
    assert proof['renders'] == scene['renders']
# Preserve native high-resolution control and both motion types for every affected model.
for suffix in ('route', 'lateral'):
    assert f'residential-gut-k0-{suffix}' in by_id
for ident in {item['render']['sceneIds'][0] for item in removed}:
    links = by_scene[ident]['renders']
    for suffix in ('route', 'lateral'):
        assert any(r['url'].endswith(f'-{suffix}.mp4') for r in links), (ident, suffix)
# Catch stale direct links in any site JSON, including dynamically loaded manifests.
retired_names = {Path(item['path']).name for item in removed}
def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value: yield from strings(item)
    elif isinstance(value, dict):
        for item in value.values(): yield from strings(item)
for path in SITE.rglob('*.json'):
    for value in strings(read(path)):
        assert Path(urlsplit(value).path).name not in retired_names, (path, value)
print(json.dumps({'passed': True, 'retiredVideos': len(removed), 'retainedVideos': len(renders),
                  'checks': 'retirement manifest, no stale JSON references, paired panels, retained route/lateral coverage, higher-resolution control, mirrored provenance'}))
