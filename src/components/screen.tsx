import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bevelStyle } from '@/constants/surface';
import { Bevel, MaxContentWidth, Spacing, Surfaces } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  children: ReactNode;
  /** Pinned below the scroll area, in the thumb zone. */
  actions?: ReactNode;
  /** Screens with no navigation header need the top inset; screens with one don't. */
  withTopInset?: boolean;
  testID?: string;
};

/**
 * The frame every screen sits in.
 *
 * It no longer owns the emergency action. That lives in the tab bar now, so it is in the same place
 * on every screen including Act, rather than appearing and disappearing — the reversal is recorded
 * in `docs/plans/field-kit-35-beacon-tab-navigation.md` §13.
 */
export function Screen({ children, actions, withTopInset = false, testID }: Props) {
  const scheme = useColorScheme();

  return (
    <View style={[styles.root, { backgroundColor: Surfaces[scheme].canvas }]} testID={testID}>
      {/*
        No `bottom` edge: every screen sits above the tab bar, and the bar owns the bottom inset.
        Leaving this in would pad for the home indicator twice, which reads as a spacing bug and
        invites someone to shrink a padding token to "fix" it.
      */}
      <SafeAreaView
        style={styles.safe}
        edges={withTopInset ? ['top', 'left', 'right'] : ['left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        {actions ? (
          // A raised level above the canvas: the footer catches light at its top edge rather than
          // being separated from the scroll area by a bare rule.
          <View style={[styles.footer, { backgroundColor: Surfaces[scheme].panel }]}>
            <View pointerEvents="none" style={bevelStyle(Bevel[scheme], 0)} />
            {actions}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safe: { flex: 1, maxWidth: MaxContentWidth, width: '100%' },
  scroll: { flex: 1 },
  body: { padding: Spacing.four, gap: Spacing.four, flexGrow: 1 },
  footer: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
