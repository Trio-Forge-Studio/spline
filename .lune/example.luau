local process = require("@lune/process")
local roblox = require("@lune/roblox")

require("@tooling/runtime")(".snippets/out", {
	globals = {
		Vector2 = roblox.Vector2,
		Vector3 = roblox.Vector3,
		CFrame = roblox.CFrame,
	},
})("examples", process.args[1])
