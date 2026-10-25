export type CurveVector = Vector2 | Vector3;

export interface CurveFrame<V extends CurveVector> {
	readonly point: V;
	readonly tangent: V;
	readonly normal: V;
}

export interface CurveProjection<V extends CurveVector> {
	readonly parameter: number;
	readonly point: V;
	readonly distance: number;
	readonly separation: number;
}

export interface CurveOptions<V extends CurveVector> {
	readonly closed?: boolean;
	readonly initialNormal?: V extends Vector3 ? Vector3 : never;
}

export interface CatmullRomOptions<V extends CurveVector> extends CurveOptions<V> {
	readonly alpha?: number;
}

// Arrow properties compile to dot calls, so Luau callers write curve.pointAt(t) and can detach them.
export interface Curve<V extends CurveVector> {
	readonly pointAt: (parameter: number) => V;
	readonly tangentAt: (parameter: number) => V | undefined;
	readonly frameAt: (parameter: number) => CurveFrame<V> | undefined;
	readonly length: () => number;
	readonly parameterAtDistance: (distance: number) => number;
	readonly distanceAtParameter: (parameter: number) => number;
	readonly closest: (query: V) => CurveProjection<V>;
}

export function catmullRom(points: readonly Vector2[], options?: CatmullRomOptions<Vector2>): Curve<Vector2>;
export function catmullRom(points: readonly Vector3[], options?: CatmullRomOptions<Vector3>): Curve<Vector3>;
export function catmullRom(points: readonly CurveVector[], options: CatmullRomOptions<CurveVector> = {}) {
	const alpha = options.alpha ?? 0.5;
	if (!(alpha >= 0 && alpha <= 1)) error(`a Catmull-Rom alpha must be from 0 to 1, got ${alpha}`);
	return build(points, options, (lifted, closed) => catmullRomSpans(lifted, closed, alpha));
}

export function cubicBezier(points: readonly Vector2[], options?: CurveOptions<Vector2>): Curve<Vector2>;
export function cubicBezier(points: readonly Vector3[], options?: CurveOptions<Vector3>): Curve<Vector3>;
export function cubicBezier(points: readonly CurveVector[], options: CurveOptions<CurveVector> = {}) {
	return build(points, options, bezierSpans);
}

export function uniformBSpline(points: readonly Vector2[], options?: CurveOptions<Vector2>): Curve<Vector2>;
export function uniformBSpline(points: readonly Vector3[], options?: CurveOptions<Vector3>): Curve<Vector3>;
export function uniformBSpline(points: readonly CurveVector[], options: CurveOptions<CurveVector> = {}) {
	return build(points, options, bSplineSpans);
}

type Span = readonly [Vector3, Vector3, Vector3, Vector3];
type Chain = readonly [Span, ...Span[]];

interface Geometry {
	readonly spans: Chain;
	readonly closed: boolean;
	readonly planar: boolean;
	readonly initialNormal?: Vector3;
	readonly tolerance: number;
}

interface Location {
	readonly index: number;
	readonly span: Span;
	readonly u: number;
}

interface ArcSpan {
	readonly stops: readonly number[];
	readonly distances: readonly number[];
}

interface ArcTable {
	readonly spans: readonly ArcSpan[];
	readonly ends: readonly number[];
	readonly length: number;
}

interface Station {
	readonly point: Vector3;
	readonly tangent: Vector3;
	readonly normal: Vector3;
}

interface FrameTable {
	readonly spanPositions: readonly number[];
	readonly stations: readonly Station[];
	readonly seamRoll: number;
}

interface Piece {
	readonly index: number;
	readonly controls: Span;
	readonly from: number;
	readonly to: number;
	readonly bound: number;
}

interface Candidate {
	readonly index: number;
	readonly u: number;
	readonly separation: number;
}

