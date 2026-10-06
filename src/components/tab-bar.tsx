import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useDepth } from '@/capture/use-depth';
import { TabGlyph } from '@/components/tab-glyph';
import { hairline } from '@/constants/surface';
import { Colors, Elevation, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_LABELS, TAB_TEST_IDS, isTabVisible, type TabId } from '@/navigation/tabs';

/**
 * The bottom bar: one pill, and the emergency action at the thumb end of it.
 *
 * The violet register drew two objects — a nav pill and a separate round red button beside it. That
 * separation read as "call" being a peer of "More", which is the one thing it must not be; Contour
 * puts 999 *inside* the pill as a red capsule, last, where the thumb already rests, and it is still
 * the only red on the screen.
 *
 * The pill is **ink in both schemes**, so it is the one surface that does not follow the theme, and
 * its glyphs take the dark scheme's light inks even under light. The tabs are **icon-only** (the
 * board's design) — their names survive as accessibility labels — which is why the pill fits at 74pt.
 *
 * The bar is a normal (not overlaid) tab bar with a transparent strip, so React Navigation measures
 * it and no screen has to reserve space for an overlay.
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
  const insets = useSafeAreaInsets();
  const { depth } = useDepth();

  // The pill is ink in both schemes; a couple of things must therefore borrow the dark ink, not the
  // live scheme's text colours, or they vanish into the pill under light.
  const dark = Colors.dark;

  return (
    <View style={[styles.strip, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: Colors[scheme].bar, borderColor: Colors[scheme].border },
          Elevation[scheme].control,
        ]}>
        {state.routes.map((route, index) => {
          const id = ROUTE_TO_TAB[route.name];
          // §1 enforced here as well as by `href: null`: depth *adds* a tab, and a bar that rendered
          // a route the depth hides would put capture in front of an untrained user.
          if (!id || !isTabVisible(depth, id)) return null;

          const focused = state.index === index;

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
              style={[styles.item, focused && { backgroundColor: Colors[scheme].brand }]}>
              <TabGlyph id={id} color={focused ? dark.brandInk : dark.textSecondary} />
            </Pressable>
          );
        })}

        {/*
          The emergency action, inside the pill and last. It is the one thing in the app allowed to
          look like it is emitting light (Elevation.attention), and the one control that carries a
          word rather than a glyph — a word beats an icon under stress.
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
            styles.call,
            { backgroundColor: Colors[scheme].rescue, ...Elevation[scheme].attention },
            pressed && styles.pressed,
          ]}>
          <PhoneGlyph color={Colors[scheme].rescueInk} />
          <Text style={[styles.callLabel, { color: Colors[scheme].rescueInk }]}>999</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The handset, drawn rather than imported — the app ships no icon set. */
function PhoneGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  pill: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 37,
    borderWidth: hairline,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two + Spacing.half,
  },
  item: {
    width: MinTarget,
    height: MinTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  call: {
    marginLeft: 'auto',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  callLabel: { ...Type.machineStrong, fontSize: 21 },
  pressed: { opacity: 0.85 },
});
