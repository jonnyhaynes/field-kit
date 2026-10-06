import { router } from 'expo-router';
import { Suspense, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { nearestAeds } from '@/aed';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { useAedFlags } from '@/aed/use-flags';
import { Card } from '@/components/card';
import { Contour } from '@/components/contour';
import { Screen } from '@/components/screen';
import { MinTarget, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Type } from '@/constants/type';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';
import { useMapAssets } from '@/maps/assets';
import { isWithinUkOverview } from '@/maps/bounds';
import { MapView } from '@/maps/map-view';
import { selectPack } from '@/maps/regions';
import { buildMapStyle } from '@/maps/style';
import { packArchiveUrl } from '@/maps/urls';
import { useRegions } from '@/maps/use-regions';

/** Where the map sits when there is no fix: the middle of the country, zoomed out. */
const UK_CENTRE = { latitude: 54.5, longitude: -3.0 };
const UK_ZOOM = 5;
const USER_ZOOM = 10;

/** More than the list shows: on a map, context is the point. */
const RESULT_LIMIT = 10;

export function MapScreen({
  onOpenWhere,
  onOpenCompass,
}: {
  onOpenWhere: () => void;
  onOpenCompass: () => void;
}) {
  return (
    <AedDatabaseProvider>
      <Suspense fallback={<MapNotice title="Offline map" body="Opening the map data…" />}>
        <MapContent onOpenWhere={onOpenWhere} onOpenCompass={onOpenCompass} />
      </Suspense>
    </AedDatabaseProvider>
  );
}

function MapContent({
  onOpenWhere,
  onOpenCompass,
}: {
  onOpenWhere: () => void;
  onOpenCompass: () => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();

  const assets = useMapAssets(scheme);
  const position = useCurrentPosition();
  const records = useAedRecords();
  const { flagged } = useAedFlags();
  const regions = useRegions();

  /**
   * Outside the archive there are no tiles, so the map would be a blank rectangle. Rather than
   * show that, the map falls back to the UK overview and the screen says why — and it does not
   * mark AEDs, because "nearest to you" would be a lie about a place the user is not standing.
   */
  const outsideArchive = position.status === 'ready' && !isWithinUkOverview(position.coordinates);

  const center = position.status === 'ready' && !outsideArchive ? position.coordinates : UK_CENTRE;
  const zoom = position.status === 'ready' && !outsideArchive ? USER_ZOOM : UK_ZOOM;

  /**
   * The pack for this position, and whether its bytes are actually here. `covering` without
   * `installed` is worth telling the user about: it is street detail they could have for where
   * they are standing, and there is a screen for it.
   */
  const covering =
    position.status === 'ready' && !outsideArchive
      ? selectPack(position.coordinates, regions.packs)
      : undefined;
  const installedPack = covering && regions.present[covering.id] === true ? covering : undefined;

  const neighbours = useMemo(() => {
    if (records.status !== 'ready' || outsideArchive) return [];
    return nearestAeds(records.records, { center, limit: RESULT_LIMIT, excludedIds: flagged });
  }, [records, center, flagged, outsideArchive]);

  const style = useMemo(
    () =>
      assets.status === 'ready'
        ? buildMapStyle({
            urls: assets.urls,
            scheme,
            // A local `pmtiles://` path: the pack's download URL never reaches the style.
            packUrl: installedPack ? packArchiveUrl(assets.rootUri, installedPack.id) : undefined,
          })
        : undefined,
    [assets, scheme, installedPack],
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
          markerColor={theme.glacier}
          markerRingColor={theme.text}
        />
        {/* The identity's contour language over the real map, in two corners. Decoration: it is
            hidden from the accessibility tree and clipped by the frame. */}
        <Contour
          variant="hill"
          corner="top-right"
          tone={scheme === 'dark' ? 'brand' : 'ink'}
          size={220}
        />
        <Contour
          variant="summit"
          corner="bottom-left"
          tone={scheme === 'dark' ? 'brand' : 'ink'}
          size={150}
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

      {installedPack ? (
        <Text testID="map-pack-active" style={[styles.body, { color: theme.textSecondary }]}>
          {`Street detail for ${installedPack.name} is downloaded, so the map is more detailed here.`}
        </Text>
      ) : covering ? (
        <Text testID="map-pack-available" style={[styles.body, { color: theme.textSecondary }]}>
          {`There is a ${covering.name} pack for this area, which would add street detail.`}
        </Text>
      ) : null}

      <Text testID="map-attribution" style={[styles.attribution, { color: theme.textSecondary }]}>
        Map data © OpenStreetMap contributors, tiles by Protomaps.
      </Text>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Region packs"
        accessibilityHint="Download street detail for one area"
        testID="map-regions-link"
        onPress={() => router.push('/locate/regions')}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkLabel, { color: theme.text }]}>Region packs</Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Where I am"
        accessibilityHint="Latitude, longitude and an OS grid reference"
        testID="map-position-link"
        onPress={onOpenWhere}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkLabel, { color: theme.text }]}>Where I am — grid reference</Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Walk on a bearing"
        accessibilityHint="Opens the compass, which points at the nearest defibrillators"
        testID="map-bearing-link"
        onPress={onOpenCompass}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkLabel, { color: theme.text }]}>Walk on a bearing</Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Data and licences"
        testID="map-about-link"
        onPress={() => router.push('/more/about')}
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
      <Card tone="outline">
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  mapFrame: {
    flex: 1,
    minHeight: 320,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  body: { ...Type.body },
  attribution: { ...Type.note },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  linkLabel: { ...Type.title },
});
