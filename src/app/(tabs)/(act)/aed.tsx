import { router } from 'expo-router';
import { Suspense, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AED_ATTRIBUTION, nearestAeds, type AedNeighbour } from '@/aed';
import { ActionButton } from '@/components/action-button';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { describeVerification, formatDistance } from '@/aed/presentation';
import { useAedFlags } from '@/aed/use-flags';
import { Card } from '@/components/card';
import { ContentSlot } from '@/components/content-slot';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { Radius, Spacing } from '@/constants/theme';
import { GUIDANCE_IDS } from '@/content';
import { Type } from '@/constants/type';
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
    <Screen testID="aed-screen">
      <Text style={[styles.title, { color: theme.text }]}>Nearest defibrillator</Text>
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
  const { notes, enqueue } = useNoteQueue();

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
    <Screen
      testID="aed-screen"
      actions={
        <>
          <ActionButton
            label="Show on a map"
            hint="Offline map — works with no signal"
            testID="aed-map"
            onPress={() => router.push('/locate')}
          />
          <ActionButton
            label="Reports and settings"
            hint={
              notes.length > 0
                ? `${notes.length} to review before sending`
                : 'Review what to send to OpenStreetMap'
            }
            testID="aed-settings"
            onPress={() => router.push('/more')}
          />
        </>
      }>
      <Text style={[styles.title, { color: theme.text }]}>Nearest defibrillator</Text>

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

  return (
    <View style={styles.list}>
      {neighbours.map((neighbour, index) => (
        <NeighbourCard key={neighbour.id} neighbour={neighbour} index={index} onFlag={onFlag} />
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
    <Card tone="tinted" testID="aed-disclaimer">
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

function NeighbourCard({
  neighbour,
  index,
  onFlag,
}: {
  neighbour: AedNeighbour;
  index: number;
  onFlag: (neighbour: AedNeighbour) => void;
}) {
  const theme = useTheme();

  return (
    <Card testID={`aed-result-${index}`}>
      {/* A fixed badge anchors the distance, so three results scan down one column instead of
          re-flowing. The cross is drawn, not imported — the app ships no icon set. */}
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: `${theme.glacier}29` }]}>
          <View style={[styles.crossV, { backgroundColor: theme.glacier }]} />
          <View style={[styles.crossH, { backgroundColor: theme.glacier }]} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.distance, { color: theme.text }]}>
            {formatDistance(neighbour.meters)}
          </Text>
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            {describeVerification(neighbour.verification)}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Flag the defibrillator ${formatDistance(neighbour.meters)} away as inaccurate`}
        accessibilityHint="Hides it from this device's list, and queues a report you can review"
        testID={`aed-flag-${index}`}
        onPress={() => onFlag(neighbour)}
        style={({ pressed }) => [
          styles.flagChip,
          { backgroundColor: `${theme.glacier}29` },
          pressed && styles.pressed,
        ]}>
        {/* Glacier, not red: with the beacon permanently red, no other control on a screen may be. */}
        <Text style={[styles.flagLabel, { color: theme.glacierText }]}>Flag as inaccurate</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  list: { gap: Spacing.three },
  cardTitle: { ...Type.title },
  distance: { ...Type.machine, fontSize: 30, letterSpacing: -0.5 },
  body: { ...Type.body },
  attribution: { ...Type.note },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: Spacing.half },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossV: { position: 'absolute', width: 4, height: 17, borderRadius: 2 },
  crossH: { position: 'absolute', width: 17, height: 4, borderRadius: 2 },
  note: { ...Type.note },
  flagChip: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  flagLabel: { ...Type.title, fontSize: 14 },
});
