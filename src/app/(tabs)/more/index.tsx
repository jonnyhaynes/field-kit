import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useDepth } from '@/capture/use-depth';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SubmitFailure } from '@/notes/submit';
import { useNoteQueue, useOsmOptIn, useOsmSubmitter } from '@/notes/use-notes';

/**
 * Settings, which for now means one thing: reporting a bad defibrillator entry back to
 * OpenStreetMap.
 *
 * The screen is built around a policy rather than a preference. OpenStreetMap's usage policy forbids
 * a client submitting "on behalf of users", and their notes are "for humans to communicate with other
 * humans", so nothing here is sent by the app: the user reads a note, edits it to say what they
 * actually found, and sends that one. With the opt-in off there is no send control at all — not a
 * disabled one, none.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { notes, updateText, remove } = useNoteQueue();
  const { optedIn, setOptedIn } = useOsmOptIn();
  const { send, sending } = useOsmSubmitter();
  const { depth, setDepth } = useDepth();

  const [failures, setFailures] = useState<Record<number, SubmitFailure>>({});
  const [sentNoteIds, setSentNoteIds] = useState<number[]>([]);

  async function handleSend(osmNodeId: number) {
    const note = notes.find((entry) => entry.osmNodeId === osmNodeId);
    if (!note) return;

    const result = await send(note);
    if (result.ok) {
      remove(osmNodeId);
      setSentNoteIds((ids) => [...ids, osmNodeId]);
      setFailures(({ [osmNodeId]: _sent, ...rest }) => rest);
      return;
    }

    // Nothing left the phone, and the note stays queued so it can be tried again.
    setFailures((current) => ({ ...current, [osmNodeId]: result.reason }));
  }

  return (
    <Screen testID="settings-screen">
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Responder tools</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Adds structured capture — SAMPLER, ABCDE, ETHANE and ASHICE — for people trained in them.
          It only adds: Call 999, CPR and the defibrillator locator stay exactly where they are, and
          nothing is hidden by turning this on.
        </Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.body, { color: theme.text }]}>Show responder capture</Text>
          <Switch
            testID="settings-depth-switch"
            accessibilityLabel="Show responder capture"
            value={depth === 'responder'}
            onValueChange={(on) => setDepth(on ? 'responder' : 'guided')}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          />
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Report to OpenStreetMap</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Defibrillator data comes from OpenStreetMap, so a wrong entry is best fixed there rather
          than only hidden here. Reports are <Text style={styles.emphasis}>public</Text> and{' '}
          <Text style={styles.emphasis}>anonymous</Text> — they carry no name and no account — and
          they are only for problems with the map data, not for general comments. A volunteer mapper
          will read yours.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nothing is ever sent on your behalf. You will see each report, and send it yourself.
        </Text>

        <View style={styles.toggleRow}>
          <Text style={[styles.body, { color: theme.text }]}>Show reports waiting to send</Text>
          <Switch
            testID="settings-osm-opt-in"
            accessibilityLabel="Show reports waiting to send"
            value={optedIn}
            onValueChange={setOptedIn}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          />
        </View>
      </View>

      {sentNoteIds.map((osmNodeId) => (
        <View
          key={`sent-${osmNodeId}`}
          testID={`settings-sent-${osmNodeId}`}
          style={[
            styles.card,
            { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
          ]}>
          <Text style={[styles.body, { color: theme.text }]}>
            Report sent. Thank you — it goes to the mappers who keep this data right.
          </Text>
        </View>
      ))}

      {notes.length === 0 ? (
        <Text testID="settings-no-reports" style={[styles.note, { color: theme.textSecondary }]}>
          Nothing waiting. Flag a defibrillator as inaccurate and it will appear here.
        </Text>
      ) : !optedIn ? (
        <View testID="settings-waiting" style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {notes.length === 1 ? 'One report is' : `${notes.length} reports are`} waiting. Turn the
            switch on to read {notes.length === 1 ? 'it' : 'them'} and decide what to send.
          </Text>
        </View>
      ) : (
        notes.map((note, index) => (
          <View
            key={note.osmNodeId}
            testID={`settings-note-${index}`}
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {`${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)} · node ${note.osmNodeId}`}
            </Text>

            <TextInput
              testID={`settings-note-text-${index}`}
              accessibilityLabel="The report text"
              multiline
              value={note.text}
              onChangeText={(text) => updateText(note.osmNodeId, text)}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            />

            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Edit this to say what you actually found — a mapper has to be able to act on it.
            </Text>

            {failures[note.osmNodeId] ? (
              <Text
                testID={`settings-note-failed-${index}`}
                style={[styles.body, { color: theme.text }]}>
                {failureMessage(failures[note.osmNodeId])}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send this report"
                testID={`settings-note-send-${index}`}
                disabled={sending === note.osmNodeId}
                onPress={() => void handleSend(note.osmNodeId)}
                style={({ pressed }) => [
                  styles.send,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                  sending === note.osmNodeId && styles.disabled,
                ]}>
                <Text style={[styles.sendLabel, { color: theme.accentInk }]}>
                  {sending === note.osmNodeId ? 'Sending…' : 'Send'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard this report"
                testID={`settings-note-discard-${index}`}
                onPress={() => remove(note.osmNodeId)}
                style={({ pressed }) => [styles.discard, pressed && styles.pressed]}>
                <Text style={[styles.body, { color: theme.textSecondary }]}>Discard</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

/** Each failure says what happened to the report, because "try again" is not always the answer. */
function failureMessage(reason: SubmitFailure): string {
  switch (reason) {
    case 'no-connection':
      return 'Could not reach OpenStreetMap. Nothing was sent, and the report is still waiting here.';
    case 'moderation-zone':
      return 'OpenStreetMap will not accept an anonymous report at these coordinates — some areas require a signed-in account. Nothing was sent.';
    case 'rejected':
      return 'OpenStreetMap refused the request, which usually means too many in a short time. Nothing was sent; try again later.';
    case 'failed':
      return 'OpenStreetMap did not accept the report. Nothing was sent, and it is still waiting here.';
  }
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
  note: { fontSize: 13, lineHeight: 18 },
  emphasis: { fontWeight: '600' },
  label: { fontSize: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: MinTarget,
  },
  input: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  send: {
    minHeight: MinTarget,
    flex: 1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendLabel: { fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  discard: { minHeight: MinTarget, justifyContent: 'center', paddingHorizontal: Spacing.two },
  pressed: { opacity: 0.85 },
});
