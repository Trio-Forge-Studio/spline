# @trioforge/spline

Catmull-Rom, cubic Bezier, and uniform B-spline curves for roblox-ts. Use `Vector2` or `Vector3` points to sample positions, travel by distance, orient objects, and find the closest point on a path.

Read the documentation at <https://website.trio-forge.workers.dev/spline/>.

## Install

```sh
pnpm add @trioforge/spline
```

roblox-ts looks for packages in the scopes your project lists. Add `@trioforge` in two places.

1. In `tsconfig.json`, add it to `typeRoots`.

	```json
	"typeRoots": ["node_modules/@rbxts", "node_modules/@trioforge"]
	```

2. In your Rojo project, map it beside `@rbxts` under `rbxts_include/node_modules`.

	```json
	"node_modules": {
		"$className": "Folder",
		"@rbxts": { "$path": "node_modules/@rbxts" },
		"@trioforge": { "$path": "node_modules/@trioforge" }
	}
	```

## Quickstart

Create a path through three points and sample its middle joint.

```ts
import { catmullRom } from "@trioforge/spline";

const path = catmullRom([new Vector3(0, 0, 0), new Vector3(10, 5, 0), new Vector3(20, 0, 0)]);
print(path.pointAt(0.5).Y);
// → 5
```

Parameters run from 0 to 1. Each span gets an equal share of that range. Equal parameter steps need not cover equal distances. Open curves clamp parameters and distances at their ends.

All curve functions are arrow properties. Luau callers use `.`, such as `path.pointAt(0.5)` and `path.length()`. You can detach these functions without binding a receiver.

## Choose a curve

### Catmull-Rom

`catmullRom` passes through its points. `alpha` controls the knot spacing. The default is centripetal, `0.5`. Use `0` for uniform spacing or `1` for chordal spacing.

```ts
import { catmullRom } from "@trioforge/spline";

const path = catmullRom([new Vector2(0, 0), new Vector2(4, 8), new Vector2(12, 0)], { alpha: 0.5 });
print(path.pointAt(0.5).Y);
// → 8
```

Adjacent duplicate points coalesce. A single point makes a constant curve with zero length.

### Cubic Bezier

`cubicBezier` uses an anchor, two handles, and an anchor for each span. Open curves need `3n + 1` controls. Adjacent spans share their anchor.

```ts
import { cubicBezier } from "@trioforge/spline";

const path = cubicBezier([new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(6, 4, 0), new Vector3(6, 0, 0)]);
print(path.pointAt(0.5).Y);
// → 3
```

### Uniform B-spline

`uniformBSpline` approximates its controls. An open curve needs at least four controls and usually does not pass through its endpoints.

```ts
import { uniformBSpline } from "@trioforge/spline";

const path = uniformBSpline([new Vector3(0, 0, 0), new Vector3(3, 0, 0), new Vector3(6, 0, 0), new Vector3(9, 0, 0)]);
print(path.pointAt(0).X);
// → 3
print(path.pointAt(1).X);
// → 6
```

## Move at an even speed

Convert elapsed time to a distance in studs. Pass that distance to `parameterAtDistance` before sampling. The distance table builds on its first use and stays cached.

```ts
import { cubicBezier } from "@trioforge/spline";

const path = cubicBezier([new Vector3(0, 0, 0), new Vector3(0.5, 0, 0), new Vector3(1, 0, 0), new Vector3(10, 0, 0)]);
const speed = 5;
const elapsed = 1;
const parameter = path.parameterAtDistance(speed * elapsed);
const position = path.pointAt(parameter);
print(math.abs(position.X - 5) < 0.001);
// → true
print(math.abs(path.distanceAtParameter(parameter) - 5) < 0.001);
// → true
```

Call this conversion with the current elapsed time on each update. `length()` returns the total distance along the curve.

## Orient along a path

`frameAt` returns a point, a unit tangent, and a unit normal. Spatial frames minimize rotation along the path. Set `initialNormal` to choose the starting roll. The default prefers world up.

This matrix points the object's local negative Z axis along the tangent. Its local Y axis follows the normal.

```ts
import { catmullRom } from "@trioforge/spline";

const path = catmullRom([new Vector3(0, 0, 0), new Vector3(10, 0, 0)], { initialNormal: new Vector3(0, 1, 0) });
const frame = path.frameAt(0.5);
if (frame !== undefined) {
	const right = frame.tangent.Cross(frame.normal);
	const pose = CFrame.fromMatrix(frame.point, right, frame.normal, frame.tangent.mul(-1));
	print(pose.LookVector.Dot(frame.tangent) > 0.999);
	// → true
}
```

`tangentAt` and `frameAt` return `undefined` at stationary points. For `Vector2` curves, the normal is the tangent's left perpendicular. Frames build their spatial lookup table on first use.

## Snap to a path

`closest` searches the whole curve. Its `distance` is the distance along the curve. Its `separation` is the straight-line gap to your query.

```ts
import { catmullRom } from "@trioforge/spline";

const path = catmullRom([new Vector3(0, 0, 0), new Vector3(10, 0, 0)]);
const found = path.closest(new Vector3(4, 3, 0));
print(math.abs(found.point.X - 4) < 0.001);
// → true
print(math.abs(found.separation - 3) < 0.001);
// → true
const ahead = path.pointAt(path.parameterAtDistance(found.distance + 2));
print(math.abs(ahead.X - 6) < 0.001);
// → true
```

`CurveProjection` also returns the `parameter` at the closest point.

## Close a loop

Set `closed` to wrap parameters and distances. Do not repeat the first point at the end. Catmull-Rom needs at least three points after adjacent duplicates coalesce, unless the loop is constant. Closed B-splines need at least three controls. Closed Beziers need `3n` controls, with the last two handles leading back to the first anchor.

```ts
import { catmullRom } from "@trioforge/spline";

const loop = catmullRom(
	[new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(10, 10, 0), new Vector3(0, 10, 0)],
	{ closed: true },
);
print(loop.pointAt(1) === loop.pointAt(0));
// → true
print(loop.pointAt(-0.25) === loop.pointAt(0.75));
// → true
print(loop.parameterAtDistance(loop.length()));
// → 0
```

Closed spatial frames distribute their roll correction along the loop to meet at the seam. Bezier handles determine whether a join's tangent is continuous.

## Types and validation

The package exports `Curve`, `CurveFrame`, `CurveProjection`, `CurveOptions`, `CatmullRomOptions`, and `CurveVector`. A curve preserves its input dimension. `initialNormal` applies only to `Vector3` curves.

Constructors reject empty inputs, mixed dimensions, non-finite points, invalid control counts, and `alpha` values outside 0 to 1. Queries reject non-finite parameters, distances, and points.

## Development

Install Node dependencies with `pnpm install`. Install Lune and StyLua with `rokit install`.

```sh
pnpm run check
pnpm run test
node scripts/check-snippets.mjs README.md
npm pack --dry-run
```

`check` runs oxfmt, rbxtsc, StyLua, the behavior tests, and every TypeScript example in this README. Tests load the compiled package in `out/` through roblox-ts's runtime. They compare behavior against dense sampling and hand-computed references. See [AGENTS.md](AGENTS.md) for contributor rules.

## License

MIT. See [LICENSE](LICENSE).
