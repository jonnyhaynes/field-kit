import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { responderForms, type ResponderDepth } from '@/capture/depth';
import type { CaptureForm } from '@/capture/forms';
import { useDepth } from '@/capture/use-depth';
import { Card } from '@/components/card';
import { Contour } from '@/components/contour';
import { Screen } from '@/components/screen';
import { brandSurface, controlSurface } from '@/constants/surface';
import { Colors, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { recordedFrom } from '@/incident/recorded-location';
import { useCurrentPosition } from '@/location/current-position';
import { answeredCount, type Report } from '@/report/report';
import { useCurrentReport } from '@/report/use-report';

/**
 * "Record incident" — the index of the four capture forms.
 *
 * The forms are worked through one at a time rather than stacked in one scroll: ABCDE alone is
 * taller than two screens, so a responder who wants ASHICE would scroll past all of it, and one
 * inside ABCDE could not see how much is left. The index shows what each form is for and how far
 * along it is, and a form gets the screen when it is opened.
 *
 * The gate is still the component boundary: only a narrowed responder depth reaches
 * `ResponderCapture`, and the forms come from `responderForms`, which accepts nothing else.
 */
export default function RecordScreen() {
  const { depth } = useDepth();

  // The refusal renders in its own component so it does not mount the position hook. Asking for
  // location permission to show a form that is not there would be indefensible.
  return depth === 'responder' ? <ResponderCapture depth={depth} /> : <RefusedCapture />;
}

function RefusedCapture() {
  const theme = useTheme();

  return (
    <Screen testID="record-screen">
      <Text style={[styles.title, { color: theme.text }]}>Record incident</Text>
      <Card testID="record-refused">
        <Text style={[styles.cardTitle, { color: theme.text }]}>Responder capture is off</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          These are the Responder tools, which add structured capture on top of the emergency path
          rather than replacing it. They are switched off, so nothing here is open. Turn them on in
          Settings if they are meant to be.
        </Text>
      </Card>
    </Screen>
  );
}

function ResponderCapture({ depth }: { depth: ResponderDepth }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { report, begin, discard, attachLocation } = useCurrentReport();
  const position = useCurrentPosition();

  const forms = responderForms(depth);
  const canAttach = position.status === 'ready';
  // The form the last observation went into — the one actually being worked on, marked "In progress".
  const activeFormId = report ? inProgressFormId(report) : undefined;

  function attach() {
    // Recorded, not live: the report says when the position was taken (§4.1 rule 1).
    if (position.status === 'ready') {
      attachLocation(recordedFrom(position.coordinates, new Date().toISOString()));
    }
  }

  return (
    <Screen
      testID="record-screen"
      actions={
        // Only once there is something to send. A Send button over an empty report would be a
        // promise the next screen cannot keep.
        report ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review and send this report"
            testID="record-send"
            onPress={() => router.push('/send')}
            style={({ pressed }) => [
              styles.primary,
              brandSurface(scheme),
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.brandInk }]}>Send report</Text>
          </Pressable>
        ) : null
      }>
      <Text style={[styles.title, { color: theme.text }]}>Record incident</Text>

      {report ? (
        <>
          <ReportHero report={report} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach my position to this report"
            testID="record-attach-position"
            disabled={!canAttach}
            onPress={attach}
            style={({ pressed }) => [
              styles.secondary,
              controlSurface(scheme),
              pressed && styles.pressed,
              !canAttach && styles.disabled,
            ]}>
            <Text style={[styles.secondaryLabel, { color: theme.text }]}>
              {canAttach ? 'Attach my position' : 'No position fix yet'}
            </Text>
          </Pressable>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Responder capture
          </Text>

          <View style={styles.list}>
            {forms.map((form) => (
              <FormRow
                key={form.id}
                form={form}
                report={report}
                active={form.id === activeFormId}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard this report"
            testID="record-discard"
            onPress={discard}
            style={({ pressed }) => [styles.discard, pressed && styles.pressed]}>
            <Text style={[styles.discardLabel, { color: theme.textSecondary }]}>
              Discard this report
            </Text>
          </Pressable>
        </>
      ) : (
        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>No report open</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            A report is somewhere to write down what you observe. It stays on this device — nothing
            is sent anywhere, and nothing here decides anything.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a report"
            testID="record-start"
            onPress={() => {
              if (position.status === 'ready') {
                begin(recordedFrom(position.coordinates, new Date().toISOString()));
              } else {
                begin();
              }
            }}
            style={({ pressed }) => [
              styles.primary,
              brandSurface(scheme),
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.brandInk }]}>Start a report</Text>
          </Pressable>
        </Card>
      )}
    </Screen>
  );
}

/** `HH:MM`, local, because a report is read back in the room it was written in. */
function clock(iso: string): string {
  const at = new Date(iso);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}

/** Which form the last observation went into — the one the user is actually working on. */
function inProgressFormId(report: Report): string | undefined {
  const latest = [...report.observations].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )[0];
  return latest?.formId;
}

