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
};

/**
 * The map itself. Deliberately dumb: it is handed a finished style, a centre and the points
 * to draw, so everything interesting stays testable and this stays a rendering shell.
 *
 * The AEDs are a circle layer over a GeoJSON source rather than view markers — a handful of
 * points do not need views, and it keeps the native view tree small.
 */
export function MapView({ style, center, zoom, neighbours, markerColor, markerRingColor }: Props) {
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

  return (
    <Map style={styles.map} mapStyle={style} attribution>
      <Camera center={[center.longitude, center.latitude]} zoom={zoom} duration={0} />

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
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
