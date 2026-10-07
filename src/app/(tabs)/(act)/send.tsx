import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { CAPTURE_FORMS } from '@/capture/forms';
import { Card } from '@/components/card';
import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { WriteToTag } from '@/components/tag-controls';
import { brandSurface, controlSurface, hairline } from '@/constants/surface';
import { MinTarget, Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { toOsGridReference } from '@/location/osgb';
import { answeredCount, isAnswered, type Report } from '@/report/report';
import { useCurrentReport } from '@/report/use-report';
import { messageChannels } from '@/transfer/channels';
import { HANDOVER_MAX_BYTES } from '@/transfer/handover';
import { useHandover } from '@/transfer/use-handover';

/**
 * "Send report" — the code, the summary, and the ways out.
 *
 * QR first, because it needs no network on either side and no entitlement: generating one is local
 * rendering and scanning it is the other device's camera (§4.2). The share sheet and the three
 * schemes are for when the reader is not standing in front of you, and they sit in the body as the
 * board's four-up row rather than in a pinned footer.
 *
 * The board's "What has happened" card summarises the report — the position and the started time —
 * and each form that has anything in it carries its progress and a way back in. It summarises and
 * links; it never asks for anything itself.
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
    <Screen testID="send-screen" withTopInset>
      <ScreenHeader title="Send report" titleSize={26} />

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

          {handover.code ? (
            <View testID="send-code" style={styles.codeCard}>
              {/*
                White on black, always — not the theme. A code drawn in the app's dark palette is a
                code no camera can read, and the one place this screen cannot compromise is being
                scannable. The board sets it on its own white plate inside the stone card.
              */}
              <View style={styles.codePlate}>
                <QRCode
                  value={handover.code}
                  size={240}
                  color="#000000"
                  backgroundColor="#ffffff"
                  ecl="M"
                />
              </View>
              {/* Fixed ink, not the theme: this card is stone in both schemes, so a theme colour
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

          {report ? <WhatHasHappened report={report} /> : null}

          {/* The board's four-up row: Share, then the three schemes. In the body, not a footer. */}
          <View style={styles.channels}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share this report"
              testID="send-share"
              onPress={() => {
                void share();
              }}
              style={({ pressed }) => [
                styles.channel,
                brandSurface(scheme),
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.channelLabel, { color: theme.brandInk }]}>Share</Text>
            </Pressable>

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

/** `HH:MM`, local — a report is read back in the room it was written in. */
function clock(iso: string): string {
  const at = new Date(iso);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

/**
 * The board's summary card: where it is, when it started, and one row per form with anything in it.
 * A review is a summary and a set of links, never a second form.
 */
function WhatHasHappened({ report }: { report: Report }) {
  const theme = useTheme();

  const reference = report.location ? toOsGridReference(report.location.coordinates) : undefined;
  const position = reference
    ? reference.formatted
    : report.location
      ? `${report.location.coordinates.latitude.toFixed(4)}, ${report.location.coordinates.longitude.toFixed(4)}`
      : 'Not attached';

  const started = CAPTURE_FORMS.filter((form) =>
    form.fields.some((field) => isAnswered(report, field.id)),
  );

  return (
    <Card testID="send-summary">
      <View style={styles.cardHead}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>What has happened</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit this report"
          testID="send-edit"
          onPress={() => router.push('/field')}
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <Text style={[styles.editLabel, { color: theme.brandText }]}>Edit</Text>
        </Pressable>
      </View>

      <Row label="Position" value={position} />
      <Row label="Started" value={clock(report.openedAt)} />

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
              onPress={() => router.push({ pathname: '/field/form', params: { form: form.id } })}
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
  label: { ...Type.label },
  body: { ...Type.body },
  note: { ...Type.note },
  spacer: { fontSize: 6, lineHeight: 8 },
  lines: { gap: Spacing.one },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: { ...Type.note },
  rowValue: { ...Type.machine, fontSize: 15, flexShrink: 1, textAlign: 'right' },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: MinTarget },
  edit: { minHeight: MinTarget, justifyContent: 'center', paddingHorizontal: Spacing.two },
  editLabel: { ...Type.title },
  input: {
    minHeight: 96,
    borderWidth: hairline,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    ...Type.body,
    textAlignVertical: 'top',
  },
  // The board's card: stone in both schemes, with the code on its own white plate. Fixed colours,
  // not the theme — this is the one surface on the screen that has to stay light to be scannable.
  codeCard: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 30,
    backgroundColor: Surfaces.light.canvas,
  },
  codePlate: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
  },
  codeCaption: { ...Type.note, color: '#10201A', textAlign: 'center' },
  codeCaptionSmall: { ...Type.note, fontSize: 12, color: '#4A5A52', textAlign: 'center' },
  privacy: { ...Type.note },
  channels: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  channel: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.md,
    borderWidth: hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: { ...Type.title, fontSize: 14 },
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
