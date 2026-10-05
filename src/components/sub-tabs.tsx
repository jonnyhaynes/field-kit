import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MinTarget, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The segmented control used for sub-tabs inside a tab — Locate's Map / Where I am / Compass, and
 * Field's Capture / Report.
 *
 * Sub-tabs are navigation *within* a place, so they are rendered as one control rather than as
 * separate buttons: the fact that they are alternatives to each other is the thing the shape has to
 * say.
 */
export type SubTab<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  tabs: readonly SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
};

export function SubTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  const theme = useTheme();

  return (
    <View
      testID="sub-tabs"
      style={[
        styles.bar,
        { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
      ]}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            testID={`sub-tab-${tab.id}`}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, isActive && { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.label, { color: isActive ? theme.text : theme.textSecondary }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: MinTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '600' },
});
