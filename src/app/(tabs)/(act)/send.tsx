import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { CAPTURE_FORMS } from '@/capture/forms';
import { Card } from '@/components/card';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { WriteToTag } from '@/components/tag-controls';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { controlSurface, brandSurface } from '@/constants/surface';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { answeredCount, isAnswered, type Report } from '@/report/report';
import { useCurrentReport } from '@/report/use-report';
import { messageChannels } from '@/transfer/channels';
import { HANDOVER_MAX_BYTES, handoverLines, handoverTitle } from '@/transfer/handover';
import { useHandover } from '@/transfer/use-handover';

/**
 * "Send report" — the code, and the ways out.
 *
 * QR first, because it needs no network on either side and no entitlement: generating one is local
 * rendering and scanning it is the other device's camera (§4.2). The share sheet and the three
 * schemes are for when the reader is not standing in front of you.
 *
 * When a report is too large to draw, this screen does **not** shrink the code until it cannot be
 * read. It says so and sends the text instead, which is the fallback the plan asked for.
 */
export default function SendScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const handover = useHandover();
  const report = useCurrentReport().report;
  const [failure, setFailure] = useState<string | undefined>(undefined);

  async function open(url: string): Promise<void> {
    try {
      await Linking.openURL(url);
      setFailure(undefined);
    } catch {
      // The dialler precedent: the caller owns the failure, because the link failing silently would
      // look like the button doing nothing.
      setFailure('Nothing on this device opened that link.');
    }
  }

  async function share(): Promise<void> {
    if (handover.status !== 'ready') return;

    try {
      await Share.share({ message: handover.text });
      setFailure(undefined);
    } catch {
      setFailure('Sharing did not open.');
    }
  }

  return (
    <Screen
      testID="send-screen"
      actions={
        handover.status === 'ready' ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share this report"
              testID="send-share"
              onPress={() => {
                void share();
              }}
              style={({ pressed }) => [
                styles.primary,
                brandSurface(scheme),
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.primaryLabel, { color: theme.brandInk }]}>Share</Text>
            </Pressable>

            <View style={styles.channels}>
              {messageChannels(handover.text).map((channel) => (
                <Pressable
                  key={channel.label}
                  accessibilityRole="link"
                  accessibilityLabel={`Send by ${channel.label}`}
                  testID={`send-channel-${channel.label.toLowerCase()}`}
                  onPress={() => {
                    void open(channel.url);
                  }}
                  style={({ pressed }) => [
                    styles.channel,
                    controlSurface(scheme),
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.channelLabel, { color: theme.text }]}>{channel.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null
      }>
      <Text style={[styles.title, { color: theme.text }]}>Send report</Text>

      {handover.status === 'empty' ? (
        <Card testID="send-empty">
          <Text style={[styles.cardTitle, { color: theme.text }]}>No report to send</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            There is nothing recorded yet. Start a report and fill in what you can — a half-filled
            report is still worth sending.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a report"
            testID="send-start-record"
            onPress={() => router.push('/field')}
            style={({ pressed }) => [
              styles.primary,
              brandSurface(scheme),
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.brandInk }]}>Start a report</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {handover.depth === 'guided' ? (
            <Card>
              <Text style={[styles.cardTitle, { color: theme.text }]}>What has happened</Text>
              <TextInput
                testID="send-note"
                accessibilityLabel="What has happened"
                value={handover.note}
                onChangeText={handover.setNote}
                multiline
                placeholder="In your own words — what you can see, and where you are"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              />
            </Card>
          ) : null}

          <Card>
            <Text testID="send-title" style={[styles.cardTitle, { color: theme.text }]}>
              {handoverTitle(handover.payload)}
            </Text>
            <View testID="send-summary" style={styles.lines}>
              {handoverLines(handover.payload).map((line, index) => (
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
          </Card>

          {report ? <FormsReview report={report} /> : null}

          {handover.code ? (
            <View testID="send-code" style={styles.codeCard}>
              {/*
                White on black, always — not the theme. A code drawn in the app's dark palette is a
                code no camera can read, and the one place this screen cannot compromise is being
                scannable.
              */}
              <QRCode
                value={handover.code}
                size={240}
                color="#000000"
                backgroundColor="#ffffff"
                ecl="M"
              />
              {/* Fixed ink, not the theme: this plate is white in both schemes, so a theme colour
                  would be unreadable here in dark mode — the same reason the code is fixed. */}
              <Text style={styles.codeCaption}>Hold it up — another phone scans this</Text>
              <Text style={styles.codeCaptionSmall}>
                Drawn on this phone. No network, no server.
              </Text>
            </View>
          ) : (
            <Card testID="send-overflow">
              <Text style={[styles.cardTitle, { color: theme.text }]}>Too long for one code</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {`This report runs past the ${String(HANDOVER_MAX_BYTES)} bytes a code can carry here, and a code shrunk to fit would not read. Use Share instead — the whole report goes as text.`}
              </Text>
            </Card>
          )}

          <OfflineNote>
            The code is made here — nothing on this screen uses the network.
          </OfflineNote>

          <Text testID="send-privacy" style={[styles.privacy, { color: theme.textSecondary }]}>
            Kept on this phone. It only leaves when you send it.
          </Text>

          {/* Renders nothing where the device cannot use tags — every iOS build today (§2.5). */}
          <WriteToTag payload={handover.payload} />

          {failure ? (
            <Text testID="send-failed" style={[styles.body, { color: theme.text }]}>
              {failure}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Scan a report"
            accessibilityHint="Point the camera at another phone's code"
            testID="send-scan-link"
            onPress={() => router.push('/field/scan')}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text style={[styles.linkLabel, { color: theme.text }]}>Scan a report</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

/**
 * The forms that have anything in them, with their progress and a way back in.
 *
 * A review is a summary and a set of links, never a second form: it shows what has been recorded and
 * where to change it, and it never asks for anything itself.
 */
function FormsReview({ report }: { report: Report }) {
  const theme = useTheme();

  const started = CAPTURE_FORMS.filter((form) =>
    form.fields.some((field) => isAnswered(report, field.id)),
  );
  if (started.length === 0) return null;

  return (
    <Card testID="send-forms">
      <Text style={[styles.cardTitle, { color: theme.text }]}>Forms</Text>
      {started.map((form) => {
        const answered = answeredCount(
          report,
          form.fields.map((field) => field.id),
        );

        return (
          <View key={form.id} testID={`send-form-${form.id}`} style={styles.formRow}>
            <Text style={[styles.body, { color: theme.text }]}>{form.mnemonic}</Text>
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              {`${String(answered)}/${String(form.fields.length)}`}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${form.mnemonic}`}
              testID={`send-form-${form.id}-edit`}
              onPress={() => router.push({ pathname: '/field/[form]', params: { form: form.id } })}
              style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
              <Text style={[styles.editLabel, { color: theme.brandText }]}>Edit</Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  cardTitle: { ...Type.title },
  body: { ...Type.body },
  line: { ...Type.body },
  spacer: { fontSize: 6, lineHeight: 8 },
  lines: { gap: Spacing.one },
  input: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    ...Type.body,
    textAlignVertical: 'top',
  },
  codeCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
  },
  codeCaption: { ...Type.note, color: '#10201A', textAlign: 'center' },
  codeCaptionSmall: { ...Type.note, fontSize: 12, color: '#4A5A52', textAlign: 'center' },
  privacy: { ...Type.note },
  note: { ...Type.note },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTarget,
  },
  edit: { minHeight: MinTarget, justifyContent: 'center', paddingHorizontal: Spacing.two },
  editLabel: { ...Type.title },
  channels: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  channel: {
    flex: 1,
    minHeight: MinTarget,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: { ...Type.title, fontSize: 15 },
  primary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { ...Type.title },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  linkLabel: { ...Type.title },
  pressed: { opacity: 0.85 },
});
