import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { DRAFT_DISCLAIMER, getDraft, getGuidance } from '@/content';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** A GUIDANCE_IDS value. The slot renders empty until that record is licensed in. */
  id: string;
  /** What would appear here, so the empty state still says something useful. */
  label: string;
};

/**
 * Renders licensed guidance, or an honest empty state when there isn't any.
 *
 * The empty branch is not a placeholder to be quietly filled with our own wording —
 * this app reproduces clinical content, it does not write it. See the plan, §2.1.
 */
export function ContentSlot({ id, label }: Props) {
  const theme = useTheme();
  const record = getGuidance(id);
  const draft = getDraft(id);

  /**
   * A cited record always wins. If the licensed wording exists, a draft for the same slot is not
   * shown at all — which is what stops the prototype outliving the permission it was waiting for.
   */
  if (record) {
    return (
      <View
        testID={`content-slot-${id}`}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Text style={[styles.title, { color: theme.text }]}>{record.title}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{record.body}</Text>
        <Text style={[styles.citation, { color: theme.textSecondary }]}>
          {record.citation.publisher} — {record.citation.edition}. Reviewed{' '}
          {record.citation.reviewedOn}.
        </Text>
      </View>
    );
  }

  // A third state, not a repurposed empty one: the card says what it is, at the top, in the app's
  // own words — because the failure this design guards against is a draft read as guidance.
  if (draft) {
    return (
      <View
        testID={`content-slot-${id}-draft`}
        style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.draftLabel, { color: theme.text }]}>Draft — not approved</Text>
        <Text style={[styles.title, { color: theme.text }]}>{draft.title}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{draft.body}</Text>
        {draft.sourceFigure ? (
          <Text style={[styles.citation, { color: theme.textSecondary }]}>
            Figure: {draft.sourceFigure}
          </Text>
        ) : null}
        <Text style={[styles.citation, { color: theme.textSecondary }]}>
          {DRAFT_DISCLAIMER} Drafted {draft.draftedOn}.
        </Text>
      </View>
    );
  }

  return (
    <View
      testID={`content-slot-${id}-empty`}
      style={[styles.card, styles.empty, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Not in this build. Field Kit reproduces first aid guidance from a licensed source rather
        than writing its own, and that licence isn&apos;t in place yet.
      </Text>
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
  empty: { borderStyle: 'dashed' },
  title: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  citation: { fontSize: 12, lineHeight: 16 },
  draftLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
