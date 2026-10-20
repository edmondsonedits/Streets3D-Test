# Publishing future playable tests

This repository and its GitHub Pages site are the user's chosen shared destination. Add tests here rather than creating separate hosting projects or modifying production simulators.

## Folder and registry contract

Use an immutable major demo folder such as `site/demos/corner-splat-v1/`. A meaningful changed experiment gets a new version folder so comparisons remain playable; small fixes can update the same version with a Git commit. Shared large assets may be reused by relative URL where appropriate. Never duplicate large files just to version a setting.

Each `site/tests.json` record requires: unique `id`, `title`, `category`, ISO `date`, `version`, `status` (prototype, tested, or archived), relative `url`, relative `preview`, `description`, `controls`, and `limitation`. The URL must open a working test. Use query parameters when two modes share an implementation. Reports may supplement, but not replace, the playable result.

Use relative assets (no leading `/`, file URLs, localhost addresses or local drive paths in site files). Test under `/Streets3D-Test/`, not only a domain root. Keep media same-origin to avoid canvas/WebGL CORS failures. A new dependency must have an explicit version and applicable license notice.

## Source preservation and provenance

Keep original recordings, training caches, credentials and private notes out of the public site. For each test, record the camera, capture date, source time ranges, transformations, web-preview settings, input/output hashes where available, and known limits in a public-safe provenance file. A filename or content hash can identify a source without exposing a personal absolute path. Never replace the source recording when encoding a preview.

## Media budget

GitHub blocks individual Git files above 100 MiB. Pages sites have a 1 GB published-site limit and a soft 100 GB/month bandwidth limit (official references below, checked 2026-10-20). These are limits, not a target. Our validator uses a conservative 900,000,000-byte site ceiling and blocks individual files at 100 MiB. Keep normal previews below 50 MiB where feasible. Check repository history growth as well as current site size.

The first test uses same-origin H.264 MP4 at 3072 × 1536, 24 fps, capped at 5 Mbit/s with faststart and short GOPs. This is a web copy, not a full-quality reconstruction source. Preserve useful sharpness; inspect a browser render after transcoding. Video playback controls must not trigger video downloads on the gallery page.

If many tests approach the cap, keep their playable pages here and assess an asset-serving plan with verified range requests and WebGL CORS. Do not assume Git LFS or a GitHub release download behaves like a same-origin streaming asset. Do not silently introduce paid storage or retire tests without the user's direction.

## Verification and deployment

1. Validate JSON, local references, files, sizes and media hashes with `python scripts/validate_site.py`.
2. Run the preview server and check every affected mode: loading, playback, seek, speed, turnaround, keyboard/touch controls, return-to-gallery and a phone viewport.
3. Check console errors and missing network assets. State when phone testing is emulated, not physical.
4. Review `git diff --check` and stage only intended public files. Fetch before pushing to avoid overwriting concurrent work.
5. Push to main. The Pages workflow validates and publishes `site/`. A failed validation must block deployment.
6. Wait for the actual deployment to succeed, then verify HTTPS responses, video range requests and actual browser interactions at the deployed URL. Record the tested commit and limitations in the delivery message.

Rollback is a reviewed Git revert followed by a new successful Pages deployment. Do not force push or delete published history to roll back.

## Official hosting references

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
