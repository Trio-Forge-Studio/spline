-- Times curve queries against the compiled package. Build it first with `pnpm run build`.
-- Lune's Vector3 is slower than Roblox's native vector, so compare runs with each other, not with Studio.
local Spline = require("../test/lib/load")
local roblox: any = require("@lune/roblox")
local Vector2 = roblox.Vector2
local Vector3 = roblox.Vector3

-- Reports the fastest of several rounds, since other work on the machine only ever adds time.
local function time(label: string, count: number, run: (number) -> ())
	local fastest = math.huge
	for _ = 1, 5 do
		local start = os.clock()
		for index = 1, count do
			run(index)
		end
		fastest = math.min(fastest, os.clock() - start)
	end
	print(string.format("  %-34s %10.2f us", label, fastest / count * 1e6))
end

-- Lune has no Random, so a fixed linear congruential generator keeps runs comparable.
local function generator(seed: number): (number?, number?) -> number
	local state = seed
	return function(low, high)
		state = (state * 1103515245 + 12345) % 2147483648
		local share = state / 2147483648
		return if low and high then low + (high - low) * share else share
	end
end

local function ring(count: number, random: (number?, number?) -> number): { any }
	local points = {}
	for index = 0, count - 1 do
		local angle = 2 * math.pi * index / count
		local radius = 100 + random() * 20
		table.insert(points, Vector3.new(radius * math.cos(angle), random() * 30, radius * math.sin(angle)))
	end
	return points
end

for _, count in { 8, 200 } do
	local random = generator(1)
	local points = ring(count, random)
	local builds = if count > 100 then 5 else 50
	print(`catmullRom, {count} points, closed`)
	time("build", builds, function()
		Spline.catmullRom(points, { closed = true })
	end)
	time("build + length()", builds, function()
		Spline.catmullRom(points, { closed = true }).length()
	end)
	time("build + first frameAt", builds, function()
		Spline.catmullRom(points, { closed = true }).frameAt(0.3)
	end)
	time("build + prepare()", builds, function()
		Spline.catmullRom(points, { closed = true }).prepare()
	end)
	local curve = Spline.catmullRom(points, { closed = true })
	curve.prepare()
	local total = curve.length()
	time("pointAt", 20000, function(index)
		curve.pointAt(index / 20000)
	end)
	time("tangentAt", 20000, function(index)
		curve.tangentAt(index / 20000)
	end)
	time("distanceAtParameter", 5000, function(index)
		curve.distanceAtParameter(index / 5000)
	end)
	time("parameterAtDistance", 5000, function(index)
		curve.parameterAtDistance(index / 5000 * total)
	end)
	time("frameAt", 5000, function(index)
		curve.frameAt(index / 5000)
	end)
	local far = generator(2)
	time("closest, anywhere in the ring", 300, function()
		curve.closest(Vector3.new(far(-120, 120), 15, far(-120, 120)))
	end)
	local near = generator(3)
	time("closest, 2 studs off the curve", 300, function()
		curve.closest(curve.pointAt(near()) + Vector3.new(0, 2, 0))
	end)
end

print("cubicBezier, 1 span, Vector2")
time("build + pointAt", 20000, function()
	Spline.cubicBezier({ Vector2.new(0, 0), Vector2.new(1, 2), Vector2.new(3, 2), Vector2.new(4, 0) }).pointAt(0.5)
end)