const UP = new Vector3(0, 1, 0);
const AXES = [new Vector3(1, 0, 0), UP, new Vector3(0, 0, 1)] as const;
const LENGTH_DEPTH = 40;
const FRAME_DEPTH = 10;
const FRAME_TURN = math.cos(math.rad(5));
const SEARCH_BUDGET = 20000;
const GAUSS_INNER = math.sqrt(5 - 2 * math.sqrt(10 / 7)) / 3;
const GAUSS_OUTER = math.sqrt(5 + 2 * math.sqrt(10 / 7)) / 3;
const GAUSS = [
	[0, 128 / 225],
	[GAUSS_INNER, (322 + 13 * math.sqrt(70)) / 900],
	[-GAUSS_INNER, (322 + 13 * math.sqrt(70)) / 900],
	[GAUSS_OUTER, (322 - 13 * math.sqrt(70)) / 900],
	[-GAUSS_OUTER, (322 - 13 * math.sqrt(70)) / 900],
] as const;

function finite(value: number) {
	return math.abs(value) < math.huge;
}

function liftPlanar(point: CurveVector): Vector3 {
	if (!typeIs(point, "Vector2")) error("a Vector2 curve takes only Vector2 points");
	if (!finite(point.X) || !finite(point.Y)) error("curve points must be finite");
	return new Vector3(point.X, point.Y, 0);
}

function lowerPlanar(point: Vector3): Vector2 {
	return new Vector2(point.X, point.Y);
}

function liftSpatial(point: CurveVector): Vector3 {
	if (!typeIs(point, "Vector3")) error("a Vector3 curve takes only Vector3 points");
	if (!finite(point.X) || !finite(point.Y) || !finite(point.Z)) error("curve points must be finite");
	return point;
}

function keepSpatial(point: Vector3): Vector3 {
	return point;
}

function build(
	points: readonly CurveVector[],
	options: CurveOptions<CurveVector>,
	toSpans: (points: readonly Vector3[], closed: boolean) => Chain,
): Curve<Vector2> | Curve<Vector3> {
	if (points.size() === 0) error("a curve needs at least one point");
	const closed = options.closed ?? false;
	const initialNormal = options.initialNormal;
	if (typeIs(points[0], "Vector2")) {
		if (initialNormal !== undefined) error("initialNormal applies only to Vector3 curves");
		return createCurve(shape(toSpans(points.map(liftPlanar), closed), closed, true), liftPlanar, lowerPlanar);
	}
	const seed = initialNormal === undefined ? undefined : liftSpatial(initialNormal);
	return createCurve(shape(toSpans(points.map(liftSpatial), closed), closed, false, seed), liftSpatial, keepSpatial);
}

function shape(spans: Chain, closed: boolean, planar: boolean, initialNormal?: Vector3): Geometry {
	let low = spans[0][0];
	let high = low;
	for (const span of spans) {
		for (const control of span) {
			if (!finite(control.X) || !finite(control.Y) || !finite(control.Z)) error("the curve's controls overflow");
			low = low.Min(control);
			high = high.Max(control);
		}
	}
	return { spans, closed, planar, initialNormal, tolerance: math.max(1e-4, 1e-5 * high.sub(low).Magnitude) };
}

function catmullRomSpans(input: readonly Vector3[], closed: boolean, alpha: number): Chain {
	const points = input.filter((point, index) => index === 0 || point !== input[index - 1]);
	if (closed && points.size() > 1 && points[points.size() - 1] === points[0]) points.pop();
	const count = points.size();
	if (count === 1) return [[points[0], points[0], points[0], points[0]]];
	if (closed && count < 3) error("a closed Catmull-Rom curve needs three distinct points");
	const at = (index: number) => {
		if (closed) return points[(index + count) % count];
		if (index < 0) return points[0].mul(2).sub(points[1]);
		if (index >= count) return points[count - 1].mul(2).sub(points[count - 2]);
		return points[index];
	};
	const span = (index: number): Span => {
		const [p0, p1, p2, p3] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
		const d01 = p1.sub(p0).Magnitude ** alpha;
		const d12 = p2.sub(p1).Magnitude ** alpha;
		const d23 = p3.sub(p2).Magnitude ** alpha;
		const m1 = p1
			.sub(p0)
			.div(d01)
			.sub(p2.sub(p0).div(d01 + d12))
			.add(p2.sub(p1).div(d12));
		const m2 = p2
			.sub(p1)
			.div(d12)
			.sub(p3.sub(p1).div(d12 + d23))
			.add(p3.sub(p2).div(d23));
		return [p1, p1.add(m1.mul(d12 / 3)), p2.sub(m2.mul(d12 / 3)), p2];
	};
	const spans: [Span, ...Span[]] = [span(0)];
	for (const index of $range(1, (closed ? count : count - 1) - 1)) spans.push(span(index));
	return spans;
}

