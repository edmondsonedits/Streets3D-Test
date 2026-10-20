# Sherbrooke reference-built block v1

Playable destination: `site/demos/sherbrooke-reference-v1/`.

## What this experiment tests

Can ordinary 3D buildings, shaped and coloured from the owner's 360 footage, stay recognizable while moving laterally across the street? The selected block is Sherbrooke between Aylmer and George, including Station 1 at 210 Sherbrooke. It contains 19 map-derived building footprints on both sides, including rear structures with lower observation confidence. The roughly 264 m map centreline is not a claim of surveyed or accepted reconstructed coverage.

The prototype is an independent visual experiment. It does not change Peterborough-Map-Game, navigation, collision, dispatch, incidents or training data. The reusable data is keyed by existing OpenStreetMap source IDs, allowing a later reviewed integration without replacing those systems.

## Data and reproducibility

- `block.json`: original geographic polygons, source IDs, local polygons, origin and exact projection constants; selected existing station survey details and municipal curb references.
- `buildings.json`: editable observations and explicit estimated dimensions, materials, roof types, openings, reference images, confidence and limitations.
- `references/`: selected unmodified perspective frames from the owner's footage. Image hashes and trimmed-export timestamps are retained.
- `provenance.json`: source rights, coordinate assumptions and limitations.
- `media-manifest.json`: exact public artifact hashes and sizes.
- `app.js` and `scene-geometry.mjs`: deterministic geometry construction and viewer controls.

There is no training job, paid API, generative texture fill, or hidden proprietary dependency. Existing pinned Three.js files and MIT notice are reused. Changing a roof, colour or facade record regenerates only browser geometry on reload.

The local coordinate calculation first converts longitude/latitude deltas at the documented midpoint latitude to east/north metres on a sphere with radius 6378137. The along-road unit vector rotates east/north to world X along Sherbrooke towards George and world Z to the south/right. World Y is up. Coordinates are relative to the Aylmer endpoint. This small-area map projection does not establish survey accuracy. Terrain is flattened and heights are observational estimates; no absolute vertical datum or checkpoint accuracy is claimed.

## Editing and next integration

Keep source footage unchanged. Copy this version folder for materially different experiments. Review a selected building alongside its reference, change only its appearance record, run the checks, inspect the result from both road sides, and record a Git revision. A source ID and geographic polygon remain the placement anchor. Keep uncertain rear geometry simple rather than inventing detailed photographic evidence.

A future production adapter should apply reviewed source-ID-keyed facade/roof overrides and suppress existing procedural panels only for those IDs. It must retain GIS footprints, road/collision geometry and routing. The current production editor does not provide arbitrary facade UV/material or roof editing, so this demo does not claim that importing the JSON into that editor already works.

## Review method

1. Use the same street positions and camera headings in baseline and enhanced views. Baseline means plain footprint massing in this viewer, not an exact copy of the production simulator.
2. Inspect Station 1's five bays, the separate glazed office, the opposite porch houses, LCBO and the George corner.
3. Move laterally and backwards. Surfaces should remain fixed; any UV stretching or occlusion mismatch is a defect to record.
4. Inspect original frames. Distinguish observed facade identity from inferred windows, height, roof depth, landscaping and hidden surfaces.
5. Measure startup, render timing, draw calls, triangles and downloadable bytes. Headless desktop and emulated phone layouts are not physical phone thermal or frame-rate certification.

## Verification

Run the existing site validator, `node scripts/test-reference-block.mjs`, and `python scripts/check-reference-data.py`. Browser checks must cover initial rendering, both ends and sides, baseline toggle, height lock, lateral movement, touch controls, source inspector and reset. Public releases require a successful Pages deployment and fresh live artifact/control checks.

## Rights

Building footprint data: © OpenStreetMap contributors, ODbL 1.0. The modified extract remains available in `block.json`. Municipal plan data retains the City of Peterborough Open Data Licence attribution recorded by the source project. The owner's photos are supplied for this experiment; no general licence for reusing them is granted. Three.js is MIT. See the public provenance file for source URLs.

## Source conflict resolved from footage

The legacy station survey annotation says four apparatus bays. Original perspective frame 0158 clearly shows five. The appearance record overrides the bay count to five while retaining the original map annotation and mapped facade line for audit. This is a concrete example of using the footage to improve the existing model.

## Limits

This is a recognizable geometric approximation, not a photorealistic reconstruction. It does not prove centimetre accuracy, complete unseen geometry, real vehicle physics, or city-scale/mobile performance. Selected source views include real capture lighting and occlusions. Coverage labels describe available observations, not a numeric quality rating. The 21 Gaussian results remain a separate comparison category.
