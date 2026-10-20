# Gaussian ratings and review protocol

[Open the rankings](https://edmondsonedits.github.io/Streets3D-Test/rankings.html).

Reviewed October 20, 2026 against the 21 published model hashes at snapshot `726cb5103b566d91228bad9ab50750f81931f03d`. No training was rerun. No source models were modified.

## What the score means

This is a provisional assessment of the delivered assets for this project's needs, not an algorithm leaderboard. Ten categories sum to 100:

| Category | Weight | Evidence |
|---|---:|---|
| Along-road clarity | 20 | Sampled browser route views |
| Side-to-side stability | 20 | Sampled lateral views |
| Detail sharpness | 10 | Unenhanced detail crops |
| Freedom from artifacts | 10 | Ghosts, streaks, smears and holes |
| Coverage and continuity | 5 | Continuity in reviewed views |
| Training speed | 10 | Recorded training-stage time, not full pipeline |
| Effort to repeat | 10 | Unknown; neutral 5/10 for every model |
| Small download | 10 | Exact published model bytes |
| Browser cost proxy | 3 | Published splat count; not measured FPS |
| Evidence and repeatability | 2 | Provenance, settings, timing and review records |

Category scores are 0–10. Total is `round(sum(score / 10 * weight))`; equal totals share a rank. Project-specific anchors and each reason are in `site/ratings/ratings.json`. Source metrics are retained as context, not blindly normalized across unrelated datasets.

Unmeasured effort alone permits a ±5-point change. Missing complete timing adds another ±5. These ranges are **sensitivity to unknown categories**, not statistical confidence intervals. Visual judgments have further uncertainty. No physical-phone speed/thermal result or independent off-path ground truth is claimed.

The three construction variants tie at 62/100 on combined utility. The MRNF corner has the highest visual subtotal (41/65) but scores 60/100 overall due to its longer recorded training. Different captures and lateral paths prevent a controlled method conclusion between those groups. A/B are visually tied. The 2K common-center experiment retains lateral defects despite more training time. The half-block has wider coverage but severe visible distortion.

## Public evidence

- `site/ratings/ratings.json`: all scores, anchors, limitations, reasons and evidence links.
- `site/ratings/records/<scene>.json`: model identity, source facts, source-file hashes, observations and review-artifact hashes. Original source archive paths are relative; original source files are not uploaded.
- `site/ratings/camera-plans.json`: exact world-space poses, FOV and residuals used for the browser reviews.
- `site/ratings/evidence/<scene>.mp4`: an 80-sample, 10-second browser review; 0–6 seconds route, 6–10 seconds lateral.
- `site/ratings/evidence/<scene>.jpg`: eight labelled samples, each with a full-frame thumbnail and unscaled center crop.
- Existing model provenance and 44 native render videos remain available separately.

Each browser review is 960×540, 75° FOV, sampled at 8 fps, H.264 CRF25 with a 1.1 Mbps maximum target. Capture screenshots are JPEG quality90; contact sheets quality83. These are small web evidence copies. They are not a live performance benchmark, a full-resolution comparison, or a measurement of high-frequency flicker. The reviewer inspected eight samples per model and consulted existing native reviews/metrics. Ratings are AI-assisted editorial judgments, not an independent human panel. Open a 3D model or its native render evidence for further inspection.

Camera paths match within the original-turn, A/B, construction and residential groups. The MRNF corner and half-block are separate experiments. Regional poses are mapped through saved similarities and model transforms; residuals are recorded. Original-turn/MRNF lateral distances are fractions of reconstruction baseline, not measured lane widths. None of these transforms establishes surveyed scale.

## Reproducing the browser evidence

Optional tooling needs Python/Pillow, Node/Playwright, Chromium or Edge, and FFmpeg. It does not retrain models.

1. Run `python scripts/serve.py --port 8855`.
2. Set `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, and `FFMPEG` if they are not on their usual paths. `REVIEW_BASE_URL` defaults to the local server.
3. Run `node scripts/capture-rating-motion.cjs` to capture the saved plans. It skips existing review MP4s, stores intermediate images under ignored `work/rating-frames`, and checks the viewer replay hook.
4. Run `python scripts/make-rating-sheets.py` to make missing contact sheets.
5. Any regenerated assets require deliberate observation review and updated hashes in the corresponding record. Pixel-identical output across GPUs/browser versions is not guaranteed.

Do not overwrite published evidence merely to regenerate it. Copy a version to a separate review workspace first. Changes to scores or model hashes require a new reviewed snapshot; historical values remain in Git.

## Future ratings

Add a scene record and all ten justified scores when publishing a new splat. Mark missing facts unknown, retain comparable camera paths, and preserve evidence. Do not auto-award quality from PSNR, resolution, file size or trainer name. Do not infer human effort from GPU runtime. Packing changes may alter download score without altering the trained reconstruction.

Run:

```
python scripts/validate_site.py
node scripts/test-ratings.mjs
node scripts/test-splat-navigation.mjs
```

Browser checks must cover initial collapsed rows, all model explanations, matched-group filters, gallery deep links, evidence playback, keyboard access and phone-width layout. After Pages deployment, repeat the live checks and compare the rating/evidence hashes.
