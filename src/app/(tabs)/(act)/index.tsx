import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDepth } from '@/capture/use-depth';
import { ActionButton } from '@/components/action-button';
import { Contour } from '@/components/contour';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { bevelStyle, controlSurface, raisedSurface } from '@/constants/surface';
import { Bevel, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The one screen everyone sees.
 *
 * The emergency action is **not here**: it is the red beacon in the bottom bar, which is on every
 * screen including this one. That keeps it in exactly one place that never moves, and the cost is
 * that it is no longer the largest thing on this screen — both halves are recorded in
 * `docs/plans/field-kit-35-beacon-tab-navigation.md` §13.
 *
 * The question is the hero, the two answer paths are the primary action and the AED row, and the two
 * tiles lead to the other things a person at an incident reaches for. With the Responder depth on a
 * third path appears. Depth *adds* tools (§1), so nothing here moves or changes when it is turned on
 * — an untrained user sees exactly the same screen either way.
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
            variant="signal"
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
      {/* The question, in a panel, with the identity's hill field in its corner. */}
      <View style={[styles.hero, raisedSurface(scheme)]}>
        <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.xl)} />
        <Contour
          variant="hill"
          corner="top-right"
          tone={scheme === 'dark' ? 'brand' : 'ink'}
          size={220}
        />
        <Text style={[styles.wordmark, { color: theme.textSecondary }]}>Field Kit</Text>
        <Text style={[styles.question, { color: theme.text }]}>
          Are they awake and breathing normally?
        </Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          If you&apos;re not sure, treat it as no.
        </Text>
      </View>

      <OfflineNote>No signal needed — nothing on this screen uses the network.</OfflineNote>

      <View style={styles.tiles}>
        <Tile
          label="Where I am"
          hint="Grid reference"
          testID="act-where"
          onPress={() => router.push({ pathname: '/locate', params: { tab: 'where' } })}
        />
        <Tile
          label="Offline map"
          hint="Works with no signal"
          testID="act-map"
          onPress={() => router.push('/locate')}
        />
      </View>

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

/** One of the two quiet destinations beside the answer paths. */
function Tile({
  label,
  hint,
  testID,
  onPress,
}: {
  label: string;
  hint: string;
  testID: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, controlSurface(scheme), pressed && styles.pressed]}>
      <Text style={[styles.tileLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.tileHint, { color: theme.textSecondary }]}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  wordmark: { ...Type.label },
  question: { ...Type.display },
  hint: { ...Type.body },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: {
    flex: 1,
    minHeight: MinTarget,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  tileLabel: { ...Type.title },
  tileHint: { ...Type.note },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  linkLabel: { ...Type.title },
  pressed: { opacity: 0.7 },
});
