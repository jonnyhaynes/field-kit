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
