# Streets3D-Test

**Play the tests: https://edmondsonedits.github.io/Streets3D-Test/**

The shared destination for Peterborough street experiments and future playable test results. This is separate from the production Fire/EMS simulators.

## Current tests

- [Photo-wall drive](https://edmondsonedits.github.io/Streets3D-Test/demos/street-alternatives-v1/?mode=road): real footage on flat facades, with lateral movement on an illustrative road.
- [360° video drive](https://edmondsonedits.github.io/Streets3D-Test/demos/street-alternatives-v1/?mode=video): adjustable speed, look-around, cab overlay and a separately recorded return journey.

Both use the same Insta360 X4 Air recording, captured October 19, 2026. The hosted videos are 3072 × 1536, 24 fps H.264 web previews. Original footage and higher-bitrate local previews are preserved outside this repository. These are visual experiments, not surveyed geometry or physically accurate driving simulations.

## Gaussian tests and saved renders

The gallery also contains **21 distinct Gaussian models** and **44 saved native render videos**. Each model opens in a shared 3D explorer with drag-to-look, WASD/arrow movement, touch controls, reset, saved capture views, and a capture-height toggle. Open **Recorded renders** inside a model to play its saved native motion comparisons.

The models include the baseline/improved/cleanup turn tests, the 20-second MRNF + GUT corner, the corner A/B comparison, the newer half-block, and 14 completed off-path diagnostic snapshots. The rejected cleanup and unfinished study quality remain clearly labelled. No Postshot model or completed 2DGS model was available. Duplicate coordinate exports are represented once.

Height lock preserves the selected source camera's level in the reconstruction coordinate system (or the documented mean capture level for the half-block). It is a fixed plane, not measured metres above the road or terrain following. The original reconstructions still have their existing blur and off-path artifacts.

See [splat delivery and provenance](docs/SPLAT-PUBLICATION.md).

## Ratings and evidence

[Compare all 21 splats](https://edmondsonedits.github.io/Streets3D-Test/rankings.html): a visual-only ranking with expandable examples and a ten-category quality/efficiency rubric. Storage and effort are intended to be measured per **100 unique usable street metres**, not by raw bytes or footage length. Metre-normalized efficiency, hands-on labor and controlled runtime/startup have not been established, so the full score remains unavailable. No neutral placeholders are awarded. Matched-capture cost facts remain available separately. See [the review protocol](docs/RATINGS.md).

## Adding future tests

1. Read [the publishing guide](docs/PUBLISHING.md).
2. Put a self-contained version in `site/demos/<name>-v<N>/`.
3. Add its metadata and relative playable URL to `site/tests.json`.
4. Add a preview image and public-safe provenance/limitations.
5. Run `python scripts/validate_site.py` and test in a browser.
6. Push to `main`. GitHub Actions validates and deploys only `site/` to GitHub Pages.
7. Verify the deployed version and controls on the live URL.

No paid service is configured. A successful upload is not evidence that a demo works; fresh deployed-browser verification is required.

## Local preview

Use an HTTP server; do not open the demo as a file URL. `python scripts/serve.py --port 8855` serves only `site/`, with video range requests. Then open http://127.0.0.1:8855/.

## Contents

- `site/tests.json`: gallery registry.
- `site/demos/`: versioned playable experiments and licensed vendor files.
- `scripts/validate_site.py`: registry, local links, asset size and media hash checks.
- `scripts/serve.py`: local range-capable preview server.
- `.github/workflows/pages.yml`: free public-repository Pages deployment.
- `docs/PUBLISHING.md`: future-demo contract and hosting limits.

## Rights

Third-party code retains its own license, including the bundled Three.js and Spark MIT notices. The recordings are supplied by the repository owner; publication does not imply an open license for reusing the footage. No blanket license is granted to the owner's media or project code by the vendor notice.
