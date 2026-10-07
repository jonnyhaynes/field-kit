import { router } from 'expo-router';
import { Suspense, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AED_ATTRIBUTION, nearestAeds, type AedNeighbour, type Coordinates } from '@/aed';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { describeVerification, formatDistance } from '@/aed/presentation';
import { useAedFlags } from '@/aed/use-flags';
import { ActionButton } from '@/components/action-button';
import { Card } from '@/components/card';
import { ContentSlot } from '@/components/content-slot';
import { Contour } from '@/components/contour';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { cardinal, initialBearing } from '@/compass/heading';
import { Radius, Spacing } from '@/constants/theme';
import { FontFamily, Type } from '@/constants/type';
import { GUIDANCE_IDS } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';
import { useNoteQueue } from '@/notes/use-notes';

/**
 * Three is the whole list. Someone reading this is standing up, one-handed, deciding where
 * to send a runner — a ranked list of every AED in the county helps nobody.
 */
const RESULT_LIMIT = 3;

export default function AedScreen() {
  return (
    <AedDatabaseProvider>
      <Suspense fallback={<AedLoading />}>
        <AedResults />
      </Suspense>
    </AedDatabaseProvider>
  );
}

function AedLoading() {
  const theme = useTheme();

  return (
    <Screen testID="aed-screen" withTopInset>
      <ScreenHeader title="Nearest defibrillator" titleSize={24} />
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Opening the defibrillator list…
      </Text>
    </Screen>
  );
}

function AedResults() {
  const theme = useTheme();
  const position = useCurrentPosition();
  const records = useAedRecords();
  const { flagged, flag } = useAedFlags();
  const { enqueue } = useNoteQueue();

  /**
   * One tap, two consequences: the entry disappears from this device at once, and a report joins the
   * queue for the user to review later. Flagging never depends on the queue, and the queue never
   * sends anything itself — see `src/notes/queue.ts`.
   */
  const onFlag = useCallback(
    (neighbour: AedNeighbour) => {
      flag(neighbour.id);
      enqueue(neighbour);
    },
    [flag, enqueue],
  );

  const neighbours = useMemo(() => {
    if (position.status !== 'ready' || records.status !== 'ready') return [];
    return nearestAeds(records.records, {
      center: position.coordinates,
      limit: RESULT_LIMIT,
      excludedIds: flagged,
    });
  }, [position, records, flagged]);

  const hasDataset = records.status === 'ready' && records.records.length > 0;

  return (
    <Screen testID="aed-screen" withTopInset>
      <ScreenHeader title="Nearest defibrillator" titleSize={24} />

      {hasDataset ? <Disclaimer /> : null}

      <Results
        recordsStatus={records.status}
        hasDataset={hasDataset}
        position={position}
        neighbours={neighbours}
        onFlag={onFlag}
      />

      {hasDataset ? (
        <Text testID="aed-attribution" style={[styles.attribution, { color: theme.textSecondary }]}>
          Defibrillator data from OpenStreetMap contributors ({AED_ATTRIBUTION}), under the Open
          Database License.
        </Text>
      ) : null}

      <ContentSlot id={GUIDANCE_IDS.aedUse} label="How to use an AED" />

      <OfflineNote>
        The defibrillator list ships with the app, so it works with no signal — the distances come
        from your own GPS.
      </OfflineNote>
    </Screen>
  );
}

type ResultsProps = {
  recordsStatus: ReturnType<typeof useAedRecords>['status'];
  hasDataset: boolean;
  position: ReturnType<typeof useCurrentPosition>;
  neighbours: AedNeighbour[];
  onFlag: (neighbour: AedNeighbour) => void;
};

function Results({ recordsStatus, hasDataset, position, neighbours, onFlag }: ResultsProps) {
  const theme = useTheme();

  if (recordsStatus === 'loading') {
    return (
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Opening the defibrillator list…
      </Text>
    );
  }

  if (!hasDataset) {
    return (
      <Card tone="outline" testID="aed-no-data">
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          No defibrillator data in this build
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          The dataset isn&apos;t installed. When it is, every result will be labelled unverified: a
          defibrillator can be removed, moved, or locked away, and this app will never imply that
          one is present, reachable or working.
        </Text>
      </Card>
    );
  }

  if (position.status !== 'ready') {
    return <PositionNotice position={position} />;
  }

  if (neighbours.length === 0) {
    return (
      <Card tone="outline" testID="aed-none-nearby">
        <Text style={[styles.cardTitle, { color: theme.text }]}>None in the dataset</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Every defibrillator near you has been flagged on this device, or none is mapped. Call 999
          and ask the operator to direct you.
        </Text>
      </Card>
    );
  }

  const from = position.coordinates;

  return (
    <View style={styles.list}>
      {neighbours.map((neighbour, index) => (
        <AedRow
          key={neighbour.id}
          neighbour={neighbour}
          index={index}
          from={from}
          onFlag={onFlag}
          hero={index === 0}
        />
      ))}
    </View>
  );
}

function PositionNotice({ position }: { position: ReturnType<typeof useCurrentPosition> }) {
  const theme = useTheme();

  const message =
    position.status === 'denied'
      ? 'Location is switched off for Field Kit, so these cannot be sorted by distance. Turn it on in Settings, or call 999 and ask the operator to direct you.'
      : 'No position fix yet. Indoors, or with GPS off, this can take a moment — call 999 and ask the operator to direct you.';

  return (
    <Card tone="outline" testID="aed-no-position">
      <Text style={[styles.cardTitle, { color: theme.text }]}>
        {position.status === 'loading' ? 'Finding your position…' : 'No position available'}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{message}</Text>
    </Card>
  );
}

