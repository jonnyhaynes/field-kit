import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';
import { toOsGridReference } from '@/location/osgb';

/**
 * "Where I am" — the thing to read out on the phone.
 *
 * This screen is a deliberate copy of the design's own mock: latitude and longitude, the OS grid
 * reference, and a what3words slot that stays empty rather than stale.
 *
 * Two things it does not do. It shows **eight figures, not ten** — metre precision would be a
 * claim neither the grid transformation nor the phone's GPS can support (see `osgb.ts`). And it
 * offers no compass button yet: the design has one, but a button that does nothing is worse than
 * no button, and the compass is its own slice.
 */
export default function PositionScreen() {
  const theme = useTheme();
  const position = useCurrentPosition();

  if (position.status !== 'ready') {
    const message =
      position.status === 'loading'
        ? 'Finding your position…'
        : position.status === 'denied'
          ? 'Location is switched off for Field Kit, so there is nothing to show. Turn it on in Settings, or call 999 and ask the operator to direct you.'
          : 'No position fix yet. Indoors, or with GPS off, this can take a moment — call 999 and ask the operator to direct you.';

    return (
      <Screen testID="position-screen">
        <Text style={[styles.title, { color: theme.text }]}>Where I am</Text>
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text testID="position-no-fix" style={[styles.body, { color: theme.textSecondary }]}>
            {message}
          </Text>
        </View>
      </Screen>
    );
  }

  const reference = toOsGridReference(position.coordinates);

  return (
    <Screen testID="position-screen">
      <Text style={[styles.title, { color: theme.text }]}>Where I am</Text>

      <Field label="Latitude, longitude">
        <Text
          testID="position-latlong"
          style={[styles.readout, { color: theme.text, fontFamily: Fonts?.mono }]}>
          {position.coordinates.latitude.toFixed(5)}
          {'\n'}
          {position.coordinates.longitude.toFixed(5)}
        </Text>
      </Field>

      <Field label="OS grid reference">
        {reference ? (
          <>
            <Text
              testID="position-grid-ref"
              style={[styles.readout, { color: theme.text, fontFamily: Fonts?.mono }]}>
              {reference.formatted}
            </Text>
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Eight figures — accurate to roughly 10 m. That is the limit of the grid transformation
              and of GPS, so no more digits are shown.
            </Text>
          </>
        ) : (
          <Text
            testID="position-out-of-coverage"
            style={[styles.body, { color: theme.textSecondary }]}>
            No grid reference. The OS grid only covers Great Britain, Northern Ireland and the Isle
            of Man, and you are outside it — so the app says nothing rather than giving you a
            reference that would send help to the wrong place. Your latitude and longitude above are
            still correct.
          </Text>
        )}
      </Field>

      <Field label="what3words">
        <Text testID="position-w3w" style={[styles.body, { color: theme.textSecondary }]}>
          Not available yet. Resolving an address needs a network, and it is not built. When it is,
          it will be stored against a record with the time it was taken — never shown here as though
          it were your current position.
        </Text>
      </Field>

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        Coordinates and the grid reference are worked out on the device. No signal needed, and
        nothing about where you are leaves the phone.
      </Text>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
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
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  readout: { fontSize: 26, lineHeight: 34, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 18 },
});
