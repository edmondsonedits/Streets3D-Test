# Gaussian ratings and useful-coverage protocol

[Open the rankings](https://edmondsonedits.github.io/Streets3D-Test/rankings.html).

Rubric v2, October 20, 2026. The 21 delivered models and existing visual evidence are unchanged from the reviewed asset snapshot `726cb5103b566d91228bad9ab50750f81931f03d`. No training was rerun. V1's combined rankings (published in `cb56962`) are withdrawn: raw file size and training time rewarded small or incomplete captures without accounting for useful coverage, and unknown labor received placeholder points. History remains in Git.

## What the ranking means now

**Current scores are visual-only, out of 100. A complete quality-and-efficiency score is pending.** Five visual categories have evidence-backed reviewer judgments; the other five have no comparable measurements and remain null. They are neither zero nor neutral points. Equal rounded visual totals share a rank.

| Category | Intended overall weight | Useful measurement |
|---|---:|---|
| Along-road clarity | 20 | Can buildings, intersections and road edges be understood while advancing? |
| Side-to-side stability | 20 | Do surfaces remain coherent when leaving the capture path? |
| Detail sharpness | 10 | Readable signs, windows and roof/porch detail in matched views |
| Freedom from artifacts | 10 | Ghosting, streaks, duplicate objects, transparent smears and holes |
| Scene completeness | 5 | Connected road and both facade bands in the reviewed views |
| Storage per useful coverage | 10 | Delivered model MB per 100 unique accepted corridor metres |
| Processing per useful coverage | 10 | Full processing minutes per 100 accepted metres, with hardware and stage breakdown |
| Hands-on effort | 5 | Logged human minutes per 100 accepted metres, separating first setup from repeat work |
| Smooth movement | 5 | Live median/p95 frame time and stalls over the same visible area, device and route |
| Time until usable | 5 | Cold-load time until the same required street area is visible and interactive |

The five visual judgments earn at most 65 weighted points. Displayed visual score is `round(100 * visualPoints / 65)`. The eventual overall formula is `round(sum(categoryScore / 10 * weight))`, only when all ten categories have comparable evidence and declared score anchors. Confidence, record completeness and splat count remain facts, not extra quality points. The largest visual weights reflect this project's road and lateral-movement priorities; they are project preferences, not scientific constants.

Current visual leader: MRNF + GUT, 63/100 visual (41/65 visual points). This is an editorial review of these delivered scenes, not proof that its method beats every alternative: scene complexity and viewpoints differ across captures. Prefer matched tests for causal conclusions. The five unmeasured categories cannot decide an overall winner yet.

## Meaningful coverage, rather than just a small file

For the user's example, assume the same required quality:

- 1,000 accepted metres at 500 MB = **50 MB per 100 m**.
- 500 accepted metres at 200 MB = **40 MB per 100 m**.
- The second uses **20% fewer bytes per equal length**, equivalently 25% more length per MB.

Use decimal MB (1,000,000 bytes). Include the model and its required dependencies; list reusable viewer overhead separately. Current packages are self-contained model files. Count delivered bytes, not compressed training caches or optional proof videos.

Accepted corridor metres mean unique physical road intervals meeting the same predeclared view, detail and continuity requirements, including the required road and both facade bands. A street filmed twice still counts once. Four perspective images extracted at a position do not create four times the street. Source duration can include stops, varying speed, turns and repeat passes. Image count, seconds and arbitrary reconstruction coordinates are not substitutes for measured length.

Do not divide file size by a subjective quality score. Instead, assess whether an interval meets the common quality requirement, then divide cost by the accepted physical extent. Report the acceptance fraction and quality scores alongside the ratio. Zero accepted metres means no useful efficiency result, not an exceptionally small cost. When street widths, facade setbacks or scene complexity differ substantially, compare matched corridors first and disclose the difference; frontage area can supplement corridor length if measured reliably.

## What can be compared today

The expandable cost tables compare exact selected input extent. They do **not** establish equal successful coverage or a winner in cost per usable metre.

| Capture group | Shared source extent | Important limits |
|---|---|---|
| Original turn: 3 models | 102 timestamps, 204 lens images, about 50 seconds | Reused camera alignment; cleanup derivative; different delivery formats; incomplete baseline timing |
| 20-second corner: 3 models | 100 timestamps, 200 lens images, 180 train / 20 held out | A/B share poses; MRNF uses a different solve/review path; MRNF trainer time differs from A/B arm-wall timing |
| Construction: 3 models | 61 training moments, 244 images, two passes | Different exported camera geometry; training plus internal evaluation only |
| Residential: 11 models | 60 training moments, 240 images, two passes | Geometry and 1K/2K resolution vary; training plus internal evaluation only |
| Half-block: 1 model | 90 selected moments, 360 views, larger two-pass extent | No same-selection peer; no comparison ratio; loop closure and metric scale remain unvalidated |

Ratios use a named reference within each group. A missing reference duration or different timer scope produces “Not comparable.” Raw training minutes are still shown with their scope. The coverage audit includes manifest hashes and exact source time windows. It establishes no surveyed metres. Full pipeline timings and human activity logs were not captured consistently, so neither can be reconstructed by counting files or workflow stages.

## Acceptance and measurement protocol

1. Declare the comparison corridor, both facade bands, road area, target display resolution and supported viewpoints. Set review criteria before seeing which variant wins. Keep the same corridor and thresholds for an A/B test.
2. Establish a metric reference and uncertainty using measured controls or validated geospatial data. Preserve the scale transform. A plausible map overlay or low reprojection error alone is insufficient.
3. Review identical along-road and lateral checkpoints. Record each road/left/right interval as pass, fail or unreviewed for legibility, surface stability, gaps and ghosts. Save the reason and view evidence.
4. Take the union of accepted physical intervals; never add repeat passes. Unreviewed portions earn no accepted length. Report accepted metres, requested metres and acceptance fraction.
5. Record model bytes, complete stage times, hardware, GPU-hours, retries and cached versus cold runs. Log human setup/correction/review time separately. Report MB, pipeline minutes and human minutes per 100 accepted metres.
6. Benchmark cold startup and steady live traversal separately. Fix viewport, target quality, visible extent, device, network and cache condition. Report repeat counts, median and spread, p95 frame time and stalls. A prerecorded 8 fps clip or splat count cannot measure live performance. Name physical phones; desktop emulation is not phone hardware evidence.
7. Choose and publish project budgets and scoring anchors before assigning efficiency points. Until then show measured ratios and tradeoffs, not arbitrary precise scores. A model must preserve required coverage and detail to benefit from performance improvements.

## Evidence and limitations

- `site/ratings/ratings.json`: rubric, all observations, current visual scores, null efficiency fields and capture-matched cost tables.
- `site/ratings/coverage-audit.json`: source selection, timer scope, scale limits and hashes of locally inspected manifests. Relative paths identify the preserved archive; the raw sources are not public.
- `site/ratings/records/<scene>.json`: original model identity, source facts, hashes and review observations. These are preserved source records; current score semantics are in the v2 registry.
- `site/ratings/camera-plans.json`: exact review poses, FOV and alignment residuals.
- `site/ratings/evidence/<scene>.mp4` and `.jpg`: 10-second route/lateral review and eight labelled samples with detail crops.
- Existing provenance and 48 native render videos remain separately available.

Each browser review is 960×540, 75° FOV, 80 sampled frames at 8 fps: route 0–6 seconds and lateral 6–10 seconds. H.264 CRF25 targets at most 1.1 Mbps; screenshots use JPEG quality90 and contact sheets quality83. These are compressed evidence copies, not full-resolution judgments or high-frequency flicker/live-FPS measurements. The reviewer inspected eight samples per model and consulted native reviews/metrics. Ratings are AI-assisted editorial judgments, not a blinded human panel. No independent off-path ground truth is claimed.

Review paths are matched within original-turn, A/B, construction and residential review groups through saved transforms; residuals are recorded. MRNF and half-block have separate review paths. Some lateral offsets are fractions of reconstruction baselines, not measured lane widths. Shared input selection does not imply identical solved poses.

## Reproduction and future entries

Optional review tooling needs Python/Pillow, Node/Playwright, Chromium/Edge and FFmpeg. Run `python scripts/serve.py --port 8855`, then `node scripts/capture-rating-motion.cjs` and `python scripts/make-rating-sheets.py`. Set `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, `FFMPEG` and optionally `REVIEW_BASE_URL` for the local environment. Existing evidence is skipped; work files stay under ignored `work/`. Regeneration needs deliberate review and updated hashes; pixel-identical GPU output is not guaranteed. Preserve earlier evidence before regenerating.

Add each new model with all ten category records, using null for unsupported scores. Missing facts must not silently become zero, neutral scores or inferred metres. Retain exact asset hashes, source selection and comparable views. Do not award quality from PSNR, resolution, trainer name, file size or documentation quality alone. Any complete score needs the measured acceptance/cost protocol above. Store each measurement's method and version so future scores can be reproduced.

Run:

```
python scripts/validate_site.py
node scripts/test-ratings.mjs
node scripts/test-rating-efficiency.mjs
```

For changes to the shared 3D viewer, also run `node scripts/test-splat-navigation.mjs` and its navigation checks. Rating-page checks cover collapsed summaries, all ten category explanations, filters, links, cost-table arithmetic, evidence playback, keyboard access and phone-width overflow. After Pages deployment, repeat relevant live checks and compare changed data/script hashes.

## Seven later results ranked by native render evidence

The integrated ranking now contains **28 results: 21 interactive models and seven native-render previews**. The new results use the same five visual categories and weights; the original 21 category grades are preserved and ordinal ranks are recalculated. The five nonvisual categories remain null for all results. Render-only entries have no Explore link or invented model-download size. Their native PLY identity is hashed in each review record; the model itself is not newly published.

| Later result | Rank among 28 | Visual /100 | Along / lateral / detail / artifacts / completeness |
|---|---:|---:|---|
| One-side unrigged | =7 | 50 | 6 / 5 / 6 / 3 / 3 |
| One-side common centre | =7 | 50 | 6 / 5 / 6 / 3 / 3 |
| Perspective valid seeds 2K | =7 | 50 | 6 / 5 / 6 / 3 / 3 |
| Native fisheye valid seeds 2K | =7 | 50 | 6 / 5 / 6 / 3 / 3 |
| Shared lens calibration 2K | =13 | 48 | 6 / 4 / 6 / 3 / 5 |
| Hybrid 5K | =25 | 46 | 5 / 5 / 6 / 3 / 2 |
| Hybrid 12K | =25 | 46 | 5 / 5 / 6 / 3 / 2 |

The four one-side tests retain slightly more coherent observed facades than the earlier residential 47-48 group, but omit the opposite facade band and retain dark road holes, smeared shadows and translucent foliage. Differences inside each matched pair do not justify whole-point winners. Shared calibration remains tied with common-centre 2K. Hybrid 12K has some crisper textures than 5K, but no defensible category-level gain: both expose large unsupported black route regions and lack a complete corridor. Sharper selected-house views do not make them the best freely explorable street.

The corner MRNF result remains first at 63/100, A/B tie second at 60, and the construction group ties fourth at 57. Those are different captures and review paths: the ranking describes delivered visual results, not a controlled algorithm contest. A score is an editorial rubric value, not a percentage of geometric accuracy or a measured success probability.

Each new `ratings/records/<id>.json` contains five timestamped category observations, original native model/config/source hashes, and public artifact hashes. Seven added contact sheets show start/middle/end route and lateral frames from the original 1152x648 PNG sequences without sharpening. Existing 21 reviews use the preserved 960x540 browser review paths. New scores also consult original native motion excerpts and prior motion-review records; not every frame is individually scored. Native/browser rasterization, timing, field of view and capture extent may differ, so fine cross-group differences have limited confidence.

`ratings/native-updates.json` preserves the seven-source provenance and twelve unique compact motion files, linked to their actual rating IDs. The paired hybrid clips show left 5K / right 12K using the same numerical path/settings; the extended profile also changes learning-rate/refinement horizons. No off-path ground-truth PSNR, surveyed metres, full-block completion or quality-goal success is claimed. All original media remain unchanged.

## Compact ranking controls

Each result shows its overall visual score and all ten category values without opening the result. An em dash means unmeasured, not zero. Click a category score to expand only its weight, explanation and evidence links; keyboard Enter/Space also toggles it. A separate Renders & facts disclosure holds the recorded previews, comparisons and detailed facts.

For the 21 published interactive models, **Play live Gaussian free view** is directly below the version title and opens the existing explorer. The seven native-render-only results explicitly say their live free view is not published; their recorded renders remain available. No link substitutes a video for a live 3D model. This layout change does not alter any scores or model assets.