function bezierSpans(points: readonly Vector3[], closed: boolean): Chain {
	const count = points.size();
	if (closed ? count % 3 !== 0 : count < 4 || count % 3 !== 1) {
		error(`a ${closed ? "closed cubic Bezier needs 3n" : "cubic Bezier needs 3n + 1"} points, got ${count}`);
	}
	const span = (start: number): Span => [
		points[start],
		points[start + 1],
		points[start + 2],
		points[(start + 3) % count],
	];
	const spans: [Span, ...Span[]] = [span(0)];
	for (const index of $range(1, math.floor(count / 3) - 1)) spans.push(span(index * 3));
	return spans;
}

function bSplineSpans(points: readonly Vector3[], closed: boolean): Chain {
	const count = points.size();
	const least = closed ? 3 : 4;
	if (count < least) error(`a ${closed ? "closed " : ""}uniform B-spline needs ${least} points, got ${count}`);
	const at = (index: number) => points[closed ? (index + count - 1) % count : index];
	const thirdOrSame = (near: Vector3, far: Vector3) => (near === far ? near : near.mul(2).add(far).div(3));
	const jointOrSame = (a: Vector3, b: Vector3, c: Vector3) =>
		a === b && b === c ? b : a.add(b.mul(4)).add(c).div(6);
	const span = (index: number): Span => {
		const [q0, q1, q2, q3] = [at(index), at(index + 1), at(index + 2), at(index + 3)];
		return [jointOrSame(q0, q1, q2), thirdOrSame(q1, q2), thirdOrSame(q2, q1), jointOrSame(q1, q2, q3)];
	};
	const spans: [Span, ...Span[]] = [span(0)];
	for (const index of $range(1, (closed ? count : count - 3) - 1)) spans.push(span(index));
	return spans;
}

function locate(geometry: Geometry, parameter: number): Location {
	const count = geometry.spans.size();
	const wrapped = geometry.closed ? parameter - math.floor(parameter) : math.clamp(parameter, 0, 1);
	const scaled = wrapped * count;
	const index = math.min(math.floor(scaled), count - 1);
	return { index, span: geometry.spans[index], u: scaled - index };
}

function bernstein([a, b, c, d]: Span, u: number): Vector3 {
	const v = 1 - u;
	return a
		.mul(v * v * v)
		.add(b.mul(3 * v * v * u))
		.add(c.mul(3 * v * u * u))
		.add(d.mul(u * u * u));
}

function velocity([a, b, c, d]: Span, u: number): Vector3 {
	const v = 1 - u;
	return b
		.sub(a)
		.mul(3 * v * v)
		.add(c.sub(b).mul(6 * v * u))
		.add(d.sub(c).mul(3 * u * u));
}

function acceleration([a, b, c, d]: Span, u: number): Vector3 {
	return c
		.sub(b.mul(2))
		.add(a)
		.mul(6 * (1 - u))
		.add(
			d
				.sub(c.mul(2))
				.add(b)
				.mul(6 * u),
		);
}

function direction(vector: Vector3): Vector3 | undefined {
	const size = vector.Magnitude;
	return size > 0 ? vector.div(size) : undefined;
}

function travel(span: Span, from: number, to: number): number {
	const half = (to - from) / 2;
	const middle = (from + to) / 2;
	let sum = 0;
	for (const [node, weight] of GAUSS) sum += weight * velocity(span, middle + half * node).Magnitude;
	return sum * half;
}

function measure(geometry: Geometry): ArcTable {
	const count = geometry.spans.size();
	let length = 0;
	const spans = geometry.spans.map((span): ArcSpan => {
		const stops = [0];
		const distances = [length];
		const visit = (from: number, to: number, whole: number, depth: number) => {
			const middle = (from + to) / 2;
			const left = travel(span, from, middle);
			const right = travel(span, middle, to);
			const allowed = math.max((geometry.tolerance * (to - from)) / count, 1e-6 * whole);
			if (depth >= 2 && math.abs(left + right - whole) <= allowed) {
				length += left + right;
				stops.push(to);
				distances.push(length);
				return;
			}
			if (depth >= LENGTH_DEPTH) error("a curve span is too irregular to measure");
			visit(from, middle, left, depth + 1);
			visit(middle, to, right, depth + 1);
		};
		visit(0, 1, travel(span, 0, 1), 0);
		return { stops, distances };
	});
	return { spans, ends: spans.map(({ distances }) => distances[distances.size() - 1]), length };
}

