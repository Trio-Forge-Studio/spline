# Agent instructions

`@trioforge/spline` provides Catmull-Rom, cubic Bezier, and uniform B-spline curves for roblox-ts. `src/curve.ts` owns the implementation. `src/index.ts` exports the public API.

## Checks

Run `pnpm run check` before calling a change complete. It compiles with rbxtsc, runs the Luau behavior tests against the compiled package, and compiles and runs the README examples. Fix the cause of failures.

`node scripts/check-snippets.mjs <files>` checks TypeScript examples in Markdown and MDX. Each `// → text` line declares expected output. Blocks with `group=<name>` share the earlier code in that group.

Run `npm pack --dry-run` after packaging changes. The package contains only `out/`, `README.md`, `LICENSE`, and `package.json`.

## Conventions

- Preserve the Vector2 and Vector3 overloads and arrow properties. Luau callers use dot calls.
- Keep implementation details private to `src/curve.ts`.
- Tests assert behavior against independent references, including dense sampling and hand-computed values. Do not copy the implementation to calculate expectations.
- Comment only non-obvious reasons and traps.
- Use Conventional Commits with scopes, such as `feat(curve)`, `test(curve)`, and `docs(readme)`.

## Releasing

Releases publish through CI. Update `version` in `package.json` in a PR and merge it. With release authorization, tag that commit on `main` and push the tag with an explicit refspec.

```sh
git tag spline-v0.2.0 origin/main
git push origin refs/tags/spline-v0.2.0
```

The repository's `.github/workflows/release.yml` rejects tags outside `main` or tags that do not match the package version. It runs `pnpm run check`, then publishes through npm trusted publishing with provenance. Do not publish from a local machine.
