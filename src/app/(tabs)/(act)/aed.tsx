import { router } from 'expo-router';
import { Suspense, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AED_ATTRIBUTION, nearestAeds, type AedNeighbour } from '@/aed';
import { ActionButton } from '@/components/action-button';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { describeVerification, formatDistance } from '@/aed/presentation';
import { useAedFlags } from '@/aed/use-flags';
import { ContentSlot } from '@/components/content-slot';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
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
      <View testID="aed-no-data" style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          No defibrillator data in this build
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          The dataset isn&apos;t installed. When it is, every result will be labelled unverified: a
          defibrillator can be removed, moved, or locked away, and this app will never imply that
          one is present, reachable or working.
        </Text>
      </View>
    );
  }

  if (position.status !== 'ready') {
    return <PositionNotice position={position} />;
  }

  if (neighbours.length === 0) {
    return (
      <View testID="aed-none-nearby" style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>None in the dataset</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Every defibrillator near you has been flagged on this device, or none is mapped. Call 999
          and ask the operator to direct you.
        </Text>
      </View>
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
    <View testID="aed-no-position" style={[styles.card, { borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>
        {position.status === 'loading' ? 'Finding your position…' : 'No position available'}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

function Disclaimer() {
  const theme = useTheme();

  return (
    <View
      testID="aed-disclaimer"
      style={[
        styles.card,
        { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
      ]}>
      <Text style={[styles.body, { color: theme.text }]}>
        Unverified. This list comes from public mapping, not from the ambulance service. A
        defibrillator may have been moved, removed, or locked away — do not rely on any entry being
        there, reachable, or working.
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        If an entry is wrong, flagging hides it here and leaves a report you can send to
        OpenStreetMap yourself, so the map is better for the next person.
      </Text>
    </View>
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
    <View
      testID={`aed-result-${index}`}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.distance, { color: theme.text }]}>
        {formatDistance(neighbour.meters)}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {describeVerification(neighbour.verification)}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Flag the defibrillator ${formatDistance(neighbour.meters)} away as inaccurate`}
        accessibilityHint="Hides it from this device's list, and queues a report you can review"
        testID={`aed-flag-${index}`}
        onPress={() => onFlag(neighbour)}
        style={({ pressed }) => [styles.flag, pressed && styles.pressed]}>
        <Text style={[styles.flagLabel, { color: theme.rescue }]}>Flag as inaccurate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  list: { gap: Spacing.three },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  distance: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  body: { fontSize: 15, lineHeight: 22 },
  attribution: { fontSize: 12, lineHeight: 16 },
  flag: { minHeight: MinTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  flagLabel: { fontSize: 15, fontWeight: '600' },
});