function lastAtMost(values: readonly number[], value: number): number {
	let low = 0;
	let high = values.size() - 1;
	while (low < high) {
		const middle = math.ceil((low + high) / 2);
		if (values[middle] <= value) low = middle;
		else high = middle - 1;
	}
	return low;
}

function firstAtLeast(values: readonly number[], value: number, from = 0): number {
	let low = from;
	let high = values.size() - 1;
	while (low < high) {
		const middle = math.floor((low + high) / 2);
		if (values[middle] >= value) high = middle;
		else low = middle + 1;
	}
	return low;
}

function distanceAt(arc: ArcTable, at: Location): number {
	const { stops, distances } = arc.spans[at.index];
	const station = lastAtMost(stops, at.u);
	if (stops[station] === at.u) return distances[station];
	return distances[station] + travel(at.span, stops[station], at.u);
}

function parameterAt(geometry: Geometry, arc: ArcTable, distance: number): number {
	const total = arc.length;
	if (geometry.closed) distance -= math.floor(distance / total) * total;
	if (!(distance > 0 && distance < total)) return geometry.closed || distance <= 0 ? 0 : 1;
	const count = geometry.spans.size();
	const index = firstAtLeast(arc.ends, distance);
	const span = geometry.spans[index];
	const { stops, distances } = arc.spans[index];
	const station = firstAtLeast(distances, distance, 1) - 1;
	const from = stops[station];
	const start = distances[station];
	const run = distances[station + 1] - start;
	let low = from;
	let high = stops[station + 1];
	let u = run > 0 ? low + ((high - low) * (distance - start)) / run : low;
	for (let step = 0; step < 40 && high - low > 1e-12; step++) {
		const miss = start + travel(span, from, u) - distance;
		if (math.abs(miss) <= geometry.tolerance * 1e-2) break;
		if (miss > 0) high = u;
		else low = u;
		const speed = velocity(span, u).Magnitude;
		const stepped = speed > 0 ? u - miss / speed : low;
		u = stepped > low && stepped < high ? stepped : (low + high) / 2;
	}
	return (index + u) / count;
}

function perpendicular(vector: Vector3, tangent: Vector3): Vector3 | undefined {
	const flat = vector.sub(tangent.mul(tangent.Dot(vector)));
	const size = flat.Magnitude;
	return size > 1e-4 * vector.Magnitude ? flat.div(size) : undefined;
}

function seed(tangent: Vector3, preferred = UP): Vector3 {
	const normal = perpendicular(preferred, tangent);
	if (normal !== undefined) return normal;
	let axis = AXES[0];
	for (const candidate of AXES) if (math.abs(candidate.Dot(tangent)) < math.abs(axis.Dot(tangent))) axis = candidate;
	return axis.sub(tangent.mul(tangent.Dot(axis))).Unit;
}

function minimalRotation(from: Vector3, to: Vector3, normal: Vector3): Vector3 {
	const sum = from.add(to);
	const size = sum.Dot(sum);
	if (size <= 1e-12) return normal;
	const flipped = normal.sub(from.mul(2 * from.Dot(normal)));
	return flipped.sub(sum.mul((2 * sum.Dot(flipped)) / size));
}

function transport(from: Station, point: Vector3, tangent: Vector3, tolerance: number): Vector3 {
	const chord = point.sub(from.point);
	const c1 = chord.Dot(chord);
	let normal: Vector3;
	if (c1 <= (tolerance * 1e-3) ** 2) {
		normal = minimalRotation(from.tangent, tangent, from.normal);
	} else {
		const reflectedNormal = from.normal.sub(chord.mul((2 * chord.Dot(from.normal)) / c1));
		const reflectedTangent = from.tangent.sub(chord.mul((2 * chord.Dot(from.tangent)) / c1));
		const second = tangent.sub(reflectedTangent);
		const c2 = second.Dot(second);
		normal = c2 > 0 ? reflectedNormal.sub(second.mul((2 * second.Dot(reflectedNormal)) / c2)) : reflectedNormal;
	}
	return perpendicular(normal, tangent) ?? seed(tangent, from.normal);
}

