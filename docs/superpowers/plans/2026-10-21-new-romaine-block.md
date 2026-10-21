# New Romaine block test simulation

Goal: publish a separate explorable geographic block on Streets3D-Test using the current Map Game geographic assets. Production files remain untouched.

Scope: Ford / Brown / High / St. Mary's perimeter, including New Romaine, Duffus and Grady, plus a 45 m context buffer. The optional user scope question remains adjustable. Preserve the true non-square perimeter.

Architecture: deterministic Python clip from a verified Git commit; compact local east/south/up geometry and Ontario terrain; existing pinned Three.js browser renderer. Buildings keep complete footprints, explicit height provenance, and footprint-clipped approximate roofs. No source footage, Google imagery, photogrammetry alignment or inferred real facade details.

Data: OSM licensed extract and Ontario DTM only in the published demo. Municipal layers are not redistributed. The road polygons are estimated-width buffers of source centerlines, not municipal surveyed pavement.

Plan:
- [x] Test block topology, source IDs, projection, footprint preservation, road/terrain alignment and deterministic extraction.
- [x] Extract bounded data; retain hashes, original geographic footprint coordinates and a machine-readable export for future tests.
- [x] Implement compact viewer: walk, free flight, perimeter tour, overview, route/street labels and touch inputs. Reuse pinned Three.js.
- [x] Check data, site validator, browser movement/look/tour/reset and responsive layout; save genuine preview.
- [ ] Publish isolated changes, verify Pages and the actual live demo; state estimated geometry limits.

Review: no arbitrary square; no cut-off houses; no remote city-wide payload at runtime; camera remains above terrain in walk mode; moving away from the original footage path is simulated geometry, with no claim of photorealistic facade recovery.

Local QA: source footprints and source projection preserved within coordinate rounding; 0 roof vertices outside footprints; road surfaces remain 6 cm above matching terrain triangles. Desktop and 390×844 emulation inspected. Actual tour, drag look, touch translation, free-flight height, reset, street jump and responsive overview passed. Browser console had no errors. Deployment/live verification remains the final gate.
