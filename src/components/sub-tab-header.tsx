import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubTabs, type SubTab } from '@/components/sub-tabs';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props<T extends string> = {
  title: string;
  tabs: readonly SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
};

/**
 * A tab's own header: its title, with the sub-tab control beneath it.
 *
 * This replaces the native header on the sub-tab screens rather than sitting inside the scroll view,
 * because a switcher that scrolls away is not a switcher. It carries the top safe-area inset itself,
 * which is why those screens do not ask `Screen` for `withTopInset`.
 */
export function SubTabHeader<T extends string>({ title, tabs, active, onChange }: Props<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + Spacing.two,
          backgroundColor: theme.backgroundElement,
          borderBottomColor: theme.border,
        },
      ]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <SubTabs tabs={tabs} active={active} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
});