function frameStops(span: Span): number[] {
	const stops = [0];
	const turns = (a: Vector3 | undefined, b: Vector3 | undefined) =>
		a === undefined || b === undefined ? a !== b : a.Dot(b) < FRAME_TURN;
	const visit = (
		from: number,
		fromTangent: Vector3 | undefined,
		to: number,
		toTangent: Vector3 | undefined,
		depth: number,
	) => {
		const middle = (from + to) / 2;
		const middleTangent = direction(velocity(span, middle));
		if (
			depth < FRAME_DEPTH &&
			(depth < 2 || turns(fromTangent, middleTangent) || turns(middleTangent, toTangent))
		) {
			visit(from, fromTangent, middle, middleTangent, depth + 1);
			visit(middle, middleTangent, to, toTangent, depth + 1);
		} else {
			stops.push(to);
		}
	};
	visit(0, direction(velocity(span, 0)), 1, direction(velocity(span, 1)), 0);
	return stops;
}

function transportFrames(geometry: Geometry): FrameTable {
	const spanPositions: number[] = [];
	const stations: Station[] = [];
	geometry.spans.forEach((span, index) => {
		for (const u of frameStops(span)) {
			const tangent = direction(velocity(span, u));
			if (tangent === undefined) continue;
			const point = bernstein(span, u);
			const normal =
				stations.size() === 0
					? seed(tangent, geometry.initialNormal)
					: transport(stations[stations.size() - 1], point, tangent, geometry.tolerance);
			spanPositions.push(index + u);
			stations.push({ point, tangent, normal });
		}
	});
	const count = geometry.spans.size();
	const first = stations[0];
	const last = stations[stations.size() - 1];
	let seamRoll = 0;
	if (
		geometry.closed &&
		stations.size() > 0 &&
		spanPositions[0] === 0 &&
		spanPositions[spanPositions.size() - 1] === count
	) {
		const arrived = minimalRotation(last.tangent, first.tangent, last.normal);
		seamRoll = math.atan2(first.tangent.Dot(arrived.Cross(first.normal)), arrived.Dot(first.normal));
	}
	return { spanPositions, stations, seamRoll };
}

function spatialNormal(geometry: Geometry, frames: FrameTable, at: Location, point: Vector3, tangent: Vector3) {
	if (frames.stations.size() === 0) return seed(tangent, geometry.initialNormal);
	const station = frames.stations[lastAtMost(frames.spanPositions, at.index + at.u)];
	return transport(station, point, tangent, geometry.tolerance);
}

function roll(normal: Vector3, axis: Vector3, angle: number): Vector3 {
	return normal.mul(math.cos(angle)).add(axis.Cross(normal).mul(math.sin(angle)));
}

function halve([a, b, c, d]: Span): [Span, Span] {
	const ab = a.add(b).mul(0.5);
	const bc = b.add(c).mul(0.5);
	const cd = c.add(d).mul(0.5);
	const abc = ab.add(bc).mul(0.5);
	const bcd = bc.add(cd).mul(0.5);
	const middle = abc.add(bcd).mul(0.5);
	return [
		[a, ab, abc, middle],
		[middle, bcd, cd, d],
	];
}

function boxGap([a, b, c, d]: Span, query: Vector3): number {
	return query.sub(query.Max(a.Min(b, c, d)).Min(a.Max(b, c, d))).Magnitude;
}

