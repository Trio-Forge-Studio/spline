local Spline = require("./lib/load")
local Vector3 = require("@lune/roblox").Vector3

return {
	["a degree-elevated quadratic matches its reference and lands exactly"] = function()
		local start = Vector3.new(-7, 2, 4)
		local handle = Vector3.new(3, 18, -5)
		local target = Vector3.new(17, -3, 11)
		local curve = Spline.cubicBezier({
			start,
			start + (handle - start) * (2 / 3),
			target + (handle - target) * (2 / 3),
			target,
		})
		assert(curve.pointAt(0) == start, "starts exactly")
		assert(curve.pointAt(1) == target, "lands exactly")
		for step = 0, 100 do
			local t = step / 100
			local expected = start * ((1 - t) ^ 2) + handle * (2 * (1 - t) * t) + target * (t ^ 2)
			assert((curve.pointAt(t) - expected).Magnitude < 1e-5, `matches the quadratic at {t}`)
		end
	end,
}
