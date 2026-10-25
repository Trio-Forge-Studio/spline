local roblox = require("@lune/roblox")

return require("./runtime")("out", {}, {
	Vector2 = roblox.Vector2,
	Vector3 = roblox.Vector3,
})
