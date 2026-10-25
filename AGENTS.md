# Agent instructions

`@trioforge/spline` provides Catmull-Rom, cubic Bezier, and uniform B-spline curves for roblox-ts. `src/curve.ts` owns the implementation. `src/index.ts` exports the public API.

## Checks

Run `pnpm run check` before calling a change complete. It compiles with rbxtsc, runs the Luau behavior tests against the compiled package, and compiles and runs the README examples. Fix the cause of failures.

`pnpm run examples <files>` compiles and runs the TypeScript examples in Markdown and MDX, as the root `AGENTS.md` describes. `.lune/example.luau` gives them `Vector2`, `Vector3` and `CFrame`.

Run `npm pack --dry-run` after packaging changes. The package contains only `out/`, `README.md`, `LICENSE`, and `package.json`.

## Conventions

- Preserve the Vector2 and Vector3 overloads and arrow properties. Luau callers use dot calls.
- Keep implementation details private to `src/curve.ts`.
- Tests assert behavior against independent references, including dense sampling and hand-computed values. Do not copy the implementation to calculate expectations.
- Comment only non-obvious reasons and traps.
- Use Conventional Commits with scopes, such as `feat(curve)`, `test(curve)`, and `docs(readme)`.
