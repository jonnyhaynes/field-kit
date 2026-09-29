import { router } from 'expo-router';
import { Suspense, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { nearestAeds } from '@/aed';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { useAedFlags } from '@/aed/use-flags';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';
import { useMapAssets } from '@/maps/assets';
import { isWithinUkOverview } from '@/maps/bounds';
import { MapView } from '@/maps/map-view';
import { buildMapStyle } from '@/maps/style';

/** Where the map sits when there is no fix: the middle of the country, zoomed out. */
const UK_CENTRE = { latitude: 54.5, longitude: -3.0 };
const UK_ZOOM = 5;
const USER_ZOOM = 10;

/** More than the list shows: on a map, context is the point. */
const RESULT_LIMIT = 10;

export default function MapScreen() {
  return (
    <AedDatabaseProvider>
      <Suspense fallback={<MapNotice title="Offline map" body="Opening the map data…" />}>
        <MapContent />
      </Suspense>
    </AedDatabaseProvider>
  );
}

function MapContent() {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const assets = useMapAssets(scheme);
  const position = useCurrentPosition();
  const records = useAedRecords();
  const { flagged } = useAedFlags();

  /**
   * Outside the archive there are no tiles, so the map would be a blank rectangle. Rather than
   * show that, the map falls back to the UK overview and the screen says why — and it does not
   * mark AEDs, because "nearest to you" would be a lie about a place the user is not standing.
   */
  const outsideArchive = position.status === 'ready' && !isWithinUkOverview(position.coordinates);

  const center = position.status === 'ready' && !outsideArchive ? position.coordinates : UK_CENTRE;
  const zoom = position.status === 'ready' && !outsideArchive ? USER_ZOOM : UK_ZOOM;

  const neighbours = useMemo(() => {
    if (records.status !== 'ready' || outsideArchive) return [];
    return nearestAeds(records.records, { center, limit: RESULT_LIMIT, excludedIds: flagged });
  }, [records, center, flagged, outsideArchive]);

  const style = useMemo(
    () => (assets.status === 'ready' ? buildMapStyle({ urls: assets.urls, scheme }) : undefined),
    [assets, scheme],
  );

  if (assets.status === 'preparing') {
    return <MapNotice title="Offline map" body="Preparing the map for offline use…" />;
  }

  if (assets.status === 'failed') {
    return (
      <MapNotice
        title="Map unavailable"
        body={`The offline map could not be prepared, so it will not be shown. Everything else still works. (${assets.reason})`}
        testID="map-failed"
      />
    );
  }

  return (
    <Screen testID="map-screen">
      <View style={[styles.mapFrame, { borderColor: theme.border }]}>
        <MapView
          style={style!}
          center={center}
          zoom={zoom}
          neighbours={neighbours}
          markerColor={theme.accent}
          markerRingColor={theme.text}
        />
      </View>

      {outsideArchive ? (
        <Text testID="map-outside-area" style={[styles.body, { color: theme.text }]}>
          You are outside the area this map covers, so it is showing the UK overview instead of
          where you are. Everything else on this screen still works, and the defibrillator list
          still uses your position.
        </Text>
      ) : position.status === 'ready' ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {neighbours.length > 0
            ? `Nearest ${neighbours.length} defibrillators marked. Distances are in the list.`
            : 'No defibrillators to mark near you.'}
        </Text>
      ) : (
        <Text testID="map-no-position" style={[styles.body, { color: theme.textSecondary }]}>
          Location is unavailable, so the map is centred on the country rather than on you.
          Everything here still works with no signal.
        </Text>
      )}

      <Text style={[styles.body, { color: theme.text }]}>
        Unverified. Public mapping shows where a defibrillator was recorded, not that it is still
        there, reachable, or working.
      </Text>

      <Text testID="map-attribution" style={[styles.attribution, { color: theme.textSecondary }]}>
        Map data © OpenStreetMap contributors, tiles by Protomaps.
      </Text>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Data and licences"
        testID="map-about-link"
        onPress={() => router.push('/about')}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkLabel, { color: theme.text }]}>Data and licences</Text>
      </Pressable>
    </Screen>
  );
}

function MapNotice({ title, body, testID }: { title: string; body: string; testID?: string }) {
  const theme = useTheme();

  return (
    <Screen testID={testID ?? 'map-screen'}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  mapFrame: {
    flex: 1,
    minHeight: 320,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  body: { fontSize: 15, lineHeight: 22 },
  attribution: { fontSize: 12, lineHeight: 16 },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  linkLabel: { fontSize: 16, fontWeight: '600' },
});
