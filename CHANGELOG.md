# @trioforge/spline

## 0.2.0

### Minor Changes

- [#3](https://github.com/Trio-Forge-Studio/spline/pull/3) [`558b984`](https://github.com/Trio-Forge-Studio/spline/commit/558b984d72d4256b7de741ff09b8f20d68973388) Thanks [@Hezaerd](https://github.com/Hezaerd)! - Add `prepare()` to build a curve's lookup tables ahead of its first query. Distance, frame, and closest-point queries run faster: arc length integrates a per-span speed polynomial, distance inversion starts from a Hermite guess, closed frames no longer measure the curve, and `closest` searches a box tree with a tighter bound and polishes across span joints.

## 0.1.2

### Patch Changes

- [`c2023c6`](https://github.com/Trio-Forge-Studio/spline/commit/c2023c684ca9516301c1d0f8a4fcfbbdf7adfd54) Thanks [@Hezaerd](https://github.com/Hezaerd)! - The source moved to its own repository, [Trio-Forge-Studio/spline](https://github.com/Trio-Forge-Studio/spline), so the package's repository and issue links point there. Its homepage is now its docs page at <https://website.trio-forge.workers.dev/docs/spline/>. The code is the same as the previous version.

## 0.1.1

### Patch Changes

- [#6](https://github.com/Trio-Forge-Studio/packages/pull/6) [`dac820b`](https://github.com/Trio-Forge-Studio/packages/commit/dac820b44abb72c663f694c6125de44e1a1a8fcd) Thanks [@Hezaerd](https://github.com/Hezaerd)! - The source moved to [Trio-Forge-Studio/packages](https://github.com/Trio-Forge-Studio/packages), so the package's repository and issue links point there. The package now ships its `CHANGELOG.md`. The code is the same as the previous version.

## 0.1.0

### Minor Changes

- First release. `catmullRom`, `cubicBezier` and `uniformBSpline` build curves through `Vector2` or `Vector3` points. A curve gives its point, tangent and rotation-minimizing frame at a parameter, converts between parameter and distance along its length, and finds the closest point to a position. Curves can be open or closed. ([Trio-Forge-Studio/spline#2](https://github.com/Trio-Forge-Studio/spline/pull/2))
