import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDepth } from '@/capture/use-depth';
import { ActionButton } from '@/components/action-button';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { MinTarget, Spacing } from '@/constants/theme';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useTheme } from '@/hooks/use-theme';

/**
 * The one screen everyone sees. Call 999 is the single dominant action; the other two
 * are peer destinations reachable in one tap, not steps in a sequence.
 *
 * With the Responder depth on, a fourth appears. Depth *adds* tools (§1), so nothing here moves or
 * changes when it is turned on — an untrained user sees exactly the same screen either way.
 */
export default function ActScreen() {
  const theme = useTheme();
  const { depth } = useDepth();

  return (
    <Screen
      testID="act-screen"
      withTopInset
      dock={false}
      actions={
        <>
          <ActionButton
            variant="rescue"
            label={EMERGENCY_LABEL}
            testID="act-call-emergency"
            accessibilityHint={`Opens the dialler with ${EMERGENCY_LABEL.replace('Call ', '')} ready`}
            onPress={() => {
              void callEmergencyServices();
            }}
          />
          <ActionButton
            label="They're not breathing"
            hint="Start compressions"
            testID="act-cpr"
            onPress={() => router.push('/cpr')}
          />
          <ActionButton
            label="Find nearest defibrillator"
            testID="act-aed"
            onPress={() => router.push('/aed')}
          />
          {depth === 'responder' ? (
            <ActionButton
              label="Record incident"
              hint="Structured capture — SAMPLER, ABCDE, ETHANE, ASHICE"
              testID="act-record"
              onPress={() => router.push('/record')}
            />
          ) : null}
        </>
      }>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: theme.text }]}>Someone needs help</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Are they awake and breathing normally? If you&apos;re not sure, treat it as no.
        </Text>
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
  intro: { gap: Spacing.two },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 23 },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  linkLabel: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
