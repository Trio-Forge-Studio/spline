# @trioforge/spline

## 0.1.1

### Patch Changes

- [#6](https://github.com/Trio-Forge-Studio/packages/pull/6) [`dac820b`](https://github.com/Trio-Forge-Studio/packages/commit/dac820b44abb72c663f694c6125de44e1a1a8fcd) Thanks [@Hezaerd](https://github.com/Hezaerd)! - The source moved to [Trio-Forge-Studio/packages](https://github.com/Trio-Forge-Studio/packages), so the package's repository and issue links point there. The package now ships its `CHANGELOG.md`. The code is the same as the previous version.

## 0.1.0

### Minor Changes

- First release. `catmullRom`, `cubicBezier` and `uniformBSpline` build curves through `Vector2` or `Vector3` points. A curve gives its point, tangent and rotation-minimizing frame at a parameter, converts between parameter and distance along its length, and finds the closest point to a position. Curves can be open or closed. ([Trio-Forge-Studio/spline#2](https://github.com/Trio-Forge-Studio/spline/pull/2))
