# Hybrid Fire Drive v1

A playable street-driving foundation for combining stable map geometry and recorded Gaussian scenery. Open `index.html` through the site's HTTP server. Map mode starts safely paused; Drive starts the truck. The half-block Gaussian is optional and remains visibly marked **registration unverified**.

## Runtime layers

| Layer | Purpose | Authority |
|---|---|---|
| Terrain and road triangles | Continuous drivable surface on local relief | Terrain sampler uses the same triangle interpolation |
| Building footprint solids | Stable boundaries and camera obstruction | Truck oriented rectangle vs footprint, including holes |
| Pumper controller | Fixed 120 Hz motion, swept collision, brakes/reverse, road/soft ground speeds | Separate from rendering and Gaussian data |
| Vehicle render | Verified Map Game GLB, animated wheels and lights | Estimated 10.4 x 2.55 x 3.25 m envelope |
| Gaussian | Optional scenery in the same Three.js depth buffer | Appearance only; no collision or terrain fitting |
| Registration | One upright similarity, ground-control fit/checks, JSON and browser-local storage | Does not deform map or model; identity must be reviewed |

Desktop: W/S throttle/brake/reverse, A/D steering, Space handbrake, C chase/driver-eye camera, F free camera, V overview, R recover, P pause, L beacons. Drag to look; Q/E free-camera height. Touch steering/pedals and flight controls are provided at narrow/coarse-pointer layouts. Standard gamepad mapping is implemented but needs physical-device QA. Sound starts only after the user opts in.

Settings pause driving. Focus loss, hidden tabs and graphics-context loss pause safely. Recover uses a road start with full vehicle-footprint clearance. Low/medium/high quality adjusts pixel ratio, shadows and Gaussian spherical harmonics. Heavy building triangles are not scanned for chase-camera collision: precomputed conservative building boxes are used.

## Model loading and failure behaviour

Large Gaussian files and Three/Spark code are reused from existing same-origin site assets. The detailed pumper is fetched from an immutable source commit, CORS checked, and SHA-256 verified before parsing. A failed or timed-out fetch selects a labelled procedural pumper; it does not stop driving. `?vehicle=fallback` tests that path. The fallback is a visual proxy, not the original detailed asset. Gaussian failure returns to Map mode. Fatal map/WebGL startup failures show an explicit reload control.

## Registration workflow

Load Hybrid, inspect the stored capture viewpoint, then use identifiable ground features (road/ground corners). Never pair a facade/roof point with terrain. Add at least three spread fit controls and two independent checks, with labels. One uniform scale, yaw and translation are fitted. Check residuals and inspect several camera viewpoints. Import/export binds controls to the exact model hash. A passing numerical gate still requires independent landmark-identity review. Building heights are estimated and unsuitable for vertical controls.

The supplied route-only suggestion has 7.45 m RMS nearest-road residual and **zero** independent landmark ties. Several grid streets can fit similar shapes. Its vertical offset assumes a 2.3 m camera height along map terrain. Neither that fit nor the screenshot establishes geographic alignment. The model's doubled/streaked surfaces persist. Keep Map as the normal driving view until proper ties and capture geometry pass review.

## Release gates beyond this foundation

1. Identify unambiguous source/map ground controls across both passes; reject the current suggestion if checks fail. Never stretch buildings to fit.
2. Validate capture calibration and cross-pass camera geometry for the chosen house; reconstruct/review a small clean region before expanding. Runtime meshes cannot recover unseen facade detail.
3. Once aligned, author a reviewed scenery/road clearance mask and collision proxies. Test truck occlusion and road seams through every intersection; retain an unedited model for comparison.
4. Replace estimated facades/roofs/curbs/sidewalks with licensed reference-backed meshes and materials. Add vegetation, LODs and street furniture with provenance.
5. Only then expand suspension/tire physics, steering-wheel support, traffic/pedestrians, tasks, damage, weather, streamed sectors and audio. Each needs performance/accessibility and regression gates.

No AAA-fidelity, 80/100 reconstruction, surveyed accuracy, full photographic block, or professional training certification is claimed. See `provenance.json` for sources, exact model references and limitations.
