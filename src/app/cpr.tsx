import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ContentSlot } from '@/components/content-slot';
import { Metronome } from '@/components/metronome';
import { Screen } from '@/components/screen';
import { compressionPaceBpm, draftCompressionPaceBpm, GUIDANCE_IDS } from '@/content';
import { useTheme } from '@/hooks/use-theme';

export default function CprScreen() {
  const theme = useTheme();

  /**
   * Licensed first, draft second, nothing third — and the source decides which, never a fallback.
   *
   * A cited pace always wins: if the licensed record ever exists, the draft cannot be shown in its
   * place. That ordering is the reason the draft tier is safe to have at all.
   */
  const licensedPace = compressionPaceBpm();
  const draftPace = draftCompressionPaceBpm();
  const bpm = licensedPace ?? draftPace;

  // Said once, at the top, because the metronome is the one place draft content drives a tool
  // rather than being read — and a pace that came from a draft must never look like a fact.
  const showingDrafts = licensedPace === undefined && draftPace !== undefined;

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

      {showingDrafts ? (
        <View testID="cpr-draft-banner" style={[styles.banner, { borderColor: theme.border }]}>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>Draft wording</Text>
          <Text style={[styles.bannerBody, { color: theme.textSecondary }]}>
            The wording and the pace below are a draft for design review. They are not approved, and
            not for use. Field Kit reproduces guidance rather than writing it — this is the version
            we are asking a clinician to check.
          </Text>
        </View>
      ) : null}

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
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerBody: { fontSize: 13, lineHeight: 18 },
});
