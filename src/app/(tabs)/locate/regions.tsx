import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { regionStorageProblem } from '@/capabilities/can-map-regions';
import { Card } from '@/components/card';
import { Contour } from '@/components/contour';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { controlSurface, brandSurface } from '@/constants/surface';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatBytes,
  hasSpaceForPack,
  REGION_PACK_HEADROOM_BYTES,
  type RegionPack,
} from '@/maps/regions';
import { FAILURE_TEXT, useRegions } from '@/maps/use-regions';

/**
 * "Region packs" — adding detail to the map for one area.
 *
 * The bundled map is a national overview at about zoom 8, so it cannot be street level; a pack is
 * the escape valve. What this screen has to be honest about, and is: the list is here offline but
 * the bytes are not, a download needs a connection once, and nothing is kept if it does not finish.
 */
export default function RegionsScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const regions = useRegions();

  const usedBytes = regions.usable.reduce((total, pack) => total + pack.bytes, 0);
  const problem = regionStorageProblem(regions.availableBytes, regions.packs);

  return (
    <Screen testID="regions-screen">
      <Text style={[styles.title, { color: theme.text }]}>Region packs</Text>

      <Card>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          The map that comes with Field Kit covers the whole country at a national overview — towns
          and main roads. A region pack adds detail for one area: lanes, footpaths and buildings.
          Once it is downloaded it works with no signal at all.
        </Text>
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Downloading needs a connection once. If you leave this screen while one is downloading it
          stops, and nothing is kept.
        </Text>
      </Card>

      {regions.capability === 'probing' ? (
        <Card testID="regions-probing">
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Checking what this device can store…
          </Text>
        </Card>
      ) : null}

      {regions.capability === 'unsupported' ? (
        <Card testID="regions-unsupported">
          <Text style={[styles.cardTitle, { color: theme.text }]}>Not available here</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {problem === 'no-space'
              ? `A pack needs its own size free, plus about ${formatBytes(REGION_PACK_HEADROOM_BYTES)} for the system to keep working. There is not that much space left, so downloading is off.`
              : 'This build has no region packs to offer.'}
          </Text>
        </Card>
      ) : null}

      {regions.packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} regions={regions} />
      ))}

      <Card>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Space used</Text>
        <Text testID="regions-total" style={[styles.body, { color: theme.textSecondary }]}>
          {regions.usable.length === 0
            ? `No packs downloaded. ${formatBytes(regions.availableBytes)} free on this device.`
            : `${regions.usable.length} pack${regions.usable.length === 1 ? '' : 's'}, ${formatBytes(usedBytes)}. ${formatBytes(regions.availableBytes)} free on this device.`}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Where this comes from</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Every pack is cut from the same Protomaps archive as the bundled map, which is built from
          OpenStreetMap data — © OpenStreetMap contributors, under the ODbL.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Data and licences"
          testID="regions-about-link"
          onPress={() => router.push('/more/about')}
          style={({ pressed }) => [
            styles.secondary,
            controlSurface(scheme),
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.secondaryLabel, { color: theme.text }]}>Data and licences</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function PackCard({ pack, regions }: { pack: RegionPack; regions: ReturnType<typeof useRegions> }) {
  const theme = useTheme();
  const scheme = useColorScheme();

  const progress = regions.progress[pack.id];
  const downloading = progress !== undefined;
  const present = regions.present[pack.id] === true;
  const record = regions.installed.find((entry) => entry.id === pack.id);
  const failure = regions.failure[pack.id];
  const roomFor = hasSpaceForPack(regions.availableBytes, pack);
  const canDownload = roomFor && regions.capability === 'ready';

  return (
    <Card testID={`regions-pack-${pack.id}`} style={downloading ? styles.downloadHero : undefined}>
      {downloading ? (
        <Contour
          variant="hill"
          corner="top-right"
          tone={scheme === 'dark' ? 'brand' : 'ink'}
          size={150}
        />
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{pack.name}</Text>
        <Text
          testID={`regions-pack-${pack.id}-size`}
          style={[styles.note, { color: theme.textSecondary }]}>
          {formatBytes(pack.bytes)}
        </Text>
      </View>

      <Text style={[styles.body, { color: theme.textSecondary }]}>{pack.description}</Text>

      {downloading ? (
        <>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.brand, width: `${Math.round((progress ?? 0) * 100)}%` },
              ]}
            />
          </View>
          <Text
            testID={`regions-pack-${pack.id}-progress`}
            style={[styles.body, { color: theme.text }]}>
            {progress === null
              ? 'Downloading…'
              : `${formatBytes(pack.bytes * progress)} / ${formatBytes(pack.bytes)} · ${Math.round(progress * 100)}%`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Stop downloading ${pack.name}`}
            testID={`regions-pack-${pack.id}-cancel`}
            onPress={() => regions.cancel(pack.id)}
            style={({ pressed }) => [
              styles.secondary,
              controlSurface(scheme),
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.secondaryLabel, { color: theme.text }]}>Stop</Text>
          </Pressable>
        </>
      ) : present ? (
        <>
          <Text
            testID={`regions-pack-${pack.id}-state`}
            style={[styles.note, { color: theme.textSecondary }]}>
            {record
              ? `Downloaded ${shortDate(record.installedAt)}, and it works offline.`
              : 'Downloaded, and it works offline.'}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Check ${pack.name}`}
              testID={`regions-pack-${pack.id}-check`}
              onPress={() => void regions.check(pack)}
              style={({ pressed }) => [
                styles.secondary,
                styles.grow,
                controlSurface(scheme),
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.secondaryLabel, { color: theme.text }]}>Check</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${pack.name}`}
              testID={`regions-pack-${pack.id}-delete`}
              onPress={() => void regions.remove(pack)}
              style={({ pressed }) => [
                styles.secondary,
                styles.grow,
                controlSurface(scheme),
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {record ? (
            <Text
              testID={`regions-pack-${pack.id}-state`}
              style={[styles.note, { color: theme.textSecondary }]}>
              This was downloaded before, but its file is no longer here. Download it again.
            </Text>
          ) : null}

          {failure ? (
            <Text
              testID={`regions-pack-${pack.id}-failure`}
              style={[styles.note, { color: theme.text }]}>
              {FAILURE_TEXT[failure]}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Download ${pack.name}`}
            accessibilityState={{ disabled: !canDownload }}
            testID={`regions-pack-${pack.id}-download`}
            disabled={!canDownload}
            onPress={() => void regions.download(pack)}
            style={({ pressed }) => [
              styles.primary,
              brandSurface(scheme),
              pressed && styles.pressed,
              !canDownload && styles.disabled,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.brandInk }]}>
              {roomFor ? `Download ${formatBytes(pack.bytes)}` : 'Not enough space'}
            </Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  cardTitle: { ...Type.title },
  downloadHero: { overflow: 'hidden' },
  track: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  body: { ...Type.body },
  note: { ...Type.note },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  grow: { flex: 1 },
  primary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { ...Type.title },
  secondary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryLabel: { ...Type.title },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
