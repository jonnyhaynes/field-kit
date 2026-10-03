import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallDock } from '@/components/call-dock';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  /** Pinned below the scroll area, in the thumb zone. */
  actions?: ReactNode;
  /** Screens with no navigation header need the top inset; screens with one don't. */
  withTopInset?: boolean;
  /**
   * The emergency dock, on by default. Only Act turns it off, because its primary button *is* that
   * action and a second one would put two red things on one screen.
   */
  dock?: boolean;
  testID?: string;
};

export function Screen({ children, actions, withTopInset = false, dock = true, testID }: Props) {
  const theme = useTheme();
  const hasFooter = Boolean(actions) || dock;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} testID={testID}>
      {/*
        No `bottom` edge: every screen now sits above the tab bar, and the tab bar owns the bottom
        inset. Leaving this in would pad for the home indicator twice, which reads as a spacing bug
        and invites someone to shrink a padding token to "fix" it.
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

        {hasFooter ? (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {actions}
            {dock ? <CallDock /> : null}
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
