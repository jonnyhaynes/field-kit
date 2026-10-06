import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ContentSlot } from '@/components/content-slot';
import { Metronome } from '@/components/metronome';
import { Screen } from '@/components/screen';
import { GUIDANCE_IDS, compressionPaceBpm } from '@/content';
import { Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Compressions.
 *
 * The pace is licensed content, so the metronome only runs once that record is present; until then
 * the slot says so rather than showing a number we picked. The defibrillator is one tap from here and
 * sits above Stop, because reaching for an AED should not mean scrolling past the control that ends
 * the thing you are doing.
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

      <ActionButton
        label="Get a defibrillator"
        hint="Nearest from the list on this phone"
        variant="glacier"
        testID="cpr-aed"
        onPress={() => router.push('/aed')}
      />

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
