# Phase 2d follow-up (#14) — downloadable region packs

Field Kit · issue [#14](https://github.com/jonnyhaynes/field-kit/issues/14) · plan of record `docs/plans/fieldkit-v1.md` §2.3, §5 (Phase 2d)

## What this builds

The bundled map is a **national overview at zoom 8** — coastlines, towns, major roads, ~190 tiles of
the UK. It is deliberately small enough to ship inside the app, which is why it cannot be street
level. Region packs are the escape valve: a **downloaded, higher-detail archive for one area**, cut
from the same Protomaps planet build, stored on the phone, and used with no network once it is there.

This slice builds the mechanism and one pack to prove it. The catalogue ships in the app; the bytes
come from a GitHub Release.

**Prerequisite: the repository must be public.** Release assets on a private repo need
authentication, which an app cannot hold. This slice depends on the visibility change agreed
separately, and it is the reason that change was worth making.

## Naming the trade-off, because it shapes the design

A pack must **not replace the overview as the map's source**. If it did, panning outside the pack's
bounding box would leave no tiles at all — a blank rectangle, which is exactly the failure Phase 2d
already fixed once (a position outside the archive left a grey rectangle with no explanation, and
§2.3 promises the map is never blank). It also could not be undone by a loading state, because the
blank area is wherever the user panned to.

So a pack is an **overlay source drawn above the overview**, and the layer order matters:

```
overview geometry  →  pack geometry  →  overview labels
```

Pack geometry above the overview's makes detail win where the pack covers. The overview's labels go
last so that its town and road names are not painted over by the pack's fills and lines.

**And the pack's own label layers are dropped.** Two sources each rendering labels would draw every
name twice, offset by a pixel or two. The cost is honest and worth stating plainly: **a pack adds
geometry, not more names** — detailed roads, paths, water and buildings under the same sparse
overview labels. Fixing that properly means toggling layer visibility at runtime as the view moves
in and out of coverage; that is deferred rather than half-built (risk 4).

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Hosting | **GitHub Releases** on the public repo, immutable tag `maps-<date>` | Free, no auth for the app, no API key, and it satisfies ODbL share-alike: offering the derived database publicly *is* the offer the licence asks for. |
| The catalogue | **Bundled and immutable** — committed `assets/maps/regions.json`, with each pack's md5 and release URL pinned in the app | Offline-first: the list is visible with no signal, and a shipped app's expectations cannot be changed under it. Adding a pack therefore needs an app release, which is the accepted cost. |
| Integrity | **MD5, natively (`File.md5`)**, recorded per pack — plus sha256 in the catalogue for build-time reproducibility | No new dependency, and it matches the project's existing habit of pinning the Geofabrik extract by md5. Honest limit: md5 detects corruption, not a malicious host. The threat model here is a large download over a flaky link. |
| Where a pack lives | `Paths.document/maps/packs/<id>.pmtiles`, beside the bundled assets | Same directory discipline the bundle already uses, and the same reason: the copy has to survive a restart. |
| Download mechanics | `File.downloadFileAsync(url, <id>.part, { onProgress, signal })`, then **md5 check, then `move()`** to the final name | The API documents that a failed Android download can leave a partial file at the destination. Verifying before renaming means a partial file can never be mistaken for a pack. |
| Which pack is used | One at most: the installed pack whose bbox contains your position; ties broken by smallest area | Two overlapping packs stacked would double-draw; "most specific wins" is the intuitive rule. |
| Capability | `canMapRegions()` — a writable packs directory exists and `Paths.availableDiskSpace` clears the smallest pack plus headroom | So the screen can say a device cannot store packs rather than offering a download that will fail. |
| What packs contain | **One pack** (a national park) at **~z14, ≤25 MB**, measured before the zoom is fixed | Street detail is the point of a pack. Sizes get measured, not guessed — the overview's zoom was chosen from a measured table. |
| Publishing | **Documented and manual** (`gh release create`), not CI | Cutting needs the 138 GB remote planet and the `pmtiles` CLI. A networked CI job that runs a handful of times a year is weight without value; the release step is scripted and reproducible instead. |

## What the repo already gives us

This slice adds very little machinery, because the patterns exist:

- `src/maps/assets.ts` — the marker-file discipline and single-flight `prepare()`, which is how a
  bundled file becomes a file on disk. A pack follows the same shape, with a hash instead of a marker.
- `src/maps/urls.ts` (`pmtiles://file://…`, ASCII-only filenames), `src/maps/style.ts` (one source
  key, `layers('protomaps', …)`), `src/maps/bounds.ts` (`UK_OVERVIEW_BOUNDS`, a rectangle copied from
  the archive header).
- `src/capabilities/can-compass.ts` — the probe convention: `canX`, never rejects, false on timeout.
- The `KeyValueStore` + `createX(store)` + hook pattern used by flags, depth, reports and the notes
  queue; corrupt state becomes a safe default.
- `src/notes/submit.ts` and `src/what3words/resolver.ts` — **the injected-IO seam**. Both take
  `fetchImpl` so the success path is unit-tested and the device only ever proves the honest states.
  This slice's downloader takes the same kind of seam.
- `scripts/build-aed-db.ts` — a thin filesystem shell over tested modules, `parseArgs`, a provenance
  sidecar validated by an `assert*` function that refuses empty output, progress on stdout.
- `assets/data/aed.meta.json` — the provenance shape to copy (`schemaVersion`, `builtAt`,
  `source{dataset,timestamp,query}`, `counts`, `licence{id,attribution,url}`).
- `expo-file-system` 57.0.7 already has everything: `File.md5`, `File.downloadFileAsync` with
  `onProgress` and an `AbortSignal`, `File.move`, and `Paths.availableDiskSpace`. **No new
  dependency.**

## Changes

**New: `assets/maps/regions.json`** — the catalogue, content as data, validated at load rather than
trusted. Per pack: `id`, `name`, `description`, `bounds`, `minZoom`, `maxZoom`, `bytes`, `md5`,
`sha256`, `url`, `builtAt`, `source { build, archive, command }`, `licence`. It ships in the app, so
it costs a few KB.

**New: `src/maps/regions.ts`** — pure. The catalogue type, `parseRegionsCatalogue` (defensive, like
every other parser here), `assertRegionsCatalogue` (throws on an empty or malformed catalogue, so a
release cannot ship a pack nobody can verify), `formatBytes`, and:

- `selectPack(coordinates, packs): RegionPack | undefined` — smallest-bbox winner, or none.
- `hasSpaceForPack(availableBytes, pack): boolean` — pure, so the space rule is testable.

**New: `src/capabilities/can-map-regions.ts`** — the thin probe over `selectPack`'s needs:
a writable packs directory and `Paths.availableDiskSpace`.

**New: `src/maps/pack-store.ts`** — installed packs in the key-value store under
`field-kit/maps/packs`: `{ id, md5, bytes, installedAt }`, corrupt-or-unreadable → empty.

**New: `src/maps/pack-download.ts`** — the IO seam, taking injected download/hash/file operations so
the whole install path is unit-tested without a network: `install(pack)`, `remove(id)`,
`verify(pack)`, and the rule that a file is only accepted when its md5 matches.

**New: `src/maps/use-regions.ts`** — the hook: catalogue + installed state + install/remove/verify +
per-pack progress, with the repo's `{ status }` union and cancellation on unmount.

**New: `src/app/regions.tsx`** — "Region packs", reached from the map. Per pack: name, area, size,
and one honest state — *Download* / *Downloading 42%* with Cancel / *Installed, checked <date>* with
Delete and Check / *Damaged, download again* / *Not enough space*. Plus total storage used, the
ODbL attribution, and the plain statement that packs need a connection once and then work offline.

**New: `scripts/build-region-pack.ts`** — the cutter and catalogue writer. `parseArgs`, shells out to
the `pmtiles` CLI (an external tool, documented like `osmium` was), hashes the result with
`node:crypto`, and updates `assets/maps/regions.json` through `src/maps/regions.ts` so the manifest
is written by tested code. Prints the size, so measuring is a byproduct of cutting.

**Changed: `src/maps/urls.ts`** — additive: `PACKS_DIRECTORY` and `packArchiveUrl(rootUri, id)`,
keeping `PMTILES_FILE_NAME` and `mapAssetUrls` exactly as they are so the existing tests stand.

**Changed: `src/maps/style.ts`** — `buildMapStyle` gains an optional `packUrl`. It adds a `detail`
source and splits the layer list into overview geometry, pack geometry (text-field layers dropped,
ids prefixed, source repointed) and overview labels, in that order.

**Changed: `src/app/map.tsx`** — ask the hook which pack covers the position, pass it to the style,
and show a small note saying which pack is supplying detail.

**Changed: `src/app/_layout.tsx`, `src/app/about.tsx`** — the route, and attribution for packs.

**Docs:** the plan of record's §5, and `README.md`'s "Region packs" and "Maestro flows" entries.

## Verification

- **Selection, as a matrix:** position inside a pack; inside the overview but no pack; outside both;
  a pack listed in the store whose file has vanished; two packs overlapping → smallest wins.
- **Catalogue validity:** every entry has a bbox, both hashes, a size, a release URL and a licence;
  ids are unique; each bbox sits inside the overview's; and **every pack records the same Protomaps
  build as the overview** — a mismatched build would break `source-layer` names silently.
- **Install, against injected IO:** happy path; **md5 mismatch → the file is discarded and nothing is
  recorded**; cancellation; a partial file left behind (the documented Android case) → rejected;
  deleting frees the file and the record.
- **Style:** with a pack, `sources.detail` exists; pack layers all have `source: 'detail'`, unique
  prefixed ids and **no `text-field`**; they sit after the overview's geometry and before its labels;
  and the existing invariant holds — **no `https://` anywhere in the built style**.
- **Space:** `hasSpaceForPack` at the boundary, and the probe returning false on a device that cannot
  store a pack.
- **On a device:** a Maestro flow for the states that need no 25 MB transfer — the catalogue renders,
  nothing is installed, sizes are shown, the download control appears, and **a cancelled download
  leaves nothing installed**. The completed-download path is covered by unit tests against the
  injected seam, as the OSM-note and what3words success paths are.
- **By hand, once, on hardware, and written down:** download a real pack and confirm the map gets
  sharper inside it and stays populated outside it. Only a device can prove MapLibre reads a second
  archive and that the release URL redirect is followed — the same lesson Phase 2d learned from a
  screenshot.
- **Measure before fixing the zoom:** cut the chosen region at z12, z13 and z14, record the real
  sizes in the plan and README the way the overview's table was recorded, then set `maxZoom` and the
  ≤25 MB cap from the measurement.

## Measured, not guessed — the pack zoom

Cut from `build.protomaps.com/20260929.pmtiles`, the same build as the bundled overview, over a Lake
District bounding box (`-3.55,54.20,-2.70,54.75`):

| maxzoom | archive size |
| --- | --- |
| 12 | 4.8 MB |
| 13 | 10.0 MB |
| **14** | **18.9 MB** |

**z14 is used** — inside the 25 MB cap, and the first of the three that is genuinely street level.
The archive's own header confirms the extent and the zoom range (`pmtiles show`): 2,457 addressed
tiles, min zoom 0, max zoom 14.

## Verified by hand — the overlay renders

The plan said only a device could prove that MapLibre reads a second archive, so it was done by hand
rather than assumed, using the real 18.9 MB pack placed in the simulator's container. Same position
both times (Ambleside, inside the pack's box), and the difference is not subtle:

- **Before**, with nothing installed: Windermere as a smoothed blob, few minor roads, no landcover,
  and the map says *"There is a Lake District pack for this area, which would add street detail."*
- **After**, with the pack on disk: a detailed shoreline, woodland and landcover polygons, streams,
  and the minor road network — and *"Street detail for Lake District is downloaded…"*

Three things about that are worth more than the pixel count: the **layer ordering works** — the
overview's "Windermere" label still draws *over* the pack's fills, which is the whole reason the
layers were regrouped; **nothing went blank**, so the pack really is an overlay and not a
replacement; and the AED markers are unaffected, because they are drawn from the app rather than the
archive.

**Delete** was exercised the same way and does what it says: the file is gone from the container and
the screen returns to *Download*.

**Still unproven, and honestly so:** the download from a GitHub Release. That needs the release to
exist, which needs a public repository — so the redirect, and a 19 MB transfer completing, remain a
device check for the day the first pack is published.

## Risks and open items

1. **The release URL redirect is unproven.** GitHub serves assets via a redirect; whether
   `downloadFileAsync` follows it needs a device check before the feature is trusted. If it does not,
   the fallback is uploading the archive somewhere that serves it directly, which is a hosting
   decision rather than a code change.
2. **A download is foreground-only.** There is no background download task, so leaving the screen or
   the app cancels it. For a ≤25 MB file that is acceptable; it should be said on the screen rather
   than discovered.
3. **`File.md5` is synchronous.** It runs at install and on Check, never during render — a 25 MB read
   on the JS thread is a jank risk, and the cost needs measuring rather than assuming.
4. **A pack adds geometry but not names** (see the trade-off above). Real, deliberate, and the most
   likely thing a user notices.
5. **Sizes are unmeasured until the region is cut.** The ≤25 MB cap is a ceiling to test against, not
   a prediction; the measurement step comes before the value is fixed.
6. **Two sources cost two tile reads where a pack covers.** Local files, so it is decode time rather
   than data, but it should be measured on a device rather than assumed free.
7. **Bounding boxes are rectangles, not coastlines** — the same caveat the overview carries. A pack
   for a coastal region will include a strip of sea, which is harmless, and a pack for a region
   crossing a border will include a little of the neighbour.
8. **ODbL obligations travel with the packs.** Each is a Produced Work, so the release page must
   carry the attribution and licence, and `about.tsx` must name them — a pack published without its
   notice is data published without its licence.
9. **Adding or fixing a pack needs an app release** — a consequence of the bundled catalogue, chosen
   deliberately over a fetched one.
10. **The issue text was not re-read.** Plan mode blocks shell commands, so I could not open #14's
    acceptance criteria; this plan derives them from §2.3 and the README. Anything in the issue that
    is not reflected here should be raised before implementation, not after.

## As built

Where the diff departs from the plan above, for a reviewer checking one against the other:

- **"Geometry only" is enforced as "no symbol layers".** The rule is `type !== 'symbol'`, which is
  simpler than testing for `text-field` and has the same effect: packs supply fills, lines and
  extrusions, and *every* symbol — text and icons alike — comes from the overview. A test asserts no
  pack layer is a symbol and none carries a `text-field`.
- **An extra failure reason: `unavailable`.** The first device run showed the honest-state problem in
  the flesh — with the release not yet published, the screen said "check your connection", which is a
  misleading thing to tell someone whose connection is fine. `downloadFileAsync` reports a non-2xx
  response only in its error message, so the installer reads the status out of that string: a 4xx
  becomes *"the pack is not where Field Kit expects to find it — it may not have been published
  yet"*, and anything else stays *no-connection*. Both paths are unit-tested.
- **`formatBytes` gained gigabytes.** It stopped at MB, so a device with 19 GB free was reported as
  "19354.1 MB" — found by reading the screenshot, not by a test.
- **`canMapRegions(packs)` takes the catalogue**, because "can this device store a pack" is a question
  about the smallest pack on offer rather than about hardware.
- **The flow is written to pass in two worlds.** It taps Download and then *conditionally* cancels or
  deletes, so it passes whether the release exists (download succeeds) or not (404), and either way it
  leaves nothing installed for the next run. That is a deliberate change from the plan, which had it
  assert an unconditional cancellation: a flow that depends on a 19 MB transfer from GitHub fails for
  reasons that have nothing to do with this app.
- **The publish step has not run yet.** The catalogue pins
  `.../releases/download/maps-2026.09/lake-district.pmtiles`, and that release can only be created —
  and downloaded anonymously — once the repository is public. Until then the download correctly
  reports `unavailable`, which is what the device flow exercises.
- **`.gitignore` gained `/packs/`.** The cutter writes there by default, and a 19 MB binary must not
  be committable by accident. The bundled archive is deliberately *not* ignored.
- **`src/maps/paths.ts` is new**, so the bundled assets and the downloaded packs cannot drift apart
  about which directory they share.
