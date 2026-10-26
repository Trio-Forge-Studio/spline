local fs = require("@lune/fs")

return {
	["compiled curve carries native code generation hints"] = function()
		local output = fs.readFile("out/curve.luau")
		assert(string.sub(output, 1, #"--!native") == "--!native", "curve.luau must start with --!native")
		assert(
			string.find(output, "local function bernstein(_param: {Vector3}, u: number)", 1, true),
			"bernstein must carry Span and number parameter hints"
		)
	end,
}
