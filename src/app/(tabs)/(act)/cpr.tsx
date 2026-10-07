import { router } from 'expo-router';
import { Suspense, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { nearestAeds } from '@/aed';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { formatDistance } from '@/aed/presentation';
import { useAedFlags } from '@/aed/use-flags';
import { ActionButton } from '@/components/action-button';
import { ContentSlot } from '@/components/content-slot';
import { Metronome } from '@/components/metronome';
import { Screen } from '@/components/screen';
import { GUIDANCE_IDS, compressionPaceBpm } from '@/content';
import { Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';

/**
 * Compressions.
 *
 * The pace is licensed content, so the metronome only runs once that record is present; until then
 * the slot says so rather than showing a number we picked. The defibrillator is one tap from here and
 * sits above Stop, because reaching for an AED should not mean scrolling past the control that ends
 * the thing you are doing.
 *
 * The defibrillator button carries the **live nearest distance**, as the board draws it. That mounts
 * the bundled dataset on the emergency path, so it is done gently: the dataset load is inside a
 * `Suspense` boundary whose fallback is the same button without a figure, and the position is read
 * **without prompting** — a permission dialog during CPR is the wrong trade.
 */
export default function CprScreen() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const bpm = compressionPaceBpm();
  const [running, setRunning] = useState(true);

  return (
    <Screen testID="cpr-screen">
      <View style={styles.stateRow}>
        <View style={[styles.stateChip, { backgroundColor: Surfaces[scheme].control }]}>
          <View
            style={[
              styles.stateDot,
              { backgroundColor: running ? theme.brand : theme.textSecondary },
            ]}
          />
          <Text style={[styles.stateLabel, { color: theme.textSecondary }]}>
            {running ? 'Running' : 'Paused'}
          </Text>
        </View>
      </View>

      {bpm === undefined ? (
        <ContentSlot id={GUIDANCE_IDS.cprCompressionRate} label="Compression pace" />
      ) : (
        <Metronome bpm={bpm} running={running} />
      )}

      <AedDatabaseProvider>
        <Suspense fallback={<GetDefibrillator hint="Works with no signal" />}>
          <NearestDefibrillatorButton />
        </Suspense>
      </AedDatabaseProvider>

      {bpm === undefined ? null : (
        <ActionButton
          label={running ? 'Stop' : 'Start'}
          testID="cpr-stop"
          onPress={() => setRunning((value) => !value)}
        />
      )}

      <ContentSlot id={GUIDANCE_IDS.cprCompressions} label="How to do compressions" />
    </Screen>
  );
}

/** The button, so the `Suspense` fallback and the live version cannot drift apart. */
function GetDefibrillator({ hint }: { hint: string }) {
  return (
    <ActionButton
      label="Get a defibrillator"
      hint={hint}
      variant="glacier"
      testID="cpr-aed"
      onPress={() => router.push('/aed')}
    />
  );
}

/** The nearest mapped defibrillator as the button's subtitle — a machine figure, or an honest none. */
function NearestDefibrillatorButton() {
  const position = useCurrentPosition({ request: false });
  const records = useAedRecords();
  const { flagged } = useAedFlags();

  const hint = useMemo(() => {
    if (position.status !== 'ready' || records.status !== 'ready') return 'Works with no signal';

    const [nearest] = nearestAeds(records.records, {
      center: position.coordinates,
      limit: 1,
      excludedIds: flagged,
    });
    return nearest
      ? `nearest ${formatDistance(nearest.meters)} · unverified`
      : 'none mapped nearby';
  }, [position, records, flagged]);

  return <GetDefibrillator hint={hint} />;
}

const styles = StyleSheet.create({
  stateRow: { flexDirection: 'row' },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  stateDot: { width: 8, height: 8, borderRadius: Radius.pill },
  stateLabel: { ...Type.label },
});
