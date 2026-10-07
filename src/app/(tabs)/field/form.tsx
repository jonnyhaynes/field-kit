import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { responderForms } from '@/capture/depth';
import {
  formForField,
  stepFields,
  type CaptureField,
  type CaptureForm,
  type CaptureStep,
} from '@/capture/forms';
import { useDepth } from '@/capture/use-depth';
import { CallBeacon } from '@/components/call-beacon';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { brandSurface, controlSurface } from '@/constants/surface';
import { Colors, MinTarget, Radius, Spacing, Surfaces } from '@/constants/theme';
import { FontFamily, Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  answeredCount,
  isAnswered,
  observationFor,
  type Observation,
  type ObservationValue,
  type Report,
} from '@/report/report';
import { useCurrentReport } from '@/report/use-report';

/**
 * One capture form, given the screen.
 *
 * A form is worked through in its own named steps — A, B, C, D, E — rather than as one long scroll.
 * The steps are the mnemonic's own structure (`src/capture/forms.ts`), so nothing inside a form gets
 * an invented stage: a form is one idea, and a step is part of it.
 *
 * **The board's own bottom bar replaces the tabs here**: Previous, Next, and the same 999 beacon, so
 * the way out of a half-filled form is the one you are in the middle of, not the tab bar. The route
 * carries the form as a query param (`/field/form?form=abcde`) rather than a dynamic segment, so one
 * file serves all four and it stays editable by path.
 *
 * The gate holds here too: the route is inside the Field tab, but a deep link could still reach it,
 * so the depth is checked and a guarded refusal renders rather than a form.
 */
export default function CaptureFormScreen() {
  const { depth } = useDepth();
  const params = useLocalSearchParams<{ form?: string }>();

  if (depth !== 'responder') {
    return (
      <GuardedRefusal body="Responder capture is switched off, so this form is not open. Turn it on in Settings if it is meant to be." />
    );
  }

  const form = responderForms(depth).find((entry) => entry.id === params.form);
  if (!form) {
    return <GuardedRefusal body="There is no form by that name." />;
  }

  return <FocusedForm form={form} />;
}

function GuardedRefusal({ body }: { body: string }) {
  const theme = useTheme();

  return (
    <Screen testID="capture-form-refused" withTopInset withBottomInset>
      <ScreenHeader title="Capture" titleSize={27} />
      <Card tone="outline">
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </Card>
    </Screen>
  );
}

function FocusedForm({ form }: { form: CaptureForm }) {
  const theme = useTheme();
  const { report, record } = useCurrentReport();
  const [stepIndex, setStepIndex] = useState(0);

  const step = form.steps[stepIndex];
  const isLast = stepIndex === form.steps.length - 1;
  const next = form.steps[stepIndex + 1];

  if (!report) {
    return (
      <Screen testID="capture-form-screen" withTopInset withBottomInset>
        <ScreenHeader title={form.mnemonic} titleSize={27} />
        <Card tone="outline" testID="capture-form-no-report">
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            There is no report open, so there is nothing to record into. Start one from the Field
            tab.
          </Text>
        </Card>
      </Screen>
    );
  }

  const answered = answeredCount(
    report,
    form.fields.map((field) => field.id),
  );

  return (
    <Screen
      testID="capture-form-screen"
      withTopInset
      withBottomInset
      actions={
        // The board's bar: Previous, the next step, and 999 — the tabs stood down for this screen.
        <View style={styles.footerRow}>
          {stepIndex > 0 ? (
            <FooterButton
              label="Previous"
              testID="capture-prev"
              variant="secondary"
              onPress={() => setStepIndex((index) => index - 1)}
            />
          ) : null}
          <FooterButton
            label={isLast ? 'Done' : `Next: ${next.letter}`}
            testID="capture-next"
            variant="primary"
            onPress={() => (isLast ? router.back() : setStepIndex((index) => index + 1))}
          />
          <CallBeacon />
        </View>
      }>
      <ScreenHeader
        title={form.mnemonic}
        titleSize={27}
        right={
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            {`${String(answered)} / ${String(form.fields.length)}`}
          </Text>
        }
      />

      <StepBar steps={form.steps} current={stepIndex} onSelect={setStepIndex} />

      {/* The board heads the step with its own name alone — "Circulation", not "C · Circulation". */}
      <Text testID="capture-step-label" style={[styles.stepLabel, { color: theme.text }]}>
        {step.label}
      </Text>

      <View style={styles.fields}>
        {stepFields(form, step)
          .filter((field) => !field.needsEquipment)
          .map((field) => (
            <FieldControl key={field.id} field={field} report={report} onRecord={record} />
          ))}
      </View>

      <EquipmentFields form={form} step={step} report={report} onRecord={record} />

      {/* The board says this in words, and it is the app's rule as much as the form's (§2.1). */}
      <Text testID="capture-observe-note" style={[styles.note, { color: theme.textSecondary }]}>
        Records what you observe. It doesn&apos;t interpret it.
      </Text>
    </Screen>
  );
}

