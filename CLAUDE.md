# Journal (desktop app)

Electron + React app that implements `template/_system/ui-contract.md` against a user-chosen journal folder.
This repo is the app; a user's actual journal data is never inside it.

## Where things live

| Path | What it holds |
|---|---|
| `electron/` | main process. The only code allowed to touch the filesystem. |
| `electron/api-types.ts` | the entire renderer-facing API surface, in one file |
| `electron/journal-date.ts` | the 04:00 day-boundary function; everything sealing-related is built on it |
| `template/` | the ICM workspace skeleton copied into a fresh journal folder on first run |
| `template/_system/ui-contract.md` | the spec this app is built against: read/write privileges, sealing, acceptance tests |
| `template/_system/ui-design-spec.md` | the Midnight design system: exact tokens, ratios, spacing |
| `src/` | renderer (React). Gets filesystem access only through `window.journal`, never `fs` directly. |
| `src/styles/app.css` | the design system CSS, lifted verbatim from the reference prototype |
| `tests/domain/` | tests for `electron/`'s pure logic, including a round trip through the real `check-entries.sh` |

## Rules that do not move

- The renderer never imports Node built-ins or touches `fs`. If a component needs filesystem data, add a method to `electron/api-types.ts`, implement it in the relevant `electron/*.ts` module, wire it in `main.ts` and `preload.ts`.
- Sealing is computed live (`isSealed()`), never cached or stored as a flag. A write to a sealed date is refused at the `electron/entries.ts` layer regardless of what the renderer sends.
- This app never writes to `reviews/` and never edits `project.md` directly. Project changes only happen through `acceptProposal`, which requires an exact verbatim match of the quoted "old" text.
- Anything written to an entry file must still pass `template/_system/scripts/check-entries.sh` unmodified. `tests/domain/frontmatter.test.ts` enforces this by actually running the script; don't relax that test to work around a serialization change; fix the serializer instead.
- `template/` must never contain personal content, a real project node, or a hardcoded path under a specific user's home directory. Run `grep -ril "aiden\|/Users/" template/` before committing a change to `template/`.

## Commands

```bash
npm start          # run the app (builds electron, then launches with vite dev server)
npm test           # vitest over tests/domain
npm run typecheck  # tsc --noEmit for both tsconfig.json and electron/tsconfig.json
npm run dist       # electron-builder, produces a distributable in release/
```
