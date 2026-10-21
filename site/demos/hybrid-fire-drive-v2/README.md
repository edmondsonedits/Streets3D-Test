# Ford/Duffus local alignment preview

This version replaces the ambiguous route-only placement with a **provisional local placement** derived from two identifiable building bases at Duffus Street/Ford Street. It starts the pumper on mapped Ford Street. Use Hybrid/Map/Splat and the building toggle to inspect overlap.

**The full captured block is not correctly aligned.** The current local placement misses the Ford/Brown turn by 26.5m and31.9m in the two passes; a separately rejected straight-road fit missed it by46–48m. Two local controls cannot establish independent accuracy; the three-fit/two-check registration gate stays failed. Existing Gaussian geometry and quality are unchanged. Do not treat the two-control zero horizontal fit residual as validation.

The original v1, recordings, native projects, source camera solve, map data and 1.5M-splat asset are preserved. This preview reuses v1 runtime and the same SOG hash; no additional large model is published. Only a uniform similarity is applied. Road physics and building collision remain map-based.

See [alignment-evidence.json](alignment-evidence.json) for observations, uncertainty and the rejected full-route test. See [runtime and controls](../hybrid-fire-drive-v1/README.md).

The next reconstruction must correct camera/scale drift using independently identified landmarks at both turns before training; shifting or deforming the map would conceal the mismatch. This release does not claim realistic final scenery, surveyed positions, or completed block reconstruction.

[Map/trajectory diagnostic](alignment-plan.png) shows the two camera paths under this local placement. Roads and footprints are unchanged. The wider turn discrepancy remains visible.

## Distributed-landmark reconstruction review

The new review identifies the numbered houses 771 Brown Street and 776 New Romaine Street. A capped pose-only diagnostic used both wall corners and the original 30,652 feature observations. It is **not an accepted reconstruction correction**: sparse geometry stayed fixed and there are no independent landmark checks. The uncertain 772 porch was excluded. See the `latestReconstructionAttempt` section of [the evidence record](alignment-evidence.json) for measured pixel residuals and limitations. No new scenery or Gaussian model was substituted, and the failed-alignment warning remains.