function nearest(geometry: Geometry, query: Vector3): Candidate {
	const tolerance = geometry.tolerance;
	let best: Candidate = { index: 0, u: 0, separation: geometry.spans[0][0].sub(query).Magnitude };
	const offer = (index: number, u: number, point: Vector3) => {
		const separation = point.sub(query).Magnitude;
		if (separation < best.separation || (separation === best.separation && index + u < best.index + best.u))
			best = { index, u, separation };
	};
	const pieces: Piece[] = [];
	geometry.spans.forEach((span, index) => {
		offer(index, 1, span[3]);
		pieces.push({ index, controls: span, from: 0, to: 1, bound: boxGap(span, query) });
	});
	for (let step = 0; pieces.size() > 0; step++) {
		let chosen = 0;
		pieces.forEach((piece, position) => {
			if (piece.bound < pieces[chosen].bound) chosen = position;
		});
		const piece = pieces[chosen];
		pieces[chosen] = pieces[pieces.size() - 1];
		pieces.pop();
		if (piece.bound >= best.separation - tolerance) break;
		if (step >= SEARCH_BUDGET) error("the closest point search did not converge");
		const middle = (piece.from + piece.to) / 2;
		const [left, right] = halve(piece.controls);
		offer(piece.index, middle, left[3]);
		for (const [controls, from, to] of [
			[left, piece.from, middle],
			[right, middle, piece.to],
		] as const) {
			const bound = boxGap(controls, query);
			if (bound < best.separation - tolerance) pieces.push({ index: piece.index, controls, from, to, bound });
		}
	}
	return refineClosest(geometry.spans[best.index], query, best);
}

function refineClosest(span: Span, query: Vector3, found: Candidate): Candidate {
	let best = found;
	let u = best.u;
	for (let step = 0; step < 8; step++) {
		const offset = bernstein(span, u).sub(query);
		const speed = velocity(span, u);
		const slope = speed.Dot(speed) + offset.Dot(acceleration(span, u));
		if (!(slope > 0)) break;
		u = math.clamp(u - offset.Dot(speed) / slope, 0, 1);
		const separation = bernstein(span, u).sub(query).Magnitude;
		if (!(separation < best.separation)) break;
		best = { index: best.index, u, separation };
	}
	return best;
}

function createCurve<V extends CurveVector>(
	geometry: Geometry,
	lift: (point: V) => Vector3,
	lower: (point: Vector3) => V,
): Curve<V> {
	let arc: ArcTable | undefined;
	let frames: FrameTable | undefined;
	const measured = () => (arc ??= measure(geometry));
	const locateChecked = (parameter: number) => {
		if (!finite(parameter)) error("curve parameters must be finite");
		return locate(geometry, parameter);
	};
	return {
		pointAt: (parameter) => {
			const at = locateChecked(parameter);
			return lower(bernstein(at.span, at.u));
		},
		tangentAt: (parameter) => {
			const at = locateChecked(parameter);
			const tangent = direction(velocity(at.span, at.u));
			return tangent === undefined ? undefined : lower(tangent);
		},
		frameAt: (parameter) => {
			const at = locateChecked(parameter);
			const tangent = direction(velocity(at.span, at.u));
			if (tangent === undefined) return undefined;
			const point = bernstein(at.span, at.u);
			let normal: Vector3;
			if (geometry.planar) {
				normal = new Vector3(-tangent.Y, tangent.X, 0);
			} else {
				frames ??= transportFrames(geometry);
				normal = spatialNormal(geometry, frames, at, point, tangent);
				if (frames.seamRoll !== 0) {
					const share = distanceAt(measured(), at) / measured().length;
					normal = roll(normal, tangent, frames.seamRoll * share);
				}
			}
			return { point: lower(point), tangent: lower(tangent), normal: lower(normal) };
		},
		length: () => measured().length,
		parameterAtDistance: (distance) => {
			if (!finite(distance)) error("curve distances must be finite");
			const lengths = measured();
			return lengths.length > 0 ? parameterAt(geometry, lengths, distance) : 0;
		},
		distanceAtParameter: (parameter) => distanceAt(measured(), locateChecked(parameter)),
		closest: (query) => {
			const target = lift(query);
			const found = nearest(geometry, target);
			const count = geometry.spans.size();
			const parameter = geometry.closed && found.index + found.u >= count ? 0 : (found.index + found.u) / count;
			const at = locate(geometry, parameter);
			const point = bernstein(at.span, at.u);
			return {
				parameter,
				point: lower(point),
				distance: distanceAt(measured(), at),
				separation: point.sub(target).Magnitude,
			};
		},
	};
}