/** The report itself, on the board's ink card: when it started, and where it is pinned to. */
function ReportHero({ report }: { report: Report }) {
  return (
    <View testID="record-location" style={styles.hero}>
      <Contour variant="hill" corner="top-right" tone="brand" size={180} />
      <View style={styles.heroHead}>
        <Text style={styles.heroLabel}>This report</Text>
        <Text style={styles.heroMeta}>{`started ${clock(report.openedAt)}`}</Text>
      </View>
      {report.location ? (
        <>
          <Text style={styles.heroValue}>
            {`${report.location.coordinates.latitude.toFixed(5)}, ${report.location.coordinates.longitude.toFixed(5)}`}
          </Text>
          <Text style={styles.heroMeta}>
            {`Recorded ${clock(report.location.sampledAt)} — where the incident was, not where you are now.`}
          </Text>
        </>
      ) : (
        <Text style={styles.heroMeta}>No position attached to this report yet.</Text>
      )}
    </View>
  );
}

/** One form in the index: what it is, and an honest progress bar with its count. */
function FormRow({ form, report, active }: { form: CaptureForm; report: Report; active: boolean }) {
  const theme = useTheme();
  const answered = answeredCount(
    report,
    form.fields.map((field) => field.id),
  );
  const fraction = form.fields.length === 0 ? 0 : answered / form.fields.length;

  // The board fills the row for the form you are in the middle of, and says so.
  const ink = active ? theme.brandInk : theme.text;
  const subInk = active ? theme.brandInk : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${form.mnemonic} — ${form.purpose}`}
      accessibilityHint={`${String(answered)} of ${String(form.fields.length)} recorded`}
      testID={`record-form-${form.id}`}
      onPress={() => router.push({ pathname: '/field/form', params: { form: form.id } })}
      style={({ pressed }) => [
        styles.formRow,
        {
          borderColor: active ? 'transparent' : theme.border,
          backgroundColor: active ? theme.brand : undefined,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.formRowHead}>
        <Text testID={`record-mnemonic-${form.id}`} style={[styles.mnemonic, { color: ink }]}>
          {form.mnemonic}
        </Text>
        <Text style={[styles.count, { color: subInk }]}>
          {`${String(answered)}/${String(form.fields.length)}`}
        </Text>
      </View>
      <Text style={[styles.formPurpose, { color: subInk }]}>
        {active ? 'In progress' : form.purpose}
      </Text>
      <View
        style={[
          styles.track,
          { backgroundColor: active ? 'rgba(15, 26, 22, 0.18)' : theme.backgroundSelected },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View
          style={[
            styles.fill,
            { backgroundColor: active ? theme.brandInk : theme.brand, width: `${fraction * 100}%` },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display },
  cardTitle: { ...Type.title },
  body: { ...Type.body },
  note: { ...Type.note },
  sectionLabel: { ...Type.label },
  list: { gap: Spacing.three },
  hero: {
    backgroundColor: Colors.light.text,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  heroHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroLabel: { ...Type.label, color: Colors.dark.brand },
  heroMeta: { ...Type.machine, fontSize: 12, color: 'rgba(241, 239, 232, 0.72)' },
  heroValue: { ...Type.machine, fontSize: 24, color: Colors.dark.text },
  formRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  formRowHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mnemonic: { ...Type.title, fontSize: 20, letterSpacing: 0.5 },
  count: { ...Type.machine, fontSize: 13 },
  formPurpose: { ...Type.note },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  discard: { minHeight: MinTarget, justifyContent: 'center' },
  discardLabel: { ...Type.title },
  primary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: { ...Type.title },
  secondary: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryLabel: { ...Type.title },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
