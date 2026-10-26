---
"@trioforge/spline": minor
---

Add `prepare()` to build a curve's lookup tables ahead of its first query. Distance, frame, and closest-point queries run faster: arc length integrates a per-span speed polynomial, distance inversion starts from a Hermite guess, closed frames no longer measure the curve, and `closest` searches a box tree with a tighter bound and polishes across span joints.
