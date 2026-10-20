# Streets3D playable test destination

The user designated https://github.com/edmondsonedits/Streets3D-Test as the home for all future playable street tests and demo results. Publish them at https://edmondsonedits.github.io/Streets3D-Test/.

- Keep production simulators separate. This repository is the experiment gallery and its playable assets.
- On H:, access only H:\ChatGPT and descendants. Store new local project files there.
- Read README.md and docs/PUBLISHING.md before adding a test.
- Add a versioned folder under site/demos and a record in site/tests.json. Preserve existing working versions and links. Each record must open a playable demo, not just a screenshot or report.
- Publish only browser-ready copies. Preserve source recordings locally. Do not commit raw INSV/LRV, secrets, local absolute paths, temporary QA files, or node_modules.
- Include known limitations and distinguish actual recorded movement from simulated movement. Never claim geographic accuracy or physical-phone performance without evidence.
- Keep assets relative to their demo directory, use pinned dependencies with notices, and keep WebGL media same-origin unless CORS is explicitly verified.
- Run python scripts/validate_site.py, relevant browser controls and responsive checks before pushing. After deployment, test the actual live URL and record the result accurately.
- Publication is part of a requested demo delivery unless the user explicitly requests local-only work. Preserve visibility and never silently use a different site.
- Prefer small web previews. No file may reach 100 MiB; total site must stay below GitHub Pages limits. Do not silently accumulate large media or use paid hosting. Escalate storage design only when actual usage requires it.

- Gaussian publications must include the actual 3D model, saved native render videos when available, and the shared capture-height/free-flight controls. Read docs/SPLAT-PUBLICATION.md. Keep failed experiments labelled and deduplicate coordinate-only exports. Verify a visible scene, not just a successful asset download.
