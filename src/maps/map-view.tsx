import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { StyleSheet } from 'react-native';

import type { AedNeighbour, Coordinates } from '@/aed';

type Props = {
  style: StyleSpecification;
  center: Coordinates;
  zoom: number;
  neighbours: readonly AedNeighbour[];
  markerColor: string;
  markerRingColor: string;
  /** The walking line to the nearest defibrillator — hi-vis on the board, not the marker colour. */
  bearingColor: string;
  /** Only draw "you are here" when there is a fix; the centre is the whole country otherwise. */
  showUser: boolean;
  userColor: string;
  /** The ink inside the user marker's ring, so the ring reads as a ring. */
  userInk: string;
};

/**
 * The map itself. Deliberately dumb: it is handed a finished style, a centre and the points
 * to draw, so everything interesting stays testable and this stays a rendering shell.
 *
 * The AEDs are a circle layer over a GeoJSON source rather than view markers — a handful of
 * points do not need views, and it keeps the native view tree small. The **bearing line** to the
 * nearest one is a second GeoJSON source, dashed, so the map answers "which way do I walk" the way
 * the board draws it, and the **user marker** is three concentric circles: a soft halo, an ink disc
 * with a hi-vis ring, and a hi-vis dot.
 */
export function MapView({
  style,
  center,
  zoom,
  neighbours,
  markerColor,
  markerRingColor,
  bearingColor,
  showUser,
  userColor,
  userInk,
}: Props) {
  const features = {
    type: 'FeatureCollection' as const,
    features: neighbours.map((neighbour) => ({
      type: 'Feature' as const,
      id: neighbour.id,
      properties: { meters: neighbour.meters },
      geometry: {
        type: 'Point' as const,
        coordinates: [neighbour.coordinates.longitude, neighbour.coordinates.latitude],
      },
    })),
  };

  const here = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Point' as const,
          coordinates: [center.longitude, center.latitude],
        },
      },
    ],
  };

  const nearest = neighbours[0];
  const bearingLine = nearest
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [center.longitude, center.latitude],
                [nearest.coordinates.longitude, nearest.coordinates.latitude],
              ],
            },
          },
        ],
      }
    : undefined;

  return (
    <Map style={styles.map} mapStyle={style} attribution>
      <Camera center={[center.longitude, center.latitude]} zoom={zoom} duration={0} />

      {bearingLine ? (
        <GeoJSONSource id="aed-bearing-line" data={bearingLine}>
          <Layer
            id="aed-bearing-line-layer"
            type="line"
            paint={{
              'line-color': bearingColor,
              'line-width': 2,
              'line-opacity': 0.9,
              'line-dasharray': [4, 5],
            }}
          />
        </GeoJSONSource>
      ) : null}

      {neighbours.length > 0 ? (
        <GeoJSONSource id="aed-neighbours" data={features}>
          <Layer
            id="aed-neighbours-circles"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': markerColor,
              'circle-stroke-width': 2,
              'circle-stroke-color': markerRingColor,
            }}
          />
        </GeoJSONSource>
      ) : null}

      {showUser ? (
        <GeoJSONSource id="map-user" data={here}>
          {/* Halo, then the ink disc ringed in hi-vis, then the dot. Painted in that order, so each
              sits over the last. */}
          <Layer
            id="map-user-halo"
            type="circle"
            paint={{ 'circle-radius': 23, 'circle-color': userColor, 'circle-opacity': 0.12 }}
          />
          <Layer
            id="map-user-ring"
            type="circle"
            paint={{
              'circle-radius': 12,
              'circle-color': userInk,
              'circle-stroke-width': 3,
              'circle-stroke-color': userColor,
            }}
          />
          <Layer
            id="map-user-dot"
            type="circle"
            paint={{ 'circle-radius': 5, 'circle-color': userColor }}
          />
        </GeoJSONSource>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
