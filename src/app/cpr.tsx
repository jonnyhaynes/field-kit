import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ContentSlot } from '@/components/content-slot';
import { Metronome } from '@/components/metronome';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { GUIDANCE_IDS, compressionPaceBpm } from '@/content';
import { useTheme } from '@/hooks/use-theme';

export default function CprScreen() {
  const theme = useTheme();
  const bpm = compressionPaceBpm();

  return (
    <Screen
      testID="cpr-screen"
      actions={
        <ActionButton
          label="Get a defibrillator"
          testID="cpr-aed"
          onPress={() => router.push('/aed')}
        />
      }>
      <Text style={[styles.title, { color: theme.text }]}>Start compressions</Text>

      {/* The pace is licensed content, so the metronome only runs once that record is
          present. Until then the slot says so rather than showing a number we picked. */}
      {bpm === undefined ? (
        <ContentSlot id={GUIDANCE_IDS.cprCompressionRate} label="Compression pace" />
      ) : (
        <Metronome bpm={bpm} />
      )}

      <ContentSlot id={GUIDANCE_IDS.cprCompressions} label="How to do compressions" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
});
