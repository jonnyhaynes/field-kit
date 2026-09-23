import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  /** Pinned below the scroll area, in the thumb zone. */
  actions?: ReactNode;
  /** Screens with no navigation header need the top inset; screens with one don't. */
  withTopInset?: boolean;
  testID?: string;
};

export function Screen({ children, actions, withTopInset = false, testID }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} testID={testID}>
      <SafeAreaView
        style={styles.safe}
        edges={withTopInset ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        {actions ? (
          <View style={[styles.actions, { borderTopColor: theme.border }]}>{actions}</View>
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
  actions: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
