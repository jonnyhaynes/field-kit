import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canQr } from '@/capabilities/can-qr';
import { Screen } from '@/components/screen';
import { ReadFromTag } from '@/components/tag-controls';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  handoverLines,
  handoverTitle,
  parseHandover,
  receivedLocation,
  REFUSAL_TEXT,
  type HandoverPayload,
  type HandoverRefusal,
} from '@/transfer/handover';

/**
 * "Scan a report" — the receiving end, which is the other half of a handover.
 *
 * Three things this screen is careful about.
 *
 * **A received report is read, never merged.** Folding somebody else's observations into your own
 * record would be inventing data, so what arrives is shown as its own thing.
 *
 * **A received position is recorded, not current.** It is turned into a `RecordedLocation` through
 * `receivedLocation`, which cannot be rendered in a current-position slot, and the screen says in
 * words that it is where the sender *was*.
 *
 * **A refusal is named.** A code that is not ours, one from a newer version and one that arrived
 * damaged are different problems, and a person standing in front of a code that will not work
 * deserves to know which one they have.
 */

type Outcome =
  | { kind: 'scanning' }
  | { kind: 'received'; payload: HandoverPayload }
  | { kind: 'refused'; reason: HandoverRefusal };

export default function ScanScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'scanning' });

  useEffect(() => {
    let cancelled = false;

    void canQr().then((answer) => {
      if (!cancelled) setAvailable(answer);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleScan(result: { data: string }): void {
    const parsed = parseHandover(result.data);
    setOutcome(
      parsed.ok
        ? { kind: 'received', payload: parsed.payload }
        : { kind: 'refused', reason: parsed.reason },
    );
  }

  const received = outcome.kind === 'received' ? receivedLocation(outcome.payload) : undefined;

  return (
    <Screen testID="scan-screen">
      <Text style={[styles.title, { color: theme.text }]}>Scan a report</Text>

      {available === false ? (
        <View
          testID="scan-unavailable"
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>No camera on this device</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            A report is read by pointing a camera at it, so this device cannot read one. Everything
            else still works.
          </Text>
        </View>
      ) : permission === null || available === null ? (
        <View
          testID="scan-checking"
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Text style={[styles.body, { color: theme.textSecondary }]}>Checking the camera…</Text>
        </View>
      ) : !permission.granted ? (
        <View
          testID="scan-permission"
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Camera access</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {permission.canAskAgain
              ? 'Field Kit needs the camera to read a code. Nothing is photographed, and nothing is uploaded.'
              : 'Camera access is off for Field Kit. Turning it back on is done in the device settings, not here.'}
          </Text>
          {permission.canAskAgain ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Allow the camera"
              testID="scan-allow"
              onPress={() => {
                void requestPermission();
              }}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.primaryLabel, { color: theme.accentInk }]}>
                Allow the camera
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : outcome.kind === 'received' ? (
        <>
          <View
            testID="scan-result"
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {handoverTitle(outcome.payload)}
            </Text>
            <View style={styles.lines}>
              {handoverLines(outcome.payload).map((line, index) => (
                <Text
                  key={`${String(index)}-${line}`}
                  style={[
                    line === '' ? styles.spacer : styles.line,
                    { color: line === '' ? theme.textSecondary : theme.text },
                  ]}>
                  {line}
                </Text>
              ))}
            </View>
          </View>

          {received ? (
            <Text testID="scan-position-warning" style={[styles.body, { color: theme.text }]}>
              {`The position above was recorded at ${received.sampledAt}. It is where the sender was then, not where they are now.`}
            </Text>
          ) : null}

          <Text style={[styles.body, { color: theme.textSecondary }]}>
            This is somebody else&apos;s report, kept apart from your own record. It is not merged
            into it, and nothing here has been sent anywhere.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan another report"
            testID="scan-again"
            onPress={() => setOutcome({ kind: 'scanning' })}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.secondaryLabel, { color: theme.text }]}>Scan another</Text>
          </Pressable>
        </>
      ) : outcome.kind === 'refused' ? (
        <>
          <View
            testID="scan-refused"
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>That code was not read</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {REFUSAL_TEXT[outcome.reason]}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan again"
            testID="scan-again"
            onPress={() => setOutcome({ kind: 'scanning' })}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.secondaryLabel, { color: theme.text }]}>Scan again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={[styles.previewFrame, { borderColor: theme.border }]}>
            <CameraView
              testID="scan-camera"
              style={styles.preview}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleScan}
            />
          </View>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Point the camera at the code on the other phone. Nothing is photographed and nothing is
            uploaded — a QR code is read on this device.
          </Text>

          {/* Nothing at all where the device cannot use tags, which is every iOS build today. */}
          <ReadFromTag />
        </>
      )}
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
  line: { fontSize: 15, lineHeight: 22 },
  spacer: { fontSize: 6, lineHeight: 8 },
  lines: { gap: Spacing.one },
  previewFrame: {
    minHeight: 320,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  preview: { flex: 1 },
  primary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { fontSize: 17, fontWeight: '600' },
  secondary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryLabel: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
