# Hybrid fire-apparatus driving sandbox

User intent: drive a fire truck through the recorded New Romaine neighborhood, with geographic mesh roads providing the physical surface and a Gaussian providing photographic scenery. Aim for a polished, testable vertical slice; source quality limits remain visible. No claim of a complete AAA title or surveyed streets.

Architecture: keep map metres (east X, south Z, up Y) as simulation authority. Shared immutable block data and existing pinned Three r180 / Spark 2.3.1. Reuse the Map Game's apparatus tuning, four wheel contacts and detailed pumper. New demo/version preserves previous tests. Production remains read-only.

Simulation: fixed substeps; analog steering, throttle/brake/reverse/handbrake, road/off-road response, oriented truck-body versus complete footprints, swept movement, four-wheel terrain pitch/roll, bounds and recovery. No splat-derived collision.

Presentation: chase/cab/free/overview cameras with terrain/building avoidance, compact speed/gear/street/status HUD, pointer look, mobile controls, gamepad, pause/focus safety, reset/road starts, emergency lights, explicit optional synthesized vehicle audio. Graphics scale/quality controls; correct depth and shadow handling.

Gaussian layer: lazy load one existing saved model at a time; retain exact native/browser basis, model hash and known defects. One extra uniform-scale/yaw/translation transform for map placement. Map/building/road visibility controls. Separate splat visual geometry from vehicle authority. Preview must be visibly labelled until independently checked.

Registration: attempt route-shape matching using saved half-block cameras, preserve assumptions and residuals, and verify source landmarks if evidence permits. Supply source/map landmark picking, deterministic similarity fit, independent check points, bounded JSON import/export and hash-bound local persistence. Never deform buildings or quietly call a visual guess verified.

Acceptance: pure tests for deterministic vehicle motion, brakes/reverse, left/right, dt caps, wheel contacts, building/bounds collisions and camera safety; registration math and invalid transforms. Browser verify actual pumper, translation/turn/brake, all cameras, source/map/hybrid views, splat load/dispose, pause/recovery, controls and 390px layout. Genuine screenshots and actual deployment/hash checks. If georeferencing or source quality fails, deliver working driving/registration tools with exact remaining defect, not a fabricated finished reconstruction.

Assets: source pumper is pinned by immutable upstream commit and SHA256; CORS verified. Existing test assets are reused, never duplicated. Stay below the current free-site limit. No purchases, cloud, footage uploads, new reconstruction or production modifications.
