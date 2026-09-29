export {
  boundingBoxAround,
  EARTH_RADIUS_M,
  haversineMeters,
  isWithinBox,
  toRadians,
  type BoundingBox,
} from './distance';
export {
  applyQualityGate,
  evaluateNode,
  type GateOptions,
  type GatePolicy,
  type GateRejectionReason,
  type GateResult,
  type GateSummary,
} from './gate';
export { nearestAeds, type AedNeighbour, type NearestQuery } from './proximity';
export type { AedNode, AedRecord, AedSource, AedTags, Coordinates, Verification } from './types';
export {
  OverpassShapeError,
  overpassTimestamp,
  parseOverpassExtract,
  type OverpassExtract,
} from './overpass';
export {
  AED_ATTRIBUTION,
  AED_DB_SCHEMA_VERSION,
  AED_LICENCE_ID,
  AED_LICENCE_URL,
  AED_SCHEMA_SQL,
  assertDatasetMeta,
  buildDatasetMeta,
  DatasetIntegrityError,
  datasetMetaProblems,
  datasetMetaRows,
  toDatasetRows,
  type AedDatasetMeta,
  type AedDatasetRow,
  type DatasetMetaInput,
} from './dataset';
