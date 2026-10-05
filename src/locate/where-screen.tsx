import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { MinTarget, Radius } from '@/constants/theme';
import { brandSurface } from '@/constants/surface';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { currentFrom, describeCurrentPosition } from '@/incident/recorded-location';
import { useCurrentPosition } from '@/location/current-position';
import { toOsGridReference } from '@/location/osgb';
import type { ResolutionFailure } from '@/what3words/resolver';
import { useAddress } from '@/what3words/use-address';

/**
 * "Where I am" — the thing to read out on the phone.
 *
 * This screen follows the design's own mock: latitude and longitude, the OS grid reference, and a
 * what3words location. Two deviations, both deliberate. It shows **eight figures, not ten** — metre
 * precision would be a claim neither the grid transformation nor GPS can support (see `osgb.ts`).
 * And there is no compass button: the design has one, but a button that does nothing is worse than
 * no button, and the compass is its own slice.
 *
 * The latitude and longitude are rendered from a `CurrentPosition`, so the type — not a comment —
 * is what stops a recorded location being shown here as though it were where you are standing.
 */
export function WhereScreen({ onOpenCompass }: { onOpenCompass: () => void }) {
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
        <Card tone="outline">
          <Text testID="position-no-fix" style={[styles.body, { color: theme.textSecondary }]}>
            {message}
          </Text>
        </Card>
      </Screen>
    );
  }

  const reference = toOsGridReference(position.coordinates);

  return (
    <Screen
      testID="position-screen"
      actions={
        <ActionButton
          label="Open compass"
          hint="A bearing to walk on, if this device has a compass"
          testID="position-compass-link"
          onPress={onOpenCompass}
        />
      }>
      <Text style={[styles.title, { color: theme.text }]}>Where I am</Text>

      <Field label="Latitude, longitude">
        <Text testID="position-latlong" style={[styles.readout, { color: theme.text }]}>
          {describeCurrentPosition(currentFrom(position.coordinates)).join('\n')}
        </Text>
      </Field>

      <Field label="OS grid reference">
        {reference ? (
          <>
            <Text testID="position-grid-ref" style={[styles.readout, { color: theme.text }]}>
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

      <What3WordsField coordinates={position.coordinates} />

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        Coordinates and the grid reference are worked out on the device and need no signal.
        Resolving a what3words location is the one thing on this screen that leaves the phone, and
        it only does so when you ask.
      </Text>
    </Screen>
  );
}

function What3WordsField({
  coordinates,
}: {
  coordinates: { latitude: number; longitude: number };
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { state, resolve } = useAddress(coordinates);

  return (
    <Field label="what3words">
      <View testID="position-w3w">
        {state.status === 'resolved' ? (
          <>
            <Text testID="position-w3w-words" style={[styles.readout, { color: theme.text }]}>
              {state.words}
            </Text>
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Read the three words out exactly as they are written.
            </Text>
          </>
        ) : state.status === 'resolving' ? (
          <Text
            testID="position-w3w-resolving"
            style={[styles.body, { color: theme.textSecondary }]}>
            Resolving…
          </Text>
        ) : state.status === 'unavailable' ? (
          <Text
            testID="position-w3w-unavailable"
            style={[styles.body, { color: theme.textSecondary }]}>
            {unavailableMessage(state.reason)}
          </Text>
        ) : (
          <>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              A location that is easier to read out than a grid reference, and that works anywhere
              in the world. It needs a network.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resolve a what3words location"
              testID="position-w3w-resolve"
              onPress={resolve}
              style={({ pressed }) => [
                styles.action,
                brandSurface(scheme),
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.actionLabel, { color: theme.brandInk }]}>Resolve</Text>
            </Pressable>
          </>
        )}
      </View>
    </Field>
  );
}

/** Each failure gets its own words, because they call for different things from the user. */
function unavailableMessage(reason: ResolutionFailure): string {
  switch (reason) {
    case 'not-configured':
      return 'Not available in this build. Resolving a what3words location needs an API key, and this copy of the app does not have one. The coordinates and grid reference above need no network at all.';
    case 'no-connection':
      return 'Could not reach what3words — no signal, or the service is unreachable. The coordinates and grid reference above need no network.';
    case 'rejected':
      return 'what3words refused the request: the key is not valid, or the plan does not include resolving. The coordinates and grid reference above still work.';
    case 'failed':
      return 'what3words did not return a usable answer. Try again, or read out the grid reference above instead.';
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <Card>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  label: { ...Type.label },
  readout: { ...Type.machine, fontSize: 26, lineHeight: 34 },
  body: { ...Type.body },
  note: { ...Type.note },
  action: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  actionLabel: { ...Type.title },
});
