import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { responderForms, type ResponderDepth } from '@/capture/depth';
import { formForField, type CaptureField, type CaptureForm } from '@/capture/forms';
import { useDepth } from '@/capture/use-depth';
import { Screen } from '@/components/screen';
import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recordedFrom } from '@/incident/recorded-location';
import { useCurrentPosition } from '@/location/current-position';
import {
  answeredCount,
  observationFor,
  type Observation,
  type ObservationValue,
  type Report,
} from '@/report/report';
import { useCurrentReport } from '@/report/use-report';

/**
 * "Record incident" — where the Responder depth actually captures something.
 *
 * The gate is the component boundary: only a narrowed responder depth reaches `ResponderCapture`, and
 * the forms come from `responderForms`, which does not accept anything else. There is no path to a
 * field that skips it, and no conditional anybody can delete.
 *
 * Nothing on this screen interprets anything. A field records what the user observed; there is no
 * score, no normal range and no conclusion anywhere on it, and §2.1 is why that is not an accident.
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
      <View
        testID="record-refused"
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Responder capture is off</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          These are the Responder tools, which add structured capture on top of the emergency path
          rather than replacing it. They are switched off, so nothing here is open. Turn them on in
          Settings if they are meant to be.
        </Text>
      </View>
    </Screen>
  );
}

function ResponderCapture({ depth }: { depth: ResponderDepth }) {
  const theme = useTheme();
  const { report, begin, record, discard, attachLocation } = useCurrentReport();
  const position = useCurrentPosition();

  const forms = responderForms(depth);
  const canAttach = position.status === 'ready';

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
            accessibilityLabel="Send this report"
            testID="record-send"
            onPress={() => router.push('/send')}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.accentInk }]}>Send report</Text>
          </Pressable>
        ) : null
      }>
      <Text style={[styles.title, { color: theme.text }]}>Record incident</Text>

      {report ? (
        <>
          <View
            testID="record-location"
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Position</Text>
            {report.location ? (
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {`${report.location.coordinates.latitude.toFixed(5)}, ${report.location.coordinates.longitude.toFixed(5)}`}
                {`\nRecorded ${report.location.sampledAt}. This is where the incident was, not where you are now.`}
              </Text>
            ) : (
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                No position attached to this report yet.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach my position to this report"
              testID="record-attach-position"
              disabled={!canAttach}
              onPress={attach}
              style={({ pressed }) => [
                styles.secondary,
                { borderColor: theme.border },
                pressed && styles.pressed,
                !canAttach && styles.disabled,
              ]}>
              <Text style={[styles.secondaryLabel, { color: theme.text }]}>
                {canAttach ? 'Attach my position' : 'No position fix yet'}
              </Text>
            </Pressable>
          </View>

          {forms.map((form) => (
            <FormSection key={form.id} form={form} report={report} onRecord={record} />
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard this report"
            testID="record-discard"
            onPress={discard}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>
              Discard this report
            </Text>
          </Pressable>
        </>
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
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
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.accentInk }]}>Start a report</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function FormSection({
  form,
  report,
  onRecord,
}: {
  form: CaptureForm;
  report: Report;
  onRecord: (observation: Observation) => void;
}) {
  const theme = useTheme();
  const answered = answeredCount(
    report,
    form.fields.map((field) => field.id),
  );

  return (
    <View
      testID={`record-form-${form.id}`}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.header}>
        <Text
          testID={`record-mnemonic-${form.id}`}
          style={[styles.mnemonic, { color: theme.text }]}>
          {form.mnemonic}
        </Text>
        <Text style={[styles.tag, { color: theme.textSecondary, borderColor: theme.border }]}>
          {form.whatItDescribes === 'scene' ? 'the scene' : 'the casualty'}
        </Text>
      </View>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{form.purpose}</Text>
      <Text style={[styles.note, { color: theme.textSecondary }]}>
        {`${answered} of ${form.fields.length} recorded`}
      </Text>

      {form.fields.map((field) => (
        <FieldControl key={field.id} field={field} report={report} onRecord={onRecord} />
      ))}
    </View>
  );
}

function FieldControl({
  field,
  report,
  onRecord,
}: {
  field: CaptureField;
  report: Report;
  onRecord: (observation: Observation) => void;
}) {
  const theme = useTheme();
  const value = observationFor(report, field.id)?.value;

  function set(next: ObservationValue) {
    onRecord({
      formId: formForField(field.id)?.id ?? '',
      fieldId: field.id,
      value: next,
      recordedAt: new Date().toISOString(),
    });
  }

  const isChoice = field.kind === 'choice' || field.kind === 'boolean';
  const options = field.kind === 'boolean' ? ['Yes', 'No'] : (field.options ?? []);

  return (
    <View testID={`record-field-${field.id}`} style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>
        {field.label}
        {field.unit ? ` (${field.unit})` : ''}
      </Text>
      {field.needsEquipment ? (
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Needs equipment you may not have.
        </Text>
      ) : null}

      {isChoice ? (
        <View style={styles.chips}>
          {options.map((option, index) => {
            const optionValue: ObservationValue =
              field.kind === 'boolean' ? option === 'Yes' : option;
            const selected = value === optionValue;

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`${field.label}: ${option}`}
                accessibilityState={{ selected }}
                testID={`record-choice-${field.id}-${index}`}
                onPress={() => set(optionValue)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: selected ? theme.accent : theme.border,
                    backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipLabel, { color: theme.text }]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          testID={`record-input-${field.id}`}
          accessibilityLabel={field.label}
          value={value === undefined ? '' : String(value)}
          onChangeText={(text) => {
            if (field.kind !== 'number') {
              set(text);
              return;
            }
            const parsed = Number(text);
            set(text.trim() === '' || Number.isNaN(parsed) ? '' : parsed);
          }}
          keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
          multiline={field.kind === 'text'}
          placeholder={field.kind === 'time' ? 'e.g. 14:20' : ''}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
            field.kind === 'text' && styles.inputTall,
          ]}
        />
      )}
    </View>
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
  note: { fontSize: 13, lineHeight: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mnemonic: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  tag: {
    fontSize: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  field: { gap: Spacing.one, marginTop: Spacing.two },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: MinTarget,
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  chipLabel: { fontSize: 15 },
  input: {
    minHeight: MinTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  inputTall: { minHeight: 80, textAlignVertical: 'top' },
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
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
