import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bevelStyle, controlSurface, hairline } from '@/constants/surface';
import { Bevel, MinTarget, Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <View testID="sub-tabs" style={[styles.bar, controlSurface(scheme)]}>
      <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.md)} />
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
            style={[styles.tab, isActive && { backgroundColor: Surfaces[scheme].selected }]}>
            <Text style={[styles.label, { color: isActive ? theme.text : theme.textSecondary }]}>
              {tab.label}
            </Text>
            {/* The signal marks the state, not only fills it (plan §5) — and it is always here, so
                the active tab does not change height. */}
            <View style={[styles.marker, isActive && { backgroundColor: theme.brand }]} />
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
    borderWidth: hairline,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: MinTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  // Three tabs across a 320px screen cannot take the 17px title size, so this is the title's face
  // and tracking at a control size.
  label: { ...Type.title, fontSize: 14 },
  marker: { width: 16, height: 3, borderRadius: 2, marginTop: Spacing.half },
});