function FooterButton({
  label,
  testID,
  variant,
  onPress,
}: {
  label: string;
  testID: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerButton,
        variant === 'primary' ? brandSurface(scheme) : controlSurface(scheme),
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.footerLabel,
          { color: variant === 'primary' ? theme.brandInk : theme.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The mnemonic's letters as a stepper: where you have been, where you are, what is left. */
function StepBar({
  steps,
  current,
  onSelect,
}: {
  steps: readonly CaptureStep[];
  current: number;
  onSelect: (index: number) => void;
}) {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <View testID="capture-stepbar" style={styles.stepBar}>
      {steps.map((step, index) => {
        const state = index === current ? 'current' : index < current ? 'done' : 'pending';
        const background =
          state === 'current'
            ? theme.brand
            : state === 'done'
              ? Colors[scheme].text
              : Surfaces[scheme].selected;
        const ink =
          state === 'current'
            ? theme.brandInk
            : state === 'done'
              ? theme.brand
              : theme.textSecondary;

        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`${step.letter} — ${step.label}, ${state}`}
            accessibilityState={{ selected: index === current }}
            testID={`capture-step-${index}`}
            onPress={() => onSelect(index)}
            // The board rings the current step with an ink outline.
            style={[
              styles.stepBox,
              { backgroundColor: background },
              state === 'current' && { borderWidth: 2, borderColor: theme.text },
            ]}>
            <Text style={[styles.stepLetter, { color: ink }]}>{step.letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The fields that need equipment, behind a disclosure and closed by default.
 *
 * The one rule that matters: an answered field is shown even when the disclosure is closed. Hiding
 * something a person has already recorded would hide their own work, which is the opposite of the
 * point.
 */
function EquipmentFields({
  form,
  step,
  report,
  onRecord,
}: {
  form: CaptureForm;
  step: CaptureStep;
  report: Report;
  onRecord: (observation: Observation) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const fields = stepFields(form, step).filter((field) => field.needsEquipment);
  if (fields.length === 0) return null;

  const visible = open ? fields : fields.filter((field) => isAnswered(report, field.id));

  return (
    <View style={styles.equipment}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="capture-equipment-toggle"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.equipmentToggle,
          { borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.equipmentLabel, { color: theme.textSecondary }]}>
          {`${String(fields.length)} ${fields.length === 1 ? 'field' : 'fields'} that need equipment`}
        </Text>
      </Pressable>

      {visible.map((field) => (
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
  const scheme = useColorScheme();
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
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}</Text>
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
                    borderColor: selected ? 'transparent' : theme.border,
                    backgroundColor: selected ? theme.brand : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipLabel, { color: selected ? theme.brandInk : theme.text }]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        // The unit rides inside the field, the board's way: a number is meaningless without it, and
        // putting it here means it cannot be separated from the value by a scroll or a screen reader.
        <View style={styles.inputRow}>
          <TextInput
            testID={`record-input-${field.id}`}
            accessibilityLabel={field.unit ? `${field.label}, in ${field.unit}` : field.label}
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
              styles.inputFlex,
              // A number reads as a measured value (mono); free text is prose. The board draws the
              // number fields with an ink emphasis border and leaves text fields on the hairline.
              field.kind === 'number' ? styles.valueMachine : styles.valueText,
              {
                color: theme.text,
                borderColor: field.kind === 'number' ? theme.text : theme.border,
                backgroundColor: Surfaces[scheme].panel,
              },
              field.kind === 'text' && styles.inputTall,
            ]}
          />
          {field.unit ? (
            <Text style={[styles.unit, { color: theme.textSecondary }]}>{field.unit}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...Type.body },
  note: { ...Type.note },
  formHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mnemonic: { ...Type.display },
  count: { ...Type.machine, fontSize: 14 },
  purpose: { ...Type.body },
  stepBar: { flexDirection: 'row', gap: Spacing.two },
  stepBox: {
    flex: 1,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLetter: { ...Type.display, fontSize: 22 },
  stepLabel: { ...Type.display, fontSize: 22 },
  fields: { gap: Spacing.three },
  field: { gap: Spacing.one, marginTop: Spacing.two },
  // The board sets a field label in Figtree 600 at 13.5 — prose, not the display face.
  fieldLabel: { fontFamily: FontFamily.textStrong, fontSize: 13.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: MinTarget,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  chipLabel: { ...Type.body },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inputFlex: { flex: 1 },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  valueMachine: { ...Type.machine, fontSize: 20 },
  valueText: { ...Type.body },
  inputTall: { minHeight: 80, textAlignVertical: 'top' },
  unit: { ...Type.machine, fontSize: 13 },
  equipment: { gap: Spacing.two },
  equipmentToggle: {
    minHeight: MinTarget,
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  equipmentLabel: { ...Type.note },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  footerButton: {
    flex: 1,
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLabel: { ...Type.title },
  pressed: { opacity: 0.85 },
});
