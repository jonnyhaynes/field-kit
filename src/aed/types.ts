/**
 * The shape of a defibrillator record, and the honesty rules that go with it.
 *
 * Every record this app ships is a *candidate*: OpenStreetMap says an AED was here at
 * some point, which is not the same as one being here now. Nothing in this module — or
 * anything built on it — is allowed to turn that into a claim that an AED is present,
 * accessible, or working. See docs/plans/fieldkit-v1.md §4.3.
 */

/** A point on the ground, WGS84. */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/** Where a record came from, so a stale or disputed entry stays traceable. */
export type AedSource = {
  /** The extract the record was taken from, e.g. its date. */
  dataset: string;
  /** The OpenStreetMap node id, so a flag can become an OSM note and a fix traced. */
  osmNodeId: number;
};

/**
 * The tags the gate inspects, kept deliberately narrow: it reads only what it needs, so
 * a heuristic cannot quietly creep into the decision.
 */
export type AedTags = {
  emergency?: string;
  access?: string;
  check_date?: string;
  [tag: string]: string | undefined;
};

/** An AED as it exists before the gate has judged it. */
export type AedNode = {
  source: AedSource;
  coordinates: Coordinates;
  tags: AedTags;
};

/**
 * How recently a record was confirmed, as far as we can honestly say. "Never verified"
 * is a first-class answer, not a missing value — most OSM defibrillator nodes carry no
 * check_date, and we will not paper over that.
 */
export type Verification = { status: 'verified'; on: string } | { status: 'never-verified' };

/** A record that passed the gate and is safe to present, labelled unverified. */
export type AedRecord = {
  id: number;
  coordinates: Coordinates;
  source: AedSource;
  verification: Verification;
};

/**
 * The result of reading an OSM extract, whichever shape it arrived in.
 *
 * Overpass JSON is the primary input; GeoJSON is accepted so a pinned Geofabrik extract can
 * feed the same gate and schema when Overpass is unreachable. `ignored` counts elements that
 * were present but unusable, so dropped input is reported rather than silently lost.
 */
export type ParsedExtract = {
  nodes: AedNode[];
  /** The extract's own data timestamp, when the source carries one. */
  sourceTimestamp?: string;
  ignored: number;
};
