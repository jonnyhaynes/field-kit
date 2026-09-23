import { StyleSheet, Text, View } from 'react-native';

import { ContentSlot } from '@/components/content-slot';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { Radius, Spacing } from '@/constants/theme';
import { GUIDANCE_IDS } from '@/content';
import { useTheme } from '@/hooks/use-theme';

/**
 * No dataset, no results — and no OpenStreetMap attribution either, because we are not
 * shipping their data yet and crediting data we don't have would be a lie.
 */
export default function AedScreen() {
  const theme = useTheme();

  return (
    <Screen testID="aed-screen">
      <Text style={[styles.title, { color: theme.text }]}>Nearest defibrillator</Text>

      <View
        testID="aed-no-data"
        style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          No defibrillator data in this build
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          The dataset isn&apos;t installed yet. When it is, every result will be labelled
          unverified: a defibrillator can be removed, moved, or locked away, and this app
          will never imply that one is present, reachable or working.
        </Text>
      </View>

      <ContentSlot id={GUIDANCE_IDS.aedUse} label="How to use an AED" />

      <OfflineNote>
        Once the dataset is installed it ships with the app, so this screen will still work
        with no signal.
      </OfflineNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
});
