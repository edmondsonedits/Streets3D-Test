# New Romaine geographic block sandbox

[Play the block](https://edmondsonedits.github.io/Streets3D-Test/demos/new-romaine-block-v1/)

The user's map screenshot identifies the Ford / Brown / High / New Romaine neighborhood. This version includes down to St. Mary's Street, with a 45 m context band to retain houses on both sides. It follows the actual street geometry, including the High Street junction jogs; it is not forced into a square.

The extract contains **284 complete building footprints**, **17 road segments** and a **1,060.15 m centerline perimeter tour**. Footprints include garages and outbuildings, so this is not a count of 284 houses. Source: Peterborough-Map-Game commit `3754f99a0e59cd97b35d5e64ac31ac26c6bbbde8`, read without changing the production checkout.

## What it provides

- Walk-height exploration, drag-to-look, WASD/arrows and touch movement.
- Free flight with Q/E (or phone +/-) elevation, a reset pose and overhead overview.
- Street selection and a simulated perimeter tour; drag to look sideways while the tour moves.
- Source geographic footprints, a local terrain grid, a reusable numeric route and public-safe provenance.
- A downloadable `map-extract.geojson` for subsequent geography and alignment tests.

All 284 building heights are estimated in this extract: no height tags were available. Roof forms, door/window placement, facade materials and road widths are generic estimates. Source footprint geometry is retained. This is a stable conventional mesh scaffold, not a photogrammetric reconstruction, a quality Gaussian result, or a surveyed model. Terrain is the simulator's approximately 8.3 m Ontario DTM grid, not the native 0.5 m source product. A finer local sampling grid does not add terrain detail.

The map is not automatically aligned to camera poses or a Gaussian model. Future alignment must verify common landmarks and a single consistent coordinate transform; never deform buildings to fit a bad camera solve. No source footage or private absolute file paths are shipped.

## Rebuild

Dependencies: Python 3.12+, numpy, Pillow 12.0, Shapely 2.1.2. These are extraction tools only; the browser has no package installation requirement.

Prepare a clean `city-explorer` snapshot of the recorded source commit containing:

- `data/peterborough-osm.json`
- `data/osm-public-roads.geojson`
- `data/terrain/peterborough-dtm-2025.json`
- `data/terrain/peterborough-dtm-2025-terrarium.png`

Then run from this repository:

```text
python scripts/rebuild_new_romaine_block.py --source-dir <snapshot-city-explorer>
python scripts/test_new_romaine_block.py
node site/demos/new-romaine-block-v1/scripts/test-block-navigation.mjs
python scripts/validate_site.py
```

`block.json.gz` stores X east, Z south, Y up in local metres, with an explicit WGS84 origin, projection factors and CGVD2013 vertical origin. Road polygons are estimated-width OSM buffers; they are split against the terrain mesh triangles to avoid crossings. Browser overview uses a separate near plane to avoid depth-buffer flicker. Roof caps stay inside concave footprint boundaries and close at gable ends.

## Attribution and reuse

Map data © OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright. The adapted geographic database is available as `map-extract.geojson` and `block.json.gz` under ODbL; Ontario terrain is separately attributed in provenance.

Ontario Digital Terrain Model (Lidar-Derived), Ministry of Natural Resources / Geospatial Ontario: Open Government Licence – Ontario, https://www.ontario.ca/page/open-government-licence-ontario.

Three.js r180, MIT: existing `site/demos/street-alternatives-v1/vendor/THREE-LICENSE.txt`. The generic facade planner is copied from the recorded Map Game commit with the owner's authorization; it makes no surveyed facade claim. Google Maps was used only to identify the requested neighborhood. Google imagery, municipal data layers and raw source video are not redistributed here.

The browser decodes the lossless gzip map locally with DecompressionStream. A current compatible browser is required; no imagery or geometry is fetched from external map services.

The new viewer and adapted facade planner are supplied with their editable source under GPL v2, matching the Map Game source licence; see `site/demos/new-romaine-block-v1/LICENSE.txt`. This does not relicense unrelated existing demonstrations. Geographic data and MIT Three.js retain their separate licences.
