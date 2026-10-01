import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TAG_FAILURE_TEXT } from '@/nfc/tag';
import { useTag } from '@/nfc/use-tag';
import { handoverLines, handoverTitle, type HandoverPayload } from '@/transfer/handover';

/**
 * Writing a report to a tag, and reading one back.
 *
 * Both render **nothing** where the device cannot use tags, which today means every iOS build: the
 * entitlement needs an Apple Developer account that the project does not have yet (§2.5), and a
 * control that can only fail is not a degraded feature, it is an absent one. The decision lives in
 * `canNfc`; this is only where it shows.
 */

export function WriteToTag({ payload }: { payload: HandoverPayload }) {
  const theme = useTheme();
  const { available, state, write } = useTag();

  if (available !== true) return null;

  return (
    <View
      testID="write-to-tag"
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Write to a tag</Text>
      <Text style={[styles.note, { color: theme.textSecondary }]}>
        Hold the phone against a tag until it beeps. This replaces anything already on it, and it
        cannot be undone.
      </Text>

      {state.status === 'wrote' ? (
        <Text testID="write-to-tag-done" style={[styles.body, { color: theme.text }]}>
          Written. The tag now carries this report, and reads without a signal.
        </Text>
      ) : null}

      {state.status === 'failed' ? (
        <Text testID="write-to-tag-failed" style={[styles.body, { color: theme.text }]}>
          {TAG_FAILURE_TEXT[state.reason]}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Write this report to a tag"
        testID="write-to-tag-start"
        disabled={state.status === 'writing'}
        onPress={() => {
          void write(payload);
        }}
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: theme.border },
          pressed && styles.pressed,
          state.status === 'writing' && styles.disabled,
        ]}>
        <Text style={[styles.secondaryLabel, { color: theme.text }]}>
          {state.status === 'writing' ? 'Waiting for a tag…' : 'Write to a tag'}
        </Text>
      </Pressable>
    </View>
  );
}

export function ReadFromTag() {
  const theme = useTheme();
  const { available, state, read, reset } = useTag();

  if (available !== true) return null;

  return (
    <View
      testID="read-from-tag"
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Read a tag</Text>

      {state.status === 'received' ? (
        <>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {handoverTitle(state.payload)}
          </Text>
          <View style={styles.lines}>
            {handoverLines(state.payload).map((line, index) => (
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
          <Text testID="read-from-tag-note" style={[styles.note, { color: theme.textSecondary }]}>
            Read from a tag, and kept apart from your own record — it is not merged into it.
          </Text>
        </>
      ) : null}

      {state.status === 'failed' ? (
        <Text testID="read-from-tag-failed" style={[styles.body, { color: theme.text }]}>
          {TAG_FAILURE_TEXT[state.reason]}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Read a report from a tag"
        testID="read-from-tag-start"
        disabled={state.status === 'reading'}
        onPress={() => {
          void (state.status === 'idle' || state.status === 'failed' ? read() : reset());
        }}
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: theme.border },
          pressed && styles.pressed,
          state.status === 'reading' && styles.disabled,
        ]}>
        <Text style={[styles.secondaryLabel, { color: theme.text }]}>
          {state.status === 'reading' ? 'Waiting for a tag…' : 'Read a tag'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 18 },
  line: { fontSize: 15, lineHeight: 22 },
  spacer: { fontSize: 6, lineHeight: 8 },
  lines: { gap: Spacing.one },
  secondary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryLabel: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
