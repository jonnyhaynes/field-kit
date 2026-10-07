import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useDepth } from '@/capture/use-depth';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { brandSurface } from '@/constants/surface';
import { FontFamily, Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const scheme = useColorScheme();
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
      <Text style={[styles.title, { color: theme.text }]}>More</Text>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Responder tools</Text>
      <Card>
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
            trackColor={{ true: theme.brand, false: theme.backgroundSelected }}
          />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Report to OpenStreetMap
      </Text>
      <Card>
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
          <View style={styles.toggleLabel}>
            <Text style={[styles.body, { color: theme.text }]}>Show reports waiting to send</Text>
            {notes.length > 0 ? (
              <View style={[styles.countBadge, { backgroundColor: theme.glacier }]}>
                <Text style={[styles.countLabel, { color: theme.brandInk }]}>{notes.length}</Text>
              </View>
            ) : null}
          </View>
          <Switch
            testID="settings-osm-opt-in"
            accessibilityLabel="Show reports waiting to send"
            value={optedIn}
            onValueChange={setOptedIn}
            trackColor={{ true: theme.brand, false: theme.backgroundSelected }}
          />
        </View>
      </Card>

      {sentNoteIds.map((osmNodeId) => (
        <Card key={`sent-${osmNodeId}`} testID={`settings-sent-${osmNodeId}`} tone="tinted">
          <Text style={[styles.body, { color: theme.text }]}>
            Report sent. Thank you — it goes to the mappers who keep this data right.
          </Text>
        </Card>
      ))}

      {notes.length === 0 ? (
        <Text testID="settings-no-reports" style={[styles.note, { color: theme.textSecondary }]}>
          Nothing waiting. Flag a defibrillator as inaccurate and it will appear here.
        </Text>
      ) : !optedIn ? (
        <Card tone="outline" testID="settings-waiting">
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {notes.length === 1 ? 'One report is' : `${notes.length} reports are`} waiting. Turn the
            switch on to read {notes.length === 1 ? 'it' : 'them'} and decide what to send.
          </Text>
        </Card>
      ) : (
        notes.map((note, index) => (
          <Card key={note.osmNodeId} testID={`settings-note-${index}`}>
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
                  brandSurface(scheme),
                  pressed && styles.pressed,
                  sending === note.osmNodeId && styles.disabled,
                ]}>
                <Text style={[styles.sendLabel, { color: theme.brandInk }]}>
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
          </Card>
        ))
      )}

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>On this phone</Text>
      <Card>
        <PhoneRow
          label="Region packs"
          value="Street detail for one area, offline for good"
          testID="settings-regions"
          onPress={() => router.push('/locate/regions')}
        />
        <PhoneRow
          label="Scan a report"
          value="Point the camera at another phone's code"
          testID="settings-scan"
          onPress={() => router.push('/field/scan')}
        />
        <PhoneRow
          label="Data and licences"
          value="Where the map and the defibrillator data come from"
          testID="settings-about"
          onPress={() => router.push('/more/about')}
        />
      </Card>

      <Text testID="settings-version" style={[styles.footer, { color: theme.textSecondary }]}>
        {`Field Kit ${Constants.expoConfig?.version ?? ''}`.trim()}
      </Text>
    </Screen>
  );
}

/** A quiet destination row: what it is, what it does, and a chevron. */
function PhoneRow({
  label,
  value,
  testID,
  onPress,
}: {
  label: string;
  value: string;
  testID: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={value}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.phoneRow, pressed && styles.pressed]}>
      <View style={styles.phoneRowText}>
        <Text style={[styles.body, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.note, { color: theme.textSecondary }]}>{value}</Text>
      </View>
      <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
    </Pressable>
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
  title: { ...Type.display },
  cardTitle: { ...Type.title },
  body: { ...Type.body },
  note: { ...Type.note },
  emphasis: { fontFamily: FontFamily.textStrong },
  label: { ...Type.machine, fontSize: 12 },
  sectionLabel: { ...Type.label },
  footer: { ...Type.machine, fontSize: 12, textAlign: 'center' },
  toggleLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  countLabel: { ...Type.machineStrong, fontSize: 13 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTarget,
  },
  phoneRowText: { flex: 1, gap: Spacing.half },
  chevron: { ...Type.title },
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
    ...Type.body,
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
  sendLabel: { ...Type.title },
  disabled: { opacity: 0.6 },
  discard: { minHeight: MinTarget, justifyContent: 'center', paddingHorizontal: Spacing.two },
  pressed: { opacity: 0.85 },
});
