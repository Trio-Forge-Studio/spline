# Agent instructions

`@trioforge/spline` provides Catmull-Rom, cubic Bezier, and uniform B-spline curves for roblox-ts. `src/curve.ts` owns the implementation. `src/index.ts` exports the public API.

## Tools

Run `pnpm install` and `rokit install`. `rokit.toml` pins Lune and StyLua. Vite+ (`vp`) formats and lints the repository from `vite.config.ts`, and `pnpm run fmt` fixes formatting. A pre-commit hook runs `vp check --fix` on staged files.

`tsconfig.json` extends `tsconfig.rbxts.json`, the roblox-ts options every Trio Forge library shares. `tooling/lune/` has the roblox-ts runtime and the test runner, which Lune code requires as `@tooling/runtime` and `@tooling/test` through `.luaurc`. `tooling/check-examples.mjs` checks the examples. Each Trio Forge library keeps its own copy of `tooling/`, so a fix there belongs in the other libraries too.

## Checks

Run `pnpm run check` before calling a change complete. It runs `vp check`, compiles with rbxtsc, runs StyLua and the Luau behavior tests against the compiled package, and compiles and runs the README examples. Fix the cause of failures.

Run `npm pack --dry-run` after packaging changes. The package contains only `out/`, `README.md`, `LICENSE`, and `package.json`.

## Examples

Every TypeScript example in the README and the docs compiles against `src/`. `pnpm run examples <files>` compiles the examples in Markdown and MDX files and runs them in Lune. `.lune/example.luau` gives them `Vector2`, `Vector3` and `CFrame`.

- A `// → text` comment is the next line the example prints.
- Blocks that share `group=<name>` in their info string build on each other. `nocheck` skips a block.

The docs live in the website repository, under `src/content/docs/docs/spline/`, and publish at <https://website.trio-forge.workers.dev/docs/spline/>. The website checks their examples against the commit of this repository that its `docs-sources.json` pins. After changing an example or an API, check the docs from a website checkout beside this one, and update them in the website PR that moves the pin:

```sh
pnpm run examples README.md ../website/src/content/docs/docs/spline/*.mdx ../website/src/content/docs/docs/spline/*/*.mdx
```

## Releases

Changesets versions and publishes the package. A PR that changes what the package ships adds a changeset with `pnpm changeset`, which says whether it takes a patch, minor or major bump. On `main`, `.github/workflows/release.yml` keeps a "chore(release): version packages" PR open that applies the changesets and writes `CHANGELOG.md`. Merging that PR stages the new version through npm trusted publishing. The trusted publisher may only stage, so the version goes live once a maintainer approves it with 2FA on npmjs.com or with `npm stage approve`. Don't publish from a machine.

CI fails a PR that changes `src/` without a changeset. A change that ships nothing, such as tests, docs or tooling, needs none.

## Lockfile

The lockfile records the pinned pnpm under `packageManagerDependencies`, and CI's frozen install fails without it. A Vite+ shell sets `PNPM_CONFIG_PM_ON_FAIL=ignore`, which stops pnpm writing that block. If it goes missing, regenerate the lockfile:

```sh
env -u PNPM_CONFIG_PM_ON_FAIL -u PNPM_CONFIG_RUNTIME_ON_FAIL pnpm install
```

## Conventions

- Preserve the Vector2 and Vector3 overloads and arrow properties. Luau callers use dot calls.
- Keep implementation details private to `src/curve.ts`.
- Tests assert behavior against independent references, including dense sampling and hand-computed values. Do not copy the implementation to calculate expectations.
- Comment only non-obvious reasons and traps.
- Use Conventional Commits with scopes, such as `feat(curve)`, `test(curve)`, and `docs(readme)`.
