import { Suspense, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { haversineMeters, nearestAeds } from '@/aed';
import { AedDatabaseProvider, useAedRecords } from '@/aed/database';
import { useAedFlags } from '@/aed/use-flags';
import {
  cardinal,
  chooseCompassDisplay,
  initialBearing,
  relativeBearing,
  turnInstruction,
} from '@/compass/heading';
import { useCourse } from '@/compass/use-course';
import { useHeading } from '@/compass/use-heading';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentPosition } from '@/location/current-position';

/**
 * The compass.
 *
 * Everything shown comes through `chooseCompassDisplay`, which decides whether the device's reading
 * may be displayed at all. That is deliberate: there is no second route to a bearing here, so one
 * that cannot be trusted cannot reach the screen.
 *
 * The needle points north rather than at the target. A second needle for the defibrillator was
 * considered and dropped — two needles are harder to read at a glance, and "turn 20° right" says it
 * better.
 */
const RESULT_LIMIT = 3;

export function CompassScreen() {
  return (
    <AedDatabaseProvider>
      <Suspense fallback={<CompassNotice body="Opening the compass…" />}>
        <CompassContent />
      </Suspense>
    </AedDatabaseProvider>
  );
}

function CompassContent() {
  const theme = useTheme();
  const headingState = useHeading();
  const course = useCourse();

  const display = chooseCompassDisplay({
    heading: headingState.status === 'ready' ? headingState.heading : undefined,
    course,
  });

  const facing = display.kind === 'heading' ? display : undefined;

  return (
    <Screen testID="compass-screen">
      <Text style={[styles.title, { color: theme.text }]}>Compass</Text>

      {headingState.status === 'probing' && display.kind !== 'course' ? (
        <Notice body="Checking whether this device has a compass…" />
      ) : display.kind === 'unsupported' ? (
        <Card testID="compass-unsupported">
          <Text style={[styles.cardTitle, { color: theme.text }]}>No compass on this device</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            This device cannot tell which way it is pointing — simulators have no magnetometer, and
            neither do a few real ones. Nothing is guessed to fill the gap. The grid reference on
            &ldquo;Where I am&rdquo; needs no sensor at all, and is what to read out.
          </Text>
        </Card>
      ) : display.kind === 'needs-calibration' ? (
        <Card tone="tinted" testID="compass-needs-calibration">
          <Text style={[styles.cardTitle, { color: theme.text }]}>Compass needs calibrating</Text>
          <Text style={[styles.body, { color: theme.text }]}>
            The magnetometer is reading badly, which usually means something magnetic is nearby.
            Move away from metal and electronics — a car, a phone case, a fence — then wave the
            phone in a figure of eight. No bearing is shown until it settles.
          </Text>
        </Card>
      ) : (
        <>
          <View style={[styles.dialWrap, { borderColor: theme.border }]}>
            <View
              testID="compass-dial"
              style={[styles.dial, { transform: [{ rotate: `${-display.degrees}deg` }] }]}>
              <View style={[styles.needleNorth, { backgroundColor: theme.brand }]} />
              <View style={[styles.needleSouth, { backgroundColor: theme.border }]} />
            </View>
            <View style={[styles.index, { borderBottomColor: theme.text }]} />
          </View>

          <Card>
            <Text testID="compass-readout" style={[styles.readout, { color: theme.text }]}>
              {`${String(Math.round(display.degrees)).padStart(3, '0')}° ${cardinal(display.degrees)}`}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {display.kind === 'course'
                ? 'Direction of travel, from GPS — not which way the phone is pointing.'
                : display.reference === 'true'
                  ? 'Facing, relative to true north.'
                  : 'Facing, relative to magnetic north. This device does not offer true north, so this is not corrected for magnetic declination.'}
            </Text>
          </Card>
        </>
      )}

      <DefibrillatorBearings facing={facing?.degrees} />

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        A bearing is only ever shown when the device can support it. Nothing here uses the network.
      </Text>
    </Screen>
  );
}

function DefibrillatorBearings({ facing }: { facing?: number }) {
  const theme = useTheme();
  const position = useCurrentPosition();
  const records = useAedRecords();
  const { flagged } = useAedFlags();

  const neighbours = useMemo(() => {
    if (position.status !== 'ready' || records.status !== 'ready') return [];
    return nearestAeds(records.records, {
      center: position.coordinates,
      limit: RESULT_LIMIT,
      excludedIds: flagged,
    });
  }, [position, records, flagged]);

  if (position.status !== 'ready' || neighbours.length === 0) return null;

  return (
    <Card>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Defibrillators from here</Text>

      {neighbours.map((neighbour, index) => {
        const bearing = initialBearing(position.coordinates, neighbour.coordinates);
        const metres = haversineMeters(position.coordinates, neighbour.coordinates);
        const turn =
          facing === undefined ? undefined : turnInstruction(relativeBearing(bearing, facing));

        return (
          <View key={neighbour.id} testID={`compass-aed-${index}`} style={styles.aedRow}>
            <Text style={[styles.aedBearing, { color: theme.text }]}>
              {`${String(Math.round(bearing)).padStart(3, '0')}° ${cardinal(bearing)}`}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {`${Math.round(metres / 10) * 10} m`}
              {turn
                ? turn.direction === 'straight'
                  ? ' — straight ahead'
                  : ` — turn ${turn.degrees}° ${turn.direction}`
                : ''}
            </Text>
          </View>
        );
      })}

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        {facing === undefined
          ? 'Bearings from your position, relative to north — the device is not supplying a heading, so these are not relative to where you are facing.'
          : 'Bearings to mapped defibrillators, which are unverified: one may have moved, or been locked away.'}
      </Text>
    </Card>
  );
}

function Notice({ body }: { body: string }) {
  const theme = useTheme();

  return (
    <Card tone="outline">
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
    </Card>
  );
}

function CompassNotice({ body }: { body: string }) {
  const theme = useTheme();

  return (
    <Screen testID="compass-screen">
      <Text style={[styles.title, { color: theme.text }]}>Compass</Text>
      <Notice body={body} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  cardTitle: { ...Type.title },
  body: { ...Type.body },
  note: { ...Type.note },
  readout: { ...Type.machine, fontSize: 40, letterSpacing: -1 },
  dialWrap: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
  },
  dial: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  needleNorth: { position: 'absolute', top: 0, width: 4, height: 74, borderRadius: 2 },
  needleSouth: { position: 'absolute', bottom: 0, width: 4, height: 74, borderRadius: 2 },
  index: {
    position: 'absolute',
    top: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  aedRow: { gap: Spacing.half },
  aedBearing: { ...Type.machine, fontSize: 22 },
});
