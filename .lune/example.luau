local process = require("@lune/process")
local roblox = require("@lune/roblox")
local load = require("../test/lib/runtime")

load(".snippets/out", { "examples", process.args[1] }, {
	Vector2 = roblox.Vector2,
	Vector3 = roblox.Vector3,
	CFrame = roblox.CFrame,
})
