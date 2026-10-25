local roblox = require("@lune/roblox")

return require("@tooling/runtime")("out", {
	globals = {
		Vector2 = roblox.Vector2,
		Vector3 = roblox.Vector3,
	},
})()
