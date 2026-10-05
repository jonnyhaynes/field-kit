import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bevelStyle, controlSurface, hairline } from '@/constants/surface';
import { Bevel, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The segmented control used for sub-tabs inside a tab — Locate's Map / Where I am / Compass.
 *
 * Sub-tabs are navigation *within* a place, so they are rendered as one control rather than as
 * separate buttons: the fact that they are alternatives to each other is the thing the shape has to
 * say. The chosen one is filled with the brand rather than merely outlined — in this register a state
 * is a material, not a tick.
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
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <View testID="sub-tabs" style={[styles.bar, controlSurface(scheme)]}>
      <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.pill)} />
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
            style={[styles.tab, isActive && { backgroundColor: theme.brand }]}>
            <Text
              style={[styles.label, { color: isActive ? theme.brandInk : theme.textSecondary }]}>
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
    borderRadius: Radius.pill,
    borderWidth: hairline,
    overflow: 'hidden',
    padding: Spacing.one,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    minHeight: MinTarget - Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  // Three tabs across a 320px screen cannot take the 17px title size, so this is the title's face
  // and tracking at a control size.
  label: { ...Type.title, fontSize: 14 },
});
