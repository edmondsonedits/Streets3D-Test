# Residential preview retirement, 2026-10-22

This change removes 16 redundant standalone web videos, not Gaussian models or QA tests. All 21 interactive models, 28 quality ratings, thumbnails, compact review clips, model/source hashes, and the 12 newer native-only preview clips are unchanged. The nine near-tied residential arms score 47–48 in the existing visual-only review; those scores have not been revised.

## Why these files

The eight affected arms already appear in retained, labelled side-by-side native comparisons for both route and lateral motion. These comparisons are more useful for comparing the interventions directly. The residential GUT k0 standalone route and lateral videos are kept as higher-resolution failure controls. The best corner experiments, construction arms, rejected cleanup, half-block, house-pass experiment, and driving demos are untouched.

The removal list is exact and machine-readable in [the retirement manifest](media-retirement/2026-10-22-residential-previews.json). Each entry preserves the retired web video's bytes, SHA-256, source path/hash, conversion settings, and its retained comparison/panel.

| Arm | Retired route + lateral bytes |
| --- | ---: |
| GUT self-calibration | 8,729,622 |
| GUT vehicle-shadow mask | 8,452,167 |
| FastGS effective-rank penalty | 8,988,992 |
| FastGS zero effective-rank penalty | 9,057,353 |
| Depth + normal priors | 8,771,986 |
| Depth prior | 8,994,942 |
| Normal prior | 8,950,377 |
| Priors OFF | 9,050,674 |
| Total media removed | 70,996,113 |

The site changes from 899,987,171 to 828,982,190 bytes: a net saving of 71,004,981 bytes and 71,017,810 bytes below the strict 900,000,000-byte limit. The main saved-render registry drops from 48 to 32 videos. Git repository history size is not reduced; this frees the deployed/current site payload, not old Git objects or original footage storage.

## Evidence and tradeoff

These are redundant viewpoints, not byte-identical files or lossless replacements. Standalone clips are 1152 × 648; retained 1600 × 450 comparisons provide two 800 × 450 panels. Fine-detail inspection is therefore less precise in each retained panel. No re-encoding was performed.

All retained pair labels were visually inspected at 12 seconds. Each removed video was compared against its designated panel at 48 evenly spaced timestamps across the full 24-second/720-frame motion. After both were scaled to 320 × 180 and their top text-label strip was excluded, mean pixel PSNR was 37–39 dB, with all sampled frame values above 32 dB. This supports matching camera motion, framing and scene content; it does not prove byte identity, identical source-render settings, lossless detail, or unseen frames. Both formats retain the same 24-second duration at 30 fps.

Source recordings and original-resolution experiment files were not accessed, overwritten or deleted. Their locations/hashes remain documented. The retired web copies also remain in Git at base commit `871fda3e6a1d6cb3c3da56f43aca49ba40e57924`.

## Validation and recovery

Run all existing checks, plus:

```sh
python scripts/test-media-retirement.py
```

This checks absence of the retired files and stale JSON URLs, registered retained comparisons, correct left/right model labels, mirrored model provenance, route/lateral coverage and the retained k0 control. The main validator still checks all active media hashes, local links, model counts, evidence and the site ceiling. No quality score or test assertion is weakened to pass cleanup.

For complete recovery, revert the cleanup commit in a review branch. This restores assets and their gallery/ranking references together. Re-run validation and obtain publication approval before merging or deploying. Do not force-push, purge history, or restore only links without their media.

For recovery of one web asset without publishing it, use the exact path from the manifest:

```sh
git restore --source=871fda3e6a1d6cb3c3da56f43aca49ba40e57924 -- site/renders/<retired-video>.mp4
```

This cleanup is prepared for review. Local verification is not approval to merge or publish and is not deployed-browser verification.
