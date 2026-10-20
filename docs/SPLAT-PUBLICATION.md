# Gaussian test publication

This release adds 21 distinct models and 48 distinct saved render videos to the existing two driving demos. It is an inventory snapshot, not a claim that the ongoing off-path study has passed its quality targets. Originals were read, never overwritten or deleted. The production simulators are unchanged.

## What is included

| Group | Interactive models | Saved videos |
| --- | ---: | ---: |
| Original turn, improved, rejected cleanup | 3 | 0 |
| 20-second MRNF + GUT corner | 1 | 1 |
| Corner A/B | 2 | 9 (including paired comparisons) |
| New half-block | 1 | 2 |
| Completed off-path diagnostic arms | 14 | 36 |
| Total | 21 | 48 |

Videos shared by two model pages are stored once. Two duplicate video copies were excluded by SHA-256. Coordinate-only exports of the same Gaussian set are represented once. Source sparse point clouds, partial runtime probes, training caches, and screenshot-only galleries are not counted as Gaussian models. No completed Postshot or 2DGS model was available in the inspected test packages. Failed-quality and rejected-cleanup results remain playable and labelled.

## Browser assets

- Six original standalone exports supplied embedded SOG data; this data was extracted without recompression. Their original PlayCanvas loader's Rz(180 degrees) model convention is retained in the Spark scene.
- Fifteen native PLY exports were converted using `@playcanvas/splat-transform` **3.10.1**, build 4593166, to compressed PLY. All Gaussians and available SH3 channels were retained; attributes are quantized. The cleaned quality model uses the same export frame as the improved SOG. The 14 off-path models use each arm's recorded native model-world matrix.
- Reproduce a PLY conversion with the pinned package's CLI: `node node_modules/@playcanvas/splat-transform/bin/cli.mjs input.ply output.compressed.ply`. Work in an isolated tools directory. Compare hashes and inspect the result before replacing a published artifact.
- Shared renderer: [Spark 2.3.1](https://sparkjs.dev/releases/spark/2.3.1/spark.module.js), with [Three.js 0.180.0](https://github.com/mrdoob/three.js/tree/r180). Vendor license notices are retained. [SplatTransform](https://github.com/playcanvas/splat-transform) is a local packaging tool, not browser code.
- Recorded native videos use FFmpeg 9.0.2, H.264/libx264, `scale=w='min(1600,iw)':h=-2`, `-preset veryfast -crf 24 -maxrate 1600k -bufsize 3200k -pix_fmt yuv420p -threads 4 -an -movflags +faststart`. Durations are preserved. Web compression can soften fine detail; original videos remain local.
- The gallery loads only preview images. One model is fetched when its page opens; a video is fetched only when the render dialog opens. Switching tests navigates to a fresh page and disposes the previous model. Closing the video dialog stops playback and releases its source.

Spark's browser rasterization is not LichtFeld's native GUT renderer. Do not use browser screenshots alone to judge native-training improvements. The recorded native comparisons remain available for that distinction. There is no retraining or claimed improvement to reconstruction geometry in this release.

## Camera and height contract

`site/splats/scenes.json` is the shared registry. Each scene stores its model matrix, local up, initial position/target, saved positions, motion scale, asset hash/count, source hash, provenance, limitations, and associated recorded renders. The same record is saved beside each model as `provenance.json`.

1. A column-major `modelMatrix` maps the stored model into its export world frame.
2. Camera positions/targets in the registry are already in that world frame. Do not apply the model matrix to them again.
3. A quaternion rotates `scene.up` to browser +Y and is applied to both the model and camera positions/targets.
4. The chosen camera's resulting Y is the reference plane. With lock ON, translation is horizontal even when looking up/down; Q/E vertical movement is ignored. Re-enabling lock snaps back to this plane.
5. Selecting another capture position changes the reference plane. OFF permits free-flight movement, including Q/E or touch +/-.

The original turn and quality models use source camera `front/000051.jpg` with the recorded visual-upright and native-to-browser transforms. The corner MRNF model has its own transform. A/B use their saved matched route; the half-block uses its documented smoothed mean capture route. Off-path snapshots use recorded camera centers, the native model-world matrix, and median local pose-up. Exact source-record names and transform evidence are in each model's provenance.

This is a fixed capture-level plane in arbitrary reconstruction units, not a calibrated rig height in metres, a collision surface, or road-following elevation. Captured heights vary along these routes. Display orientation is kept upright for exploration; original sensor roll is not replayed. Geographic alignment is not established by these controls.

## Storage and future additions

The site is about 0.84 GB including both existing driving demos. Every individual artifact is below GitHub's 100 MiB file limit. The validator enforces a 900,000,000-byte site ceiling. Existing tests must not be silently removed to make space. Before adding many more models, assess a free asset-delivery plan with verified browser/range/CORS behavior; do not assume releases or Git LFS act as a streaming CDN, and do not enable paid hosting without authorization.

Give a materially different reconstruction a new scene ID/version. Never overwrite source files to produce an export. Preserve exact source/output hashes, software versions, camera transform history, experiment status, and prior public versions. Adding a screenshot or MP4 alone does not satisfy the interactive-model contract.

## Verification

- `python scripts/validate_site.py`: all gallery links, model counts, matrices/vectors, SHA-256 hashes, render associations, private-path exclusions and storage ceilings.
- `node scripts/test-splat-navigation.mjs`: steep-pitch movement, locked vertical input, free flight, diagonal normalization, and lock re-engagement.
- Browser: load and visually inspect every model, move forward and sideways, look around, unlock/change height/relock, select capture views and reset; inspect console/network failures.
- Browser video: play and seek every distinct saved clip; close the render dialog and verify source release.
- Desktop and emulated portrait/landscape phone layouts: gallery filters, touch navigation and dialogs. Emulation does not certify physical-phone GPU performance, thermals, or memory limits. Largest model: 1.5 million splats.
- Recheck the deployed GitHub Pages artifact after a successful workflow; a local pass or Git push is not deployment verification.

## Ranking render update

Four route/lateral videos for the common-centre 1K and 2K models bring the associated saved-render registry to 48. The rankings page supports on-demand playback of all linked native videos. A separate unranked evidence section adds seven later diagnostic results, seven JPEG stills and twelve distinct compact native-motion previews; the hybrid pair shares two paired clips. Those seven results do not add interactive 3D assets or alter the 21-model rating snapshot. All remain below the requested off-path quality target. `site/ratings/native-updates.json` records source hashes, web-copy hashes and timing. The existing 900 MB site limit remains enforced.
