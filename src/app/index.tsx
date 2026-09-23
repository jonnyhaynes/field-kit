import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useTheme } from '@/hooks/use-theme';

/**
 * The one screen everyone sees. Call 999 is the single dominant action; the other two
 * are peer destinations reachable in one tap, not steps in a sequence.
 */
export default function ActScreen() {
  const theme = useTheme();

  return (
    <Screen
      testID="act-screen"
      withTopInset
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
        </>
      }>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: theme.text }]}>Someone needs help</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Are they awake and breathing normally? If you&apos;re not sure, treat it as no.
        </Text>
      </View>

      <OfflineNote>No signal needed — nothing on this screen uses the network.</OfflineNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 23 },
});
