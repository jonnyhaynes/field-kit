/**
 * Provenance for the archive that ships inside the app.
 *
 * One constant, in its own module, because a region pack has to be cut from the *same* Protomaps
 * build: Protomaps' layer definitions reference `source-layer` names that come from the build, so a
 * pack cut from a different one would render nothing and look like a broken download. The catalogue
 * records the build it was cut from, and a test compares the two.
 *
 * The values come from the command that produced the archive (plan of record, §5, Phase 2d).
 */

export const UK_OVERVIEW_SOURCE = {
  build: '20260929',
  archive: 'https://build.protomaps.com/20260929.pmtiles',
  command:
    'pmtiles extract https://build.protomaps.com/20260929.pmtiles assets/maps/uk-overview.pmtiles ' +
    '--bbox=-8.65,49.86,1.77,60.86 --maxzoom=8',
} as const;
