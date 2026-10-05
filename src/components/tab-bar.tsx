import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDepth } from '@/capture/use-depth';
import { TabGlyph } from '@/components/tab-glyph';
import { bevelStyle, hairline } from '@/constants/surface';
import {
  Bevel,
  BevelOnColor,
  Elevation,
  MinTarget,
  Radius,
  Spacing,
  Surfaces,
} from '@/constants/theme';
import { Type } from '@/constants/type';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { TAB_LABELS, TAB_TEST_IDS, isTabVisible, type TabId } from '@/navigation/tabs';

/**
 * The bottom bar, and the emergency action inside it.
 *
 * Two objects rather than one: the navigator is a floating pill, and Call 999 is its own rounded
 * container beside it with a gap. That separation is the point — the reference this register comes
 * from does exactly that, and it is what stops the emergency action reading as a fifth tab, a peer of
 * "More". It is joined by nothing and it is identical on every screen, so its position is learned
 * once and never has to be found again.
 *
 * The bar is a normal (not overlaid) tab bar with a transparent strip, so the canvas shows around the
 * pill and no screen has to reserve space for an overlay. React Navigation measures it and the screen
 * ends above it.
 */

/** Route names to the tab ids the app reasons in. */
const ROUTE_TO_TAB: Record<string, TabId> = {
  '(act)': 'act',
  locate: 'locate',
  field: 'field',
  more: 'more',
};

/** Where each tab lives. Act is served from a route group, so it stays at the root. */
const TAB_PATH: Record<TabId, '/' | '/locate' | '/field' | '/more'> = {
  act: '/',
  locate: '/locate',
  field: '/field',
  more: '/more',
};

/**
 * Only the fields this bar actually reads. Declaring a subset rather than importing the navigator's
 * own props type keeps it assignable (the real props are a superset) and avoids reaching into
 * expo-router's vendored react-navigation internals, which are not a public import.
 */
type TabBarProps = {
  state: { index: number; routes: readonly { key: string; name: string }[] };
};

export function TabBar({ state }: TabBarProps) {
  const scheme = useColorScheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { depth } = useDepth();

  return (
    <View style={[styles.strip, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.pill,
            { backgroundColor: Surfaces[scheme].panel },
            Elevation[scheme].control,
          ]}>
          <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.xl)} />
          {state.routes.map((route, index) => {
            const id = ROUTE_TO_TAB[route.name];
            // §1 enforced here as well as by `href: null`: depth *adds* a tab, and a bar that
            // rendered a route the depth hides would put capture in front of an untrained user.
            if (!id || !isTabVisible(depth, id)) return null;

            const focused = state.index === index;
            const colour = focused ? theme.text : theme.textSecondary;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={TAB_LABELS[id]}
                testID={TAB_TEST_IDS[id]}
                onPress={() => {
                  if (!focused) router.navigate(TAB_PATH[id]);
                }}
                style={[styles.item, focused && { backgroundColor: Surfaces[scheme].selected }]}>
                <TabGlyph id={id} color={colour} />
                <Text style={[styles.itemLabel, { color: colour }]}>{TAB_LABELS[id]}</Text>
              </Pressable>
            );
          })}
        </View>

        {/*
          The emergency action. Its own container, its own gap, and the only red on the screen — the
          one thing in the app allowed to look like it is emitting light (Elevation.attention).
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={EMERGENCY_LABEL}
          accessibilityHint={`Opens the dialler with ${EMERGENCY_LABEL.replace('Call ', '')} ready`}
          testID="call-beacon"
          onPress={() => {
            void callEmergencyServices();
          }}
          style={({ pressed }) => [
            styles.callWrap,
            { backgroundColor: Surfaces[scheme].panel },
            Elevation[scheme].control,
            pressed && styles.pressed,
          ]}>
          <View
            style={[
              styles.call,
              { backgroundColor: theme.rescue, ...Elevation[scheme].attention },
            ]}>
            <View pointerEvents="none" style={bevelStyle(BevelOnColor, Radius.pill)} />
            <Text style={[styles.callLabel, { color: theme.rescueInk }]}>999</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.two },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Radius.xl,
    borderWidth: hairline,
    borderColor: 'transparent',
    padding: Spacing.one,
  },
  item: {
    flex: 1,
    minHeight: MinTarget,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  itemLabel: { ...Type.note, fontSize: 10 },
  callWrap: {
    width: MinTarget + Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: hairline,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.one,
  },
  call: {
    width: MinTarget,
    height: MinTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callLabel: { ...Type.note, fontWeight: undefined, fontSize: 15 },
  pressed: { opacity: 0.85 },
});