function Disclaimer() {
  const theme = useTheme();

  return (
    <Card tone="outline" testID="aed-disclaimer" style={styles.provenance}>
      <View style={[styles.unverifiedChip, { backgroundColor: theme.glacier }]}>
        <Text style={[styles.unverifiedLabel, { color: theme.brandInk }]}>Unverified</Text>
      </View>
      <Text style={[styles.body, { color: theme.text }]}>
        Unverified. This list comes from public mapping, not from the ambulance service. A
        defibrillator may have been moved, removed, or locked away — do not rely on any entry being
        there, reachable, or working.
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        If an entry is wrong, flagging hides it here and leaves a report you can send to
        OpenStreetMap yourself, so the map is better for the next person.
      </Text>
    </Card>
  );
}

/** The bearing to walk on, as a compass reads it: `042° NE`. */
function bearingText(from: Coordinates, to: Coordinates): string {
  const degrees = initialBearing(from, to);
  return `${String(Math.round(degrees)).padStart(3, '0')}° ${cardinal(degrees)}`;
}

function AedRow({
  neighbour,
  index,
  from,
  onFlag,
  hero,
}: {
  neighbour: AedNeighbour;
  index: number;
  from: Coordinates;
  onFlag: (neighbour: AedNeighbour) => void;
  hero: boolean;
}) {
  const theme = useTheme();
  const number = index + 1;

  return (
    <Card testID={`aed-result-${index}`} style={hero ? styles.heroCard : undefined}>
      {/* The nearest one is the hero: a glacier field in its corner, its rank on a numbered badge,
          and the walking bearing beside the distance. The rest are quiet rows in the same column. */}
      {hero ? <Contour variant="hill" corner="top-right" tone="glacier" size={180} /> : null}

      <View style={styles.row}>
        {/* The board's badge: the hero is a glacier plate at 40, the rows are control plates at 34
            with the digit in glacier. */}
        <View
          style={[
            styles.badge,
            hero ? styles.badgeHero : styles.badgeRow,
            { backgroundColor: hero ? theme.glacier : theme.backgroundSelected },
          ]}>
          <Text
            style={[
              hero ? styles.badgeNumberHero : styles.badgeNumberRow,
              { color: hero ? theme.brandInk : theme.glacier },
            ]}>
            {number}
          </Text>
        </View>
        <Text style={[hero ? styles.distanceHero : styles.distanceRow, { color: theme.text }]}>
          {formatDistance(neighbour.meters)}
        </Text>
        {hero ? (
          <Text style={[styles.bearing, { color: theme.textSecondary }]}>
            {bearingText(from, neighbour.coordinates)}
          </Text>
        ) : (
          <Text style={[styles.unverified, { color: theme.glacierText }]}>Unverified</Text>
        )}
      </View>

      {hero ? (
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          {describeVerification(neighbour.verification)}
        </Text>
      ) : null}

      {hero ? (
        <View style={styles.heroAction}>
          <View style={styles.heroButton}>
            <ActionButton
              label="Show on a map"
              hint="Offline — works with no signal"
              variant="signal"
              testID="aed-map"
              onPress={() => router.push('/locate')}
            />
          </View>
          <View style={styles.heroButton}>
            <ActionButton
              label="Walk on a bearing"
              hint="Opens the compass pointed at this one"
              testID="aed-bearing"
              onPress={() => router.push({ pathname: '/locate', params: { tab: 'compass' } })}
            />
          </View>
        </View>
      ) : null}

      {/* The flag is the hero's — the board draws it once, for the nearest. */}
      {hero ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Flag the defibrillator ${formatDistance(neighbour.meters)} away as inaccurate`}
          accessibilityHint="Hides it from this device's list, and queues a report you can review"
          testID={`aed-flag-${index}`}
          onPress={() => onFlag(neighbour)}
          style={({ pressed }) => [styles.flag, pressed && styles.pressed]}>
          {/* Quiet and underlined. Muted, not glacier, and never red — the beacon is the only red. */}
          <Text style={[styles.flagLabel, { color: theme.textSecondary }]}>Flag as inaccurate</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  list: { gap: Spacing.three },
  cardTitle: { ...Type.title },
  body: { ...Type.body },
  attribution: { ...Type.note },
  provenance: { backgroundColor: 'rgba(142, 216, 248, 0.12)', borderColor: 'transparent' },
  unverifiedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.sm,
  },
  unverifiedLabel: { ...Type.label, letterSpacing: 0.8 },
  heroCard: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeHero: { width: 40, height: 40, borderRadius: 14 },
  badgeRow: { width: 34, height: 34, borderRadius: 12 },
  badgeNumberHero: { ...Type.machineStrong, fontSize: 18 },
  badgeNumberRow: { ...Type.machineStrong, fontSize: 15 },
  distanceHero: { ...Type.machine, fontSize: 30, letterSpacing: -0.6 },
  distanceRow: { ...Type.machine, fontSize: 17 },
  bearing: { ...Type.machine, fontSize: 15, marginLeft: 'auto' },
  unverified: { ...Type.machine, fontSize: 13, marginLeft: 'auto' },
  note: { ...Type.note },
  heroAction: { marginTop: Spacing.one, flexDirection: 'row', gap: Spacing.two },
  heroButton: { flex: 1 },
  flag: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  flagLabel: {
    ...Type.body,
    fontSize: 13,
    fontFamily: FontFamily.textStrong,
    textDecorationLine: 'underline',
  },
});
