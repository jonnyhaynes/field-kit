import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { OfflineNote } from '@/components/offline-note';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const handover = useHandover();
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
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.primaryLabel, { color: theme.accentInk }]}>Share</Text>
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
                    { borderColor: theme.border },
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
        <View
          testID="send-empty"
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>No report to send</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            There is nothing recorded yet. Start a report and fill in what you can — a half-filled
            report is still worth sending.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a report"
            testID="send-start-record"
            onPress={() => router.push('/record')}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.accentInk }]}>Start a report</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {handover.depth === 'guided' ? (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
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
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
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
          </View>

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
              <Text style={[styles.codeCaption, { color: theme.textSecondary }]}>
                Drawn on this phone. No network, no server — the other phone just points its camera
                at it.
              </Text>
            </View>
          ) : (
            <View
              testID="send-overflow"
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Too long for one code</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {`This report runs past the ${String(HANDOVER_MAX_BYTES)} bytes a code can carry here, and a code shrunk to fit would not read. Use Share instead — the whole report goes as text.`}
              </Text>
            </View>
          )}

          <OfflineNote>
            The code is made here — nothing on this screen uses the network.
          </OfflineNote>

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
            onPress={() => router.push('/scan')}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text style={[styles.linkLabel, { color: theme.text }]}>Scan a report</Text>
          </Pressable>
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
  input: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  codeCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
  },
  codeCaption: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  channels: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  channel: {
    flex: 1,
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: { fontSize: 15, fontWeight: '600' },
  primary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { fontSize: 17, fontWeight: '600' },
  link: { minHeight: MinTarget, justifyContent: 'center' },
  linkLabel: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
