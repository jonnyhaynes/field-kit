import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDepth } from '@/capture/use-depth';
import { ActionButton } from '@/components/action-button';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { bevelStyle, brandSurface } from '@/constants/surface';
import { BevelOnColor, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The one screen everyone sees.
 *
 * The emergency action is **not here** any more: it is the red beacon in the bottom bar, which is on
 * every screen including this one. That keeps it in exactly one place that never moves, and the cost
 * is that it is no longer the largest thing on this screen — both halves are recorded in
 * `docs/plans/field-kit-35-beacon-tab-navigation.md` §13.
 *
 * What is left is the question, the two answer paths, and nothing competing with them. With the
 * Responder depth on, a third path appears. Depth *adds* tools (§1), so nothing here moves or changes
 * when it is turned on — an untrained user sees exactly the same screen either way.
 */
export default function ActScreen() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const { depth } = useDepth();

  return (
    <Screen
      testID="act-screen"
      withTopInset
      actions={
        <>
          <ActionButton
            label="They're not breathing"
            hint="Start compressions"
            testID="act-cpr"
            onPress={() => router.push('/cpr')}
          />
          <ActionButton
            label="Find nearest defibrillator"
            hint="Sorted by your position, works with no signal"
            testID="act-aed"
            onPress={() => router.push('/aed')}
          />
          {depth === 'responder' ? (
            <ActionButton
              label="Record incident"
              hint="Structured capture — SAMPLER, ABCDE, ETHANE, ASHICE"
              testID="act-record"
              onPress={() => router.push('/field')}
            />
          ) : null}
        </>
      }>
      {/* The brand's own surface, carrying the wordmark and the question it asks. */}
      <View style={[styles.hero, brandSurface(scheme)]}>
        <View pointerEvents="none" style={bevelStyle(BevelOnColor, Radius.xl)} />
        <Text style={styles.wordmark}>Field Kit</Text>
        <Text style={styles.question}>Are they awake and breathing normally?</Text>
        <Text style={styles.hint}>If you&apos;re not sure, treat it as no.</Text>
      </View>

      <OfflineNote>No signal needed — nothing on this screen uses the network.</OfflineNote>

      {/*
        Offered to both depths, and always present. §1 says depth *adds* tools rather than moving
        anything, so a link that appeared only in one depth would be the opposite: turning the
        Responder depth on would take this away. The screen it opens adapts instead.
      */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Send a report"
        accessibilityHint="A code the other phone can read, or send by message"
        testID="act-send"
        onPress={() => router.push('/send')}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkLabel, { color: theme.text }]}>Send a report</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  wordmark: { ...Type.label, color: 'rgba(255, 255, 255, 0.85)' },
  question: { ...Type.display, color: '#FFFFFF' },
  hint: { ...Type.body, color: 'rgba(255, 255, 255, 0.82)' },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  linkLabel: { ...Type.title },
  pressed: { opacity: 0.7 },
});
